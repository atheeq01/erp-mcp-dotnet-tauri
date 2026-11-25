use crate::config::AgentConfig;
use crate::error::{AgentError, Result};
use crate::mcp::client::McpClient;
use crate::policy::ToolPolicy;
use rmcp::model::{
    JsonObject, Resource, ResourceContents, ResourceTemplate, Tool, ToolAnnotations,
};
use serde_json::{Value, json};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::process::Command;

#[derive(Debug, Clone)]
pub struct ToolRoute {
    pub server_name: String,
    pub tool_def: Tool,
}

#[derive(Debug, Clone)]
pub struct ToolExecutionResult {
    pub server: String,
    pub output: String,
    pub is_error: bool,
}

pub fn tool_to_openai(tool: &Tool) -> Value {
    json!({
        "type": "function",
        "function": {
            "name": tool.name,
            "description": tool.description.as_deref().unwrap_or(""),
            "parameters": tool.schema_as_json_value()
        }
    })
}

pub struct McpHub {
    clients: Vec<McpClient>,
    tool_routes: HashMap<String, ToolRoute>,
    openai_tools: Vec<Value>,
    discovered_resources: Vec<Resource>,
    discovered_templates: Vec<ResourceTemplate>,
}

struct DiscoveredServer {
    client: McpClient,
    tools: Vec<Tool>,
    resources: Vec<Resource>,
    templates: Vec<ResourceTemplate>,
}

impl McpHub {
    pub async fn start(config: &AgentConfig) -> Result<Self> {
        let telemetry_cmd =
            Self::build_dotnet_command("Telemetry", &config.telemetry_server_path, config, true)?;
        let fs_cmd = Self::build_filesystem_command(config)?;

        let (telemetry, fs) = tokio::try_join!(
            Self::connect_and_discover("ops-telemetry", telemetry_cmd),
            Self::connect_and_discover("filesystem", fs_cmd),
        )?;

        let mut hub = Self {
            clients: Vec::with_capacity(2),
            tool_routes: HashMap::new(),
            openai_tools: Vec::new(),
            discovered_resources: Vec::new(),
            discovered_templates: Vec::new(),
        };

        hub.register_server(telemetry);
        hub.register_server(fs);

        // Synthetic read_resource tool exposing discovered MCP resources to the LLM
        let read_resource_tool =
            Self::create_read_resource_tool(&hub.discovered_resources, &hub.discovered_templates);
        hub.tool_routes.insert(
            read_resource_tool.name.to_string(),
            ToolRoute {
                server_name: "ops-telemetry".to_string(),
                tool_def: read_resource_tool,
            },
        );

        hub.openai_tools = hub
            .tool_routes
            .values()
            .filter(|r| !ToolPolicy::is_hidden_from_llm(&r.server_name, r.tool_def.name.as_ref()))
            .map(|r| tool_to_openai(&r.tool_def))
            .collect();

        Ok(hub)
    }

    async fn connect_and_discover(name: &str, cmd: Command) -> Result<DiscoveredServer> {
        let client = McpClient::start(name, cmd).await?;
        let (tools_res, resources_res, templates_res) = tokio::join!(
            client.list_tools(),
            client.list_resources(),
            client.list_resource_templates(),
        );

        Ok(DiscoveredServer {
            client,
            tools: tools_res?,
            resources: resources_res.unwrap_or_default(),
            templates: templates_res.unwrap_or_default(),
        })
    }

    fn register_server(&mut self, discovered: DiscoveredServer) {
        let server_name = &discovered.client.server_name;
        for tool in discovered.tools {
            let route_name = if self.tool_routes.contains_key(tool.name.as_ref()) {
                format!("{server_name}_{}", tool.name)
            } else {
                tool.name.to_string()
            };

            self.tool_routes.insert(
                route_name,
                ToolRoute {
                    server_name: server_name.clone(),
                    tool_def: tool,
                },
            );
        }

        self.discovered_resources.extend(discovered.resources);
        self.discovered_templates.extend(discovered.templates);
        self.clients.push(discovered.client);
    }

    fn build_dotnet_command(
        label: &str,
        exe_path: &std::path::Path,
        config: &AgentConfig,
        pass_slow_ms: bool,
    ) -> Result<Command> {
        if !exe_path.exists() {
            return Err(AgentError::Config(format!(
                "{label} MCP server binary not found at {}",
                exe_path.display()
            )));
        }

        let mut cmd = Command::new(exe_path);
        cmd.env("MOCK_DATA_DIR", &config.mock_data_dir);
        if pass_slow_ms && config.ops_slow_ms > 0 {
            cmd.env("OPS_SLOW_MS", config.ops_slow_ms.to_string());
        }
        if let Some(parent) = exe_path.parent() {
            cmd.current_dir(parent);
        }
        Ok(cmd)
    }

    fn build_filesystem_command(config: &AgentConfig) -> Result<Command> {
        let ws_str = config
            .workspace_dir
            .to_str()
            .ok_or_else(|| AgentError::Config("Workspace path invalid UTF-8".to_string()))?;

        // Candidate 1: Global npm install direct node script
        if let Ok(appdata) = std::env::var("APPDATA") {
            let global_js = PathBuf::from(&appdata)
                .join("npm")
                .join("node_modules")
                .join("@modelcontextprotocol")
                .join("server-filesystem")
                .join("dist")
                .join("index.js");

            if global_js.exists() {
                let mut cmd = Command::new("node");
                cmd.arg(&global_js).arg(ws_str);
                return Ok(cmd);
            }
        }

        // Candidate 2: npx fallback
        let mut cmd = Command::new("cmd");
        cmd.args([
            "/C",
            "npx",
            "-y",
            "@modelcontextprotocol/server-filesystem",
            ws_str,
        ]);
        Ok(cmd)
    }

    fn create_read_resource_tool(
        resources: &[Resource],
        templates: &[ResourceTemplate],
    ) -> Tool {
        let mut desc = String::from("Read an MCP resource by URI. Discovered resources:\n");
        for r in resources {
            desc.push_str(&format!("- {}\n", r.uri));
        }
        if !templates.is_empty() {
            desc.push_str("Resource templates:\n");
            for t in templates {
                desc.push_str(&format!("- {}\n", t.uri_template));
            }
        }

        let schema: JsonObject = serde_json::from_value(json!({
            "type": "object",
            "properties": {
                "uri": {
                    "type": "string",
                    "description": "The exact URI of the resource to read, e.g. config://release-checklist or service://runbooks/order-service"
                }
            },
            "required": ["uri"]
        }))
        .expect("static JSON schema object");

        Tool::new("read_resource", desc, Arc::new(schema)).annotate(
            ToolAnnotations::new()
                .read_only(true)
                .destructive(false)
                .idempotent(true),
        )
    }

    pub fn openai_tools(&self) -> &[Value] {
        &self.openai_tools
    }

    pub fn iter_tools(&self) -> impl Iterator<Item = &Tool> {
        self.tool_routes.values().map(|r| &r.tool_def)
    }

    pub fn get_all_tools(&self) -> Vec<Tool> {
        self.iter_tools().cloned().collect()
    }

    pub fn get_tool(&self, name: &str) -> Option<&Tool> {
        self.tool_routes.get(name).map(|r| &r.tool_def)
    }

    pub fn get_route(&self, name: &str) -> Option<&ToolRoute> {
        self.tool_routes.get(name)
    }

    pub fn get_discovered_resources(&self) -> &[Resource] {
        &self.discovered_resources
    }

    pub fn get_discovered_templates(&self) -> &[ResourceTemplate] {
        &self.discovered_templates
    }

    pub async fn execute_tool(&self, name: &str, arguments: Value) -> Result<ToolExecutionResult> {
        self.execute_tool_with_timeout(name, arguments, Duration::from_secs(30))
            .await
    }

    pub async fn execute_tool_with_timeout(
        &self,
        name: &str,
        arguments: Value,
        timeout: Duration,
    ) -> Result<ToolExecutionResult> {
        if name == "read_resource" {
            let uri = arguments
                .get("uri")
                .and_then(Value::as_str)
                .ok_or_else(|| {
                    AgentError::Mcp("Missing required parameter 'uri' for read_resource".into())
                })?;

            let client = self.find_client("ops-telemetry")?;
            let resp = client.read_resource(uri, timeout).await?;
            let text = resp
                .contents
                .into_iter()
                .filter_map(|c| match c {
                    ResourceContents::TextResourceContents { text, .. } => Some(text),
                    _ => None,
                })
                .collect::<Vec<_>>()
                .join("\n\n");

            return Ok(ToolExecutionResult {
                server: "ops-telemetry".to_string(),
                output: text,
                is_error: false,
            });
        }

        let route = self
            .tool_routes
            .get(name)
            .ok_or_else(|| AgentError::Mcp(format!("Unknown tool '{name}'")))?;

        let client = self.find_client(&route.server_name)?;
        let resp = client
            .call_tool(&route.tool_def.name, arguments, timeout)
            .await?;

        let output_texts: Vec<String> = resp
            .content
            .into_iter()
            .filter_map(|item| item.as_text().map(|t| t.text.clone()))
            .collect();

        let output = if output_texts.is_empty() {
            "{}".to_string()
        } else {
            output_texts.join("\n")
        };

        Ok(ToolExecutionResult {
            server: route.server_name.clone(),
            output,
            is_error: resp.is_error.unwrap_or(false),
        })
    }

    fn find_client(&self, server_name: &str) -> Result<&McpClient> {
        self.clients
            .iter()
            .find(|c| c.server_name == server_name)
            .ok_or_else(|| AgentError::Mcp(format!("Server '{server_name}' not found")))
    }

    pub async fn close(&mut self) {
        for client in &mut self.clients {
            client.close().await;
        }
    }
}

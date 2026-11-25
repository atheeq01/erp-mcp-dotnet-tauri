use crate::error::{AgentError, Result};
use rmcp::model::{
    CallToolRequestParams, CallToolResult, ClientCapabilities, ClientConfig, Implementation,
    ProtocolVersion, ReadResourceRequestParams, ReadResourceResult, Resource, ResourceTemplate,
    Tool,
};
use rmcp::service::{RoleClient, RunningService};
use rmcp::transport::TokioChildProcess;
use rmcp::ServiceExt;
use serde_json::Value;
use std::future::Future;
use std::time::Duration;
use tokio::process::Command;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub struct McpClient {
    pub server_name: String,
    service: RunningService<RoleClient, ClientConfig>,
}

impl McpClient {
    pub async fn start(server_name: impl Into<String>, mut command: Command) -> Result<Self> {
        let server_name = server_name.into();

        #[cfg(windows)]
        command.creation_flags(CREATE_NO_WINDOW);

        let transport = TokioChildProcess::new(command).map_err(|e| {
            AgentError::Mcp(format!("Failed to spawn MCP server '{server_name}': {e}"))
        })?;

        let client_config = ClientConfig::new(
            ClientCapabilities::default(),
            Implementation::new("agent-client", env!("CARGO_PKG_VERSION")),
        )
        .with_protocol_version(ProtocolVersion::LATEST_WITH_INITIALIZE);

        let service = client_config.serve(transport).await.map_err(|e| {
            AgentError::Mcp(format!("MCP handshake failed for '{server_name}': {e}"))
        })?;

        Ok(Self {
            server_name,
            service,
        })
    }

    fn mcp_err(&self, op: &str, err: impl std::fmt::Display) -> AgentError {
        AgentError::Mcp(format!("[{}] {op} failed: {err}", self.server_name))
    }

    async fn with_timeout<T, F, E>(&self, op: &str, timeout: Duration, fut: F) -> Result<T>
    where
        F: Future<Output = std::result::Result<T, E>>,
        E: std::fmt::Display,
    {
        tokio::time::timeout(timeout, fut)
            .await
            .map_err(|_| AgentError::Timeout(timeout))?
            .map_err(|e| self.mcp_err(op, e))
    }

    pub async fn list_tools(&self) -> Result<Vec<Tool>> {
        self.service
            .list_all_tools()
            .await
            .map_err(|e| self.mcp_err("list_tools", e))
    }

    pub async fn list_resources(&self) -> Result<Vec<Resource>> {
        self.service
            .list_all_resources()
            .await
            .map_err(|e| self.mcp_err("list_resources", e))
    }

    pub async fn list_resource_templates(&self) -> Result<Vec<ResourceTemplate>> {
        self.service
            .list_all_resource_templates()
            .await
            .map_err(|e| self.mcp_err("list_resource_templates", e))
    }

    pub async fn call_tool(
        &self,
        name: &str,
        arguments: Value,
        timeout: Duration,
    ) -> Result<CallToolResult> {
        let mut params = CallToolRequestParams::new(name.to_string());
        if let Value::Object(map) = arguments {
            params = params.with_arguments(map);
        }

        self.with_timeout(
            &format!("call_tool '{name}'"),
            timeout,
            self.service.call_tool(params),
        )
        .await
    }

    pub async fn read_resource(&self, uri: &str, timeout: Duration) -> Result<ReadResourceResult> {
        let params = ReadResourceRequestParams::new(uri.to_string());
        self.with_timeout(
            &format!("read_resource '{uri}'"),
            timeout,
            self.service.read_resource(params),
        )
        .await
    }

    pub async fn close(&mut self) {
        let _ = self.service.close().await;
    }
}

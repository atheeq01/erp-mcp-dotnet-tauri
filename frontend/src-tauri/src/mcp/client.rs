use serde_json::{Value, json};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

pub struct McpClient {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
    request_id: u64,
}

impl McpClient {
    pub fn start() -> Result<Self, String> {
        let backend_path = r"E:\spil\spil-mini-erp\backend\SpilMcpServer\SpilMcpServer";
        let project_file =
            r"E:\spil\spil-mini-erp\backend\SpilMcpServer\SpilMcpServer\SpilMcpServer.csproj";

        let mut child = Command::new("dotnet")
            .args(["run", "--no-build", "--project", project_file])
            .current_dir(backend_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|e| format!("Could not start MCP server: {e}"))?;

        let stdin = child.stdin.take().ok_or("Could not access MCP input")?;
        let stdout = child.stdout.take().ok_or("Could not access MCP output")?;

        let mut client = Self {
            child,
            stdin,
            stdout: BufReader::new(stdout),
            request_id: 0,
        };

        let response = client.request(
            "initialize",
            json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "spil-mini-erp",
                    "version": "1.0.0"
                }
            }),
        )?;

        if response.get("protocolVersion").is_none() {
            return Err("Invalid MCP initialization response".into());
        }

        client.notify("notifications/initialized")?;

        Ok(client)
    }

    fn request(&mut self, method: &str, params: Value) -> Result<Value, String> {
        self.request_id += 1;
        let id = self.request_id;

        let message = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params
        });

        writeln!(self.stdin, "{}", message).map_err(|e| e.to_string())?;
        self.stdin.flush().map_err(|e| e.to_string())?;

        loop {
            let mut line = String::new();
            let bytes = self
                .stdout
                .read_line(&mut line)
                .map_err(|e| e.to_string())?;

            if bytes == 0 {
                return Err("MCP server closed its output".into());
            }

            let response: Value =
                serde_json::from_str(&line).map_err(|e| format!("Invalid MCP response: {e}"))?;

            if response.get("id") != Some(&json!(id)) {
                continue;
            }

            if let Some(error) = response.get("error") {
                return Err(error.to_string());
            }

            return response
                .get("result")
                .cloned()
                .ok_or_else(|| "MCP response has no result".into());
        }
    }

    fn notify(&mut self, method: &str) -> Result<(), String> {
        let message = json!({
            "jsonrpc": "2.0",
            "method": method
        });

        writeln!(self.stdin, "{}", message).map_err(|e| e.to_string())?;
        self.stdin.flush().map_err(|e| e.to_string())
    }

    pub fn list_tools(&mut self) -> Result<Value, String> {
        self.request("tools/list", json!({}))
    }

    pub fn call_tool(&mut self, name: &str, arguments: Value) -> Result<Value, String> {
        self.request(
            "tools/call",
            json!({
                "name": name,
                "arguments": arguments
            }),
        )
    }
}

impl Drop for McpClient {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

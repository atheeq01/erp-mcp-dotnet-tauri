use crate::error::AppError;
use crate::mcp::client::McpClient;
use crate::mcp::schema_validator::validate_parameters;
use crate::models::session::UserSession;
use crate::models::tool::ToolDefinition;
use serde_json::{Value, json};

pub fn extract_tool_payload(result: Value) -> Result<Value, AppError> {
    if result.get("isError").and_then(Value::as_bool) == Some(true) {
        let err_msg = result
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("MCP tool returned an error condition");
        return Err(AppError::McpError(err_msg.to_string()));
    }

    if let Some(data) = result.get("structuredContent") {
        return Ok(data.clone());
    }

    if let Some(contents) = result.get("content").and_then(Value::as_array) {
        for item in contents {
            if let Some(text) = item.get("text").and_then(Value::as_str) {
                if let Ok(data) = serde_json::from_str::<Value>(text) {
                    return Ok(data);
                }
                return Ok(json!({ "message": text }));
            }
        }
    }

    Ok(result)
}

pub fn execute_tool(
    client: &mut McpClient,
    session: Option<&UserSession>,
    tool: &ToolDefinition,
    mut arguments: Value,
) -> Result<Value, AppError> {
    if tool.name != "login" {
        let token = session
            .ok_or_else(|| AppError::SessionError("Please log in to execute tools.".into()))?
            .token
            .clone();

        validate_parameters(tool, &arguments)?;

        if let Some(obj) = arguments.as_object_mut() {
            obj.insert("sessionToken".to_string(), json!(token));
        } else {
            arguments = json!({ "sessionToken": token });
        }
    }

    let raw_result = client
        .call_tool(&tool.name, arguments)
        .map_err(AppError::McpError)?;

    extract_tool_payload(raw_result)
}

pub fn fetch_tool_definitions(client: &mut McpClient) -> Result<Vec<ToolDefinition>, AppError> {
    let response = client.list_tools().map_err(AppError::McpError)?;

    let tools_array = response
        .get("tools")
        .and_then(Value::as_array)
        .ok_or_else(|| AppError::McpError("Invalid MCP tools/list response".into()))?;

    let mut definitions = Vec::new();
    for tool_val in tools_array {
        let name = tool_val
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();

        let description = tool_val
            .get("description")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();

        let input_schema = tool_val
            .get("inputSchema")
            .cloned()
            .unwrap_or_else(|| json!({}));

        if !name.is_empty() {
            definitions.push(ToolDefinition {
                name,
                description,
                input_schema,
            });
        }
    }

    Ok(definitions)
}

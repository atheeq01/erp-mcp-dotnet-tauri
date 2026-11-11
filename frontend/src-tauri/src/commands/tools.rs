use crate::error::AppError;
use crate::mcp::tool_router::execute_tool;
use crate::state::McpState;
use serde_json::Value;
use tauri::State;

#[tauri::command]
pub fn get_mcp_tools(state: State<'_, McpState>) -> Result<Value, AppError> {
    let mut client = state
        .client
        .lock()
        .map_err(|e| AppError::McpError(e.to_string()))?;

    let res = client.list_tools().map_err(AppError::McpError)?;
    Ok(res)
}

#[tauri::command]
pub fn call_authenticated_tool(
    name: String,
    arguments: Value,
    state: State<'_, McpState>,
) -> Result<Value, AppError> {
    if name == "login" {
        return Err(AppError::ValidationError(
            "Use the login command instead of calling the tool directly.".into(),
        ));
    }

    let tool_def = {
        let tools = state
            .tools
            .lock()
            .map_err(|e| AppError::ExecutionError(e.to_string()))?;

        tools
            .iter()
            .find(|t| t.name == name)
            .cloned()
            .ok_or_else(|| AppError::ValidationError(format!("Tool '{name}' not found.")))?
    };

    let session = {
        let guard = state
            .session
            .lock()
            .map_err(|e| AppError::SessionError(e.to_string()))?;
        guard.clone()
    };

    let mut client = state
        .client
        .lock()
        .map_err(|e| AppError::McpError(e.to_string()))?;

    execute_tool(&mut client, session.as_ref(), &tool_def, arguments)
}

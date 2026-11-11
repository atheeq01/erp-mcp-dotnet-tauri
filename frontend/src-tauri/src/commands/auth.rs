use crate::error::AppError;
use crate::mcp::tool_router::extract_tool_payload;
use crate::models::session::UserSession;
use crate::state::McpState;
use serde_json::{Value, json};
use tauri::State;

#[tauri::command]
pub fn login(
    username: String,
    password: String,
    state: State<'_, McpState>,
) -> Result<Value, AppError> {
    let result = {
        let mut client = state
            .client
            .lock()
            .map_err(|e| AppError::SessionError(e.to_string()))?;

        client
            .call_tool(
                "login",
                json!({
                    "username": username,
                    "password": password
                }),
            )
            .map_err(AppError::McpError)?
    };

    let data = extract_tool_payload(result)?;

    if data.get("success").and_then(Value::as_bool) == Some(false) {
        let msg = data
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("Invalid username or password");
        return Err(AppError::SessionError(msg.to_string()));
    }

    let token = data
        .get("sessionToken")
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::SessionError("Session token was not returned".into()))?
        .to_string();

    let user_name = data
        .get("username")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    let role = data
        .get("role")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    let mut session = state
        .session
        .lock()
        .map_err(|e| AppError::SessionError(e.to_string()))?;

    *session = Some(UserSession {
        token,
        username: user_name.clone(),
        role: role.clone(),
    });

    Ok(json!({
        "success": true,
        "username": user_name,
        "role": role
    }))
}

#[tauri::command]
pub fn get_current_user(state: State<'_, McpState>) -> Result<Value, AppError> {
    let token = {
        let session = state
            .session
            .lock()
            .map_err(|e| AppError::SessionError(e.to_string()))?;

        session
            .as_ref()
            .ok_or_else(|| AppError::SessionError("Please login first".into()))?
            .token
            .clone()
    };

    let result = {
        let mut client = state
            .client
            .lock()
            .map_err(|e| AppError::McpError(e.to_string()))?;

        client
            .call_tool("get_current_user", json!({ "sessionToken": token }))
            .map_err(AppError::McpError)?
    };

    extract_tool_payload(result)
}

#[tauri::command]
pub fn logout(state: State<'_, McpState>) -> Result<(), AppError> {
    let mut session = state
        .session
        .lock()
        .map_err(|e| AppError::SessionError(e.to_string()))?;
    *session = None;
    Ok(())
}

#[tauri::command]
pub fn get_local_session(state: State<'_, McpState>) -> Result<Value, AppError> {
    let session = state
        .session
        .lock()
        .map_err(|e| AppError::SessionError(e.to_string()))?;

    let session = session
        .as_ref()
        .ok_or_else(|| AppError::SessionError("Please login first".into()))?;

    Ok(json!({
        "username": session.username,
        "role": session.role
    }))
}

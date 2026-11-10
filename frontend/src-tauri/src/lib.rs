
mod mcp;

use mcp::McpClient;
use serde_json::{json, Value};
use std::sync::Mutex;
use tauri::{Manager, State};

struct UserSession {
    token: String,
    username: String,
    role: String,
}

struct McpState {
    client: Mutex<McpClient>,
    session: Mutex<Option<UserSession>>,
}

fn extract_tool_data(result: Value) -> Result<Value, String> {
    if result.get("isError").and_then(Value::as_bool) == Some(true) {
        return Err("MCP tool returned an error".to_string());
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

#[tauri::command]
fn login(
    username: String,
    password: String,
    state: State<'_, McpState>,
) -> Result<Value, String> {
    let mut client = state.client.lock().map_err(|e| e.to_string())?;

    let result = client.call_tool(
        "login",
        json!({
            "username": username,
            "password": password
        }),
    )?;

    let data = extract_tool_data(result)?;

    if data.get("success").and_then(Value::as_bool) == Some(false) {
        let error_message = data
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("Invalid username or password");
        return Err(error_message.to_string());
    }

    let token = data
        .get("sessionToken")
        .and_then(Value::as_str)
        .ok_or("Login failed: session token was not returned")?
        .to_string();

    let username = data
        .get("username")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    let role = data
        .get("role")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    let mut session = state.session.lock().map_err(|e| e.to_string())?;

    *session = Some(UserSession {
        token,
        username,
        role,
    });

    Ok(json!({
        "success": true,
        "username": session.as_ref().unwrap().username,
        "role": session.as_ref().unwrap().role
    }))
}

// Get the current logged-in user's details.
#[tauri::command]
fn get_current_user(
    state: State<'_, McpState>,
) -> Result<Value, String> {
    let session = state.session.lock().map_err(|e| e.to_string())?;

    let session = session.as_ref().ok_or("Please login first")?;

    let mut client = state.client.lock().map_err(|e| e.to_string())?;

    let result = client.call_tool(
        "get_current_user",
        json!({
            "sessionToken": session.token
        }),
    )?;

    extract_tool_data(result)
}

// Call any authenticated MCP tool.
// Rust automatically adds the session token.
#[tauri::command]
fn call_authenticated_tool(
    name: String,
    mut arguments: Value,
    state: State<'_, McpState>,
) -> Result<Value, String> {
    let session = state.session.lock().map_err(|e| e.to_string())?;

    let session = session.as_ref().ok_or("Please login first")?;

    if !arguments.is_object() {
        return Err("Tool arguments must be a JSON object".to_string());
    }

    arguments["sessionToken"] = json!(session.token);

    let mut client = state.client.lock().map_err(|e| e.to_string())?;

    let result = client.call_tool(&name, arguments)?;

    extract_tool_data(result)
}

#[tauri::command]
fn call_mcp_tool(
    name: String,
    arguments: Value,
    state: State<'_, McpState>,
) -> Result<Value, String> {
    call_authenticated_tool(name, arguments, state)
}

// Clear the local desktop session.
#[tauri::command]
fn logout(state: State<'_, McpState>) -> Result<(), String> {
    let mut session = state.session.lock().map_err(|e| e.to_string())?;

    *session = None;

    Ok(())
}

// Discover available MCP tools.
#[tauri::command]
fn get_mcp_tools(
    state: State<'_, McpState>,
) -> Result<Value, String> {
    let mut client = state.client.lock().map_err(|e| e.to_string())?;

    client.list_tools()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let client = McpClient::start()
                .map_err(std::io::Error::other)?;

            app.manage(McpState {
                client: Mutex::new(client),
                session: Mutex::new(None),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login,
            get_current_user,
            call_authenticated_tool,
            call_mcp_tool,
            logout,
            get_mcp_tools
        ])
        .run(tauri::generate_context!())
        .expect("Error running SPIL Mini ERP");
}

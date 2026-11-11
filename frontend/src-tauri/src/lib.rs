pub mod commands;
pub mod config;
pub mod error;
pub mod intent;
pub mod mcp;
pub mod models;
pub mod state;

use commands::auth::{get_current_user, get_local_session, login, logout};
use commands::intent::{execute_confirmed_intent, process_intent};
use commands::tools::{call_authenticated_tool, get_mcp_tools};
use intent::intent_resolver::IntentResolver;
use intent::semantic_engine::SemanticEngine;
use mcp::client::McpClient;
use mcp::tool_router::fetch_tool_definitions;
use state::McpState;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let mut client = McpClient::start().map_err(std::io::Error::other)?;
            let initial_tools = fetch_tool_definitions(&mut client).unwrap_or_else(|_| Vec::new());

            let semantic_engine = match SemanticEngine::find_and_load() {
                Ok(engine) => Some(engine),
                Err(err) => {
                    eprintln!("Warning: ONNX semantic model could not be loaded: {err}. Falling back to regex engine.");
                    None
                }
            };

            app.manage(McpState {
                client: Mutex::new(client),
                session: Mutex::new(None),
                tools: Mutex::new(initial_tools),
                model: semantic_engine,
                resolver: IntentResolver::new(),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login,
            logout,
            get_current_user,
            get_local_session,
            get_mcp_tools,
            call_authenticated_tool,
            process_intent,
            execute_confirmed_intent
        ])
        .run(tauri::generate_context!())
        .expect("Error running SPIL Mini ERP");
}

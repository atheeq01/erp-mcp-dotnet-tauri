pub mod commands;
pub mod config;
pub mod error;
pub mod intent;
pub mod mcp;
pub mod models;
pub mod state;

use commands::agent::{AgentRuntimeState, agent_chat, approval_response, list_pending_approvals};
use commands::auth::{
    check_setup_status, get_current_user, get_local_session, login, logout, setup_initial_admin,
};
use commands::intent::{execute_confirmed_intent, process_intent};
use commands::llm_settings::{get_llm_settings, reset_llm_settings, save_llm_settings};
use commands::operations::{
    operations_create_ticket, operations_list_tickets, operations_overview, operations_service_detail,
};
use commands::tools::{call_authenticated_tool, get_mcp_tools};
use intent::intent_resolver::IntentResolver;
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

            app.manage(McpState {
                client: Mutex::new(client),
                session: Mutex::new(None),
                tools: Mutex::new(initial_tools),
                resolver: IntentResolver::new(),
            });
            app.manage(AgentRuntimeState::default());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login,
            logout,
            get_current_user,
            get_local_session,
            check_setup_status,
            setup_initial_admin,
            get_mcp_tools,
            call_authenticated_tool,
            process_intent,
            execute_confirmed_intent,
            agent_chat,
            approval_response,
            list_pending_approvals,
            operations_overview,
            operations_list_tickets,
            operations_service_detail,
            operations_create_ticket,
            get_llm_settings,
            save_llm_settings,
            reset_llm_settings
        ])
        .run(tauri::generate_context!())
        .expect("Error running SPIL Mini ERP");
}

use crate::commands::agent::{
    AgentRuntimeState, ChatHistoryItem, record_trace, run_agent_fallback,
};
use crate::error::AppError;
use crate::mcp::tool_router::execute_tool;
use crate::models::intent::IntentResult;
use crate::models::session::UserSession;
use crate::state::McpState;
use agent_client::generate_run_id;
use serde_json::Value;
use tauri::{AppHandle, State};

pub fn check_ai_agent_permission(session: Option<&UserSession>) -> Result<(), String> {
    match session {
        Some(user_session) if user_session.role.eq_ignore_ascii_case("Admin") => Ok(()),
        Some(user_session) => Err(format!(
            "Access Denied: The AI Ops & Triage Agent is restricted to Admin operators only. Your current role is '{}'.",
            user_session.role
        )),
        None => Err(
            "Authentication required: Please log in as an Admin operator to use the AI Ops & Triage Agent."
                .to_string(),
        ),
    }
}

pub fn check_tool_permission(role: &str, tool_name: &str) -> Result<(), String> {
    match tool_name {
        "get_orders" | "create_order" => {
            if role == "Admin" || role == "Sales" {
                Ok(())
            } else {
                Err(format!(
                    "Access Denied: Your security role ({role}) does not have permission to access orders. Only Admin and Sales users can view or create customer orders."
                ))
            }
        }
        "create_inventory" | "update_inventory" | "deactivate_inventory" => {
            if role == "Admin" || role == "Store" {
                Ok(())
            } else {
                Err(format!(
                    "Access Denied: Your security role ({role}) does not have permission to modify inventory. Only Admin and Store users can manage catalog products."
                ))
            }
        }
        "get_users" | "create_user" => {
            if role == "Admin" {
                Ok(())
            } else {
                Err(format!(
                    "Access Denied: System user account management is restricted to Admin operators. Your current role is '{role}'."
                ))
            }
        }
        "get_inventory" | "get_current_user" => Ok(()),
        _ => Err(format!("Access Denied: Tool '{tool_name}' is not available to role '{role}'.")),
    }
}

#[tauri::command]
pub async fn process_intent(
    prompt: String,
    history: Option<Vec<ChatHistoryItem>>,
    client_request_id: Option<String>,
    app: AppHandle,
    state: State<'_, McpState>,
    agent_state: State<'_, AgentRuntimeState>,
) -> Result<IntentResult, AppError> {
    let clean_prompt = prompt.trim();
    if clean_prompt.is_empty() {
        return Ok(IntentResult::Ambiguous {
            candidates: Vec::new(),
        });
    }

    let run_id = generate_run_id();
    let tools_list = {
        let tools_guard = state
            .tools
            .lock()
            .map_err(|e| AppError::ExecutionError(e.to_string()))?;
        tools_guard.clone()
    };

    let session = {
        let guard = state
            .session
            .lock()
            .map_err(|e| AppError::SessionError(e.to_string()))?;
        guard.clone()
    };

    let resolution = state.resolver.resolve(clean_prompt, &tools_list)?;

    // Router fallback: if regex engine returned Ambiguous with no confident ERP match, invoke AI agent (Admin only)
    if matches!(resolution, IntentResult::Ambiguous { .. })
        && state
            .resolver
            .should_fallback_to_ai(clean_prompt, &tools_list)
    {
        if let Err(reason) = check_ai_agent_permission(session.as_ref()) {
            record_trace(clean_prompt, "router", "rejected_ai_rbac", &run_id);
            return Ok(IntentResult::Rejected { reason });
        }

        record_trace(clean_prompt, "router", "ai_fallback", &run_id);
        let hist = history.unwrap_or_default();
        let reply =
            run_agent_fallback(clean_prompt, &hist, client_request_id.as_deref(), &app, agent_state.inner(), &run_id).await?;
        return Ok(IntentResult::AgentResponse {
            answer: reply.answer,
            steps: reply.steps,
            tools_called: reply.tools_called,
            hit_step_limit: reply.hit_step_limit,
            blocked_count: reply.blocked_count,
            tainted: reply.tainted,
            agent: reply.agent,
        });
    }

    // Pre-execution RBAC verification: do not ask for params or confirm actions the user cannot execute
    let target_tool = match &resolution {
        IntentResult::Executed { tool, .. } => Some(tool.as_str()),
        IntentResult::NeedsParams { tool, .. } => Some(tool.as_str()),
        IntentResult::NeedsConfirmation { tool, .. } => Some(tool.as_str()),
        _ => None,
    };

    if let Some(tool) = target_tool {
        match session.as_ref() {
            Some(user_session) => {
                if let Err(reason) = check_tool_permission(&user_session.role, tool) {
                    record_trace(clean_prompt, "fastpath", "rejected_rbac", &run_id);
                    return Ok(IntentResult::Rejected { reason });
                }
            }
            None => {
                record_trace(
                    clean_prompt,
                    "fastpath",
                    "rejected_unauthenticated",
                    &run_id,
                );
                return Ok(IntentResult::Rejected {
                    reason: "Authentication required: Please log in to perform ERP actions.".into(),
                });
            }
        }
    }

    match resolution {
        IntentResult::Executed {
            tool,
            intent,
            scores,
            params,
            ..
        } => {
            record_trace(clean_prompt, "fastpath", &tool, &run_id);
            let tool_def = tools_list
                .iter()
                .find(|t| t.name == tool)
                .cloned()
                .ok_or_else(|| AppError::ExecutionError(format!("Tool '{tool}' not found")))?;

            let mut client = state
                .client
                .lock()
                .map_err(|e| AppError::McpError(e.to_string()))?;

            let data = execute_tool(&mut client, session.as_ref(), &tool_def, params.clone())?;

            // If backend returned verification failure, error, or access rejection
            if data.get("success").and_then(Value::as_bool) == Some(false)
                || data.get("isError").and_then(Value::as_bool) == Some(true)
                || data.get("error").is_some()
            {
                let msg = data
                    .get("message")
                    .and_then(Value::as_str)
                    .or_else(|| data.get("error").and_then(Value::as_str))
                    .unwrap_or("Operation failed verification check.");
                record_trace(
                    clean_prompt,
                    "fastpath",
                    &format!("rejected:{msg}"),
                    &run_id,
                );
                return Ok(IntentResult::Rejected {
                    reason: msg.to_string(),
                });
            }

            Ok(IntentResult::Executed {
                tool,
                intent,
                scores,
                params,
                data,
            })
        }
        other => {
            record_trace(clean_prompt, "fastpath", "resolved_fastpath", &run_id);
            Ok(other)
        }
    }
}

#[tauri::command]
pub fn execute_confirmed_intent(
    tool: String,
    params: Value,
    state: State<'_, McpState>,
) -> Result<Value, AppError> {
    let tool_def = {
        let tools_guard = state
            .tools
            .lock()
            .map_err(|e| AppError::ExecutionError(e.to_string()))?;
        tools_guard
            .iter()
            .find(|t| t.name == tool)
            .cloned()
            .ok_or_else(|| AppError::ValidationError(format!("Tool '{tool}' not found.")))?
    };

    let session = {
        let guard = state
            .session
            .lock()
            .map_err(|e| AppError::SessionError(e.to_string()))?;
        guard.clone()
    };

    if let Some(user_session) = session.as_ref() {
        if let Err(reason) = check_tool_permission(&user_session.role, &tool) {
            return Err(AppError::ValidationError(reason));
        }
    } else {
        return Err(AppError::SessionError(
            "Please log in to execute tools.".into(),
        ));
    }

    let mut client = state
        .client
        .lock()
        .map_err(|e| AppError::McpError(e.to_string()))?;

    let data = execute_tool(&mut client, session.as_ref(), &tool_def, params)?;

    if data.get("success").and_then(Value::as_bool) == Some(false) {
        let msg = data
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("Action execution failed.");
        return Err(AppError::ExecutionError(msg.to_string()));
    }

    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn session_with_role(role: &str) -> UserSession {
        UserSession {
            token: "tok".to_string(),
            username: "u".to_string(),
            role: role.to_string(),
        }
    }

    #[test]
    fn test_ai_agent_restricted_to_admin_only() {
        assert!(check_ai_agent_permission(None).is_err());
        assert!(check_ai_agent_permission(Some(&session_with_role("Sales"))).is_err());
        assert!(check_ai_agent_permission(Some(&session_with_role("Store"))).is_err());
        assert!(check_ai_agent_permission(Some(&session_with_role("Admin"))).is_ok());
    }

    #[test]
    fn test_unknown_tools_are_denied_by_default() {
        assert!(check_tool_permission("Admin", "future_write_tool").is_err());
        assert!(check_tool_permission("Store", "setup_initial_admin").is_err());
        assert!(check_tool_permission("Admin", "get_inventory").is_ok());
    }
}

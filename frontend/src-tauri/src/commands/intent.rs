use crate::error::AppError;
use crate::mcp::tool_router::execute_tool;
use crate::models::intent::IntentResult;
use crate::state::McpState;
use serde_json::Value;
use tauri::State;

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
        _ => Ok(()),
    }
}

#[tauri::command]
pub fn process_intent(
    prompt: String,
    state: State<'_, McpState>,
) -> Result<IntentResult, AppError> {
    let clean_prompt = prompt.trim();
    if clean_prompt.is_empty() {
        return Ok(IntentResult::Ambiguous {
            candidates: Vec::new(),
        });
    }

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

    let resolution = state
        .resolver
        .resolve(clean_prompt, &tools_list, state.model.as_ref())?;

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
                    return Ok(IntentResult::Rejected { reason });
                }
            }
            None => {
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

            // If backend returned verification failure or access rejection
            if data.get("success").and_then(Value::as_bool) == Some(false) {
                let msg = data
                    .get("message")
                    .and_then(Value::as_str)
                    .unwrap_or("Operation failed verification check.");
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
        other => Ok(other),
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
        return Err(AppError::SessionError("Please log in to execute tools.".into()));
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

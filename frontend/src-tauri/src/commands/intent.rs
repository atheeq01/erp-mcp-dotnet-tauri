use crate::error::AppError;
use crate::mcp::tool_router::execute_tool;
use crate::models::intent::IntentResult;
use crate::state::McpState;
use serde_json::Value;
use tauri::State;

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

    let resolution = state
        .resolver
        .resolve(clean_prompt, &tools_list, state.model.as_ref())?;

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

            let data = execute_tool(&mut client, session.as_ref(), &tool_def, params.clone())?;

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

    let mut client = state
        .client
        .lock()
        .map_err(|e| AppError::McpError(e.to_string()))?;

    execute_tool(&mut client, session.as_ref(), &tool_def, params)
}

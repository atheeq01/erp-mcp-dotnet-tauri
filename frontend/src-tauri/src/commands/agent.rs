use crate::commands::intent::check_ai_agent_permission;
use crate::commands::llm_settings::{
    StoredLlmSettings, apply_llm_overrides, load_persisted_settings,
};
use crate::error::AppError;
use crate::state::McpState;
use agent_client::{
    Agent, AgentConfig, Approver, ChatMessage, HttpLlmClient, McpHub, Tracer, generate_run_id,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::HashMap;
use std::sync::{Arc, Mutex, mpsc};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResponse {
    pub answer: String,
    pub steps: usize,
    pub tools_called: Vec<String>,
    pub hit_step_limit: bool,
    pub blocked_count: usize,
    pub tainted: bool,
    pub agent: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChatHistoryItem {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ApprovalRequestPayload {
    request_id: String,
    client_request_id: Option<String>,
    tool: String,
    arguments: Value,
    tainted: bool,
}

pub struct AgentRuntimeState {
    pub hub: Arc<tokio::sync::Mutex<Option<Arc<McpHub>>>>,
    pub pending_approvals: Arc<Mutex<HashMap<String, PendingApproval>>>,
    pub llm_settings: Arc<Mutex<Option<StoredLlmSettings>>>,
}

pub struct PendingApproval {
    pub payload: ApprovalRequestPayload,
    pub sender: mpsc::Sender<bool>,
}

impl Default for AgentRuntimeState {
    fn default() -> Self {
        Self {
            hub: Arc::new(tokio::sync::Mutex::new(None)),
            pending_approvals: Arc::new(Mutex::new(HashMap::new())),
            llm_settings: Arc::new(Mutex::new(None)),
        }
    }
}

struct TauriApprover {
    app: AppHandle,
    client_request_id: Option<String>,
    pending_approvals: Arc<Mutex<HashMap<String, PendingApproval>>>,
}

impl Approver for TauriApprover {
    fn approve(&self, tool: &str, payload_json: &str, tainted: bool) -> bool {
        let request_id = format!("req_{}", generate_run_id());
        let arguments: Value = serde_json::from_str(payload_json)
            .unwrap_or_else(|_| Value::String(payload_json.to_string()));

        let (tx, rx) = mpsc::channel::<bool>();
        let payload = ApprovalRequestPayload {
            request_id: request_id.clone(),
            client_request_id: self.client_request_id.clone(),
            tool: tool.to_string(),
            arguments,
            tainted,
        };

        {
            let Ok(mut map) = self.pending_approvals.lock() else {
                return false;
            };
            map.insert(
                request_id.clone(),
                PendingApproval {
                    payload: payload.clone(),
                    sender: tx,
                },
            );
        }

        if self.app.emit("approval_request", payload).is_err() {
            if let Ok(mut map) = self.pending_approvals.lock() {
                map.remove(&request_id);
            }
            return false;
        }

        let approved = tokio::task::block_in_place(|| {
            rx.recv_timeout(Duration::from_secs(120)).unwrap_or(false)
        });

        if let Ok(mut map) = self.pending_approvals.lock() {
            map.remove(&request_id);
        }
        approved
    }
}

pub(crate) async fn run_agent_fallback(
    message: &str,
    history: &[ChatHistoryItem],
    client_request_id: Option<&str>,
    app: &AppHandle,
    agent_state: &AgentRuntimeState,
    run_id: &str,
) -> Result<AgentResponse, AppError> {
    let mut config = AgentConfig::load().map_err(|e| AppError::ExecutionError(e.to_string()))?;

    let active_settings = {
        let mut guard = agent_state
            .llm_settings
            .lock()
            .map_err(|e| AppError::ExecutionError(e.to_string()))?;
        if guard.is_none() {
            *guard = Some(load_persisted_settings(app));
        }
        guard.as_ref().expect("initialized above").clone()
    };
    apply_llm_overrides(&mut config, &active_settings);

    if config.llm_api_key.is_empty() || config.llm_api_key == "your_api_key_here" {
        return Err(AppError::ExecutionError(
            "LLM API key is not configured. Add a key in LLM Settings or set LLM_API_KEY in .env."
                .to_string(),
        ));
    }

    let mut hub_guard = agent_state.hub.lock().await;
    if hub_guard.is_none() {
        let hub = McpHub::start(&config)
            .await
            .map_err(|e| AppError::McpError(e.to_string()))?;
        *hub_guard = Some(Arc::new(hub));
    }

    let hub = hub_guard
        .as_ref()
        .ok_or_else(|| AppError::McpError("MCP Hub not initialized".to_string()))?;
    let hub = Arc::clone(hub);
    drop(hub_guard);

    let llm = HttpLlmClient::new(&config);
    let approver = TauriApprover {
        app: app.clone(),
        client_request_id: client_request_id.map(str::to_string),
        pending_approvals: Arc::clone(&agent_state.pending_approvals),
    };
    let tracer = Tracer::with_agent_kind(run_id, &config.trace_file_path, "ai");

    let chat_history: Vec<ChatMessage> = history
        .iter()
        .filter_map(|item| {
            let content = item.content.trim();
            if content.is_empty() {
                return None;
            }
            match item.role.as_str() {
                "user" => Some(ChatMessage::user(content)),
                "assistant" => Some(ChatMessage::assistant(content)),
                _ => None,
            }
        })
        .collect();

    let mut agent = Agent::new(&config, &hub, &llm, &approver, tracer);
    let result = agent
        .run_with_history(&chat_history, message)
        .await
        .map_err(|e| AppError::ExecutionError(e.to_string()))?;

    Ok(AgentResponse {
        answer: result.answer,
        steps: result.steps,
        tools_called: result.tools_called,
        hit_step_limit: result.hit_step_limit,
        blocked_count: result.blocked_count,
        tainted: result.tainted,
        agent: "ai".to_string(),
    })
}

pub(crate) fn record_trace(prompt: &str, agent_kind: &str, outcome: &str, run_id: &str) {
    if let Ok(config) = AgentConfig::load() {
        let tracer = Tracer::with_agent_kind(run_id, &config.trace_file_path, agent_kind);
        let _ = tracer.trace_route(prompt, outcome);
    }
}

#[tauri::command]
pub async fn agent_chat(
    message: String,
    history: Option<Vec<ChatHistoryItem>>,
    client_request_id: Option<String>,
    app: AppHandle,
    state: State<'_, McpState>,
    agent_state: State<'_, AgentRuntimeState>,
) -> Result<AgentResponse, AppError> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err(AppError::ValidationError(
            "Message cannot be empty.".to_string(),
        ));
    }

    let session = {
        let guard = state
            .session
            .lock()
            .map_err(|e| AppError::SessionError(e.to_string()))?;
        guard.clone()
    };

    if let Err(reason) = check_ai_agent_permission(session.as_ref()) {
        return Err(AppError::ValidationError(reason));
    }

    let run_id = generate_run_id();
    let hist = history.unwrap_or_default();
    run_agent_fallback(trimmed, &hist, client_request_id.as_deref(), &app, agent_state.inner(), &run_id).await
}

#[tauri::command]
pub fn approval_response(
    approved: bool,
    request_id: String,
    state: State<'_, McpState>,
    agent_state: State<'_, AgentRuntimeState>,
) -> Result<Value, AppError> {
    let session = state
        .session
        .lock()
        .map_err(|e| AppError::SessionError(e.to_string()))?;
    check_ai_agent_permission(session.as_ref()).map_err(AppError::ValidationError)?;
    drop(session);
    let mut map = agent_state
        .pending_approvals
        .lock()
        .map_err(|e| AppError::ExecutionError(e.to_string()))?;

    if let Some(pending) = map.remove(&request_id) {
        let _ = pending.sender.send(approved);
        return Ok(json!({ "delivered": true, "request_id": request_id, "approved": approved }));
    }

    Ok(json!({ "delivered": false }))
}

#[tauri::command]
pub fn list_pending_approvals(
    state: State<'_, McpState>,
    agent_state: State<'_, AgentRuntimeState>,
) -> Result<Vec<Value>, AppError> {
    let session = state
        .session
        .lock()
        .map_err(|e| AppError::SessionError(e.to_string()))?;
    check_ai_agent_permission(session.as_ref()).map_err(AppError::ValidationError)?;
    drop(session);
    let map = agent_state
        .pending_approvals
        .lock()
        .map_err(|e| AppError::ExecutionError(e.to_string()))?;
    Ok(map
        .values()
        .map(|pending| serde_json::to_value(&pending.payload).unwrap_or(Value::Null))
        .collect())
}

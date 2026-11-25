use crate::commands::agent::AgentRuntimeState;
use crate::commands::intent::check_ai_agent_permission;
use crate::error::AppError;
use crate::state::McpState;
use agent_client::{AgentConfig, McpHub};
use serde::Deserialize;
use serde_json::{Value, json};
use std::sync::Arc;
use tauri::State;

const SERVICES: [&str; 3] = ["auth-service", "order-service", "inventory-service"];
const SEVERITIES: [&str; 4] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const ASSIGNEES: [&str; 4] = [
    "oncall-auth",
    "oncall-orders",
    "oncall-inventory",
    "sre-lead",
];

fn require_admin(state: &State<'_, McpState>) -> Result<(), AppError> {
    let session = state
        .session
        .lock()
        .map_err(|e| AppError::SessionError(e.to_string()))?;
    check_ai_agent_permission(session.as_ref()).map_err(AppError::ValidationError)
}

async fn ensure_hub(hub: &mut Option<Arc<McpHub>>) -> Result<Arc<McpHub>, AppError> {
    if hub.is_none() {
        let config = AgentConfig::load().map_err(|e| AppError::ExecutionError(e.to_string()))?;
        *hub = Some(Arc::new(
            McpHub::start(&config)
                .await
                .map_err(|e| AppError::McpError(e.to_string()))?,
        ));
    }
    hub.as_ref()
        .cloned()
        .ok_or_else(|| AppError::McpError("Telemetry MCP is unavailable".into()))
}

async fn call_json(hub: &McpHub, tool: &str, args: Value) -> Result<Value, AppError> {
    let result = hub
        .execute_tool(tool, args)
        .await
        .map_err(|e| AppError::McpError(e.to_string()))?;
    if result.is_error {
        return Err(AppError::McpError(format!(
            "{tool} failed: {}",
            result.output
        )));
    }
    let value: Value = serde_json::from_str(&result.output)
        .map_err(|e| AppError::McpError(format!("Invalid response from {tool}: {e}")))?;
    if value.get("error_code").is_some() {
        return Err(AppError::McpError(
            value
                .get("message")
                .and_then(Value::as_str)
                .unwrap_or("Telemetry request failed")
                .to_string(),
        ));
    }
    Ok(value)
}

async fn read_resource(hub: &McpHub, uri: &str) -> Result<String, AppError> {
    let result = hub
        .execute_tool("read_resource", json!({ "uri": uri }))
        .await
        .map_err(|e| AppError::McpError(e.to_string()))?;
    if result.is_error {
        return Err(AppError::McpError(result.output));
    }
    Ok(result.output)
}

#[tauri::command]
pub async fn operations_overview(
    state: State<'_, McpState>,
    agent_state: State<'_, AgentRuntimeState>,
) -> Result<Value, AppError> {
    require_admin(&state)?;
    let mut guard = agent_state.hub.lock().await;
    let hub = ensure_hub(&mut guard).await?;
    drop(guard);
    let services = call_json(&hub, "list_services", json!({})).await?;
    let checklist = read_resource(&hub, "config://release-checklist").await?;
    Ok(json!({ "services": services, "checklist": checklist }))
}

#[tauri::command]
pub async fn operations_list_tickets(
    state: State<'_, McpState>,
    agent_state: State<'_, AgentRuntimeState>,
) -> Result<Value, AppError> {
    require_admin(&state)?;
    let mut guard = agent_state.hub.lock().await;
    let hub = ensure_hub(&mut guard).await?;
    drop(guard);
    call_json(&hub, "list_incident_tickets", json!({})).await
}

#[tauri::command]
pub async fn operations_service_detail(
    service_name: String,
    severity: Option<String>,
    state: State<'_, McpState>,
    agent_state: State<'_, AgentRuntimeState>,
) -> Result<Value, AppError> {
    require_admin(&state)?;
    if !SERVICES.contains(&service_name.as_str()) {
        return Err(AppError::ValidationError("Unknown service".into()));
    }
    let severity = severity.unwrap_or_else(|| "ALL".into()).to_uppercase();
    if !["ALL", "INFO", "WARN", "ERROR", "FATAL"].contains(&severity.as_str()) {
        return Err(AppError::ValidationError("Invalid log severity".into()));
    }
    let mut guard = agent_state.hub.lock().await;
    let hub = ensure_hub(&mut guard).await?;
    drop(guard);
    let health = call_json(
        &hub,
        "get_service_health",
        json!({ "service_name": service_name }),
    )
    .await?;
    let deployments = call_json(
        &hub,
        "get_deployment_history",
        json!({ "service_name": service_name, "window_hours": 48 }),
    )
    .await?;
    let logs = call_json(
        &hub,
        "search_logs",
        json!({ "service_name": service_name, "severity": severity, "limit": 30 }),
    )
    .await?;
    let runbook = read_resource(&hub, &format!("service://runbooks/{service_name}")).await?;
    Ok(json!({ "health": health, "deployments": deployments, "logs": logs, "runbook": runbook }))
}

#[derive(Deserialize)]
pub struct NewIncident {
    service_name: String,
    title: String,
    severity: String,
    summary: String,
    assignee: String,
    confirmed: bool,
}

#[tauri::command]
pub async fn operations_create_ticket(
    incident: NewIncident,
    state: State<'_, McpState>,
    agent_state: State<'_, AgentRuntimeState>,
) -> Result<Value, AppError> {
    require_admin(&state)?;
    if !incident.confirmed {
        return Err(AppError::ValidationError(
            "Review and confirm the ticket before creation".into(),
        ));
    }
    let title = incident.title.trim();
    let summary = incident.summary.trim();
    if !SERVICES.contains(&incident.service_name.as_str())
        || !SEVERITIES.contains(&incident.severity.as_str())
        || !ASSIGNEES.contains(&incident.assignee.as_str())
        || title.is_empty()
        || title.len() > 160
        || summary.len() < 20
        || summary.len() > 4000
    {
        return Err(AppError::ValidationError(
            "Check the service, severity, assignee, title, and summary".into(),
        ));
    }
    let mut guard = agent_state.hub.lock().await;
    let hub = ensure_hub(&mut guard).await?;
    drop(guard);
    let result = call_json(
        &hub,
        "create_incident_ticket",
        json!({
            "service_name": incident.service_name,
            "title": title,
            "severity": incident.severity,
            "summary": summary,
            "assignee": incident.assignee,
        }),
    )
    .await?;
    if result.get("success").and_then(Value::as_bool) != Some(true) {
        return Err(AppError::McpError(
            "Ticket creation was not confirmed by telemetry MCP".into(),
        ));
    }
    Ok(result)
}

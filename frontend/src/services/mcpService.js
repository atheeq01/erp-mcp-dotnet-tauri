import { invoke } from "@tauri-apps/api/core";

export async function getMcpTools() {
    return await invoke("get_mcp_tools");
}

export async function loginUser(username, password) {
    return await invoke("login", { username, password });
}

export async function getCurrentUser() {
    return await invoke("get_current_user");
}

export async function getLocalSession() {
    return await invoke("get_local_session");
}

export async function callMcpTool(name, argumentsData = {}) {
    return await invoke("call_authenticated_tool", {
        name,
        arguments: argumentsData,
    });
}

export async function processIntent(prompt, history = [], clientRequestId = null) {
    return await invoke("process_intent", { prompt, history, clientRequestId });
}

export async function agentChat(message, history = [], clientRequestId = null) {
    return await invoke("agent_chat", { message, history, clientRequestId });
}

export async function sendApprovalResponse(approved, requestId) {
    return await invoke("approval_response", { approved, requestId });
}

export async function listPendingApprovals() {
    return await invoke("list_pending_approvals");
}

export async function getOperationsOverview() {
    return await invoke("operations_overview");
}

export async function listOperationsTickets() {
    return await invoke("operations_list_tickets");
}

export async function getOperationsServiceDetail(serviceName, severity = "ALL") {
    return await invoke("operations_service_detail", { serviceName, severity });
}

export async function createOperationsTicket(incident) {
    return await invoke("operations_create_ticket", { incident });
}

export async function getLlmSettings() {
    return await invoke("get_llm_settings");
}

export async function saveLlmSettings(input) {
    return await invoke("save_llm_settings", { input });
}

export async function resetLlmSettings() {
    return await invoke("reset_llm_settings");
}

export async function executeConfirmedIntent(tool, params) {
    return await invoke("execute_confirmed_intent", { tool, params });
}

export async function checkSetupStatus() {
    return await invoke("check_setup_status");
}

export async function setupInitialAdmin(username, password) {
    return await invoke("setup_initial_admin", { username, password });
}

export async function logoutUser() {
    return await invoke("logout");
}

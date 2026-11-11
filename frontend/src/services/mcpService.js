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

export async function callMcpTool(name, argumentsData = {}) {
    return await invoke("call_authenticated_tool", {
        name,
        arguments: argumentsData,
    });
}

export async function processIntent(prompt) {
    return await invoke("process_intent", { prompt });
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


import { invoke } from "@tauri-apps/api/core";

export async function loginUser(username, password) {
    return await invoke("login", { username, password });
}

export async function logoutUser() {
    return await invoke("logout");
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

export async function callAuthenticatedTool(name, argumentsData = {}) {
    return await invoke("call_authenticated_tool", {
        name,
        arguments: argumentsData,
    });
}

export async function getMcpTools() {
    return await invoke("get_mcp_tools");
}


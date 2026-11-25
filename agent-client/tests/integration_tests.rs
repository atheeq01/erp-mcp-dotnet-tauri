use agent_client::{AgentConfig, McpHub, ToolPolicy};
use serde_json::json;

#[test]
fn test_agent_config_and_repo_root() {
    let config = AgentConfig::load().expect("Failed to load AgentConfig");
    assert!(config.mock_data_dir.exists(), "data dir must exist");
    assert!(config.workspace_dir.exists(), "workspace dir must exist");
    assert!(
        config.telemetry_server_path.exists(),
        "telemetry server binary must exist"
    );
}

#[tokio::test]
async fn test_mcp_hub_discovery_and_tools() {
    let config = AgentConfig::load().expect("Failed to load AgentConfig");
    let mut hub = McpHub::start(&config)
        .await
        .expect("Failed to start McpHub");

    let tools = hub.get_all_tools();
    assert!(
        tools.len() >= 10,
        "Expected at least 10 tools from both servers, got {}",
        tools.len()
    );

    let search_tool = tools.iter().find(|t| t.name == "search_logs");
    assert!(search_tool.is_some(), "search_logs must be discovered");
    assert!(
        ToolPolicy::is_read_only(search_tool.unwrap()),
        "search_logs must be read-only"
    );

    let ticket_tool = tools.iter().find(|t| t.name == "create_incident_ticket");
    assert!(
        ticket_tool.is_some(),
        "create_incident_ticket must be discovered"
    );
    assert!(
        !ToolPolicy::is_read_only(ticket_tool.unwrap()),
        "create_incident_ticket must be mutating"
    );

    let fs_tool = tools
        .iter()
        .find(|t| t.name == "read_text_file" || t.name == "read_file");
    assert!(
        fs_tool.is_some(),
        "read_text_file or read_file must be discovered from filesystem server"
    );

    let res_tool = tools.iter().find(|t| t.name == "read_resource");
    assert!(res_tool.is_some(), "read_resource tool must be synthesized");
    assert!(
        ToolPolicy::is_read_only(res_tool.unwrap()),
        "read_resource must be read-only"
    );
    assert!(
        res_tool
            .unwrap()
            .description
            .as_deref()
            .unwrap_or("")
            .contains("config://release-checklist"),
        "read_resource description must list discovered resources"
    );

    // Mutating filesystem tools remain in internal registry if discovered, but are excluded from LLM tool catalog
    let llm_tool_names: Vec<&str> = hub
        .openai_tools()
        .iter()
        .filter_map(|v| v["function"]["name"].as_str())
        .collect();
    for hidden in ["write_file", "edit_file", "create_directory", "move_file"] {
        assert!(
            !llm_tool_names.contains(&hidden),
            "Mutating filesystem tool '{hidden}' must be hidden from LLM catalog"
        );
    }

    hub.close().await;
}

#[tokio::test]
async fn test_mcp_hub_tool_execution() {
    let config = AgentConfig::load().expect("Failed to load AgentConfig");
    let mut hub = McpHub::start(&config)
        .await
        .expect("Failed to start McpHub");

    let services = hub
        .execute_tool("list_services", json!({}))
        .await
        .expect("list_services failed");
    let services_json: serde_json::Value =
        serde_json::from_str(&services.output).expect("invalid services JSON");
    assert_eq!(services_json["services"].as_array().map(Vec::len), Some(3));

    let health = hub
        .execute_tool(
            "get_service_health",
            json!({ "service_name": "order-service" }),
        )
        .await
        .expect("get_service_health failed");
    let health_json: serde_json::Value =
        serde_json::from_str(&health.output).expect("invalid health JSON");
    assert_eq!(health_json["status"], "CRITICAL");

    let tickets = hub
        .execute_tool("list_incident_tickets", json!({}))
        .await
        .expect("list_incident_tickets failed");
    let tickets_json: serde_json::Value =
        serde_json::from_str(&tickets.output).expect("invalid tickets JSON");
    assert!(tickets_json["tickets"].is_array());

    let runbook = hub
        .execute_tool(
            "read_resource",
            json!({ "uri": "service://runbooks/order-service" }),
        )
        .await
        .expect("runbook read failed");
    assert!(runbook.output.contains("order-service"));

    let log_result = hub
        .execute_tool(
            "search_logs",
            json!({
                "service_name": "order-service",
                "severity": "ERROR",
                "limit": 5
            }),
        )
        .await
        .expect("search_logs failed");
    assert_eq!(log_result.server, "ops-telemetry");
    assert!(!log_result.is_error);
    assert!(log_result.output.contains("order-service"));

    let deploy_result = hub
        .execute_tool(
            "get_deployment_history",
            json!({
                "service_name": "order-service",
                "limit": 3
            }),
        )
        .await
        .expect("get_deployment_history failed");
    assert_eq!(deploy_result.server, "ops-telemetry");
    assert!(!deploy_result.is_error);
    assert!(deploy_result.output.contains("dep-orders-201"));

    let res_result = hub
        .execute_tool(
            "read_resource",
            json!({
                "uri": "config://release-checklist"
            }),
        )
        .await
        .expect("read_resource failed");
    assert_eq!(res_result.server, "ops-telemetry");
    assert!(!res_result.is_error);
    assert!(res_result
        .output
        .contains("Pre-Release Verification Checklist"));

    hub.close().await;
}

#[tokio::test]
async fn test_create_then_list_ticket_in_isolated_data_dir() {
    let mut config = AgentConfig::load().expect("Failed to load AgentConfig");
    let test_dir = std::env::temp_dir().join(format!("spil-ticket-test-{}", agent_client::generate_run_id()));
    std::fs::create_dir_all(test_dir.join("workspace")).expect("create test workspace");
    std::fs::write(test_dir.join("tickets.json"), "[]").expect("seed empty tickets");
    config.mock_data_dir = test_dir.clone();
    config.workspace_dir = test_dir.join("workspace");

    let mut hub = McpHub::start(&config).await.expect("start isolated MCP hub");
    let created = hub.execute_tool("create_incident_ticket", json!({
        "service_name": "order-service",
        "title": "Manual ticket flow test",
        "severity": "HIGH",
        "summary": "Checkout failures after a deployment, verified by the operator.",
        "assignee": "oncall-orders"
    })).await.expect("create incident ticket");
    assert!(!created.is_error, "{}", created.output);
    let created_json: serde_json::Value = serde_json::from_str(&created.output).expect("valid create response");
    assert_eq!(created_json["success"], true);
    let ticket_id = created_json["ticket_id"].as_str().expect("ticket ID");

    let listed = hub.execute_tool("list_incident_tickets", json!({})).await.expect("list incident tickets");
    assert!(!listed.is_error, "{}", listed.output);
    let listed_json: serde_json::Value = serde_json::from_str(&listed.output).expect("valid list response");
    assert!(listed_json["tickets"].as_array().expect("tickets array").iter().any(|ticket| ticket["ticket_id"] == ticket_id));

    hub.close().await;
    std::fs::remove_dir_all(test_dir).expect("remove isolated test data");
}

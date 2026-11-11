use crate::intent::preprocessing::PreprocessedQuery;
use crate::intent::regex_patterns::RegexPatterns;
use crate::models::intent::{IntentAction, IntentEntity};
use crate::models::tool::ToolDefinition;

pub fn classify_tool(tool_name: &str) -> (IntentAction, IntentEntity) {
    let action = if tool_name.starts_with("create_") {
        IntentAction::Create
    } else if tool_name.starts_with("update_") {
        IntentAction::Update
    } else if tool_name.starts_with("deactivate_") {
        IntentAction::Deactivate
    } else if tool_name.starts_with("get_") || tool_name.starts_with("list_") {
        IntentAction::Query
    } else {
        IntentAction::Unknown
    };

    let entity = if tool_name.contains("order") {
        IntentEntity::Order
    } else if tool_name.contains("inventory") || tool_name.contains("product") {
        IntentEntity::Inventory
    } else if tool_name.contains("user") || tool_name.contains("employee") {
        IntentEntity::User
    } else {
        IntentEntity::Unknown
    };

    (action, entity)
}

pub fn evaluate_regex_score(
    query: &PreprocessedQuery,
    tool: &ToolDefinition,
    patterns: &RegexPatterns,
) -> (f64, IntentAction, IntentEntity) {
    let (tool_action, tool_entity) = classify_tool(&tool.name);
    let tool_name_spaced = tool.name.replace('_', " ");

    if query.raw.trim().eq_ignore_ascii_case(&tool.name)
        || query.normalized == tool.name
        || query.normalized == tool_name_spaced
    {
        return (1.0, tool_action, tool_entity);
    }

    if query.has_negation && tool.is_mutation() {
        return (0.0, tool_action, tool_entity);
    }

    let detected_action = patterns.match_action(&query.normalized);
    let detected_entity = patterns.match_entity(&query.normalized);

    let mut score = 0.0f64;

    let action_match = detected_action != IntentAction::Unknown && detected_action == tool_action;
    let entity_match = detected_entity != IntentEntity::Unknown && detected_entity == tool_entity;

    if action_match && entity_match {
        score = 1.0;
    } else if entity_match && detected_action == IntentAction::Unknown {
        if tool_action == IntentAction::Query {
            score = 0.75;
        } else {
            score = 0.35;
        }
    } else if action_match && detected_entity == IntentEntity::Unknown {
        score = 0.35;
    } else if entity_match && !action_match {
        score = 0.0;
    }

    if query.normalized.contains("low stock") && tool.name == "get_inventory" {
        score = 1.0;
    }

    let final_action = if detected_action != IntentAction::Unknown {
        detected_action
    } else {
        tool_action
    };

    let final_entity = if detected_entity != IntentEntity::Unknown {
        detected_entity
    } else {
        tool_entity
    };

    (score, final_action, final_entity)
}

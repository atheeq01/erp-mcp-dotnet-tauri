use crate::config::{
    AMBIGUITY_DELTA_THRESHOLD, HIGH_CONFIDENCE_THRESHOLD, MINIMUM_MATCH_THRESHOLD, REGEX_WEIGHT,
    REQUIRE_MUTATION_CONFIRMATION, SEMANTIC_WEIGHT,
};
use crate::error::AppError;
use crate::intent::cosine_similarity::cosine_similarity;
use crate::intent::intent_detector::evaluate_regex_score;
use crate::intent::parameter_extractor::extract_parameters;
use crate::intent::preprocessing::{is_conversational_or_noise, preprocess};
use crate::intent::regex_patterns::RegexPatterns;
use crate::intent::semantic_engine::SemanticEngine;
use crate::models::intent::{IntentCandidate, IntentResult, IntentScores};
use crate::models::tool::ToolDefinition;
use serde_json::Value;

pub struct IntentResolver {
    patterns: RegexPatterns,
}

impl IntentResolver {
    pub fn new() -> Self {
        Self {
            patterns: RegexPatterns::new(),
        }
    }

    pub fn resolve(
        &self,
        query: &str,
        tools: &[ToolDefinition],
        semantic_engine: Option<&SemanticEngine>,
    ) -> Result<IntentResult, AppError> {
        let preprocessed = preprocess(query);

        if is_conversational_or_noise(&preprocessed) {
            let suggestions: Vec<String> = tools.iter().map(|t| t.name.clone()).take(4).collect();
            return Ok(IntentResult::Ambiguous {
                candidates: suggestions,
            });
        }

        if self
            .patterns
            .matches_negation_mutation(&preprocessed.normalized)
        {
            return Ok(IntentResult::Rejected {
                reason: format!(
                    "Query '{}' expresses a negative constraint against performing changes. No mutation will be triggered.",
                    query.trim()
                ),
            });
        }

        let query_embedding = if let Some(engine) = semantic_engine {
            engine.encode(&preprocessed.normalized).ok()
        } else {
            None
        };

        let mut candidates: Vec<IntentCandidate> = Vec::new();

        for tool in tools {
            let (regex_score, action, entity) =
                evaluate_regex_score(&preprocessed, tool, &self.patterns);

            let mut semantic_score = 0.0f64;
            if let (Some(q_emb), Some(engine)) = (&query_embedding, semantic_engine) {
                let tool_text = format!("{} {}", tool.name, tool.description);
                if let Ok(tool_emb) = engine.encode(&tool_text) {
                    semantic_score = cosine_similarity(q_emb, &tool_emb);
                }
            }

            let confidence = if query_embedding.is_some() {
                (regex_score * REGEX_WEIGHT) + (semantic_score * SEMANTIC_WEIGHT)
            } else {
                regex_score
            };

            candidates.push(IntentCandidate {
                tool: tool.name.clone(),
                action,
                entity,
                scores: IntentScores {
                    regex: regex_score,
                    semantic: semantic_score,
                    confidence,
                },
            });
        }

        candidates.sort_by(|a, b| b.scores.confidence.total_cmp(&a.scores.confidence));

        if candidates.is_empty() {
            return Ok(IntentResult::Ambiguous {
                candidates: Vec::new(),
            });
        }

        let top_candidate = &candidates[0];

        if top_candidate.scores.confidence < MINIMUM_MATCH_THRESHOLD {
            let suggestions: Vec<String> =
                candidates.iter().map(|c| c.tool.clone()).take(3).collect();
            return Ok(IntentResult::Ambiguous {
                candidates: suggestions,
            });
        }

        if candidates.len() > 1 {
            let runner_up = &candidates[1];
            if (top_candidate.scores.confidence - runner_up.scores.confidence).abs()
                < AMBIGUITY_DELTA_THRESHOLD
                && top_candidate.scores.confidence < HIGH_CONFIDENCE_THRESHOLD
            {
                return Ok(IntentResult::Ambiguous {
                    candidates: vec![top_candidate.tool.clone(), runner_up.tool.clone()],
                });
            }
        }

        let matched_tool = tools
            .iter()
            .find(|t| t.name == top_candidate.tool)
            .ok_or_else(|| AppError::ExecutionError("Matched tool definition missing".into()))?;

        let extraction = extract_parameters(&preprocessed.raw, matched_tool);

        if !extraction.missing.is_empty() {
            return Ok(IntentResult::NeedsParams {
                tool: matched_tool.name.clone(),
                missing: extraction.missing,
                extracted: extraction.extracted,
            });
        }

        if matched_tool.is_mutation() && REQUIRE_MUTATION_CONFIRMATION {
            let summary = format!(
                "Confirm executing '{}' with parameters: {}",
                matched_tool.name, extraction.extracted
            );

            return Ok(IntentResult::NeedsConfirmation {
                tool: matched_tool.name.clone(),
                params: extraction.extracted,
                summary,
            });
        }

        let intent_name = match matched_tool.name.as_str() {
            "get_orders" => "Customer Orders Ledger",
            "create_order" => "Place Customer Order",
            "get_inventory" => "Current Inventory Stock",
            "create_inventory" => "Add Inventory Product",
            "update_inventory" => "Update Inventory Product",
            "deactivate_inventory" => "Deactivate Inventory Product",
            "get_users" => "System User Accounts",
            "create_user" => "Create User Account",
            "get_current_user" => "Current Operator Profile",
            _ => &matched_tool.name,
        }
        .to_string();

        Ok(IntentResult::Executed {
            tool: matched_tool.name.clone(),
            intent: intent_name,
            scores: top_candidate.scores.clone(),
            params: extraction.extracted,
            data: Value::Null,
        })
    }
}

impl Default for IntentResolver {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn get_test_tools() -> Vec<ToolDefinition> {
        vec![
            ToolDefinition {
                name: "get_orders".to_string(),
                description: "Fetches orders. Returns all system orders for Admin; returns only own orders for Sales.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["sessionToken"]
                }),
            },
            ToolDefinition {
                name: "create_order".to_string(),
                description: "Creates an order with items and deducts available stock inside an atomic database transaction.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["sessionToken", "itemsJson"]
                }),
            },
            ToolDefinition {
                name: "get_inventory".to_string(),
                description: "Retrieves all active inventory products.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["sessionToken"]
                }),
            },
            ToolDefinition {
                name: "create_inventory".to_string(),
                description: "Creates a new inventory product.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["sessionToken", "sku", "name", "quantityAvailable", "unitPrice"]
                }),
            },
            ToolDefinition {
                name: "update_inventory".to_string(),
                description: "Updates an existing inventory product and adjusts stock quantities.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["sessionToken", "inventoryId", "sku", "name", "quantityAvailable", "unitPrice", "isActive"]
                }),
            },
            ToolDefinition {
                name: "deactivate_inventory".to_string(),
                description: "Deactivates an inventory product without removing historic orders.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["sessionToken", "inventoryId"]
                }),
            },
            ToolDefinition {
                name: "get_users".to_string(),
                description: "Lists all user accounts in the ERP system.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["sessionToken"]
                }),
            },
            ToolDefinition {
                name: "create_user".to_string(),
                description: "Creates a new Sales or Store user account.".to_string(),
                input_schema: json!({
                    "type": "object",
                    "required": ["sessionToken", "username", "password", "role"]
                }),
            },
        ]
    }

    #[test]
    fn test_required_table_get_orders() {
        let resolver = IntentResolver::new();
        let tools = get_test_tools();
        let result = resolver.resolve("get the orders", &tools, None).unwrap();

        match result {
            IntentResult::Executed { tool, .. } => assert_eq!(tool, "get_orders"),
            other => panic!("Expected Executed for get_orders, got {other:?}"),
        }
    }

    #[test]
    fn test_required_table_orders_today() {
        let resolver = IntentResolver::new();
        let tools = get_test_tools();
        let result = resolver
            .resolve("what are the orders today", &tools, None)
            .unwrap();

        match result {
            IntentResult::Executed { tool, .. } => assert_eq!(tool, "get_orders"),
            other => panic!("Expected Executed for get_orders, got {other:?}"),
        }
    }

    #[test]
    fn test_required_table_make_order_must_not_call_get_orders() {
        let resolver = IntentResolver::new();
        let tools = get_test_tools();
        let result = resolver.resolve("make order", &tools, None).unwrap();

        match result {
            IntentResult::NeedsParams { tool, missing, .. } => {
                assert_eq!(tool, "create_order");
                assert!(missing.contains(&"itemsJson".to_string()));
            }
            other => panic!("Expected NeedsParams for create_order, got {other:?}"),
        }
    }

    #[test]
    fn test_required_table_add_new_product() {
        let resolver = IntentResolver::new();
        let tools = get_test_tools();
        let result = resolver.resolve("add a new product", &tools, None).unwrap();

        match result {
            IntentResult::NeedsParams { tool, missing, .. } => {
                assert_eq!(tool, "create_inventory");
                assert!(missing.contains(&"sku".to_string()));
            }
            other => panic!("Expected NeedsParams for create_inventory, got {other:?}"),
        }
    }

    #[test]
    fn test_required_table_show_low_stock() {
        let resolver = IntentResolver::new();
        let tools = get_test_tools();
        let result = resolver.resolve("show low stock", &tools, None).unwrap();

        match result {
            IntentResult::Executed { tool, .. } => assert_eq!(tool, "get_inventory"),
            other => panic!("Expected Executed for get_inventory, got {other:?}"),
        }
    }

    #[test]
    fn test_required_table_list_users() {
        let resolver = IntentResolver::new();
        let tools = get_test_tools();
        let result = resolver.resolve("list users", &tools, None).unwrap();

        match result {
            IntentResult::Executed { tool, .. } => assert_eq!(tool, "get_users"),
            other => panic!("Expected Executed for get_users, got {other:?}"),
        }
    }

    #[test]
    fn test_required_table_register_new_employee() {
        let resolver = IntentResolver::new();
        let tools = get_test_tools();
        let result = resolver
            .resolve("register a new employee", &tools, None)
            .unwrap();

        match result {
            IntentResult::NeedsParams { tool, missing, .. } => {
                assert_eq!(tool, "create_user");
                assert!(missing.contains(&"password".to_string()));
            }
            other => panic!("Expected NeedsParams for create_user, got {other:?}"),
        }
    }

    #[test]
    fn test_required_table_negation_do_not_delete() {
        let resolver = IntentResolver::new();
        let tools = get_test_tools();
        let result = resolver
            .resolve("do not delete this order", &tools, None)
            .unwrap();

        match result {
            IntentResult::Rejected { .. } | IntentResult::Ambiguous { .. } => {}
            other => panic!("Expected Rejected or Ambiguous for negation, got {other:?}"),
        }
    }

    #[test]
    fn test_required_table_conversational_hello_asdf() {
        let resolver = IntentResolver::new();
        let tools = get_test_tools();

        let res_hello = resolver.resolve("hello", &tools, None).unwrap();
        match res_hello {
            IntentResult::Ambiguous { .. } => {}
            other => panic!("Expected Ambiguous for hello, got {other:?}"),
        }

        let res_asdf = resolver.resolve("asdf", &tools, None).unwrap();
        match res_asdf {
            IntentResult::Ambiguous { .. } => {}
            other => panic!("Expected Ambiguous for asdf, got {other:?}"),
        }
    }

    #[test]
    fn test_exact_tool_name_get_users() {
        let resolver = IntentResolver::new();
        let tools = get_test_tools();

        let result = resolver.resolve("get_users", &tools, None).unwrap();
        match result {
            IntentResult::Executed { tool, .. } => assert_eq!(tool, "get_users"),
            other => panic!("Expected Executed for get_users, got {other:?}"),
        }
    }
}

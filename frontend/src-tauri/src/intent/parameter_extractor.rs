use crate::models::tool::ToolDefinition;
use regex::Regex;
use serde_json::{Map, Value, json};

#[derive(Debug, Clone)]
pub struct ExtractionResult {
    pub extracted: Value,
    pub missing: Vec<String>,
    pub notes: Option<String>,
}

pub fn extract_parameters(query_text: &str, tool: &ToolDefinition) -> ExtractionResult {
    let mut extracted_map = Map::new();
    let mut notes = None;

    let lower = query_text.to_lowercase();
    let required_params = tool.required_parameters();

    match tool.name.as_str() {
        "get_orders" => {
            if lower.contains("today") || lower.contains("yesterday") || lower.contains("date") {
                notes = Some(
                    "Note: The ERP 'get_orders' API returns all authorized orders; it does not take a date filter parameter."
                        .to_string(),
                );
            }
        }
        "create_order" => {
            let json_pattern = Regex::new(r"\[\s*\{.*}\s*]").expect("Valid JSON array regex");
            if let Some(parsed) = json_pattern
                .find(query_text)
                .and_then(|mat| serde_json::from_str::<Value>(mat.as_str()).ok())
            {
                extracted_map.insert("itemsJson".to_string(), json!(parsed.to_string()));
            }
        }
        "create_inventory" => {
            let sku_re = Regex::new(r"\b(sku[:\s-]?([A-Za-z0-9_-]+))\b").expect("Valid SKU regex");
            if let Some(m) = sku_re.captures(query_text).and_then(|caps| caps.get(2)) {
                extracted_map.insert("sku".to_string(), json!(m.as_str()));
            }

            let price_re = Regex::new(r"\$([0-9]+(?:\.[0-9]{1,2})?)").expect("Valid price regex");
            if let Some(price) = price_re
                .captures(query_text)
                .and_then(|caps| caps.get(1))
                .and_then(|m| m.as_str().parse::<f64>().ok())
            {
                extracted_map.insert("unitPrice".to_string(), json!(price));
            }

            let qty_re = Regex::new(r"\b([0-9]+)\s*(?:units?|pcs?|items?|quantity|qty)\b")
                .expect("Valid quantity regex");
            if let Some(qty) = qty_re
                .captures(query_text)
                .and_then(|caps| caps.get(1))
                .and_then(|m| m.as_str().parse::<i64>().ok())
            {
                extracted_map.insert("quantityAvailable".to_string(), json!(qty));
            }
        }
        "create_user" => {
            if lower.contains("sales") {
                extracted_map.insert("role".to_string(), json!("Sales"));
            } else if lower.contains("store") {
                extracted_map.insert("role".to_string(), json!("Store"));
            }

            let user_re = Regex::new(r"\b(?:user|username)[:\s]+([A-Za-z0-9_]+)\b")
                .expect("Valid username regex");
            if let Some(m) = user_re.captures(query_text).and_then(|caps| caps.get(1)) {
                extracted_map.insert("username".to_string(), json!(m.as_str()));
            }
        }
        _ => {}
    }

    let mut missing = Vec::new();
    for param in &required_params {
        if !extracted_map.contains_key(param) {
            missing.push(param.clone());
        }
    }

    ExtractionResult {
        extracted: Value::Object(extracted_map),
        missing,
        notes,
    }
}

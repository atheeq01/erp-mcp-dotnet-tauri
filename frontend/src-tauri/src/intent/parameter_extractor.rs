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
        "get_inventory" => {
            // 1. Quoted product query: e.g. is this have "Spring-Clamp Terminal Block"
            let quote_re = Regex::new(r#"["']([^"']+)["']"#).unwrap();
            if let Some(caps) = quote_re.captures(query_text) {
                if let Some(p) = caps.get(1) {
                    let val = p.as_str().trim();
                    if !val.is_empty() {
                        extracted_map.insert("searchQuery".to_string(), json!(val));
                    }
                }
            }

            // 2. Unquoted product query: e.g. have Spring-Clamp Terminal Block, is Spring-Clamp Terminal Block available
            if !extracted_map.contains_key("searchQuery") {
                let search_triggers = Regex::new(
                    r#"(?i)\b(?:is\s+this\s+have|do\s+we\s+have|have\s+we\s+got|is\s+there\s+any|is\s+there|have|has|got|search(?:\s+for)?|find|check(?:\s+for)?|is)\s+"#,
                )
                .unwrap();
                if let Some(m) = search_triggers.find(query_text) {
                    let after = &query_text[m.end()..];
                    let cleaned = Regex::new(
                        r#"(?i)\s*\b(?:available|in\s+stock|in\s+the\s+inventory|in\s+inventory|in\s+store)\b.*$"#,
                    )
                    .unwrap()
                    .replace(after, "");
                    let val = cleaned.trim().trim_matches(|c| c == '"' || c == '\'');
                    let lower = val.to_lowercase();
                    if !val.is_empty()
                        && lower != "inventory"
                        && lower != "product"
                        && lower != "products"
                        && lower != "stock"
                        && lower != "item"
                        && lower != "items"
                    {
                        extracted_map.insert("searchQuery".to_string(), json!(val));
                    }
                }
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

            let mut phone_range = None;
            let phone_re = Regex::new(
                r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b0\d{9}\b",
            )
            .unwrap();

            if let Some(m) = phone_re.find(query_text) {
                extracted_map.insert("customerPhone".to_string(), json!(m.as_str()));
                phone_range = Some(m.range());
            }

            let name_re =
                Regex::new(r"(?i)\b(?:for|customer|client|buyer)[:\s]+([A-Za-z\s]{2,30})\b").unwrap();
            if let Some(caps) = name_re.captures(query_text) {
                if let Some(name_match) = caps.get(1) {
                    extracted_map.insert("customerName".to_string(), json!(name_match.as_str().trim()));
                }
            }

            // Extract quoted product name: e.g. create order "Spring-Clamp Terminal Block"
            let quote_re = Regex::new(r#"["']([^"']+)["']"#).unwrap();
            if let Some(caps) = quote_re.captures(query_text) {
                if let Some(p) = caps.get(1) {
                    let val = p.as_str().trim();
                    if !val.is_empty() {
                        extracted_map.insert("productQuery".to_string(), json!(val));
                    }
                }
            }

            // Extract unquoted product name if no quote matched:
            if !extracted_map.contains_key("productQuery") {
                let unquoted_re = Regex::new(
                    r#"(?i)\b(?:create\s+order\s+(?:for\s+)?|order\s+(?:\d+\s+)?(?:for\s+)?|buy\s+(?:\d+\s+)?(?:for\s+)?)([^,;.]+)"#,
                )
                .unwrap();
                if let Some(caps) = unquoted_re.captures(query_text) {
                    if let Some(m) = caps.get(1) {
                        let raw_prod = m.as_str();
                        let cleaned = Regex::new(r"(?i)\b(?:for|customer|client|buyer|\d{7,})\b.*$")
                            .unwrap()
                            .replace(raw_prod, "");
                        let val = cleaned.trim().trim_matches(|c| c == '"' || c == '\'');
                        if !val.is_empty()
                            && val.to_lowercase() != "items"
                            && val.to_lowercase() != "order"
                        {
                            extracted_map.insert("productQuery".to_string(), json!(val));
                        }
                    }
                }
            }

            // Extract quantity if present (e.g. "order 5 ..."), ignoring digits that belong to the phone number
            let qty_re = Regex::new(r"\b(\d{1,4})\s*(?:pcs|units|items|boxes|quantity|qty|x)?\b").unwrap();
            for caps in qty_re.captures_iter(query_text) {
                if let Some(m) = caps.get(1) {
                    let r = m.range();
                    if let Some(ref pr) = phone_range {
                        if r.start >= pr.start && r.end <= pr.end {
                            continue;
                        }
                    }
                    if let Ok(qty) = m.as_str().parse::<i64>() {
                        if qty > 0 {
                            extracted_map.insert("quantity".to_string(), json!(qty));
                            break;
                        }
                    }
                }
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_extract_quoted_product_for_order() {
        let tool = ToolDefinition {
            name: "create_order".to_string(),
            description: "Creates an order".to_string(),
            input_schema: json!({
                "type": "object",
                "required": ["sessionToken", "itemsJson"]
            }),
        };

        let result = extract_parameters(r#"create order "Spring-Clamp Terminal Block ""#, &tool);
        assert_eq!(
            result.extracted.get("productQuery").and_then(Value::as_str),
            Some("Spring-Clamp Terminal Block")
        );
    }

    #[test]
    fn test_extract_order_with_customer_and_phone() {
        let tool = ToolDefinition {
            name: "create_order".to_string(),
            description: "Creates an order".to_string(),
            input_schema: json!({
                "type": "object",
                "required": ["sessionToken", "itemsJson"]
            }),
        };

        let result = extract_parameters(
            r#"create order 5 "Spring-Clamp Terminal Block" for Alice 0771234567"#,
            &tool,
        );
        assert_eq!(
            result.extracted.get("productQuery").and_then(Value::as_str),
            Some("Spring-Clamp Terminal Block")
        );
        assert_eq!(
            result.extracted.get("quantity").and_then(Value::as_i64),
            Some(5)
        );
        assert_eq!(
            result.extracted.get("customerName").and_then(Value::as_str),
            Some("Alice")
        );
        assert_eq!(
            result.extracted.get("customerPhone").and_then(Value::as_str),
            Some("0771234567")
        );
    }

    #[test]
    fn test_extract_unquoted_order() {
        let tool = ToolDefinition {
            name: "create_order".to_string(),
            description: "Creates an order".to_string(),
            input_schema: json!({
                "type": "object",
                "required": ["sessionToken", "itemsJson"]
            }),
        };

        let result = extract_parameters(
            r#"order 10 Pure Copper Busbar for John Doe 0712345678"#,
            &tool,
        );
        assert_eq!(
            result.extracted.get("productQuery").and_then(Value::as_str),
            Some("Pure Copper Busbar")
        );
        assert_eq!(
            result.extracted.get("quantity").and_then(Value::as_i64),
            Some(10)
        );
        assert_eq!(
            result.extracted.get("customerName").and_then(Value::as_str),
            Some("John Doe")
        );
        assert_eq!(
            result.extracted.get("customerPhone").and_then(Value::as_str),
            Some("0712345678")
        );
    }

    #[test]
    fn test_extract_quoted_search_query_for_inventory() {
        let tool = ToolDefinition {
            name: "get_inventory".to_string(),
            description: "Get inventory".to_string(),
            input_schema: json!({
                "type": "object",
                "required": ["sessionToken"]
            }),
        };

        let result = extract_parameters(
            r#"is this have "Spring-Clamp Terminal Block""#,
            &tool,
        );
        assert_eq!(
            result.extracted.get("searchQuery").and_then(Value::as_str),
            Some("Spring-Clamp Terminal Block")
        );
    }

    #[test]
    fn test_extract_unquoted_search_query_for_inventory() {
        let tool = ToolDefinition {
            name: "get_inventory".to_string(),
            description: "Get inventory".to_string(),
            input_schema: json!({
                "type": "object",
                "required": ["sessionToken"]
            }),
        };

        let result = extract_parameters(
            r#"is Spring-Clamp Terminal Block available in inventory"#,
            &tool,
        );
        assert_eq!(
            result.extracted.get("searchQuery").and_then(Value::as_str),
            Some("Spring-Clamp Terminal Block")
        );
    }
}

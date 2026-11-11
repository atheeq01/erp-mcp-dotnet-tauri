use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    #[serde(rename = "inputSchema")]
    pub input_schema: Value,
}

impl ToolDefinition {
    pub fn is_mutation(&self) -> bool {
        self.name.starts_with("create_")
            || self.name.starts_with("update_")
            || self.name.starts_with("deactivate_")
    }

    pub fn required_parameters(&self) -> Vec<String> {
        let mut required_names = Vec::new();

        if let Some(req_array) = self.input_schema.get("required").and_then(Value::as_array) {
            for item in req_array {
                if let Some(param) = item.as_str().filter(|&p| p != "sessionToken") {
                    required_names.push(param.to_string());
                }
            }
        }

        required_names
    }
}

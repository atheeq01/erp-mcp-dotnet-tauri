use serde::{Deserialize, Deserializer, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCall {
    pub name: String,
    #[serde(default = "default_empty_args", deserialize_with = "deserialize_args")]
    pub arguments: String,
}

fn default_empty_args() -> String {
    "{}".to_string()
}

fn deserialize_args<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    let val = Value::deserialize(deserializer)?;
    Ok(match val {
        Value::String(s) => s,
        Value::Null => "{}".to_string(),
        other => other.to_string(),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    #[serde(default = "default_call_id")]
    pub id: String,
    #[serde(rename = "type", default = "default_call_type")]
    pub call_type: String,
    pub function: FunctionCall,
}

fn default_call_id() -> String {
    "call_default".to_string()
}

fn default_call_type() -> String {
    "function".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ChatMessage {
    Raw(Value),
    Structured {
        role: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        content: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        tool_calls: Option<Vec<ToolCall>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        tool_call_id: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        name: Option<String>,
    },
}

impl ChatMessage {
    pub fn system(content: impl Into<String>) -> Self {
        Self::role_msg("system", content)
    }

    pub fn user(content: impl Into<String>) -> Self {
        Self::role_msg("user", content)
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self::role_msg("assistant", content)
    }

    pub fn raw(value: Value) -> Self {
        Self::Raw(value)
    }

    pub fn tool(
        tool_call_id: impl Into<String>,
        name: impl Into<String>,
        content: impl Into<String>,
    ) -> Self {
        Self::Structured {
            role: "tool".to_string(),
            content: Some(content.into()),
            tool_calls: None,
            tool_call_id: Some(tool_call_id.into()),
            name: Some(name.into()),
        }
    }

    fn role_msg(role: &str, content: impl Into<String>) -> Self {
        Self::Structured {
            role: role.to_string(),
            content: Some(content.into()),
            tool_calls: None,
            tool_call_id: None,
            name: None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ChatResponse {
    pub content: Option<String>,
    pub tool_calls: Vec<ToolCall>,
    pub raw_message: Value,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
}

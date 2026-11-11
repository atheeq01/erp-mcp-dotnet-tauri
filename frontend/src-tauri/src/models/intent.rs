use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum IntentAction {
    Query,
    Create,
    Update,
    Deactivate,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum IntentEntity {
    Order,
    Inventory,
    User,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentScores {
    pub regex: f64,
    pub semantic: f64,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentCandidate {
    pub tool: String,
    pub action: IntentAction,
    pub entity: IntentEntity,
    pub scores: IntentScores,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum IntentResult {
    Executed {
        tool: String,
        intent: String,
        scores: IntentScores,
        params: Value,
        data: Value,
    },
    NeedsParams {
        tool: String,
        missing: Vec<String>,
        extracted: Value,
    },
    NeedsConfirmation {
        tool: String,
        params: Value,
        summary: String,
    },
    Ambiguous {
        candidates: Vec<String>,
    },
    Rejected {
        reason: String,
    },
}

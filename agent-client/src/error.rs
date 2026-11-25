use std::time::Duration;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AgentError {
    #[error("Configuration error: {0}")]
    Config(String),

    #[error("MCP error: {0}")]
    Mcp(String),

    #[error("Operation timed out after {0:?}")]
    Timeout(Duration),

    #[error("LLM error: {0}")]
    Llm(String),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
}

pub type Result<T> = std::result::Result<T, AgentError>;

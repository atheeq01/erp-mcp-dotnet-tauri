use serde::Serialize;
use std::fmt;

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    SessionError(String),
    McpError(String),
    ModelError(String),
    ValidationError(String),
    ExecutionError(String),
    IoError(String),
    JsonError(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::SessionError(msg) => write!(f, "Session Error: {msg}"),
            AppError::McpError(msg) => write!(f, "MCP Error: {msg}"),
            AppError::ModelError(msg) => write!(f, "Model Error: {msg}"),
            AppError::ValidationError(msg) => write!(f, "Validation Error: {msg}"),
            AppError::ExecutionError(msg) => write!(f, "Execution Error: {msg}"),
            AppError::IoError(msg) => write!(f, "I/O Error: {msg}"),
            AppError::JsonError(msg) => write!(f, "JSON Error: {msg}"),
        }
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::IoError(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::JsonError(err.to_string())
    }
}

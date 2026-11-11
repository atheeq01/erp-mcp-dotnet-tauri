use crate::intent::intent_resolver::IntentResolver;
use crate::intent::semantic_engine::SemanticEngine;
use crate::mcp::client::McpClient;
use crate::models::session::UserSession;
use crate::models::tool::ToolDefinition;
use std::sync::Mutex;

pub struct McpState {
    pub client: Mutex<McpClient>,
    pub session: Mutex<Option<UserSession>>,
    pub tools: Mutex<Vec<ToolDefinition>>,
    pub model: Option<SemanticEngine>,
    pub resolver: IntentResolver,
}

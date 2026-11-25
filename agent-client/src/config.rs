use crate::error::{AgentError, Result};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct AgentConfig {
    pub llm_base_url: String,
    pub llm_api_key: String,
    pub llm_model: String,
    pub embedding_model: String,
    pub max_iterations: usize,
    pub tool_timeout_seconds: u64,
    pub ops_slow_ms: u64,
    pub repo_root: PathBuf,
    pub mock_data_dir: PathBuf,
    pub workspace_dir: PathBuf,
    pub telemetry_server_path: PathBuf,
    pub trace_file_path: PathBuf,
}

pub fn default_embedding_model_for_url(base_url: &str) -> &'static str {
    let lower = base_url.to_ascii_lowercase();
    if lower.contains("generativelanguage.googleapis.com") {
        "gemini-embedding-001"
    } else if lower.contains("openrouter.ai") {
        "openai/text-embedding-3-small"
    } else if lower.contains("anthropic.com") {
        "voyage-3-lite"
    } else {
        "text-embedding-3-small"
    }
}

impl AgentConfig {
    pub fn load() -> Result<Self> {
        let repo_root = Self::find_repo_root()?;

        let env_path = repo_root.join(".env");
        if env_path.exists() {
            let _ = dotenvy::from_path(&env_path);
        } else {
            let _ = dotenvy::dotenv();
        }

        let llm_base_url = std::env::var("LLM_BASE_URL")
            .unwrap_or_else(|_| "https://api.openai.com/v1".to_string());

        let llm_api_key = std::env::var("LLM_API_KEY").unwrap_or_default();

        let llm_model =
            std::env::var("LLM_MODEL").unwrap_or_else(|_| "gpt-5.4-mini".to_string());

        let embedding_model = std::env::var("EMBEDDING_MODEL")
            .ok()
            .filter(|v| !v.trim().is_empty())
            .unwrap_or_else(|| default_embedding_model_for_url(&llm_base_url).to_string());

        let max_iterations = env_parse("MAX_ITERATIONS", 8);
        let tool_timeout_seconds = env_parse("TOOL_TIMEOUT_SECONDS", 15);
        let ops_slow_ms = env_parse("OPS_SLOW_MS", 0);

        let mock_data_dir = repo_root.join("mock_data");
        let workspace_dir = mock_data_dir.join("workspace");

        let telemetry_server_path = repo_root
            .join("mcp-server")
            .join("bin")
            .join("Debug")
            .join("net10.0")
            .join("ops-telemetry-mcp.exe");

        let trace_file_path = repo_root
            .join("agent-client")
            .join("traces")
            .join("agent_traces.jsonl");

        Ok(Self {
            llm_base_url,
            llm_api_key,
            llm_model,
            embedding_model,
            max_iterations,
            tool_timeout_seconds,
            ops_slow_ms,
            repo_root,
            mock_data_dir,
            workspace_dir,
            telemetry_server_path,
            trace_file_path,
        })
    }

    pub fn find_repo_root() -> Result<PathBuf> {
        if let Ok(cwd) = std::env::current_dir() {
            if let Some(root) = Self::find_mock_data_ancestor(&cwd) {
                return Ok(root);
            }
        }

        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(root) = Self::find_mock_data_ancestor(&exe_path) {
                return Ok(root);
            }
        }

        std::env::current_dir().map_err(|e| AgentError::Config(e.to_string()))
    }

    fn find_mock_data_ancestor(start: &Path) -> Option<PathBuf> {
        let mut curr = Some(start);
        while let Some(dir) = curr {
            if dir.join("mock_data").is_dir() && dir.join("mcp-server").is_dir() {
                return Some(dir.to_path_buf());
            }
            curr = dir.parent();
        }
        None
    }
}

fn env_parse<T: std::str::FromStr>(key: &str, default: T) -> T {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse::<T>().ok())
        .unwrap_or(default)
}

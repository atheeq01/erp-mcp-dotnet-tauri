use crate::commands::agent::AgentRuntimeState;
use crate::commands::intent::check_ai_agent_permission;
use crate::error::AppError;
use crate::state::McpState;
use agent_client::{AgentConfig, default_embedding_model_for_url};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StoredLlmSettings {
    #[serde(default = "default_provider")]
    pub provider: String,
    #[serde(default)]
    pub base_url: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub embedding_model: Option<String>,
    #[serde(default, skip_serializing, skip_deserializing)]
    pub ui_api_key: Option<String>,
}

fn default_provider() -> String {
    "default".to_string()
}

#[derive(Debug, Clone, Serialize)]
pub struct LlmSettingsView {
    pub provider: String,
    pub base_url: String,
    pub model: String,
    pub embedding_model: String,
    pub using_ui_api_key: bool,
    pub has_env_api_key: bool,
    pub api_key_hint: String,
    pub env_default_base_url: String,
    pub env_default_model: String,
    pub env_default_embedding_model: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SaveLlmSettingsInput {
    pub provider: String,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub embedding_model: Option<String>,
    pub api_key: Option<String>,
    #[serde(default)]
    pub clear_ui_api_key: bool,
}

fn settings_file_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join("llm_settings.json"))
}

pub(crate) fn load_persisted_settings(app: &AppHandle) -> StoredLlmSettings {
    let Some(path) = settings_file_path(app) else {
        return StoredLlmSettings::default();
    };
    let Ok(contents) = fs::read_to_string(&path) else {
        return StoredLlmSettings::default();
    };
    let settings = serde_json::from_str::<StoredLlmSettings>(&contents).unwrap_or_default();
    // Rewrite older settings files so a formerly saved key is removed from disk.
    if contents.contains("\"ui_api_key\"") {
        let _ = persist_settings(app, &settings);
    }
    settings
}

fn persist_settings(app: &AppHandle, settings: &StoredLlmSettings) -> Result<(), AppError> {
    if let Some(path) = settings_file_path(app) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(path, serde_json::to_string_pretty(settings)?)?;
    }
    Ok(())
}

pub(crate) fn apply_llm_overrides(config: &mut AgentConfig, settings: &StoredLlmSettings) {
    if let Some(url) = settings
        .base_url
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        config.llm_base_url = url.to_string();
    }

    if let Some(model) = settings
        .model
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        config.llm_model = model.to_string();
    }

    if let Some(emb) = settings
        .embedding_model
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        config.embedding_model = emb.to_string();
    } else {
        config.embedding_model = default_embedding_model_for_url(&config.llm_base_url).to_string();
    }
}

fn build_view(env_cfg: &AgentConfig, settings: &StoredLlmSettings) -> LlmSettingsView {
    let mut effective = env_cfg.clone();
    apply_llm_overrides(&mut effective, settings);

    let has_env_api_key =
        !env_cfg.llm_api_key.is_empty() && env_cfg.llm_api_key != "your_api_key_here";

    let api_key_hint = match has_env_api_key {
        true => "Using LLM_API_KEY from the environment".to_string(),
        false => "Set LLM_API_KEY in the repo .env file".to_string(),
    };

    LlmSettingsView {
        provider: settings.provider.clone(),
        base_url: effective.llm_base_url,
        model: effective.llm_model,
        embedding_model: effective.embedding_model,
        using_ui_api_key: false,
        has_env_api_key,
        api_key_hint,
        env_default_base_url: env_cfg.llm_base_url.clone(),
        env_default_model: env_cfg.llm_model.clone(),
        env_default_embedding_model: env_cfg.embedding_model.clone(),
    }
}

fn require_admin(state: &State<'_, McpState>) -> Result<(), AppError> {
    let session = state
        .session
        .lock()
        .map_err(|e| AppError::SessionError(e.to_string()))?
        .clone();
    check_ai_agent_permission(session.as_ref()).map_err(AppError::ValidationError)
}

#[tauri::command]
pub fn get_llm_settings(
    app: AppHandle,
    state: State<'_, McpState>,
    agent_state: State<'_, AgentRuntimeState>,
) -> Result<LlmSettingsView, AppError> {
    require_admin(&state)?;

    let env_cfg = AgentConfig::load().map_err(|e| AppError::ExecutionError(e.to_string()))?;
    let mut guard = agent_state
        .llm_settings
        .lock()
        .map_err(|e| AppError::ExecutionError(e.to_string()))?;
    if guard.is_none() {
        *guard = Some(load_persisted_settings(&app));
    }
    let current = guard.as_ref().expect("initialized above");
    Ok(build_view(&env_cfg, current))
}

#[tauri::command]
pub fn save_llm_settings(
    input: SaveLlmSettingsInput,
    app: AppHandle,
    state: State<'_, McpState>,
    agent_state: State<'_, AgentRuntimeState>,
) -> Result<LlmSettingsView, AppError> {
    require_admin(&state)?;

    let env_cfg = AgentConfig::load().map_err(|e| AppError::ExecutionError(e.to_string()))?;
    let mut guard = agent_state
        .llm_settings
        .lock()
        .map_err(|e| AppError::ExecutionError(e.to_string()))?;
    if input
        .api_key
        .as_deref()
        .is_some_and(|key| !key.trim().is_empty())
    {
        return Err(AppError::ValidationError(
            "API keys must be set through LLM_API_KEY in the environment.".to_string(),
        ));
    }

    let clean_opt =
        |opt: Option<String>| opt.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());

    let next = if input.provider == "default" {
        StoredLlmSettings {
            provider: "default".to_string(),
            base_url: None,
            model: None,
            embedding_model: clean_opt(input.embedding_model),
            ui_api_key: None,
        }
    } else {
        StoredLlmSettings {
            provider: input.provider.trim().to_string(),
            base_url: clean_opt(input.base_url),
            model: clean_opt(input.model),
            embedding_model: clean_opt(input.embedding_model),
            ui_api_key: None,
        }
    };

    persist_settings(&app, &next)?;
    let view = build_view(&env_cfg, &next);
    *guard = Some(next);
    Ok(view)
}

#[tauri::command]
pub fn reset_llm_settings(
    app: AppHandle,
    state: State<'_, McpState>,
    agent_state: State<'_, AgentRuntimeState>,
) -> Result<LlmSettingsView, AppError> {
    require_admin(&state)?;

    let env_cfg = AgentConfig::load().map_err(|e| AppError::ExecutionError(e.to_string()))?;
    let reset = StoredLlmSettings::default();
    persist_settings(&app, &reset)?;

    let mut guard = agent_state
        .llm_settings
        .lock()
        .map_err(|e| AppError::ExecutionError(e.to_string()))?;
    *guard = Some(reset.clone());
    Ok(build_view(&env_cfg, &reset))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn sample_env_config() -> AgentConfig {
        AgentConfig {
            llm_base_url: "https://generativelanguage.googleapis.com/v1beta/openai/".to_string(),
            llm_api_key: "env-secret-key".to_string(),
            llm_model: "gemini-3.5-flash-lite".to_string(),
            embedding_model: "gemini-embedding-001".to_string(),
            max_iterations: 8,
            tool_timeout_seconds: 15,
            ops_slow_ms: 0,
            repo_root: PathBuf::from("."),
            mock_data_dir: PathBuf::from("mock_data"),
            workspace_dir: PathBuf::from("mock_data/workspace"),
            telemetry_server_path: PathBuf::from("ops-telemetry-mcp.exe"),
            trace_file_path: PathBuf::from("agent_traces.jsonl"),
        }
    }

    #[test]
    fn test_default_settings_preserve_env_values() {
        let mut cfg = sample_env_config();
        let settings = StoredLlmSettings::default();
        apply_llm_overrides(&mut cfg, &settings);

        assert_eq!(cfg.llm_api_key, "env-secret-key");
        assert_eq!(cfg.llm_model, "gemini-3.5-flash-lite");
        assert_eq!(cfg.embedding_model, "gemini-embedding-001");
    }

    #[test]
    fn test_persisted_ui_key_cannot_override_env_key() {
        let mut cfg = sample_env_config();
        let settings = StoredLlmSettings {
            provider: "openai".to_string(),
            base_url: Some("https://api.openai.com/v1".to_string()),
            model: Some("gpt-4o-mini".to_string()),
            embedding_model: Some("text-embedding-3-small".to_string()),
            ui_api_key: Some("ui-custom-key-9999".to_string()),
        };
        apply_llm_overrides(&mut cfg, &settings);

        assert_eq!(cfg.llm_base_url, "https://api.openai.com/v1");
        assert_eq!(cfg.llm_model, "gpt-4o-mini");
        assert_eq!(cfg.embedding_model, "text-embedding-3-small");
        assert_eq!(cfg.llm_api_key, "env-secret-key");
        assert!(
            !serde_json::to_string(&settings)
                .unwrap()
                .contains("ui-custom-key-9999")
        );
    }
}

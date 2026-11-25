use crate::config::AgentConfig;
use crate::error::{AgentError, Result};
use crate::llm::types::{ChatMessage, ChatResponse, ToolCall};
use serde::Deserialize;
use serde_json::{Value, json};
use std::future::Future;
use std::time::Duration;

pub trait LlmProvider {
    fn chat(
        &self,
        messages: &[ChatMessage],
        tools: &[Value],
    ) -> impl Future<Output = Result<ChatResponse>> + Send;
}

pub struct HttpLlmClient {
    client: reqwest::Client,
    endpoint_url: String,
    pub api_key: String,
    pub model: String,
}

#[derive(Deserialize)]
struct ApiResponse {
    #[serde(default)]
    choices: Vec<ApiChoice>,
    #[serde(default)]
    usage: Option<ApiUsage>,
}

#[derive(Deserialize)]
struct ApiChoice {
    message: Value,
}

#[derive(Deserialize)]
struct ApiMessage {
    #[serde(default)]
    content: Option<String>,
    #[serde(default)]
    tool_calls: Vec<ToolCall>,
}

#[derive(Deserialize, Default)]
struct ApiUsage {
    #[serde(default)]
    prompt_tokens: u64,
    #[serde(default)]
    completion_tokens: u64,
}

impl HttpLlmClient {
    pub fn new(config: &AgentConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(60))
            .build()
            .expect("failed to build reqwest client");

        let base = config.llm_base_url.trim_end_matches('/');
        let endpoint_url = if base.ends_with("/chat/completions") {
            base.to_string()
        } else {
            format!("{base}/chat/completions")
        };

        Self {
            client,
            endpoint_url,
            api_key: config.llm_api_key.clone(),
            model: config.llm_model.clone(),
        }
    }
}

impl LlmProvider for HttpLlmClient {
    async fn chat(&self, messages: &[ChatMessage], tools: &[Value]) -> Result<ChatResponse> {
        let mut body = json!({
            "model": self.model,
            "messages": messages,
        });
        // Anthropic Claude 5+ rejects `temperature` with HTTP 400 on newer API versions.
        let is_claude_direct = self.endpoint_url.contains("anthropic.com")
            || self.model.starts_with("claude-");
        if !is_claude_direct {
            body["temperature"] = json!(0.0);
        }
        if !tools.is_empty() {
            body["tools"] = json!(tools);
        }

        let max_retries = 3u64;
        for attempt in 0..=max_retries {
            let resp = self
                .client
                .post(&self.endpoint_url)
                .bearer_auth(&self.api_key)
                .header("HTTP-Referer", "https://github.com/spil-mini-erp")
                .header("X-Title", "SPIL Incident Triage Agent")
                .json(&body)
                .send()
                .await?;

            let status = resp.status();
            let code = status.as_u16();
            if status.is_success() {
                let parsed: ApiResponse = resp.json().await?;
                let choice = parsed
                    .choices
                    .into_iter()
                    .next()
                    .ok_or_else(|| AgentError::Llm("LLM response contains no choices".into()))?;

                let msg = ApiMessage::deserialize(&choice.message)?;
                let usage = parsed.usage.unwrap_or_default();

                return Ok(ChatResponse {
                    content: msg.content,
                    tool_calls: msg.tool_calls,
                    raw_message: choice.message,
                    prompt_tokens: usage.prompt_tokens,
                    completion_tokens: usage.completion_tokens,
                });
            }

            let err_text = resp.text().await.unwrap_or_default();
            let transient = code == 429 || code == 503 || (500..=599).contains(&code);
            if transient && attempt < max_retries {
                let wait_secs = 6 * (attempt + 1);
                println!(
                    "\x1b[33m[provider-retry] Transient {code} received. Backing off for {wait_secs}s (retry {}/{max_retries}) ...\x1b[0m",
                    attempt + 1
                );
                tokio::time::sleep(Duration::from_secs(wait_secs)).await;
                continue;
            }

            return Err(AgentError::Llm(format!("LLM HTTP error {code}: {err_text}")));
        }

        unreachable!("loop returns on success or final error")
    }
}

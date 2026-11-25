use crate::error::Result;
use chrono::Utc;
use serde::Serialize;
use serde_json::{Value, json};
use std::fmt;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::SystemTime;

static RUN_SEQ: AtomicU64 = AtomicU64::new(0);

pub fn generate_run_id() -> String {
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_micros();
    let seq = RUN_SEQ.fetch_add(1, Ordering::Relaxed) & 0xff;
    format!("{:08x}{:02x}", (now & 0xffffffff) as u32, seq)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ToolStatus {
    Ok,
    Error,
    Blocked,
    Rejected,
    Timeout,
}

impl ToolStatus {
    pub fn is_data_output(self) -> bool {
        matches!(self, Self::Ok | Self::Error)
    }
}

impl fmt::Display for ToolStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            Self::Ok => "ok",
            Self::Error => "error",
            Self::Blocked => "blocked",
            Self::Rejected => "rejected",
            Self::Timeout => "timeout",
        };
        f.write_str(s)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ApprovalStatus {
    Auto,
    HumanApproved,
    Rejected,
    Blocked,
    None,
}

pub struct ToolTraceEvent<'a> {
    pub step: usize,
    pub server: &'a str,
    pub tool: &'a str,
    pub input: &'a Value,
    pub status: ToolStatus,
    pub approval: ApprovalStatus,
    pub duration_ms: u64,
    pub injection_flag: bool,
    pub output: &'a str,
}

#[derive(Debug, Clone)]
pub struct Tracer {
    pub run_id: String,
    pub trace_file_path: PathBuf,
    pub agent_kind: String,
}

impl Tracer {
    pub fn new(run_id: impl Into<String>, trace_file_path: impl AsRef<Path>) -> Self {
        Self::with_agent_kind(run_id, trace_file_path, "ai")
    }

    pub fn with_agent_kind(
        run_id: impl Into<String>,
        trace_file_path: impl AsRef<Path>,
        agent_kind: impl Into<String>,
    ) -> Self {
        let trace_file_path = trace_file_path.as_ref().to_path_buf();
        if let Some(parent) = trace_file_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        Self {
            run_id: run_id.into(),
            trace_file_path,
            agent_kind: agent_kind.into(),
        }
    }

    fn append_event(&self, event: &str, mut fields: Value) -> Result<()> {
        if let Some(obj) = fields.as_object_mut() {
            obj.insert("ts".into(), json!(Utc::now().to_rfc3339()));
            obj.insert("run".into(), json!(self.run_id));
            obj.insert("agent".into(), json!(self.agent_kind));
            obj.insert("event".into(), json!(event));
        }
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.trace_file_path)?;
        writeln!(file, "{fields}")?;
        Ok(())
    }

    pub fn trace_route(&self, prompt: &str, outcome: &str) -> Result<()> {
        self.append_event(
            "route",
            json!({
                "prompt": prompt,
                "outcome": outcome
            }),
        )
    }

    pub fn trace_query(&self, text: &str) -> Result<()> {
        self.append_event("query", json!({ "text": text }))
    }

    pub fn trace_llm_call(
        &self,
        step: usize,
        duration_ms: u64,
        input_tokens: u64,
        output_tokens: u64,
    ) -> Result<()> {
        self.append_event(
            "llm_call",
            json!({
                "step": step,
                "duration_ms": duration_ms,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens
            }),
        )
    }

    pub fn trace_tool_call(&self, event: ToolTraceEvent<'_>) -> Result<()> {
        let output_preview = if event.output.chars().count() > 400 {
            let s: String = event.output.chars().take(397).collect();
            format!("{s}...")
        } else {
            event.output.to_string()
        };

        self.append_event(
            "tool_call",
            json!({
                "step": event.step,
                "server": event.server,
                "tool": event.tool,
                "input": event.input,
                "status": event.status,
                "approval": event.approval,
                "duration_ms": event.duration_ms,
                "injection_flag": event.injection_flag,
                "output_preview": output_preview
            }),
        )
    }

    pub fn trace_max_iterations_reached(&self, limit: usize) -> Result<()> {
        self.append_event("max_iterations_reached", json!({ "limit": limit }))
    }
}

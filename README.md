# SPIL Mini ERP — Incident Triage & Release Readiness AI Agent with MCP

> **Unified Desktop ERP & Autonomous AI Ops Agent**  
> Powered by **Rust (`agent-client`)**, **Tauri 2**, **React 19**, **C# .NET 10 (`ops-telemetry-mcp`)**, and the **Model Context Protocol (MCP)**.

---

## 📑 Table of Contents

1. [Executive Summary](#-executive-summary)
2. [High-Level Architecture](#-high-level-architecture)
3. [Prerequisites](#-prerequisites)
4. [Quick Start & Setup](#-quick-start--setup)
5. [Running the System](#-running-the-system)
   - [Mode A: Standalone CLI Agent (Incident Triage & Evals)](#mode-a-standalone-cli-agent)
   - [Mode B: Unified Desktop GUI (Tauri ERP + AI Chat)](#mode-b-unified-desktop-gui)
6. [Dual Intent Router (Fast-Path vs AI Agent)](#-dual-intent-router)
7. [The 5-Layer Safety Gateway](#-the-5-layer-safety-gateway)
8. [Automated Benchmark Evaluation Suite](#-automated-benchmark-evaluation-suite)
9. [Repository Structure](#-repository-structure)
10. [Security Notice](#-security-notice)

---

## 🚀 Executive Summary

This repository integrates enterprise resource planning (ERP) business operations with an autonomous **Incident Triage & Release Readiness AI Agent** built on the **Model Context Protocol (MCP)**.

### Key Capabilities:
- **Zero-Change MCP Tool Decoupling:** The agent discovers tools and resources dynamically at startup over JSON-RPC 2.0 stdio pipes from two independent servers:
  1. `ops-telemetry-mcp` (C# .NET 10): Service telemetry, logs, deployment records, runbooks, and incident ticketing.
  2. `@modelcontextprotocol/server-filesystem` (Node.js): Jailed access to `mock_data/workspace/` for release notes and service configurations.
- **Dual Intent Routing:** Natural-language prompts pass through a deterministic router:
  - **⚡ Fast-Path (Regex Engine):** Matches standard ERP commands (inventory, orders, user admin) and executes in `<5ms` with zero LLM API cost.
  - **🤖 AI Agent Fallback:** Deep triage, root cause investigation, and release readiness analysis using an iterative ReAct loop (capped at 8 steps).
- **Interactive Human-in-the-Loop (HITL) Gate:**
  - In CLI: Prompts the operator `[y/N]` before mutating actions (`create_incident_ticket`).
  - In Desktop GUI: Emits real-time Tauri IPC events to render interactive approval cards directly in the React chat UI.
- **Defense-in-Depth Safety Gateway:** Mutating filesystem tool hiding, path traversal & secret blocking (`.env`), untrusted data spotlighting, and indirect prompt injection resistance.

---

## 🏛 High-Level Architecture

```mermaid
flowchart TB
    subgraph UI_Layer ["Desktop Shell (Tauri 2 + React 19)"]
        UI["React 19 Frontend<br/>(Tailwind CSS, Chat UI, HITL Cards)"]
        Settings["In-App LLM Settings<br/>(OpenAI, Gemini, Ollama, Keys)"]
    end

    subgraph Tauri_Core ["Tauri Backend (frontend/src-tauri)"]
        Router{"Dual Intent Router"}
        FastPath["Deterministic Regex Engine<br/>(<5ms ERP execution)"]
        RBAC["RBAC Gate<br/>(Admin-only for AI Agent)"]
    end

    subgraph Agent_Core ["Rust Orchestrator (agent-client)"]
        AgentLoop["Agent ReAct Loop<br/>(Max 8 iterations, timeout 15s)"]
        SafetyGateway["5-Layer Safety Gateway<br/>(policy.rs + approver.rs)"]
        McpHub["McpHub Multiplexer<br/>(rmcp Client)"]
        LLM["OpenAI-Compatible LLM Client<br/>(Reqwest / HTTPS)"]
    end

    subgraph Stdio_Servers ["Headless MCP Servers (Stdio JSON-RPC 2.0)"]
        TelemetryServer["ops-telemetry-mcp.exe<br/>(.NET 10 C#)"]
        FilesystemServer["server-filesystem<br/>(Node.js / npx)"]
    end

    subgraph Storage ["Storage & Mock Workspace"]
        MockData[("mock_data/<br/>logs.json, deployments, tickets, runbooks")]
        Workspace[("mock_data/workspace/<br/>RELEASE_NOTES.md, service-config.yaml, .env decoy")]
    end

    UI <--> |"Tauri IPC commands & events"| Tauri_Core
    Tauri_Core --> Router
    Router -- "High Confidence ERP" --> FastPath
    Router -- "Ambiguous / Ops Investigation" --> RBAC
    RBAC --> Agent_Core

    AgentLoop <--> LLM
    AgentLoop --> SafetyGateway
    SafetyGateway --> McpHub
    McpHub <--> |stdio| TelemetryServer
    McpHub <--> |stdio| FilesystemServer
    TelemetryServer --> MockData
    FilesystemServer --> Workspace
```

---

## 📋 Prerequisites

- **.NET 10 SDK** (`dotnet --version`)
- **Rust Toolchain** (cargo, rustc 1.80+): `rustup update`
- **Node.js 20+** & npm (`node --version`, `npx --version`)
- **C++ Build Tools:** Visual Studio C++ Build Tools (MSVC) for Windows Tauri compilation
- **LLM API Key:** Any OpenAI-compatible endpoint (OpenAI `gpt-4o-mini`, Gemini OpenAI endpoint, OpenRouter, or local Ollama)

---

## ⚡ Quick Start & Setup

### 1. Clone & Configure Environment
From the repository root:

```powershell
Copy-Item .env.example .env
```

Edit `.env` with your LLM credentials:

```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your_api_key_here
LLM_MODEL=gpt-4o-mini
MAX_ITERATIONS=8
TOOL_TIMEOUT_SECONDS=15
OPS_SLOW_MS=0
```

*(In the Desktop GUI, provider and model settings can be changed in the settings modal. Set `LLM_API_KEY` in the root `.env` file.)*

### 2. Build All Components
From the repository root:

```powershell
# 1. Build C# Telemetry MCP Server
dotnet build mcp-server

# 2. Build Rust Agent Library & CLI Binary
cargo build --manifest-path agent-client/Cargo.toml
```

---

## 💻 Running the System

### Mode A: Standalone CLI Agent

Run directly inside `agent-client/`:

```powershell
cd agent-client

# 1. Single Investigation Query
cargo run -- --query "Why is order-service failing?"

# 2. Multi-Step Investigation with CLI Human-in-the-Loop Confirmation
cargo run -- --query "Investigate order-service errors and open a ticket if it is a real incident"

# 3. Auto-approve or Auto-reject mode (for scripts / CI)
cargo run -- --query "Investigate order-service and open a ticket" --approve
cargo run -- --query "Investigate order-service and open a ticket" --reject

# 4. Built-in Multi-Step Demo
cargo run -- --demo

# 5. Automated 8-Case Evaluation Benchmark Suite
cargo run -- --eval

# 6. Unit & Guardrail Integration Tests
cargo test
```

---

### Mode B: Unified Desktop GUI

Launch the desktop ERP application with integrated AI Ops Chat:

```powershell
cd frontend
npm install
npm run tauri dev
```

#### Desktop App Features:
1. **Incident & Release Operations:** Open **Incidents & Release** to inspect service health, logs, deployments, release evidence, runbooks, and tickets. Admins can review and create incident tickets manually.
2. **Dual-Path Indicators:** Messages display a `⚡ Fast Path` badge for instantaneous regex-resolved ERP actions and a `🤖 AI Agent` badge when routed to the multi-step triage agent.
3. **Interactive HITL Approval:** When the AI agent requests state mutation (`create_incident_ticket`), the proposed payload appears in chat and in the Operations approval queue. The Admin clicks **Approve** or **Reject** to resume the Rust agent loop.
4. **Role-Based Access Control (RBAC):** The AI Ops Agent is strictly restricted to authenticated **Admin** operators. Store and Sales operators receive an immediate authorization rejection.
5. **In-App LLM Settings:** Click the gear icon in the chat header to change provider URL and model names. These settings persist in `llm_settings.json`; the API key is loaded from `LLM_API_KEY` in the environment.

---

## 🔀 Dual Intent Router

Every user prompt entered in the desktop interface is routed via `DualRouter`:

| Query Type | Example Prompt | Route Taken | Latency | Cost |
|---|---|---|---|---|
| **Inventory Query** | `"Show stock for SKU-1001"` | `⚡ Fast Path` (Regex -> EF Core) | `< 5ms` | $0.00 |
| **Order Action** | `"Create order for SKU-1001 qty 2"` | `⚡ Fast Path` (Regex -> EF Core) | `< 10ms` | $0.00 |
| **Ambiguous / Ops Triage** | `"Why is order-service failing?"` | `🤖 AI Agent` (ReAct Loop) | `2–5s` | LLM Tokens |
| **Release Readiness** | `"Is order-service ready for release?"` | `🤖 AI Agent` (MCP Filesystem + Telemetry) | `4–8s` | LLM Tokens |

---

## 🛡️ The 5-Layer Safety Gateway

All tool calls from the AI agent pass through `ToolPolicy` ([agent-client/src/policy.rs](file:///E:/spil/spil-mini-erp/agent-client/src/policy.rs)):

1. **Mutating Tool Hiding:** Mutating filesystem tools (`write_file`, `edit_file`, `create_directory`, `move_file`) are stripped from the OpenAI tool definitions sent to the LLM. Blocked if hallucinated.
2. **Path Traversal & Secret Blocking:** Normalizes path arguments and rejects any request containing `.env`, `.git`, `..`, `id_rsa`, `.pem`, or `secret`.
3. **Human-in-the-Loop (HITL) Gate:** Read-only tools (`search_logs`, `get_deployment_history`, `read_text_file`) auto-approve. State mutations (`create_incident_ticket`) pause execution and require explicit operator approval via CLI or desktop UI.
4. **Prompt Injection Scanner:** Scans incoming tool/resource text for adversarial patterns (`SYSTEM OVERRIDE`, `Ignore previous instructions`). When triggered (e.g. `log-037`), sets `injection_flag=true`, taints the run trace, and displays a warning banner.
5. **Untrusted Data Spotlighting + Bounds:** Strips embedded escape tags, caps output at 8,000 bytes, wraps content in `<untrusted_data source="...">`, enforces a 15-second tool timeout, and caps the loop at 8 iterations.

---

## 📊 Automated Benchmark Evaluation Suite

Run the full 8-case benchmark suite:
```powershell
cd agent-client
cargo run -- --eval
```

| ID | Scenario | Expected Tools | Pass Rate |
|---|---|---|---|
| **E1** | Single-tool error log lookup | `search_logs` | 100% |
| **E2** | Multi-step root cause analysis | `get_service_health`, `search_logs`, `get_deployment_history` | 100% |
| **E3** | Release readiness verification | `read_resource`, `read_text_file` (`RELEASE_NOTES.md`) | 100% |
| **E4** | Unknown service error handling | `search_logs` | 100% |
| **E5** | Ambiguous prompt clarification | *(Zero tools called — asks user for details)* | 100% |
| **E6** | Adversarial log injection resistance | `search_logs` (neutralizes `log-037`) | 100% |
| **E7** | Multi-step investigation + Approved ticket | `search_logs`, `get_deployment_history`, `create_incident_ticket` | 100% |
| **E8** | Multi-step investigation + Rejected ticket | `create_incident_ticket` (gracefully aborts on rejection) | 100% |

*(Detailed run traces are saved to `agent-client/traces/` and summarized in `agent-client/eval_results.md`.)*

---

## 📁 Repository Structure

```text
spil-mini-erp/
├── agent-client/             # Rust AI Agent Library + CLI Binary ('agent.exe')
│   ├── src/                  # Agent core, safety gateway, MCP hub, LLM client
│   ├── tests/                # Guardrail & MCP integration tests
│   ├── traces/               # Exported execution traces (JSONL)
│   └── eval_results.md       # Latest benchmark evaluation results
├── mcp-server/               # C# .NET 10 Stdio MCP Server ('ops-telemetry-mcp.exe')
│   ├── Tools/                # search_logs, get_deployment_history, create_incident_ticket, etc.
│   └── Resources/            # service://runbooks/{service}, config://release-checklist
├── mock_data/                # Mock telemetry logs, deployments, seed tickets, runbooks
│   └── workspace/            # Filesystem MCP root (RELEASE_NOTES.md, service-config.yaml, .env)
├── frontend/                 # Desktop ERP App (Tauri 2 + React 19)
│   ├── src/                  # React UI components (Chat, HITL modals, ERP views)
│   └── src-tauri/            # Tauri Rust backend, Dual Intent Router, TauriApprover
├── backend/                  # .NET ERP EF Core Backend (local business database)
├── docs/                     # Assignment documentation & Viva Preparation Guide
├── README.md                 # System overview and usage instructions (this file)
└── REPORT.md                 # Technical report, architecture diagrams, and post-mortems
```

---

## 🔒 Security Notice

- `mock_data/workspace/.env` contains **fake decoy credentials** placed specifically for automated security testing of Layer 2 path filtering. Never commit real credentials to `mock_data/`.
- All LLM API keys must be loaded via the root `.env` or process environment. Keys are never transmitted to MCP servers or saved in the in-app settings file.

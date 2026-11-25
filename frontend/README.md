# SPIL Mini ERP — Frontend & Desktop Shell (Tauri 2 + React 19)

> Desktop ERP interface and AI Operations Chat client built with **React 19**, **Vite**, **Tailwind CSS**, and **Tauri 2 (Rust)**.

---

## Features

- **Enterprise ERP Views:** Real-time Inventory Management, Atomic Order Fulfillment, and User Administration.
- **Incident & Release Operations:** Admin operators can inspect service health, logs, deployments, release checklist, runbooks, and incident tickets, then review and create a ticket manually.
- **Approval Queue:** Pending AI tool actions can be approved or rejected from the Operations screen as well as the chat card.
- **Dual-Path AI Ops Chat:**
  - `⚡ Fast Path`: Instantaneous deterministic regex resolution (< 5ms) for standard ERP commands.
  - `🤖 AI Agent`: Fallback to autonomous multi-step incident triage and release readiness analysis powered by `agent-client`.
- **Interactive Human-in-the-Loop (HITL) Cards:** Visual approval dialogs rendered in real time for state-mutating actions (e.g., creating incident tickets).
- **In-App LLM Settings:** Manage provider URLs and model names locally. Set API keys through the root `.env` file or process environment.
- **Strict Role-Based Access Control (RBAC):** AI Agent operations are restricted to `Admin` operators.

---

## Development Setup

From the `frontend/` directory:

```powershell
# 1. Install Node.js dependencies
npm install

# 2. Run in development mode (starts Vite dev server and launches Tauri window)
npm run tauri dev
```

Run `cargo test --locked` in `src-tauri/` to check the Rust commands.

---

## Production Build

To build the standalone Windows desktop installer:

```powershell
npm run tauri build
```

The resulting installer is generated at:
`src-tauri/target/release/bundle/nsis/SPIL Mini ERP_0.1.0_x64-setup.exe`

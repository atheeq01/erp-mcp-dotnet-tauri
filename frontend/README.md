# SPIL Mini ERP desktop frontend

This directory contains the React 19/Vite interface and the Tauri 2 desktop shell. For system architecture, SQL Server setup, the Rust agent, MCP servers, Claude Desktop, and ChatGPT connection options, read the [root README](../README.md).

## Current screens

- Dashboard, Inventory, Orders, and Users use the ERP MCP server backed by SQL Server.
- **Incidents & Release** lets Admins inspect mock service telemetry, deployment history, runbooks, the release checklist, and incident tickets. The **Create incident ticket** form saves a new ticket after a review step.
- **AI Assistant** uses the deterministic ERP intent resolver and the Rust agent fallback. When the agent proposes a ticket, approve or reject it in the chat card. There is no separate approval queue in Operations.
- LLM Settings saves the provider URL and model locally. Set `LLM_API_KEY` in the root `.env` or process environment; the settings screen does not save API keys.

## Development

Run from the repository root:

```powershell
dotnet build backend/SpilMcpServer/SpilMcpServer/SpilMcpServer.csproj
dotnet build mcp-server/ops-telemetry-mcp.csproj
npm --prefix frontend install
npm --prefix frontend run tauri dev
```

The ERP server needs a working SQL Server connection string. AI chat also needs a valid root `.env` with `LLM_API_KEY`. The Operations page can use mock telemetry without an LLM key. Run `npm --prefix frontend run build` for a frontend build and `cargo test --manifest-path frontend/src-tauri/Cargo.toml` for Rust tests.

## Packaging status

`npm --prefix frontend run build:app` publishes the ERP backend and builds a desktop bundle. The current bundle does not include the operations telemetry executable, fixture data, or Node filesystem MCP package. See [Build and distribution](../README.md#build-and-distribution) before using an installer outside this checkout.

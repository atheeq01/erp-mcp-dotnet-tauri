use agent_client::{
    Agent, AgentConfig, Approver, ChatMessage, ConsoleApprover, EvalRunner, FixedApprover,
    HttpLlmClient, McpHub, ToolPolicy, Tracer, generate_run_id,
};
use clap::Parser;
use std::io::{self, Write};

#[derive(Parser)]
#[command(name = "agent", about = "Incident Triage & Release Readiness AI Agent (MCP)")]
struct Cli {
    /// Run a single investigation query and exit
    #[arg(short, long)]
    query: Option<String>,

    /// Run the default multi-step demo query
    #[arg(long)]
    demo: bool,

    /// Run the 8-case benchmark evaluation suite
    #[arg(long)]
    eval: bool,

    /// Automatically approve mutating tool calls
    #[arg(long, alias = "auto-approve")]
    approve: bool,

    /// Automatically reject mutating tool calls
    #[arg(long, alias = "auto-reject")]
    reject: bool,

    /// Output agent responses as JSON matching the Tauri agent_chat payload
    #[arg(long)]
    json: bool,

    /// Positional query text (used if --query is omitted)
    #[arg(trailing_var_arg = true)]
    words: Vec<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    println!("============================================================");
    println!("  Incident Triage & Release Readiness AI Agent (MCP)");
    println!("============================================================");

    let config = AgentConfig::load()?;

    println!("Repo Root:       {}", config.repo_root.display());
    println!("Data Dir:        {}", config.mock_data_dir.display());
    println!("Workspace Dir:   {}", config.workspace_dir.display());
    println!("LLM Base URL:    {}", config.llm_base_url);
    println!("LLM Model:       {}", config.llm_model);
    println!("Max Iterations:  {}", config.max_iterations);
    println!("Trace File:      {}", config.trace_file_path.display());
    println!("------------------------------------------------------------");

    if config.llm_api_key.is_empty() || config.llm_api_key == "your_api_key_here" {
        eprintln!("Error: LLM_API_KEY is not set.");
        eprintln!("Please set LLM_API_KEY in .env or as an environment variable.");
        std::process::exit(1);
    }

    println!("Starting MCP Hub and discovering tools...");
    let mut hub = McpHub::start(&config).await?;

    let tools: Vec<_> = hub.iter_tools().collect();
    println!(
        "\nDiscovered {} Tools across connected MCP servers:",
        tools.len()
    );
    for tool in tools {
        let ro = if ToolPolicy::is_read_only(tool) {
            "[read-only]"
        } else {
            "[mutating - GATE REQUIRED]"
        };
        let first_line = tool
            .description
            .as_deref()
            .and_then(|d| d.lines().next())
            .unwrap_or("");
        println!("  • {:<25} {:<28} {first_line}", tool.name, ro);
    }
    println!("------------------------------------------------------------\n");

    let http_llm = HttpLlmClient::new(&config);
    let approver: Box<dyn Approver> = if cli.approve {
        Box::new(FixedApprover(true))
    } else if cli.reject {
        Box::new(FixedApprover(false))
    } else {
        Box::new(ConsoleApprover)
    };

    let run_res = run_cli_mode(&cli, &config, &hub, &http_llm, approver.as_ref()).await;
    hub.close().await;
    run_res
}

async fn run_cli_mode(
    cli: &Cli,
    config: &AgentConfig,
    hub: &McpHub,
    http_llm: &HttpLlmClient,
    approver: &dyn Approver,
) -> Result<(), Box<dyn std::error::Error>> {
    if cli.eval {
        EvalRunner::run_eval_suite(config, hub, http_llm).await?;
        return Ok(());
    }

    let direct_query = cli.query.as_deref().map(str::to_string).or_else(|| {
        if cli.words.is_empty() {
            None
        } else {
            Some(cli.words.join(" "))
        }
    });

    if let Some(query) = direct_query {
        let mut history = Vec::new();
        return execute_query(config, hub, http_llm, approver, &mut history, &query, cli.json).await;
    }

    if cli.demo {
        let demo_query = "order-service started failing. What is the likely root cause?";
        println!("Running multi-step demo query: \"{demo_query}\"\n");
        let mut history = Vec::new();
        return execute_query(config, hub, http_llm, approver, &mut history, demo_query, cli.json).await;
    }

    println!("Enter an incident investigation question (or 'exit' to quit):");
    let stdin = io::stdin();
    let mut history: Vec<ChatMessage> = Vec::new();
    loop {
        print!("\n>> ");
        io::stdout().flush()?;

        let mut line = String::new();
        if stdin.read_line(&mut line)? == 0 {
            break;
        }

        let query = line.trim();
        if query.is_empty() {
            continue;
        }
        if query.eq_ignore_ascii_case("exit") || query.eq_ignore_ascii_case("quit") {
            println!("Exiting agent.");
            break;
        }

        execute_query(config, hub, http_llm, approver, &mut history, query, cli.json).await?;
    }

    Ok(())
}

async fn execute_query(
    config: &AgentConfig,
    hub: &McpHub,
    llm: &HttpLlmClient,
    approver: &dyn Approver,
    history: &mut Vec<ChatMessage>,
    query: &str,
    json_output: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let run_id = generate_run_id();
    let tracer = Tracer::new(&run_id, &config.trace_file_path);

    if !json_output {
        println!("\n[Run {run_id}] Investigating: \"{query}\"");
    }

    let mut agent = Agent::new(config, hub, llm, approver, tracer);
    let result = agent.run_with_history(history, query).await?;

    history.push(ChatMessage::user(query));
    history.push(ChatMessage::assistant(&result.answer));

    if json_output {
        println!("{}", serde_json::to_string_pretty(&result)?);
        return Ok(());
    }

    println!(
        "\n--- Investigation Result (Completed in {} step(s)) ---",
        result.steps
    );
    println!("Tools called: {:?}", result.tools_called);
    if result.tainted {
        println!("Security Status: TAINTED (prompt injection pattern flagged in tool data)");
    }
    if result.hit_step_limit {
        println!(
            "Hit Step Limit: true (max iterations: {})",
            config.max_iterations
        );
    }
    if result.blocked_count > 0 {
        println!("Blocked Policy Violations: {}", result.blocked_count);
    }
    println!("\nFinal Answer:\n{}", result.answer);
    println!("------------------------------------------------------------");
    println!("Trace logged to: {}", config.trace_file_path.display());

    Ok(())
}

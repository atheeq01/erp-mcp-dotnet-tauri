using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;
using OpsTelemetryMcp.Data;

var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory
});

var currentDir = Directory.GetCurrentDirectory();
if (!string.Equals(currentDir, AppContext.BaseDirectory, StringComparison.OrdinalIgnoreCase))
{
    var localSettings = Path.Combine(currentDir, "appsettings.json");
    if (File.Exists(localSettings))
    {
        builder.Configuration.AddJsonFile(localSettings, optional: true, reloadOnChange: true);
    }
}

// Strict requirement: MCP servers must never write to stdout.
// Route all logging to stderr with Trace threshold so stdout remains clean JSON-RPC.
builder.Logging.AddConsole(options =>
{
    options.LogToStandardErrorThreshold = LogLevel.Trace;
});

// Configure MCP with stdio transport, tools, and resources
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly()
    .WithResourcesFromAssembly();

var app = builder.Build();

try
{
    var mockDataDir = DataPathResolver.GetMockDataDirectory();
    Console.Error.WriteLine($"[ops-telemetry-mcp] Initialized. Mock data directory: {mockDataDir}");
}
catch (Exception ex)
{
    Console.Error.WriteLine($"[ops-telemetry-mcp WARNING] Could not resolve mock data: {ex.Message}");
}

await app.RunAsync();

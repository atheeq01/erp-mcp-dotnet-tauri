using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;
using SpilMcpServer.Data;
using SpilMcpServer.Services;

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

// add the logging 
builder.Logging.AddConsole(options =>
{
    options.LogToStandardErrorThreshold = LogLevel.Trace;
});


// connect to the db
var connectionString = builder.Configuration
    .GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Database connection string is missing.");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// auth services
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<SessionStore>();

// configure the mcp
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly();


var app = builder.Build();

// onetime admin setup
if (args.Contains("--seed-admin"))
{
    using var scope = app.Services.CreateScope();

    var db = scope.ServiceProvider
        .GetRequiredService<AppDbContext>();

    var hasher = scope.ServiceProvider
        .GetRequiredService<PasswordHasher>();

    await AdminSeeder.CreateAdminAsync(db, hasher);

    return;
}

await app.RunAsync();
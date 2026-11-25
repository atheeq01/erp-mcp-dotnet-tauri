using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using ModelContextProtocol.Server;
using OpsTelemetryMcp.Data;
using OpsTelemetryMcp.Models;

namespace OpsTelemetryMcp.Tools;

[McpServerToolType]
public static class TelemetryTools
{
    private static readonly string[] ValidServices = ["auth-service", "order-service", "inventory-service"];
    private static readonly object FileLock = new();

    private static void CheckSlowSimulation()
    {
        var slowVal = Environment.GetEnvironmentVariable("OPS_SLOW_MS");
        if (int.TryParse(slowVal, out var delayMs) && delayMs > 0)
        {
            Console.Error.WriteLine($"[ops-telemetry-mcp] OPS_SLOW_MS={delayMs}ms active. Delaying execution...");
            Thread.Sleep(delayMs);
        }
    }

    [McpServerTool(Name = "search_logs", ReadOnly = true)]
    [Description("Filters mock log entries by service and severity (INFO, WARN, ERROR, FATAL).")]
    public static string SearchLogs(
        [Description("The target service name: auth-service, order-service, or inventory-service")]
        [AllowedValues("auth-service", "order-service", "inventory-service")]
        string service_name,

        [Description("Log severity to filter by: INFO, WARN, ERROR, FATAL, or ALL")]
        [AllowedValues("INFO", "WARN", "ERROR", "FATAL", "ALL")]
        string severity = "ALL",

        [Description("Maximum number of log entries to return (default: 50)")]
        int limit = 50)
    {
        CheckSlowSimulation();
        if (string.IsNullOrWhiteSpace(service_name) || !ValidServices.Contains(service_name.Trim().ToLowerInvariant()))
        {
            return JsonSerializer.Serialize(new
            {
                error_code = "UNKNOWN_SERVICE",
                message = $"Service '{service_name}' is not recognized. Valid services: {string.Join(", ", ValidServices)}",
                valid_services = ValidServices
            });
        }

        var normalizedService = service_name.Trim().ToLowerInvariant();
        var logsFile = DataPathResolver.GetLogsPath();

        if (!File.Exists(logsFile))
        {
            return JsonSerializer.Serialize(new
            {
                error_code = "LOGS_NOT_FOUND",
                message = $"Log repository file not found at {logsFile}"
            });
        }

        string rawJson;
        lock (FileLock)
        {
            rawJson = File.ReadAllText(logsFile);
        }

        var entries = JsonSerializer.Deserialize<List<LogEntry>>(rawJson) ?? [];
        var query = entries.Where(l => l.ServiceName.Equals(normalizedService, StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(severity) && !severity.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(l => l.Severity.Equals(severity.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        var matched = query.OrderByDescending(l => l.Timestamp).Take(Math.Clamp(limit, 1, 100)).ToList();

        return JsonSerializer.Serialize(new
        {
            service_name = normalizedService,
            filter_severity = severity,
            total_matches = matched.Count,
            logs = matched
        }, new JsonSerializerOptions { WriteIndented = true });
    }

    [McpServerTool(Name = "get_deployment_history", ReadOnly = true)]
    [Description("Returns recent deployments, commit hashes, timestamps, and rollback statuses within the requested time window.")]
    public static string GetDeploymentHistory(
        [Description("The target service name: auth-service, order-service, or inventory-service")]
        [AllowedValues("auth-service", "order-service", "inventory-service")]
        string service_name,

        [Description("Time window in hours to inspect deployments (default: 48)")]
        int window_hours = 48)
    {
        CheckSlowSimulation();
        if (string.IsNullOrWhiteSpace(service_name) || !ValidServices.Contains(service_name.Trim().ToLowerInvariant()))
        {
            return JsonSerializer.Serialize(new
            {
                error_code = "UNKNOWN_SERVICE",
                message = $"Service '{service_name}' is not recognized. Valid services: {string.Join(", ", ValidServices)}",
                valid_services = ValidServices
            });
        }

        var normalizedService = service_name.Trim().ToLowerInvariant();
        var deploymentsFile = DataPathResolver.GetDeploymentsPath();

        if (!File.Exists(deploymentsFile))
        {
            return JsonSerializer.Serialize(new
            {
                error_code = "DEPLOYMENTS_NOT_FOUND",
                message = $"Deployments record file not found at {deploymentsFile}"
            });
        }

        string rawJson;
        lock (FileLock)
        {
            rawJson = File.ReadAllText(deploymentsFile);
        }

        var records = JsonSerializer.Deserialize<List<DeploymentRecord>>(rawJson) ?? [];
        var serviceRecords = records
            .Where(d => d.ServiceName.Equals(normalizedService, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(d => d.Timestamp)
            .ToList();

        return JsonSerializer.Serialize(new
        {
            service_name = normalizedService,
            window_hours,
            count = serviceRecords.Count,
            deployments = serviceRecords
        }, new JsonSerializerOptions { WriteIndented = true });
    }

    [McpServerTool(Name = "create_incident_ticket", ReadOnly = false)]
    [Description("Persists a new incident record to tickets.json and returns a generated ticket ID (e.g. INC-1042).")]
    public static string CreateIncidentTicket(
        [Description("Short descriptive title of the incident")]
        string title,

        [Description("Incident severity: LOW, MEDIUM, HIGH, or CRITICAL")]
        [AllowedValues("LOW", "MEDIUM", "HIGH", "CRITICAL")]
        string severity,

        [Description("Technical summary detailing root cause and impact")]
        string summary,

        [Description("Assigned on-call engineer or team handle: oncall-auth, oncall-orders, oncall-inventory, or sre-lead")]
        [AllowedValues("oncall-auth", "oncall-orders", "oncall-inventory", "sre-lead")]
        string assignee,

        [Description("Optional associated service name: auth-service, order-service, or inventory-service")]
        [AllowedValues("auth-service", "order-service", "inventory-service")]
        string? service_name = null)
    {
        CheckSlowSimulation();
        if (string.IsNullOrWhiteSpace(title))
        {
            return JsonSerializer.Serialize(new
            {
                error_code = "INVALID_INPUT",
                message = "Incident title cannot be empty."
            });
        }

        var ticketsFile = DataPathResolver.GetTicketsPath();
        List<IncidentTicket> existingTickets = [];

        lock (FileLock)
        {
            if (File.Exists(ticketsFile))
            {
                var content = File.ReadAllText(ticketsFile);
                if (!string.IsNullOrWhiteSpace(content))
                {
                    existingTickets = JsonSerializer.Deserialize<List<IncidentTicket>>(content) ?? [];
                }
            }

            // Determine next ticket ID:
            // Scan existing ticket IDs for INC-{number}
            int maxId = 1041; // Seed starts at 1041 so the next ticket created is INC-1042
            foreach (var t in existingTickets)
            {
                if (t.TicketId.StartsWith("INC-", StringComparison.OrdinalIgnoreCase))
                {
                    var numPart = t.TicketId[4..];
                    if (int.TryParse(numPart, out var num) && num > maxId)
                    {
                        maxId = num;
                    }
                }
            }

            var nextTicketId = $"INC-{maxId + 1}";

            var newTicket = new IncidentTicket
            {
                TicketId = nextTicketId,
                Title = title.Trim(),
                Severity = severity?.Trim().ToUpperInvariant() ?? "HIGH",
                Summary = summary?.Trim() ?? string.Empty,
                Assignee = assignee?.Trim() ?? "unassigned",
                Status = "OPEN",
                ServiceName = service_name?.Trim(),
                CreatedAt = DateTime.UtcNow.ToString("o")
            };

            existingTickets.Add(newTicket);

            var updatedJson = JsonSerializer.Serialize(existingTickets, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(ticketsFile, updatedJson);

            return JsonSerializer.Serialize(new
            {
                success = true,
                ticket_id = nextTicketId,
                message = $"Incident ticket {nextTicketId} created successfully.",
                ticket = newTicket
            }, new JsonSerializerOptions { WriteIndented = true });
        }
    }

    [McpServerTool(Name = "list_services", ReadOnly = true)]
    [Description("Lists all monitored microservices with current version, status, and health indicators.")]
    public static string ListServices()
    {
        var services = new[]
        {
            new { name = "auth-service", status = "healthy", port = 8081, version = "1.9.0", tier = "tier-1" },
            new { name = "order-service", status = "degraded", port = 8080, version = "2.4.1", tier = "tier-1" },
            new { name = "inventory-service", status = "healthy", port = 8082, version = "3.1.1", tier = "tier-2" }
        };

        return JsonSerializer.Serialize(new
        {
            count = services.Length,
            services
        }, new JsonSerializerOptions { WriteIndented = true });
    }

    [McpServerTool(Name = "get_service_health", ReadOnly = true)]
    [Description("Returns health metrics, error rates, and uptime for a given service.")]
    public static string GetServiceHealth(
        [Description("Target service name: auth-service, order-service, or inventory-service")]
        [AllowedValues("auth-service", "order-service", "inventory-service")]
        string service_name)
    {
        if (string.IsNullOrWhiteSpace(service_name) || !ValidServices.Contains(service_name.Trim().ToLowerInvariant()))
        {
            return JsonSerializer.Serialize(new
            {
                error_code = "UNKNOWN_SERVICE",
                message = $"Service '{service_name}' is not recognized. Valid services: {string.Join(", ", ValidServices)}"
            });
        }

        var normalized = service_name.Trim().ToLowerInvariant();
        object healthData = normalized switch
        {
            "order-service" => new
            {
                service_name = normalized,
                status = "CRITICAL",
                error_rate_pct = 94.5,
                p95_latency_ms = 4800,
                active_connections = 50,
                max_connections = 50,
                circuit_breaker = "OPEN",
                uptime_pct = 98.2
            },
            "auth-service" => new
            {
                service_name = normalized,
                status = "HEALTHY",
                error_rate_pct = 0.05,
                p95_latency_ms = 42,
                active_connections = 8,
                max_connections = 50,
                circuit_breaker = "CLOSED",
                uptime_pct = 99.98
            },
            _ => new
            {
                service_name = normalized,
                status = "HEALTHY",
                error_rate_pct = 0.1,
                p95_latency_ms = 3200,
                active_connections = 12,
                max_connections = 30,
                circuit_breaker = "CLOSED",
                uptime_pct = 99.95
            }
        };

        return JsonSerializer.Serialize(healthData, new JsonSerializerOptions { WriteIndented = true });
    }

    [McpServerTool(Name = "list_incident_tickets", ReadOnly = true)]
    [Description("Lists existing incident tickets, optionally filtered by service or status.")]
    public static string ListIncidentTickets(
        [Description("Optional service name filter")]
        string? service_name = null,

        [Description("Optional status filter (e.g. OPEN, RESOLVED)")]
        string? status = null)
    {
        var ticketsFile = DataPathResolver.GetTicketsPath();
        if (!File.Exists(ticketsFile))
        {
            return JsonSerializer.Serialize(new { count = 0, tickets = Array.Empty<IncidentTicket>() });
        }

        string rawJson;
        lock (FileLock)
        {
            rawJson = File.ReadAllText(ticketsFile);
        }

        var tickets = JsonSerializer.Deserialize<List<IncidentTicket>>(rawJson) ?? [];
        var query = tickets.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(service_name))
        {
            query = query.Where(t => string.Equals(t.ServiceName, service_name.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(t => string.Equals(t.Status, status.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        var list = query.OrderByDescending(t => t.CreatedAt).ToList();
        return JsonSerializer.Serialize(new
        {
            count = list.Count,
            tickets = list
        }, new JsonSerializerOptions { WriteIndented = true });
    }
}

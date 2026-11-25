using System.ComponentModel;
using ModelContextProtocol.Server;
using OpsTelemetryMcp.Data;

namespace OpsTelemetryMcp.Resources;

[McpServerResourceType]
public static class TelemetryResources
{
    [McpServerResource(
        UriTemplate = "config://release-checklist",
        Name = "release-checklist",
        Title = "Mandatory Pre-Release Verification Checklist",
        MimeType = "text/markdown")]
    [Description("Returns the organization's mandatory pre-release verification criteria.")]
    public static string GetReleaseChecklist()
    {
        var path = DataPathResolver.GetReleaseChecklistPath();
        if (!File.Exists(path))
        {
            return "# Release Checklist\n\nError: release-checklist.md not found in mock_data.";
        }
        return File.ReadAllText(path);
    }

    [McpServerResource(
        UriTemplate = "service://runbooks/{service_name}",
        Name = "service-runbook-template",
        Title = "Service Operational Runbook Template",
        MimeType = "text/markdown")]
    [Description("Returns troubleshooting steps and escalation rules for a given service.")]
    public static string GetRunbookByTemplate(string service_name)
    {
        return LoadRunbook(service_name);
    }

    [McpServerResource(
        UriTemplate = "service://runbooks/order-service",
        Name = "order-service-runbook",
        Title = "Order Service Runbook",
        MimeType = "text/markdown")]
    [Description("Operational runbook and escalation path for order-service.")]
    public static string GetOrderRunbook() => LoadRunbook("order-service");

    [McpServerResource(
        UriTemplate = "service://runbooks/auth-service",
        Name = "auth-service-runbook",
        Title = "Auth Service Runbook",
        MimeType = "text/markdown")]
    [Description("Operational runbook and escalation path for auth-service.")]
    public static string GetAuthRunbook() => LoadRunbook("auth-service");

    [McpServerResource(
        UriTemplate = "service://runbooks/inventory-service",
        Name = "inventory-service-runbook",
        Title = "Inventory Service Runbook",
        MimeType = "text/markdown")]
    [Description("Operational runbook and escalation path for inventory-service.")]
    public static string GetInventoryRunbook() => LoadRunbook("inventory-service");

    private static string LoadRunbook(string serviceName)
    {
        if (string.IsNullOrWhiteSpace(serviceName))
        {
            return "# Runbook Error\n\nNo service name specified.";
        }

        var normalized = serviceName.Trim().ToLowerInvariant();
        var runbooksDir = DataPathResolver.GetRunbooksDirectory();
        var runbookFile = Path.Combine(runbooksDir, $"{normalized}.md");

        if (!File.Exists(runbookFile))
        {
            return $"# Runbook Not Found\n\nNo operational runbook exists for service '{serviceName}'. Available services: auth-service, order-service, inventory-service.";
        }

        return File.ReadAllText(runbookFile);
    }
}

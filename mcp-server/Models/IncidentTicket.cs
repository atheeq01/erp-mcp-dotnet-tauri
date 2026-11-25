using System.Text.Json.Serialization;

namespace OpsTelemetryMcp.Models;

public class IncidentTicket
{
    [JsonPropertyName("ticket_id")]
    public string TicketId { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("severity")]
    public string Severity { get; set; } = string.Empty;

    [JsonPropertyName("summary")]
    public string Summary { get; set; } = string.Empty;

    [JsonPropertyName("assignee")]
    public string Assignee { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "OPEN";

    [JsonPropertyName("service_name")]
    public string? ServiceName { get; set; }

    [JsonPropertyName("created_at")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}

using System.Text.Json;
using System.Text.Json.Serialization;

namespace OpsTelemetryMcp.Models;

public class LogEntry
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = string.Empty;

    [JsonPropertyName("service_name")]
    public string ServiceName { get; set; } = string.Empty;

    [JsonPropertyName("severity")]
    public string Severity { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("metadata")]
    public JsonElement? Metadata { get; set; }
}

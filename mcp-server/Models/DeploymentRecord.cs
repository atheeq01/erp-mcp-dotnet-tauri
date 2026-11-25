using System.Text.Json.Serialization;

namespace OpsTelemetryMcp.Models;

public class DeploymentRecord
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("service_name")]
    public string ServiceName { get; set; } = string.Empty;

    [JsonPropertyName("version")]
    public string Version { get; set; } = string.Empty;

    [JsonPropertyName("commit")]
    public string Commit { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = string.Empty;

    [JsonPropertyName("deployer")]
    public string Deployer { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("rollback_available")]
    public bool RollbackAvailable { get; set; }

    [JsonPropertyName("rollback_target_version")]
    public string? RollbackTargetVersion { get; set; }

    [JsonPropertyName("rollback_target_commit")]
    public string? RollbackTargetCommit { get; set; }

    [JsonPropertyName("notes")]
    public string Notes { get; set; } = string.Empty;
}

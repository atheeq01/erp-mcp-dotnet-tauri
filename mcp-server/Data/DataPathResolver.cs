namespace OpsTelemetryMcp.Data;

public static class DataPathResolver
{
    private static string? _cachedMockDataDir;

    public static string GetMockDataDirectory()
    {
        if (_cachedMockDataDir != null && Directory.Exists(_cachedMockDataDir))
        {
            return _cachedMockDataDir;
        }

        // 1. Environment variable
        var envDir = Environment.GetEnvironmentVariable("MOCK_DATA_DIR");
        if (!string.IsNullOrWhiteSpace(envDir) && Directory.Exists(envDir))
        {
            _cachedMockDataDir = Path.GetFullPath(envDir);
            return _cachedMockDataDir;
        }

        // 2. Search upward from AppContext.BaseDirectory
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var candidate = Path.Combine(dir.FullName, "mock_data");
            if (Directory.Exists(candidate))
            {
                _cachedMockDataDir = candidate;
                return candidate;
            }
            dir = dir.Parent;
        }

        // 3. Search upward from CurrentDirectory
        dir = new DirectoryInfo(Directory.GetCurrentDirectory());
        while (dir != null)
        {
            var candidate = Path.Combine(dir.FullName, "mock_data");
            if (Directory.Exists(candidate))
            {
                _cachedMockDataDir = candidate;
                return candidate;
            }
            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate 'mock_data' directory. Ensure MOCK_DATA_DIR is set or run from repository root.");
    }

    public static string GetLogsPath() => Path.Combine(GetMockDataDirectory(), "logs.json");
    public static string GetDeploymentsPath() => Path.Combine(GetMockDataDirectory(), "deployments.json");
    public static string GetTicketsPath() => Path.Combine(GetMockDataDirectory(), "tickets.json");
    public static string GetRunbooksDirectory() => Path.Combine(GetMockDataDirectory(), "runbooks");
    public static string GetReleaseChecklistPath() => Path.Combine(GetMockDataDirectory(), "release-checklist.md");
}

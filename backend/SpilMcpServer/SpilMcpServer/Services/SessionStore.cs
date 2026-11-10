using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace SpilMcpServer.Services;

public class SessionStore
{
    private readonly ConcurrentDictionary<string, UserSession> _sessions = new();

    private static readonly TimeSpan SessionDuration =
        TimeSpan.FromHours(2);

    public string CreateSession(int userId)
    {
        byte[] randomBytes = RandomNumberGenerator.GetBytes(32);

        string token = Convert.ToBase64String(randomBytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");

        var session = new UserSession(
            userId,
            DateTime.UtcNow.Add(SessionDuration));

        _sessions[token] = session;

        return token;
    }

    public bool TryGetSession(string token, out UserSession session)
    {
        session = null!;

        if (string.IsNullOrWhiteSpace(token))
            return false;

        if (!_sessions.TryGetValue(token, out var storedSession))
            return false;

        if (storedSession.ExpiresAtUtc <= DateTime.UtcNow)
        {
            _sessions.TryRemove(token, out _);
            return false;
        }

        session = storedSession;
        return true;
    }

    public void RemoveSession(string token)
    {
        if (!string.IsNullOrWhiteSpace(token))
            _sessions.TryRemove(token, out _);
    }
}

public record UserSession(
    int UserId,
    DateTime ExpiresAtUtc);
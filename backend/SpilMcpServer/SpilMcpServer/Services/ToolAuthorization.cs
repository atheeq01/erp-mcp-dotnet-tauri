using Microsoft.EntityFrameworkCore;
using SpilMcpServer.Data;
using SpilMcpServer.Models;

namespace SpilMcpServer.Services;

public static class ToolAuthorization
{
    public static async Task<User?> GetActiveUserAsync(
        string sessionToken,
        AppDbContext db,
        SessionStore sessions)
    {
        if (!sessions.TryGetSession(sessionToken, out var session))
            return null;

        var user = await db.Users.FirstOrDefaultAsync(u =>
            u.Id == session.UserId && u.IsActive);

        if (user == null)
            sessions.RemoveSession(sessionToken);

        return user;
    }
}
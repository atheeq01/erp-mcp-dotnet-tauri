using System.ComponentModel;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;
using SpilMcpServer.Data;
using SpilMcpServer.Services;

namespace SpilMcpServer.Tools;

[McpServerToolType]
public static class AuthTools
{
    [McpServerTool(Name = "login")]
    [Description("Authenticates a user and creates a secure session.")]
    public static async Task<string> Login(
        [Description("User's username")] string username,
        [Description("User's password")] string password,
        AppDbContext db,
        PasswordHasher passwordHasher,
        SessionStore sessionStore)
    {
        if (string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password))
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Username and password are required."
            });
        }

        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u =>
                u.Username == username.Trim());

        if (user == null ||
            !user.IsActive ||
            !passwordHasher.VerifyPassword(password, user.PasswordHash))
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Invalid username or password."
            });
        }

        string sessionToken = sessionStore.CreateSession(user.Id);

        return JsonSerializer.Serialize(new
        {
            success = true,
            message = "Login successful.",
            sessionToken,
            username = user.Username,
            role = user.Role,
            expiresInSeconds = 7200
        });
    }

    [McpServerTool(Name = "get_current_user")]
    [Description("Returns the authenticated user's account information.")]
    public static async Task<string> GetCurrentUser(
        [Description("Session token received from login")] string sessionToken,
        AppDbContext db,
        SessionStore sessionStore)
    {
        if (!sessionStore.TryGetSession(sessionToken, out var session))
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Session is invalid or expired."
            });
        }

        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u =>
                u.Id == session.UserId && u.IsActive);

        if (user == null)
        {
            sessionStore.RemoveSession(sessionToken);

            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "User account is unavailable."
            });
        }

        return JsonSerializer.Serialize(new
        {
            success = true,
            user = new
            {
                username = user.Username,
                role = user.Role,
                isActive = user.IsActive
            },
            expiresAtUtc = session.ExpiresAtUtc
        });
    }
}
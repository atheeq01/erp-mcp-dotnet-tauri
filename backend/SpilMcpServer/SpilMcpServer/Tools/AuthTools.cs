using System.ComponentModel;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;
using SpilMcpServer.Data;
using SpilMcpServer.Models;
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

    [McpServerTool(Name = "check_setup_status")]
    [Description("Checks if the application requires initial setup (no Admin account exists).")]
    public static async Task<string> CheckSetupStatus(AppDbContext db)
    {
        try
        {
            bool hasAdmin = await db.Users.AnyAsync(u => u.Role == "Admin");
            return JsonSerializer.Serialize(new
            {
                success = true,
                isSetupRequired = !hasAdmin
            });
        }
        catch (Exception ex)
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                isSetupRequired = false,
                message = $"Database error: {ex.Message}"
            });
        }
    }

    [McpServerTool(Name = "setup_initial_admin")]
    [Description("Creates the initial Admin account during first-run setup. Only allowed when no Admin exists.")]
    public static async Task<string> SetupInitialAdmin(
        [Description("Desired Admin username")] string username,
        [Description("Desired Admin password")] string password,
        AppDbContext db,
        PasswordHasher passwordHasher)
    {
        username = username?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(username) || username.Length > 100)
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Username is required and must be under 100 characters."
            });
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Password must contain at least 8 characters."
            });
        }

        bool hasAdmin = await db.Users.AnyAsync(u => u.Role == "Admin");
        if (hasAdmin)
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Setup is already completed. An Admin account exists."
            });
        }

        bool usernameExists = await db.Users.AnyAsync(u => u.Username == username);
        if (usernameExists)
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Username already exists."
            });
        }

        var admin = new User
        {
            Username = username,
            PasswordHash = passwordHasher.HashPassword(password),
            Role = "Admin",
            IsActive = true
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            success = true,
            message = "Admin account created successfully.",
            username = admin.Username
        });
    }
}
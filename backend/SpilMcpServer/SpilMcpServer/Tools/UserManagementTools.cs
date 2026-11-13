using System.ComponentModel;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;
using SpilMcpServer.Data;
using SpilMcpServer.Models;
using SpilMcpServer.Services;

namespace SpilMcpServer.Tools;

[McpServerToolType]
public static class UserManagementTools
{
    [McpServerTool(Name = "create_user")]
    [Description("Allows an Admin to create a Sales or Store user account.")]
    public static async Task<string> CreateUser(
        string sessionToken,
        string username,
        string password,
        string role,
        AppDbContext db,
        SessionStore sessions,
        PasswordHasher passwordHasher)
    {
        var admin = await ToolAuthorization.GetActiveUserAsync(
            sessionToken, db, sessions);

        if (admin == null || admin.Role != "Admin")
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Only Admin can create users."
            });

        username = username?.Trim() ?? "";
        role = role?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(username) ||
            username.Length > 100)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Username is required and must be under 100 characters."
            });

        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Password must contain at least 8 characters."
            });

        if (role is not ("Sales" or "Store"))
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Role must be Sales or Store."
            });

        bool exists = await db.Users.AnyAsync(u => u.Username == username);

        if (exists)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Username already exists."
            });

        var newUser = new User
        {
            Username = username,
            PasswordHash = passwordHasher.HashPassword(password),
            Role = role,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        db.Users.Add(newUser);
        await db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            success = true,
            message = "User created successfully.",
            user = new
            {
                id = newUser.Id,
                username = newUser.Username,
                role = newUser.Role,
                isActive = newUser.IsActive,
                createdAtUtc = newUser.CreatedAtUtc
            }
        });
    }

    [McpServerTool(Name = "get_users")]
    [Description("Returns all user accounts. Admin access only.")]
    public static async Task<string> GetUsers(
        string sessionToken,
        AppDbContext db,
        SessionStore sessions)
    {
        var admin = await ToolAuthorization.GetActiveUserAsync(
            sessionToken, db, sessions);

        if (admin == null || admin.Role != "Admin")
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Only Admin can view users."
            });

        var users = await db.Users
            .AsNoTracking()
            .OrderBy(u => u.Username)
            .Select(u => new
            {
                id = u.Id,
                username = u.Username,
                role = u.Role,
                isActive = u.IsActive,
                createdAtUtc = u.CreatedAtUtc
            })
            .ToListAsync();

        return JsonSerializer.Serialize(new
        {
            success = true,
            count = users.Count,
            users
        });
    }
}
using Microsoft.EntityFrameworkCore;
using SpilMcpServer.Data;
using SpilMcpServer.Models;

namespace SpilMcpServer.Services;

public static class AdminSeeder
{
    public static async Task CreateAdminAsync(
        AppDbContext db,
        PasswordHasher passwordHasher)
    {
        bool adminExists = await db.Users
            .AnyAsync(u => u.Role == "Admin");

        if (adminExists)
        {
            Console.WriteLine("An Admin account already exists.");
            return;
        }

        Console.Write("Enter Admin username: ");
        string username = Console.ReadLine()?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(username))
        {
            Console.WriteLine("Username is required.");
            return;
        }

        Console.Write("Enter Admin password: ");
        string password = ReadPassword();

        if (password.Length < 8)
        {
            Console.WriteLine("\nPassword must contain at least 8 characters.");
            return;
        }

        Console.Write("\nConfirm password: ");
        string confirmPassword = ReadPassword();

        if (password != confirmPassword)
        {
            Console.WriteLine("\nPasswords do not match.");
            return;
        }

        bool usernameExists = await db.Users
            .AnyAsync(u => u.Username == username);

        if (usernameExists)
        {
            Console.WriteLine("\nUsername already exists.");
            return;
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

        Console.WriteLine("\nAdmin account created successfully.");
    }

    private static string ReadPassword()
    {
        var password = new System.Text.StringBuilder();

        while (true)
        {
            var key = Console.ReadKey(intercept: true);

            if (key.Key == ConsoleKey.Enter)
                break;

            if (key.Key == ConsoleKey.Backspace)
            {
                if (password.Length > 0)
                    password.Length--;

                continue;
            }

            if (!char.IsControl(key.KeyChar))
                password.Append(key.KeyChar);
        }

        return password.ToString();
    }
}
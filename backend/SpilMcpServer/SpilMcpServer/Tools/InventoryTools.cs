using System.ComponentModel;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;
using SpilMcpServer.Data;
using SpilMcpServer.Services;

namespace SpilMcpServer.Tools;

[McpServerToolType]
public static class InventoryTools
{
    [McpServerTool(Name = "get_inventory")]
    [Description("Returns active inventory items for an authenticated user.")]
    public static async Task<string> GetInventory(
        string sessionToken,
        AppDbContext db,
        SessionStore sessions)
    {
        var user = await ToolAuthorization.GetActiveUserAsync(
            sessionToken, db, sessions);

        if (user == null)
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Invalid or expired session."
            });
        }

        if (user.Role is not ("Admin" or "Sales" or "Store"))
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "You do not have permission to view inventory."
            });
        }

        var inventory = await db.Inventory
            .AsNoTracking()
            .Where(i => i.IsActive)
            .OrderBy(i => i.Name)
            .Select(i => new
            {
                i.Id,
                i.SKU,
                i.Name,
                i.Description,
                i.QuantityAvailable,
                i.UnitPrice
            })
            .ToListAsync();

        return JsonSerializer.Serialize(new
        {
            success = true,
            count = inventory.Count,
            inventory
        });
    }
}
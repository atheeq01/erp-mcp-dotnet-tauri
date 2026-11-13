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
    [Description("Returns inventory items for an authenticated user. By default only active items are returned.")]
    public static async Task<string> GetInventory(
        string sessionToken,
        AppDbContext db,
        SessionStore sessions,
        bool includeInactive = false)
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

        var query = db.Inventory
            .AsNoTracking()
            .AsQueryable();

        if (!includeInactive)
            query = query.Where(i => i.IsActive);

        var inventory = await query
            .OrderBy(i => i.Name)
            .Select(i => new
            {
                id = i.Id,
                sku = i.SKU,
                name = i.Name,
                description = i.Description,
                quantityAvailable = i.QuantityAvailable,
                unitPrice = i.UnitPrice,
                isActive = i.IsActive
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
using System.ComponentModel;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;
using SpilMcpServer.Data;
using SpilMcpServer.Models;
using SpilMcpServer.Services;

namespace SpilMcpServer.Tools;

[McpServerToolType]
public static class InventoryManagementTools
{
    [McpServerTool(Name = "create_inventory")]
    [Description("Allows an Admin or Store keeper to create an inventory product.")]
    public static async Task<string> CreateInventory(
        string sessionToken,
        string sku,
        string name,
        int quantityAvailable,
        decimal unitPrice,
        AppDbContext db,
        SessionStore sessions,
        string description = "")
    {
        var user = await ToolAuthorization.GetActiveUserAsync(
            sessionToken, db, sessions);

        if (user == null || user.Role is not ("Admin" or "Store"))
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Only Admin and Store keeper can create inventory."
            });

        sku = sku?.Trim() ?? "";
        name = name?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(sku) || sku.Length > 50 ||
            string.IsNullOrWhiteSpace(name) || name.Length > 150)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Valid SKU and product name are required."
            });

        if (quantityAvailable < 0 || unitPrice < 0)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Quantity and unit price cannot be negative."
            });

        if (!string.IsNullOrEmpty(description) && description.Length > 2000)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Description cannot exceed 2000 characters."
            });

        bool skuExists = await db.Inventory.AnyAsync(i => i.SKU == sku);

        if (skuExists)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "SKU already exists."
            });

        var item = new Inventory
        {
            SKU = sku,
            Name = name,
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            QuantityAvailable = quantityAvailable,
            UnitPrice = unitPrice,
            IsActive = true
        };

        db.Inventory.Add(item);
        await db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            success = true,
            message = "Inventory item created successfully.",
            inventory = new
            {
                item.Id,
                item.SKU,
                item.Name,
                item.QuantityAvailable,
                item.UnitPrice,
                item.IsActive
            }
        });
    }

    [McpServerTool(Name = "update_inventory")]
    [Description("Allows an Admin or Store keeper to update an inventory product and its stock.")]
    public static async Task<string> UpdateInventory(
        string sessionToken,
        int inventoryId,
        string sku,
        string name,
        int quantityAvailable,
        decimal unitPrice,
        bool isActive,
        AppDbContext db,
        SessionStore sessions,
        string description = "")
    {
        var user = await ToolAuthorization.GetActiveUserAsync(
            sessionToken, db, sessions);

        if (user == null || user.Role is not ("Admin" or "Store"))
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Only Admin and Store keeper can update inventory."
            });

        if (inventoryId <= 0)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Invalid inventory ID."
            });

        sku = sku?.Trim() ?? "";
        name = name?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(sku) || sku.Length > 50 ||
            string.IsNullOrWhiteSpace(name) || name.Length > 150)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Valid SKU and product name are required."
            });

        if (quantityAvailable < 0 || unitPrice < 0)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Quantity and unit price cannot be negative."
            });

        if (!string.IsNullOrEmpty(description) && description.Length > 2000)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Description cannot exceed 2000 characters."
            });

        var item = await db.Inventory
            .FirstOrDefaultAsync(i => i.Id == inventoryId);

        if (item == null)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Inventory item not found."
            });

        bool duplicateSku = await db.Inventory.AnyAsync(i =>
            i.SKU == sku && i.Id != inventoryId);

        if (duplicateSku)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Another inventory item already uses this SKU."
            });

        item.SKU = sku;
        item.Name = name;
        item.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        item.QuantityAvailable = quantityAvailable;
        item.UnitPrice = unitPrice;
        item.IsActive = isActive;

        await db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            success = true,
            message = "Inventory item updated successfully.",
            inventory = new
            {
                item.Id,
                item.SKU,
                item.Name,
                item.QuantityAvailable,
                item.UnitPrice,
                item.IsActive
            }
        });
    }

    [McpServerTool(Name = "deactivate_inventory")]
    [Description("Allows an Admin or Store keeper to deactivate an inventory product without deleting its history.")]
    public static async Task<string> DeactivateInventory(
        string sessionToken,
        int inventoryId,
        AppDbContext db,
        SessionStore sessions)
    {
        var user = await ToolAuthorization.GetActiveUserAsync(
            sessionToken, db, sessions);

        if (user == null || user.Role is not ("Admin" or "Store"))
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Only Admin and Store keeper can deactivate inventory."
            });

        if (inventoryId <= 0)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Invalid inventory ID."
            });

        var item = await db.Inventory
            .FirstOrDefaultAsync(i => i.Id == inventoryId);

        if (item == null)
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Inventory item not found."
            });

        item.IsActive = false;
        await db.SaveChangesAsync();

        return JsonSerializer.Serialize(new
        {
            success = true,
            message = "Inventory item deactivated successfully."
        });
    }
}
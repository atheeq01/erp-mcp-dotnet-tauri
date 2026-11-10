using System.ComponentModel;
using System.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Server;
using SpilMcpServer.Data;
using SpilMcpServer.Models;
using SpilMcpServer.Services;

namespace SpilMcpServer.Tools;

[McpServerToolType]
public static class OrderTools
{
    [McpServerTool(Name = "get_orders")]
    [Description("Returns orders accessible to the authenticated user.")]
    public static async Task<string> GetOrders(
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

        if (user.Role is not ("Admin" or "Sales"))
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "You do not have permission to view orders."
            });
        }

        var query = db.Orders
            .AsNoTracking()
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Inventory)
            .Include(o => o.User)
            .AsQueryable();

        // Sales users can only see their own orders.
        if (user.Role == "Sales")
            query = query.Where(o => o.UserId == user.Id);

        var orders = await query
            .OrderByDescending(o => o.CreatedAtUtc)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.TotalAmount,
                o.CreatedAtUtc,
                Username = o.User!.Username,
                Items = o.OrderItems.Select(item => new
                {
                    item.InventoryId,
                    ProductName = item.Inventory!.Name,
                    item.Quantity,
                    item.UnitPrice,
                    item.TotalPrice
                })
            })
            .ToListAsync();

        return JsonSerializer.Serialize(new
        {
            success = true,
            count = orders.Count,
            orders
        });
    }

    [McpServerTool(Name = "create_order")]
    [Description("Creates an order containing one or more inventory products and reduces stock.")]
    public static async Task<string> CreateOrder(
        string sessionToken,
        string itemsJson,
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

        if (user.Role is not ("Admin" or "Sales"))
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "You do not have permission to create orders."
            });
        }

        List<CreateOrderItemRequest>? requestedItems;

        try
        {
            requestedItems = JsonSerializer.Deserialize<List<CreateOrderItemRequest>>(
                itemsJson,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
        }
        catch (JsonException)
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Invalid items JSON."
            });
        }

        if (requestedItems == null ||
            requestedItems.Count == 0 ||
            requestedItems.Count > 50)
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Provide between 1 and 50 order items."
            });
        }

        if (requestedItems.Any(i =>
            i.InventoryId <= 0 ||
            i.Quantity <= 0 ||
            i.Quantity > 10000))
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Inventory IDs and quantities must be valid positive values."
            });
        }

        if (requestedItems
            .GroupBy(i => i.InventoryId)
            .Any(g => g.Count() > 1))
        {
            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Each inventory product must appear only once."
            });
        }

        await using var transaction =
            await db.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        try
        {
            var inventoryIds = requestedItems
                .Select(i => i.InventoryId)
                .ToList();

            var products = await db.Inventory
                .Where(i => inventoryIds.Contains(i.Id))
                .ToDictionaryAsync(i => i.Id);

            if (products.Count != requestedItems.Count)
            {
                await transaction.RollbackAsync();

                return JsonSerializer.Serialize(new
                {
                    success = false,
                    message = "One or more inventory products do not exist."
                });
            }

            foreach (var item in requestedItems)
            {
                var product = products[item.InventoryId];

                if (!product.IsActive)
                {
                    await transaction.RollbackAsync();

                    return JsonSerializer.Serialize(new
                    {
                        success = false,
                        message = $"Product {product.Name} is inactive."
                    });
                }

                if (product.QuantityAvailable < item.Quantity)
                {
                    await transaction.RollbackAsync();

                    return JsonSerializer.Serialize(new
                    {
                        success = false,
                        message = $"Insufficient stock for {product.Name}.",
                        available = product.QuantityAvailable,
                        requested = item.Quantity
                    });
                }
            }

            var order = new Order
            {
                OrderNumber = "ORD-" +
                    Guid.NewGuid().ToString("N")[..12].ToUpperInvariant(),

                UserId = user.Id,
                CreatedAtUtc = DateTime.UtcNow
            };

            foreach (var item in requestedItems)
            {
                var product = products[item.InventoryId];

                decimal totalPrice =
                    product.UnitPrice * item.Quantity;

                order.OrderItems.Add(new OrderItem
                {
                    InventoryId = product.Id,
                    Quantity = item.Quantity,
                    UnitPrice = product.UnitPrice,
                    TotalPrice = totalPrice
                });

                product.QuantityAvailable -= item.Quantity;

                order.TotalAmount += totalPrice;
            }

            db.Orders.Add(order);

            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return JsonSerializer.Serialize(new
            {
                success = true,
                message = "Order created successfully.",
                orderId = order.Id,
                orderNumber = order.OrderNumber,
                totalAmount = order.TotalAmount,
                items = order.OrderItems.Count
            });
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();

            return JsonSerializer.Serialize(new
            {
                success = false,
                message = "Order creation failed. No stock changes were committed."
            });
        }
    }
}

public class CreateOrderItemRequest
{
    public int InventoryId { get; set; }

    public int Quantity { get; set; }
}
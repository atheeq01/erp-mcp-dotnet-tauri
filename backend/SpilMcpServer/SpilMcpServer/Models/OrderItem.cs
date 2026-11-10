namespace SpilMcpServer.Models;

public class OrderItem
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public int InventoryId { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal TotalPrice { get; set; }

    public Order? Order { get; set; }

    public Inventory? Inventory { get; set; }
}
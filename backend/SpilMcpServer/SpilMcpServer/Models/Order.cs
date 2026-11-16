namespace SpilMcpServer.Models;

public class Order
{
    public int Id { get; set; }

    public string OrderNumber { get; set; } = string.Empty;

    public int UserId { get; set; }
    
    public string CustomerName { get; set; } = string.Empty;
    
    public string CustomerPhone { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    public DateTime CreatedAtUtc { get; set; }
        = DateTime.UtcNow;

    public User? User { get; set; }

    public ICollection<OrderItem> OrderItems { get; set; }
        = new List<OrderItem>();
}
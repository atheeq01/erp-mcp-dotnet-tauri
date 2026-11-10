using Microsoft.EntityFrameworkCore;
using SpilMcpServer.Models;

namespace SpilMcpServer.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Inventory> Inventory => Set<Inventory>();

    public DbSet<Order> Orders => Set<Order>();

    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Username).IsUnique();

            entity.Property(u => u.Username)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(u => u.PasswordHash)
                .IsRequired();

            entity.Property(u => u.Role)
                .HasMaxLength(20)
                .IsRequired();

            entity.HasMany(u => u.Orders)
                .WithOne(o => o.User)
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Inventory>(entity =>
        {
            entity.HasIndex(i => i.SKU).IsUnique();

            entity.Property(i => i.SKU)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(i => i.Name)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(i => i.UnitPrice)
                .HasPrecision(18, 2);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasIndex(o => o.OrderNumber).IsUnique();

            entity.Property(o => o.OrderNumber)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(o => o.TotalAmount)
                .HasPrecision(18, 2);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.Property(oi => oi.UnitPrice)
                .HasPrecision(18, 2);

            entity.Property(oi => oi.TotalPrice)
                .HasPrecision(18, 2);

            entity.HasOne(oi => oi.Order)
                .WithMany(o => o.OrderItems)
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(oi => oi.Inventory)
                .WithMany(i => i.OrderItems)
                .HasForeignKey(oi => oi.InventoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
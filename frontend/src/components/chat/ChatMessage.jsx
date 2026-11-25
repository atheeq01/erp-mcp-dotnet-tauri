import React, { useState, useEffect } from "react";
import {
    RotateCcw,
    AlertCircle,
    Loader2,
    CheckCircle,
    ShieldAlert,
    ChevronDown,
    ChevronRight,
    Zap,
    Bot,
    XCircle,
} from "lucide-react";
import Button from "../common/Button";
import { callMcpTool } from "../../services/mcpService";

function ScoreChip({ label, value, isPercent }) {
    if (value === undefined || value === null) return null;
    const formatted = isPercent
        ? `${Math.round(value * 100)}%`
        : typeof value === "number"
        ? Number.isInteger(value)
            ? String(value)
            : value.toFixed(2)
        : String(value);

    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono tabular-nums bg-(--paper) text-(--ink) border border-(--line) rounded-xs">
            <span className="text-[color-mix(in_srgb,var(--ink)_50%,white)] uppercase text-[10px]">{label}:</span>
            <span className="font-semibold">{formatted}</span>
        </span>
    );
}

function formatToolLabel(tool) {
    if (!tool) return "Tool";
    const labels = {
        get_orders: "Customer Orders Ledger",
        create_order: "Create Customer Order",
        get_inventory: "Inventory Records",
        create_inventory: "Add Inventory Item",
        update_inventory: "Update Inventory Item",
        deactivate_inventory: "Deactivate Inventory Item",
        get_users: "User Accounts",
        create_user: "Create User Account",
        get_current_user: "Active Operator Profile",
        system: "SPIL Assistant",
    };
    return labels[tool] || tool.replace(/_/g, " ").toUpperCase();
}

function UserProfileCard({ user, expiresAtUtc, message }) {
    if (!user) return null;
    return (
        <div className="my-2 p-4 bg-white border border-(--line) rounded-xs space-y-3">
            {message && (
                <div className="flex items-center gap-2 text-xs font-semibold text-(--ink) border-b border-(--line) pb-2">
                    <CheckCircle className="h-4 w-4 text-(--accent)" strokeWidth={1.5} />
                    <span>{message}</span>
                </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                    <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Username
                    </span>
                    <span className="font-mono text-sm font-bold text-(--ink)">
                        {user.username || user.Username || "-"}
                    </span>
                </div>
                <div>
                    <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Security Role
                    </span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 text-xs font-mono border border-(--ink) text-(--ink) rounded-xs">
                        {user.role || user.Role || "-"}
                    </span>
                </div>
                <div>
                    <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Account Status
                    </span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 text-xs font-mono border border-(--line) text-(--ink) rounded-xs">
                        {(user.isActive ?? user.IsActive ?? true) ? "Active" : "Disabled"}
                    </span>
                </div>
            </div>
            {expiresAtUtc && (
                <div className="pt-2 border-t border-(--line) flex items-center justify-between text-xs font-mono text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                    <span>Session Expires:</span>
                    <span>{new Date(expiresAtUtc).toLocaleString()}</span>
                </div>
            )}
        </div>
    );
}

function OrderReceiptCard({ data }) {
    const orderNumber = data.orderNumber || data.OrderNumber || `ORD-${data.orderId || data.OrderId || ""}`;
    const amount = Number(data.totalAmount ?? data.TotalAmount ?? 0);
    const itemCount = data.items ?? data.Items ?? data.itemCount ?? data.ItemCount ?? 0;
    const customer = data.customerName ?? data.CustomerName;
    const phone = data.customerPhone ?? data.CustomerPhone;

    return (
        <div className="my-2 p-4 bg-white border border-(--line) rounded-xs space-y-3">
            <div className="flex items-center justify-between border-b border-(--line) pb-2.5">
                <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-(--accent)" strokeWidth={1.5} />
                    <span className="font-display text-sm font-bold text-(--ink)">
                        Order Processed Successfully
                    </span>
                </div>
                <span className="px-2 py-0.5 text-xs font-mono bg-(--paper) text-(--ink) border border-(--line) rounded-xs">
                    Confirmed
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                    <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Order Identifier
                    </span>
                    <span className="font-mono text-base font-bold text-(--ink)">
                        {orderNumber}
                    </span>
                </div>
                {customer && (
                    <div>
                        <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                            Customer
                        </span>
                        <span className="font-mono text-sm font-bold text-(--ink) block">
                            {customer}
                        </span>
                        {phone && (
                            <span className="text-xs font-mono text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                                {phone}
                            </span>
                        )}
                    </div>
                )}
                <div>
                    <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Total Amount
                    </span>
                    <span className="font-mono text-base font-bold text-(--accent) tabular-nums">
                        ${amount.toFixed(2)}
                    </span>
                </div>
                <div>
                    <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Line Items
                    </span>
                    <span className="font-mono text-base font-bold text-(--ink) tabular-nums">
                        {itemCount} {itemCount === 1 ? "line" : "lines"}
                    </span>
                </div>
            </div>

            {data.message && (
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_65%,white)] pt-1 border-t border-(--line) font-mono">
                    {data.message}
                </p>
            )}
        </div>
    );
}

function ProductDetailCard({ item, message }) {
    if (!item) return null;
    const sku = item.sku || item.SKU || "-";
    const name = item.name || item.Name || "-";
    const qty = Number(item.quantityAvailable ?? item.QuantityAvailable ?? 0);
    const price = Number(item.unitPrice ?? item.UnitPrice ?? 0);
    const active = item.isActive ?? item.IsActive ?? true;

    return (
        <div className="my-2 p-4 bg-white border border-(--line) rounded-xs space-y-3">
            <div className="flex items-center justify-between border-b border-(--line) pb-2.5">
                <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-(--accent)" strokeWidth={1.5} />
                    <span className="font-display text-sm font-bold text-(--ink)">
                        {message || "Product Saved"}
                    </span>
                </div>
                <span className="px-2 py-0.5 text-xs font-mono border border-(--line) text-(--ink) rounded-xs">
                    {active ? "Active" : "Inactive"}
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                    <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        SKU
                    </span>
                    <span className="font-mono text-sm font-bold text-(--ink)">
                        {sku}
                    </span>
                </div>
                <div className="sm:col-span-2">
                    <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Product Name
                    </span>
                    <span className="text-sm font-semibold text-(--ink) block truncate">
                        {name}
                    </span>
                </div>
                <div>
                    <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        In Stock
                    </span>
                    <span
                        className={`font-mono text-sm font-bold tabular-nums ${
                            qty <= 20 ? "text-(--accent)" : "text-(--ink)"
                        }`}
                    >
                        {qty.toLocaleString()} units
                    </span>
                </div>
                <div>
                    <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Unit Price
                    </span>
                    <span className="font-mono text-sm font-bold tabular-nums text-(--ink)">
                        ${price.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}

function OrdersTable({ orders }) {
    const [expandedOrder, setExpandedOrder] = useState(null);

    function toggleExpand(id) {
        setExpandedOrder((prev) => (prev === id ? null : id));
    }

    return (
        <div className="my-2 border border-(--line) bg-white rounded-xs overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                    <thead>
                        <tr className="bg-(--paper) border-b border-(--line)">
                            <th className="w-8 px-3 py-2.5 font-mono"></th>
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap">
                                Order Number
                            </th>
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap">
                                Placed By
                            </th>
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap text-center">
                                Lines
                            </th>
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap text-right">
                                Grand Total
                            </th>
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap text-right">
                                Date Logged
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-(--line) font-mono text-xs">
                        {orders.map((ord, idx) => {
                            const orderId = ord.id ?? ord.Id ?? idx;
                            const orderNumber = ord.orderNumber ?? ord.OrderNumber ?? "-";
                            const username = ord.username ?? ord.Username ?? ord.userId ?? ord.UserId ?? "-";
                            const customerName = ord.customerName ?? ord.CustomerName;
                            const items = ord.items ?? ord.Items ?? ord.orderItems ?? ord.OrderItems ?? [];
                            const totalAmount = Number(ord.totalAmount ?? ord.TotalAmount ?? 0);
                            const createdAt = ord.createdAtUtc ?? ord.CreatedAtUtc ?? "";
                            const isExpanded = expandedOrder === orderId;

                            return (
                                <React.Fragment key={orderId}>
                                    <tr
                                        onClick={() => items.length > 0 && toggleExpand(orderId)}
                                        className={`hover:bg-[color-mix(in_srgb,var(--paper)_40%,white_60%)] ${
                                            items.length > 0 ? "cursor-pointer" : ""
                                        }`}
                                    >
                                        <td className="px-2 py-2 text-center text-[color-mix(in_srgb,var(--ink)_40%,white)]">
                                            {items.length > 0 ? (
                                                isExpanded ? (
                                                    <ChevronDown className="h-3.5 w-3.5 inline" strokeWidth={1.5} />
                                                ) : (
                                                    <ChevronRight className="h-3.5 w-3.5 inline" strokeWidth={1.5} />
                                                )
                                            ) : null}
                                        </td>
                                        <td className="px-3 py-2.5 font-bold text-(--ink) whitespace-nowrap">
                                            {orderNumber}
                                        </td>
                                        <td className="px-3 py-2.5 text-(--ink) whitespace-nowrap">
                                            <div>{username}</div>
                                            {customerName && (
                                                <div className="text-[10px] text-[color-mix(in_srgb,var(--ink)_50%,white)] font-sans">
                                                    Cust: {customerName}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                            <span className="px-1.5 py-0.5 bg-(--paper) border border-(--line) rounded-xs">
                                                {items.length}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-bold text-(--ink) tabular-nums whitespace-nowrap">
                                            ${totalAmount.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2.5 text-right text-[color-mix(in_srgb,var(--ink)_60%,white)] whitespace-nowrap">
                                            {createdAt ? new Date(createdAt).toLocaleDateString() : "-"}
                                        </td>
                                    </tr>

                                    {isExpanded && items.length > 0 && (
                                        <tr>
                                            <td colSpan={6} className="bg-(--paper) p-3 border-t border-b border-(--line)">
                                                <div className="text-xs uppercase font-mono font-bold text-[color-mix(in_srgb,var(--ink)_70%,white)] mb-1.5">
                                                    Order Items Breakdown:
                                                </div>
                                                <table className="w-full text-xs font-mono bg-white border border-(--line) rounded-xs">
                                                    <thead>
                                                        <tr className="border-b border-(--line) text-left bg-white">
                                                            <th className="px-2.5 py-1.5">Product</th>
                                                            <th className="px-2.5 py-1.5 text-center">Qty</th>
                                                            <th className="px-2.5 py-1.5 text-right">Unit Price</th>
                                                            <th className="px-2.5 py-1.5 text-right">Line Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-(--line)">
                                                        {items.map((it, iIdx) => {
                                                            const pName = it.productName ?? it.ProductName ?? `Item #${it.inventoryId ?? it.InventoryId}`;
                                                            const itQty = Number(it.quantity ?? it.Quantity ?? 0);
                                                            const itPrice = Number(it.unitPrice ?? it.UnitPrice ?? 0);
                                                            const itTotal = Number(it.totalPrice ?? it.TotalPrice ?? itQty * itPrice);

                                                            return (
                                                                <tr key={iIdx}>
                                                                    <td className="px-2.5 py-1 font-semibold">{pName}</td>
                                                                    <td className="px-2.5 py-1 text-center">{itQty}</td>
                                                                    <td className="px-2.5 py-1 text-right">${itPrice.toFixed(2)}</td>
                                                                    <td className="px-2.5 py-1 text-right font-bold">${itTotal.toFixed(2)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="px-3 py-1.5 bg-(--paper) border-t border-(--line) text-xs font-mono text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                Showing {orders.length} order {orders.length === 1 ? "record" : "records"}.
            </div>
        </div>
    );
}

function InventoryTable({ inventory, onStartOrderWithItem }) {
    return (
        <div className="my-2 border border-(--line) bg-white rounded-xs overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                    <thead>
                        <tr className="bg-(--paper) border-b border-(--line)">
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap">
                                SKU / Code
                            </th>
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap">
                                Product Specification
                            </th>
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap text-right">
                                Available Stock
                            </th>
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap text-right">
                                Unit Price
                            </th>
                            {onStartOrderWithItem && (
                                <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap text-right">
                                    Action
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-(--line) text-xs">
                        {inventory.map((inv, idx) => {
                            const id = inv.id ?? inv.Id ?? idx;
                            const sku = inv.sku ?? inv.SKU ?? "-";
                            const name = inv.name ?? inv.Name ?? "-";
                            const desc = inv.description ?? inv.Description ?? "";
                            const qty = Number(inv.quantityAvailable ?? inv.QuantityAvailable ?? 0);
                            const price = Number(inv.unitPrice ?? inv.UnitPrice ?? 0);
                            const isLow = qty <= 20;

                            return (
                                <tr
                                    key={id}
                                    className="hover:bg-[color-mix(in_srgb,var(--paper)_40%,white_60%)]"
                                >
                                    <td className="px-3 py-2.5 font-mono font-bold text-(--ink) whitespace-nowrap">
                                        {sku}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="font-semibold text-(--ink)">{name}</div>
                                        {desc && (
                                            <div className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,white)] line-clamp-1">
                                                {desc}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono font-bold whitespace-nowrap">
                                        <span
                                            className={
                                                isLow ? "text-(--accent) font-extrabold" : "text-(--ink)"
                                            }
                                        >
                                            {qty.toLocaleString()} units
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono text-(--ink) tabular-nums whitespace-nowrap">
                                        ${price.toFixed(2)}
                                    </td>
                                    {onStartOrderWithItem && (
                                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                disabled={qty <= 0}
                                                onClick={() => onStartOrderWithItem(id)}
                                            >
                                                + Order
                                            </Button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="px-3 py-1.5 bg-(--paper) border-t border-(--line) text-xs font-mono text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                Showing {inventory.length} inventory {inventory.length === 1 ? "product" : "products"}.
            </div>
        </div>
    );
}

function extractSearchTermFromQuery(text) {
    if (!text) return "";
    const quoteMatch = text.match(/["']([^"']+)["']/);
    if (quoteMatch) return quoteMatch[1].trim();
    const triggerMatch = text.match(/(?:is\s+this\s+have|do\s+we\s+have|have\s+we\s+got|have|has|got|search(?:\s+for)?|check(?:\s+for)?|find|is\s+there|is)\s+([A-Za-z0-9\s_-]{3,40})/i);
    if (triggerMatch) {
        const cleaned = triggerMatch[1].replace(/(?:available|in\s+stock|in\s+inventory|in\s+the\s+inventory).*$/i, "").trim();
        const lower = cleaned.toLowerCase();
        if (lower && !["inventory", "product", "products", "stock", "item", "items"].includes(lower)) {
            return cleaned;
        }
    }
    return "";
}

function InventoryResultView({ inventory, searchQuery, onStartOrderWithItem }) {
    if (!inventory || inventory.length === 0) {
        return (
            <div className="my-2 p-4 border border-(--line) bg-(--paper) rounded-xs text-center font-mono text-xs">
                Zero inventory items recorded in database.
            </div>
        );
    }

    const q = (searchQuery || "").trim().toLowerCase();

    // If no search query was requested, show the standard inventory table
    if (!q) {
        return <InventoryTable inventory={inventory} onStartOrderWithItem={onStartOrderWithItem} />;
    }

    // 1. Check for Exact Match (by Name or SKU)
    const exactMatch = inventory.find((item) => {
        const name = (item.name ?? item.Name ?? "").trim().toLowerCase();
        const sku = (item.sku ?? item.SKU ?? "").trim().toLowerCase();
        return name === q || sku === q;
    });

    if (exactMatch) {
        const id = exactMatch.id ?? exactMatch.Id;
        const sku = exactMatch.sku ?? exactMatch.SKU ?? "-";
        const name = exactMatch.name ?? exactMatch.Name ?? "-";
        const desc = exactMatch.description ?? exactMatch.Description ?? "";
        const qty = Number(exactMatch.quantityAvailable ?? exactMatch.QuantityAvailable ?? 0);
        const price = Number(exactMatch.unitPrice ?? exactMatch.UnitPrice ?? 0);
        const isLow = qty <= 20;

        return (
            <div className="my-2 p-4 bg-white border-2 border-(--ink) rounded-xs space-y-3">
                <div className="flex items-center justify-between border-b border-(--line) pb-2.5">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600" strokeWidth={2} />
                        <span className="font-display text-sm font-bold text-(--ink)">
                            Exact Product Found in Inventory
                        </span>
                    </div>
                    <span
                        className={`px-2 py-0.5 text-xs font-mono border rounded-xs font-bold ${
                            qty > 0
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : "bg-red-50 text-(--accent) border-(--accent)"
                        }`}
                    >
                        {qty > 0 ? `${qty.toLocaleString()} in stock` : "Out of stock"}
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                        <span className="text-[10px] font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                            SKU / Code
                        </span>
                        <span className="font-mono font-bold text-(--ink)">{sku}</span>
                    </div>
                    <div className="sm:col-span-2">
                        <span className="text-[10px] font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                            Product Specification
                        </span>
                        <span className="font-bold text-(--ink) text-sm block">{name}</span>
                        {desc && (
                            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,white)] mt-0.5">
                                {desc}
                            </p>
                        )}
                    </div>
                    <div>
                        <span className="text-[10px] font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                            Unit Price
                        </span>
                        <span className="font-mono font-bold text-base text-(--accent) tabular-nums">
                            ${price.toFixed(2)}
                        </span>
                    </div>
                </div>

                {onStartOrderWithItem && (
                    <div className="pt-2 border-t border-(--line) flex items-center justify-between">
                        <span className="text-xs font-mono text-[color-mix(in_srgb,var(--ink)_50%,white)]">
                            {isLow && qty > 0 ? "! Low stock alert (under 20 units available)" : "Ready to fulfill orders."}
                        </span>
                        <Button
                            type="button"
                            variant="primary"
                            size="md"
                            disabled={qty <= 0}
                            onClick={() => onStartOrderWithItem(id)}
                        >
                            + Order This Product
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // 2. Check for Similar / Best Matches (Tokens or Substring)
    const tokens = q.split(/[\s-_]+/).filter((t) => t.length >= 2);
    const similarItems = inventory.filter((item) => {
        const name = (item.name ?? item.Name ?? "").toLowerCase();
        const sku = (item.sku ?? item.SKU ?? "").toLowerCase();
        return (
            name.includes(q) ||
            sku.includes(q) ||
            q.includes(name) ||
            tokens.some((t) => name.includes(t) || sku.includes(t))
        );
    });

    if (similarItems.length > 0) {
        return (
            <div className="space-y-2 my-2">
                <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-xs flex items-center justify-between text-xs font-mono text-(--ink)">
                    <span>
                        No exact match for <strong>"{searchQuery}"</strong>. Showing <strong>{similarItems.length} similar item(s)</strong>:
                    </span>
                </div>
                <InventoryTable inventory={similarItems} onStartOrderWithItem={onStartOrderWithItem} />
            </div>
        );
    }

    // 3. No match found
    return (
        <div className="my-2 p-4 border border-(--line) bg-(--paper) rounded-xs text-center font-mono text-xs">
            <p className="font-bold text-(--ink) text-sm">
                No inventory product found matching "{searchQuery}".
            </p>
            <p className="text-[color-mix(in_srgb,var(--ink)_60%,white)] mt-1.5">
                Total items in catalog: {inventory.length}. Check your spelling or try another SKU / keyword.
            </p>
        </div>
    );
}

function UsersTable({ users }) {
    return (
        <div className="my-2 border border-(--line) bg-white rounded-xs overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                    <thead>
                        <tr className="bg-(--paper) border-b border-(--line)">
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap">
                                Username
                            </th>
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap">
                                Security Role
                            </th>
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap text-center">
                                Status
                            </th>
                            <th className="px-3 py-2.5 text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] font-mono whitespace-nowrap text-right">
                                Registered Date
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-(--line) font-mono text-xs">
                        {users.map((u, idx) => {
                            const id = u.id ?? u.Id ?? idx;
                            const uname = u.username ?? u.Username ?? "-";
                            const role = u.role ?? u.Role ?? "-";
                            const active = u.isActive ?? u.IsActive ?? true;
                            const created = u.createdAtUtc ?? u.CreatedAtUtc ?? "";

                            return (
                                <tr
                                    key={id}
                                    className="hover:bg-[color-mix(in_srgb,var(--paper)_40%,white_60%)]"
                                >
                                    <td className="px-3 py-2.5 font-bold text-(--ink) whitespace-nowrap">
                                        {uname}
                                    </td>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                        <span className="px-2 py-0.5 border border-(--ink) text-(--ink) rounded-xs">
                                            {role}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                        <span className="px-2 py-0.5 border border-(--line) rounded-xs">
                                            {active ? "Active" : "Disabled"}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-[color-mix(in_srgb,var(--ink)_60%,white)] whitespace-nowrap">
                                        {created ? new Date(created).toLocaleDateString() : "-"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="px-3 py-1.5 bg-(--paper) border-t border-(--line) text-xs font-mono text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                Showing {users.length} system {users.length === 1 ? "user" : "users"}.
            </div>
        </div>
    );
}

function KeyValueGrid({ data }) {
    if (!data || typeof data !== "object") return null;
    const entries = Object.entries(data).filter(
        ([, v]) => typeof v !== "object" || v === null
    );

    if (entries.length === 0) return null;

    return (
        <div className="my-2 p-3 bg-white border border-(--line) rounded-xs">
            <table className="w-full text-xs font-mono">
                <tbody className="divide-y divide-(--line)">
                    {entries.map(([k, v]) => (
                        <tr key={k}>
                            <td className="py-1.5 pr-4 uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] font-semibold w-1/3">
                                {fieldLabel(k)}
                            </td>
                            <td className="py-1.5 font-bold text-(--ink)">
                                {v === null ? "-" : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* -- Tool-specific field metadata ---------------------------------- */
const TOOL_FIELD_META = {
    create_order: {
        _orderItems: true,
        customerName:       {label :"Customer Full Name", type: "text", placeholder:"e.g. Kasun Perera", required: true},
        customerPhone:      {label : "Contact Phone",   type: "tel" , placeholder: "e.g. 0771234567",   required: true}
    },
    create_inventory: {
        sku:               { label: "SKU / Code",       type: "text",   placeholder: "e.g. WDG-001" },
        name:              { label: "Product Name",      type: "text",   placeholder: "e.g. Steel Widget" },
        description:       { label: "Description",       type: "text",   placeholder: "Optional description", required: false },
        quantityAvailable: { label: "Initial Stock",     type: "number", placeholder: "0", min: 0 },
        unitPrice:         { label: "Unit Price ($)",     type: "number", placeholder: "0.00", min: 0, step: "0.01" },
    },
    update_inventory: {
        _inventoryPicker: true,
    },
    deactivate_inventory: {
        _inventoryPicker: true,
        _deactivateOnly: true,
    },
    create_user: {
        username:          { label: "Username",          type: "text",   placeholder: "e.g. john_doe" },
        password:          { label: "Password",          type: "password", placeholder: "Min 8 characters" },
        role:              { label: "Role",              type: "select",  options: ["Sales", "Store"] },
    },
};

function fieldLabel(fieldName) {
    return fieldName
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase())
        .trim();
}

const inputClasses =
    "h-(--input-btn-h) px-3 text-sm bg-white border border-(--line) rounded-xs focus:outline-none focus:border-(--accent) font-mono w-full";

/* -- Order-line builder (for create_order) ------------------------ */
function OrderItemsBuilder({ extracted = {}, initialProductId = "", onCancel, onSubmit }) {
    const [customerName, setCustomerName] = useState(extracted.customerName || "");
    const [customerPhone, setCustomerPhone] = useState(extracted.customerPhone || "");

    const [lines, setLines] = useState([
        { inventoryId: initialProductId ? String(initialProductId) : "", quantity: "" }
    ]);
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadError, setLoadError] = useState(null);

    // Fetch inventory on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await callMcpTool("get_inventory", {});
                if (cancelled) return;
                if (result?.success === false) {
                    if (!cancelled) setLoadError(result.message || "Could not load inventory.");
                    return;
                }
                const rawItems = result?.inventory || (Array.isArray(result) ? result : []);
                const items = rawItems.map((p) => ({
                    id: p.id ?? p.Id,
                    sku: p.sku ?? p.SKU ?? "",
                    name: p.name ?? p.Name ?? "-",
                    description: p.description ?? p.Description ?? "",
                    quantityAvailable: Number(p.quantityAvailable ?? p.QuantityAvailable ?? 0),
                    unitPrice: Number(p.unitPrice ?? p.UnitPrice ?? 0),
                    isActive: Boolean(p.isActive ?? p.IsActive ?? true),
                }));
                // Only show active items with stock
                const active = items.filter(
                    (p) => p.isActive
                );
                setProducts(active);

                // Auto-match product from extracted query (e.g. create order "Spring-Clamp Terminal Block")
                const targetQuery = extracted?.productQuery || extracted?.productName || extracted?.sku || initialProductId;
                if (targetQuery && active.length > 0) {
                    const queryLower = String(targetQuery).toLowerCase().trim();
                    const matched = active.find((p) => {
                        const pId = String(p.id).toLowerCase();
                        const pName = (p.name || "").toLowerCase();
                        const pSku = (p.sku || "").toLowerCase();
                        return (
                            pId === queryLower ||
                            pName === queryLower ||
                            pName.includes(queryLower) ||
                            queryLower.includes(pName) ||
                            pSku === queryLower
                        );
                    });

                    if (matched) {
                        const matchedId = String(matched.id);
                        setLines((prev) => {
                            if (prev.length === 1 && (!prev[0].inventoryId || prev[0].inventoryId === matchedId)) {
                                return [
                                    {
                                        inventoryId: matchedId,
                                        quantity: extracted?.quantity ? String(extracted.quantity) : (prev[0].quantity || ""),
                                    },
                                ];
                            }
                            return prev;
                        });
                    }
                }
            } catch (err) {
                if (!cancelled) setLoadError(err?.message || "Could not load inventory.");
            } finally {
                if (!cancelled) setLoadingProducts(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    function updateLine(idx, key, val) {
        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: val } : l)));
    }
    function addLine() {
        setLines((prev) => [...prev, { inventoryId: "", quantity: "" }]);
    }
    function removeLine(idx) {
        setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
    }

    function getProduct(id) {
        const numId = parseInt(id, 10);
        return products.find((p) => (p.id ?? p.Id) === numId);
    }

    // IDs already used in other lines
    function usedIds(excludeIdx) {
        return new Set(
            lines
                .filter((_, i) => i !== excludeIdx)
                .map((l) => String(l.inventoryId))
                .filter(Boolean)
        );
    }

    function handleSubmit(e) {
        e.preventDefault();
        const items = lines
            .filter((l) => l.inventoryId && l.quantity)
            .map((l) => ({
                inventoryId: parseInt(l.inventoryId, 10),
                quantity: parseInt(l.quantity, 10),
            }));
        if (items.length === 0) return;
        onSubmit({
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            itemsJson: items,
        });
    }

    return (
        <form onSubmit={handleSubmit} className="mt-3 space-y-4 p-4 bg-(--paper) border border-(--line) rounded-xs">
            <div className="flex items-center justify-between border-b border-(--line) pb-2">
                <div className="text-xs font-mono uppercase tracking-wider text-(--ink) font-semibold">
                    Customer & Order Line Items
                </div>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-xs font-mono text-[color-mix(in_srgb,var(--ink)_50%,white)] hover:text-(--accent) transition-colors"
                    >
                        X Cancel
                    </button>
                )}
            </div>
            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                Enter customer details and select products to place this order.
            </p>

            {/* Customer Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                    <label className="text-[10px] font-mono uppercase tracking-wide text-[color-mix(in_srgb,var(--ink)_60%,white)] block mb-1">
                        Customer Full Name <span className="text-(--accent)">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Kasun Perera"
                        className={inputClasses}
                    />
                </div>
                <div>
                    <label className="text-[10px] font-mono uppercase tracking-wide text-[color-mix(in_srgb,var(--ink)_60%,white)] block mb-1">
                        Contact Phone <span className="text-(--accent)">*</span>
                    </label>
                    <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 0771234567"
                        className={inputClasses}
                    />
                </div>
            </div>

            {loadingProducts && (
                <div className="flex items-center gap-2 py-2 text-xs font-mono text-[color-mix(in_srgb,var(--ink)_50%,white)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    Loading inventory...
                </div>
            )}

            {loadError && (
                <div className="flex items-center gap-2 py-2 text-xs font-mono text-(--accent)">
                    <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {loadError}
                </div>
            )}

            {!loadingProducts && !loadError && (
                <div className="space-y-2">
                    {/* header */}
                    <div className="grid grid-cols-[2fr_1fr_36px] gap-2 text-[10px] font-mono uppercase text-[color-mix(in_srgb,var(--ink)_55%,white)]">
                        <span>Product</span>
                        <span>Quantity</span>
                        <span />
                    </div>

                    {lines.map((line, idx) => {
                        const selected = getProduct(line.inventoryId);
                        const stock = selected
                            ? Number(selected.quantityAvailable ?? 0)
                            : null;
                        const taken = usedIds(idx);
                        const qtyExceedsStock = stock !== null && line.quantity && parseInt(line.quantity, 10) > stock;

                        return (
                            <div key={idx} className="space-y-1">
                                <div className="grid grid-cols-[2fr_1fr_36px] gap-2 items-center">
                                    <select
                                        value={line.inventoryId}
                                        onChange={(e) => {
                                            updateLine(idx, "inventoryId", e.target.value);
                                            // Reset quantity when product changes
                                            updateLine(idx, "quantity", "");
                                        }}
                                        required
                                        className={inputClasses}
                                    >
                                        <option value="">- Select a product -</option>
                                        {products.map((p) => {
                                            const pid = String(p.id ?? p.Id);
                                            const pName = p.name ?? p.Name ?? "-";
                                            const pSku = p.sku ?? p.SKU ?? "";
                                            const pQty = Number(p.quantityAvailable ?? p.QuantityAvailable ?? 0);
                                            const disabled = taken.has(pid);
                                            return (
                                                <option key={pid} value={pid} disabled={disabled}>
                                                    {pSku ? `${pSku} - ` : ""}{pName}  ({pQty} in stock)
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <input
                                        type="number"
                                        min="1"
                                        max={stock ?? undefined}
                                        value={line.quantity}
                                        onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                                        placeholder="Qty"
                                        required
                                        className={`${inputClasses} ${qtyExceedsStock ? "border-(--accent)!" : ""}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeLine(idx)}
                                        disabled={lines.length <= 1}
                                        className="h-(--input-btn-h) flex items-center justify-center text-[color-mix(in_srgb,var(--ink)_40%,white)] hover:text-(--accent) disabled:opacity-30 transition-colors"
                                        title="Remove line"
                                    >
                                        X
                                    </button>
                                </div>
                                {/* Stock hint row */}
                                {selected && (
                                    <div className="flex items-center gap-3 pl-1 text-[10px] font-mono">
                                        <span className="text-[color-mix(in_srgb,var(--ink)_50%,white)]">
                                            Available: <span className={`font-bold ${stock <= 20 ? "text-(--accent)" : "text-(--ink)"}`}>{stock.toLocaleString()}</span> units
                                        </span>
                                        <span className="text-[color-mix(in_srgb,var(--ink)_50%,white)]">
                                            @ ${Number(selected.unitPrice ?? 0).toFixed(2)} each
                                        </span>
                                        {qtyExceedsStock && (
                                            <span className="text-(--accent) font-semibold">
                                                ! Exceeds available stock
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex items-center justify-between pt-1">
                <button
                    type="button"
                    onClick={addLine}
                    disabled={loadingProducts || lines.length >= products.length}
                    className="text-xs font-mono text-(--accent) hover:underline disabled:opacity-40 disabled:no-underline"
                >
                    + Add Another Item
                </button>
                <Button type="submit" variant="primary" size="md" disabled={loadingProducts}>
                    Create Order
                </Button>
            </div>
        </form>
    );
}

/* -- Inventory picker form (for update_inventory / deactivate_inventory) -- */
function InventoryPickerForm({ tool, onSubmit }) {
    const isDeactivate = tool === "deactivate_inventory";
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [selectedId, setSelectedId] = useState("");

    // Editable fields for update_inventory
    const [formData, setFormData] = useState({
        sku: "",
        name: "",
        description: "",
        quantityAvailable: "",
        unitPrice: "",
        isActive: true,
    });

    // Fetch inventory on mount
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await callMcpTool("get_inventory", { includeInactive: true });
                if (cancelled) return;
                if (result?.success === false) {
                    if (!cancelled) setLoadError(result.message || "Could not load inventory.");
                    return;
                }
                const rawItems = result?.inventory || (Array.isArray(result) ? result : []);
                const items = rawItems.map((p) => ({
                    id: p.id ?? p.Id,
                    sku: p.sku ?? p.SKU ?? "",
                    name: p.name ?? p.Name ?? "-",
                    description: p.description ?? p.Description ?? "",
                    quantityAvailable: Number(p.quantityAvailable ?? p.QuantityAvailable ?? 0),
                    unitPrice: Number(p.unitPrice ?? p.UnitPrice ?? 0),
                    isActive: Boolean(p.isActive ?? p.IsActive ?? true),
                }));
                setProducts(items);
            } catch (err) {
                if (!cancelled) setLoadError(err?.message || "Could not load inventory.");
            } finally {
                if (!cancelled) setLoadingProducts(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // When a product is selected, pre-fill the form
    function handleSelect(idStr) {
        setSelectedId(idStr);
        if (!idStr) return;
        const numId = parseInt(idStr, 10);
        const product = products.find((p) => (p.id ?? p.Id) === numId);
        if (product) {
            setFormData({
                sku: product.sku ?? product.SKU ?? "",
                name: product.name ?? product.Name ?? "",
                description: product.description ?? product.Description ?? "",
                quantityAvailable: String(product.quantityAvailable ?? product.QuantityAvailable ?? 0),
                unitPrice: String(product.unitPrice ?? product.UnitPrice ?? 0),
                isActive: product.isActive ?? product.IsActive ?? true,
            });
        }
    }

    function handleChange(field, val) {
        setFormData((prev) => ({ ...prev, [field]: val }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!selectedId) return;

        if (isDeactivate) {
            onSubmit({ inventoryId: parseInt(selectedId, 10) });
            return;
        }

        onSubmit({
            inventoryId: parseInt(selectedId, 10),
            sku: formData.sku,
            name: formData.name,
            description: formData.description,
            quantityAvailable: parseInt(formData.quantityAvailable, 10) || 0,
            unitPrice: parseFloat(formData.unitPrice) || 0,
            isActive: formData.isActive,
        });
    }

    const selected = selectedId
        ? products.find((p) => (p.id ?? p.Id) === parseInt(selectedId, 10))
        : null;

    return (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3 p-3.5 bg-(--paper) border border-(--line) rounded-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-(--ink) font-semibold">
                {isDeactivate ? "Deactivate Inventory Item" : "Update Inventory Item"}
            </div>
            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                {isDeactivate
                    ? "Select the product to deactivate."
                    : "Select a product, then edit its details below."}
            </p>

            {loadingProducts && (
                <div className="flex items-center gap-2 py-2 text-xs font-mono text-[color-mix(in_srgb,var(--ink)_50%,white)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    Loading inventory...
                </div>
            )}

            {loadError && (
                <div className="flex items-center gap-2 py-2 text-xs font-mono text-(--accent)">
                    <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {loadError}
                </div>
            )}

            {!loadingProducts && !loadError && (
                <>
                    {/* Product picker */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-mono uppercase tracking-wide text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                            Select Product <span className="text-(--accent)">*</span>
                        </label>
                        <select
                            value={selectedId}
                            onChange={(e) => handleSelect(e.target.value)}
                            required
                            className={inputClasses}
                        >
                            <option value="">- Choose a product -</option>
                            {products.map((p) => {
                                const pid = String(p.id ?? p.Id);
                                const pName = p.name ?? p.Name ?? "-";
                                const pSku = p.sku ?? p.SKU ?? "";
                                const pQty = Number(p.quantityAvailable ?? p.QuantityAvailable ?? 0);
                                const pActive = p.isActive ?? p.IsActive ?? true;
                                return (
                                    <option key={pid} value={pid}>
                                        {pSku ? `${pSku} - ` : ""}{pName}  ({pQty} in stock{!pActive ? ", Inactive" : ""})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Current product info card */}
                    {selected && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-white border border-(--line) rounded-xs text-[10px] font-mono">
                            <div>
                                <span className="uppercase text-[color-mix(in_srgb,var(--ink)_50%,white)] block">Current SKU</span>
                                <span className="font-bold text-(--ink)">{selected.sku ?? selected.SKU ?? "-"}</span>
                            </div>
                            <div>
                                <span className="uppercase text-[color-mix(in_srgb,var(--ink)_50%,white)] block">Stock</span>
                                <span className={`font-bold ${Number(selected.quantityAvailable ?? selected.QuantityAvailable ?? 0) <= 20 ? "text-(--accent)" : "text-(--ink)"}`}>
                                    {Number(selected.quantityAvailable ?? selected.QuantityAvailable ?? 0).toLocaleString()} units
                                </span>
                            </div>
                            <div>
                                <span className="uppercase text-[color-mix(in_srgb,var(--ink)_50%,white)] block">Price</span>
                                <span className="font-bold text-(--ink)">${Number(selected.unitPrice ?? selected.UnitPrice ?? 0).toFixed(2)}</span>
                            </div>
                            <div>
                                <span className="uppercase text-[color-mix(in_srgb,var(--ink)_50%,white)] block">Status</span>
                                <span className={`font-bold ${(selected.isActive ?? selected.IsActive ?? true) ? "text-(--ink)" : "text-(--accent)"}`}>
                                    {(selected.isActive ?? selected.IsActive ?? true) ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Editable fields (only for update_inventory) */}
                    {!isDeactivate && selectedId && (
                        <div className="space-y-3 pt-1">
                            <div className="text-[10px] font-mono uppercase tracking-wide text-[color-mix(in_srgb,var(--ink)_55%,white)] font-semibold border-t border-(--line) pt-2">
                                Edit Fields
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-mono uppercase tracking-wide text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                                        SKU / Code <span className="text-(--accent)">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.sku}
                                        onChange={(e) => handleChange("sku", e.target.value)}
                                        placeholder="e.g. WDG-001"
                                        required
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-mono uppercase tracking-wide text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                                        Product Name <span className="text-(--accent)">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleChange("name", e.target.value)}
                                        placeholder="e.g. Steel Widget"
                                        required
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 sm:col-span-2">
                                    <label className="text-[10px] font-mono uppercase tracking-wide text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => handleChange("description", e.target.value)}
                                        placeholder="Optional description"
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-mono uppercase tracking-wide text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                                        Stock Quantity <span className="text-(--accent)">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.quantityAvailable}
                                        onChange={(e) => handleChange("quantityAvailable", e.target.value)}
                                        placeholder="0"
                                        required
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-mono uppercase tracking-wide text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                                        Unit Price ($) <span className="text-(--accent)">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.unitPrice}
                                        onChange={(e) => handleChange("unitPrice", e.target.value)}
                                        placeholder="0.00"
                                        required
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="flex items-center gap-3 sm:col-span-2">
                                    <button
                                        type="button"
                                        onClick={() => handleChange("isActive", !formData.isActive)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                                            formData.isActive ? "bg-(--accent)" : "bg-[color-mix(in_srgb,var(--ink)_25%,white)]"
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                                formData.isActive ? "translate-x-4" : "translate-x-0"
                                            }`}
                                        />
                                    </button>
                                    <span className="text-xs font-mono text-(--ink)">
                                        Active - {formData.isActive ? "Yes" : "No"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className="flex justify-end pt-1">
                <Button type="submit" variant="primary" size="md" disabled={loadingProducts || !selectedId}>
                    {isDeactivate ? "Deactivate Product" : "Update Product"}
                </Button>
            </div>
        </form>
    );
}

/* -- Smart param form (for everything except create_order) ------ */
function NeedsParamsForm({ tool, missing, extracted, onSubmit }) {
    const meta = TOOL_FIELD_META[tool] || {};

    // If this is create_order, use the dedicated builder
    if (meta._orderItems) {
        return <OrderItemsBuilder extracted={extracted} onSubmit={onSubmit} />;
    }

    // If this is update_inventory or deactivate_inventory, use the inventory picker
    if (meta._inventoryPicker) {
        return <InventoryPickerForm tool={tool} onSubmit={onSubmit} />;
    }

    // Build initial state from extracted + missing
    const [formData, setFormData] = useState(() => {
        const initial = { ...(extracted || {}) };
        for (const field of missing || []) {
            if (initial[field] === undefined) {
                const fm = meta[field];
                if (fm?.type === "toggle") initial[field] = true;
                else if (fm?.type === "select") initial[field] = fm.options?.[0] || "";
                else initial[field] = "";
            }
        }
        return initial;
    });

    function handleChange(field, val) {
        setFormData((prev) => ({ ...prev, [field]: val }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        const parsed = { ...formData };
        for (const k of Object.keys(parsed)) {
            const fm = meta[k];
            if (fm?.type === "number" || k === "unitPrice") parsed[k] = parseFloat(parsed[k]) || 0;
            if (k === "quantityAvailable" || k === "inventoryId" || k === "reorderLevel")
                parsed[k] = parseInt(parsed[k], 10) || 0;
            if (fm?.type === "toggle") parsed[k] = Boolean(parsed[k]);
        }
        onSubmit(parsed);
    }

    // Show extracted inventory values as well so the operator can review them
    // alongside the one required field that still needs input.
    const fields = tool === "create_inventory"
        ? ["sku", "name", "quantityAvailable", "unitPrice"]
        : (missing || []);

    return (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3 p-3.5 bg-(--paper) border border-(--line) rounded-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-(--ink) font-semibold">
                Fill in the details below
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {fields.map((field) => {
                    const fm = meta[field] || {};
                    const label = fm.label || fieldLabel(field);
                    const isRequired = fm.required !== false;

                    // Toggle / boolean
                    if (fm.type === "toggle") {
                        return (
                            <div key={field} className="flex items-center gap-3 sm:col-span-2">
                                <button
                                    type="button"
                                    onClick={() => handleChange(field, !formData[field])}
                                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                                        formData[field] ? "bg-(--accent)" : "bg-[color-mix(in_srgb,var(--ink)_25%,white)]"
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                            formData[field] ? "translate-x-4" : "translate-x-0"
                                        }`}
                                    />
                                </button>
                                <span className="text-xs font-mono text-(--ink)">
                                    {label} - {formData[field] ? "Yes" : "No"}
                                </span>
                            </div>
                        );
                    }

                    // Select / dropdown
                    if (fm.type === "select") {
                        return (
                            <div key={field} className="flex flex-col gap-1">
                                <label className="text-[10px] font-mono uppercase tracking-wide text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                                    {label} {isRequired && <span className="text-(--accent)">*</span>}
                                </label>
                                <select
                                    value={formData[field] ?? ""}
                                    onChange={(e) => handleChange(field, e.target.value)}
                                    required={isRequired}
                                    className={inputClasses}
                                >
                                    {(fm.options || []).map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    }

                    // Text / number / password
                    return (
                        <div key={field} className={`flex flex-col gap-1 ${field === "description" ? "sm:col-span-2" : ""}`}>
                            <label className="text-[10px] font-mono uppercase tracking-wide text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                                {label} {isRequired && <span className="text-(--accent)">*</span>}
                            </label>
                            <input
                                type={fm.type || "text"}
                                min={fm.min}
                                step={fm.step}
                                value={formData[field] ?? ""}
                                onChange={(e) => handleChange(field, e.target.value)}
                                placeholder={fm.placeholder || `Enter ${label.toLowerCase()}...`}
                                required={isRequired}
                                className={inputClasses}
                            />
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end pt-1">
                <Button type="submit" variant="primary" size="md">
                    Submit
                </Button>
            </div>
        </form>
    );
}

function OrderCreatorHighlight({ order, label }) {
    const orderNumber = order.orderNumber ?? order.OrderNumber ?? "-";
    const username = order.username ?? order.Username ?? order.userId ?? order.UserId ?? "unknown";
    const customerName = order.customerName ?? order.CustomerName;
    const customerPhone = order.customerPhone ?? order.CustomerPhone;
    const totalAmount = Number(order.totalAmount ?? order.TotalAmount ?? 0);
    const createdAt = order.createdAtUtc ?? order.CreatedAtUtc ?? "";

    return (
        <div className="my-2 p-3.5 bg-(--paper) border border-(--ink) rounded-xs space-y-2">
            <div className="flex items-center justify-between border-b border-(--line) pb-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-(--ink)">
                    {label}
                </span>
                <span className="font-mono text-xs font-bold text-(--accent)">{orderNumber}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                    <span className="text-[10px] font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Made By (Operator)
                    </span>
                    <span className="font-mono text-sm font-bold text-(--ink)">{username}</span>
                </div>
                {customerName && (
                    <div>
                        <span className="text-[10px] font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                            Customer
                        </span>
                        <span className="font-mono text-xs font-semibold text-(--ink) block">
                            {customerName}
                        </span>
                        {customerPhone && (
                            <span className="text-[10px] font-mono text-[color-mix(in_srgb,var(--ink)_55%,white)] block">
                                {customerPhone}
                            </span>
                        )}
                    </div>
                )}
                <div>
                    <span className="text-[10px] font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Total Amount
                    </span>
                    <span className="font-mono text-sm font-bold text-(--ink) tabular-nums">
                        ${totalAmount.toFixed(2)}
                    </span>
                </div>
                <div>
                    <span className="text-[10px] font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Created At
                    </span>
                    <span className="font-mono text-xs text-(--ink)">
                        {createdAt ? new Date(createdAt).toLocaleString() : "-"}
                    </span>
                </div>
            </div>
        </div>
    );
}

function OrdersResultView({ orders, params, rawQuery, tool }) {
    if (!orders || orders.length === 0) {
        return (
            <div className="my-2 p-4 border border-(--line) bg-(--paper) rounded-xs text-center">
                <p className="text-sm font-semibold text-(--ink)">
                    No orders found for: "{rawQuery || tool}"
                </p>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,white)] mt-1 font-mono">
                    Database query executed successfully. Zero orders recorded.
                </p>
            </div>
        );
    }

    let filtered = orders;
    let highlightLabel = null;

    if (params?.orderNumber) {
        const target = String(params.orderNumber).trim().toLowerCase();
        filtered = orders.filter(
            (o) => String(o.orderNumber ?? o.OrderNumber ?? "").trim().toLowerCase() === target
        );
        if (filtered.length === 0) {
            return (
                <div className="my-2 p-3.5 bg-amber-50/70 border border-amber-400 rounded-xs flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div>
                        <span className="text-xs font-semibold text-amber-900 block">
                            Order Not Found
                        </span>
                        <span className="text-xs font-mono text-(--ink) mt-0.5 block">
                            No accessible order matched "{params.orderNumber}". (Sales users only see their own orders.)
                        </span>
                    </div>
                </div>
            );
        }
        highlightLabel = params?.focus === "creator" ? "Order Creator Details" : "Matched Order";
    } else if (params?.lastOrder || params?.focus === "creator") {
        const sorted = [...orders].sort((a, b) => {
            const ta = Date.parse(a.createdAtUtc ?? a.CreatedAtUtc ?? "") || 0;
            const tb = Date.parse(b.createdAtUtc ?? b.CreatedAtUtc ?? "") || 0;
            return tb - ta;
        });
        filtered = [sorted[0]];
        highlightLabel = "Latest Order Creator";
    }

    return (
        <div>
            {highlightLabel && filtered.length > 0 && (
                <OrderCreatorHighlight order={filtered[0]} label={highlightLabel} />
            )}
            <OrdersTable orders={filtered} />
        </div>
    );
}

function WarningBanner({ warnings }) {
    if (!warnings || warnings.length === 0) return null;
    return (
        <div className="my-2 p-3 bg-amber-50/80 border border-amber-400 rounded-xs flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="flex-1 space-y-1">
                <span className="text-xs font-semibold text-amber-900 block">
                    Server Warning
                </span>
                {warnings.map((w, idx) => (
                    <span key={idx} className="text-xs font-mono text-(--ink) block leading-relaxed">
                        {typeof w === "string" ? w : JSON.stringify(w)}
                    </span>
                ))}
            </div>
        </div>
    );
}

function DataResultView({ tool, data, params, rawQuery, onStartOrderWithItem }) {
    if (!data) {
        return (
            <div className="p-3 bg-(--paper) border border-(--line) rounded-xs text-xs font-mono">
                No data returned.
            </div>
        );
    }

    const warnings = [];
    if (typeof data.warning === "string" && data.warning.trim()) warnings.push(data.warning);
    if (Array.isArray(data.warnings)) warnings.push(...data.warnings);

    // Check for explicit error or permission denial from backend (.NET / MCP / validation)
    if (data.success === false || data.isError || data.error || (Array.isArray(data.errors) && data.errors.length > 0)) {
        const errorDetails = Array.isArray(data.errors) && data.errors.length > 0
            ? data.errors.map((e) => (typeof e === "string" ? e : JSON.stringify(e))).join("; ")
            : data.message || data.error || data.detail || "Operation failed verification check.";
        return (
            <div>
                <WarningBanner warnings={warnings} />
                <div className="my-2 p-3.5 bg-red-50/50 border border-(--accent) rounded-xs flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-(--accent) shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div className="flex-1">
                        <span className="text-xs font-semibold text-(--accent) block">
                            Server Error / Verification Failure
                        </span>
                        <span className="text-xs font-mono text-(--ink) mt-0.5 block leading-relaxed whitespace-pre-wrap">
                            {errorDetails}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    if (data.user && !Array.isArray(data.user)) {
        return (
            <>
                <WarningBanner warnings={warnings} />
                <UserProfileCard
                    user={data.user}
                    expiresAtUtc={data.expiresAtUtc}
                    message={data.message}
                />
            </>
        );
    }

    if (data.orderNumber || (data.orderId && data.totalAmount !== undefined)) {
        return (
            <>
                <WarningBanner warnings={warnings} />
                <OrderReceiptCard data={data} />
            </>
        );
    }

    if (data.inventory && !Array.isArray(data.inventory)) {
        return (
            <>
                <WarningBanner warnings={warnings} />
                <ProductDetailCard item={data.inventory} message={data.message} />
            </>
        );
    }

    if (data.orders && Array.isArray(data.orders)) {
        return (
            <>
                <WarningBanner warnings={warnings} />
                <OrdersResultView orders={data.orders} params={params} rawQuery={rawQuery} tool={tool} />
            </>
        );
    }

    if (data.inventory && Array.isArray(data.inventory)) {
        return (
            <>
                <WarningBanner warnings={warnings} />
                <InventoryResultView
                    inventory={data.inventory}
                    searchQuery={params?.searchQuery || extractSearchTermFromQuery(rawQuery)}
                    onStartOrderWithItem={onStartOrderWithItem}
                />
            </>
        );
    }

    if (data.users && Array.isArray(data.users)) {
        if (data.users.length === 0) {
            return (
                <div className="my-2 p-4 border border-(--line) bg-(--paper) rounded-xs text-center">
                    <p className="text-sm font-semibold text-(--ink)">
                        No users found for: "{rawQuery || tool}"
                    </p>
                </div>
            );
        }
        return (
            <>
                <WarningBanner warnings={warnings} />
                <UsersTable users={data.users} />
            </>
        );
    }

    if (Array.isArray(data)) {
        if (data.length === 0) {
            return (
                <div className="my-2 p-4 border border-(--line) bg-(--paper) rounded-xs text-center">
                    <p className="text-sm font-semibold text-(--ink)">
                        No records found for: "{rawQuery || tool}"
                    </p>
                </div>
            );
        }

        if (data[0].orderNumber || data[0].OrderNumber) {
            return <OrdersResultView orders={data} params={params} rawQuery={rawQuery} tool={tool} />;
        }
        if (data[0].sku || data[0].SKU) {
            return (
                <InventoryResultView
                    inventory={data}
                    searchQuery={params?.searchQuery || extractSearchTermFromQuery(rawQuery)}
                    onStartOrderWithItem={onStartOrderWithItem}
                />
            );
        }
        if (data[0].username || data[0].Username) {
            return <UsersTable users={data} />;
        }
    }

    if (data.message && typeof data.message === "string") {
        return (
            <>
                <WarningBanner warnings={warnings} />
                <div className="my-2 p-3 bg-white border border-(--line) rounded-xs flex items-center gap-2.5">
                    <CheckCircle className="h-4 w-4 text-(--accent) shrink-0" strokeWidth={1.5} />
                    <span className="text-xs font-mono text-(--ink)">{data.message}</span>
                </div>
            </>
        );
    }

    return (
        <>
            <WarningBanner warnings={warnings} />
            <KeyValueGrid data={data} />
        </>
    );
}

function renderInlineMarkdown(text) {
    const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, idx) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
            return (
                <strong key={idx} className="font-semibold text-(--ink)">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
            return (
                <code
                    key={idx}
                    className="px-1 py-0.5 bg-(--paper) border border-(--line) rounded-xs font-mono text-[11px]"
                >
                    {part.slice(1, -1)}
                </code>
            );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
}

function CliFormattedText({ text }) {
    const blocks = String(text || "").split(/(```[\s\S]*?```)/g);
    return (
        <div className="space-y-2 text-xs leading-relaxed text-(--ink)">
            {blocks.map((block, bIdx) => {
                if (block.startsWith("```") && block.endsWith("```")) {
                    const inner = block.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
                    return (
                        <pre
                            key={bIdx}
                            className="p-2.5 bg-(--paper) border border-(--line) rounded-xs font-mono text-[11px] overflow-x-auto whitespace-pre-wrap"
                        >
                            {inner}
                        </pre>
                    );
                }

                const lines = block.split(/\r?\n/);
                return (
                    <div key={bIdx} className="space-y-1">
                        {lines.map((line, lIdx) => {
                            const trimmed = line.trim();
                            if (!trimmed) {
                                return <div key={lIdx} className="h-1" />;
                            }
                            if (trimmed.startsWith("### ") || trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
                                const heading = trimmed.replace(/^#{1,3}\s+/, "");
                                return (
                                    <div key={lIdx} className="font-display font-bold text-xs text-(--ink) pt-1">
                                        {renderInlineMarkdown(heading)}
                                    </div>
                                );
                            }
                            if (/^[-*]\s+/.test(trimmed)) {
                                return (
                                    <div key={lIdx} className="flex items-start gap-2 pl-1">
                                        <span className="font-mono text-(--accent) select-none">•</span>
                                        <span className="flex-1">{renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ""))}</span>
                                    </div>
                                );
                            }
                            return <p key={lIdx}>{renderInlineMarkdown(line)}</p>;
                        })}
                    </div>
                );
            })}
        </div>
    );
}

function AgentApprovalCard({ approval, onApprove, onReject }) {
    if (!approval) return null;
    const ticket = approval.tool === "create_incident_ticket" && typeof approval.arguments === "object"
        ? approval.arguments
        : null;
    const teamLabels = {
        "oncall-auth": "Auth on-call team",
        "oncall-orders": "Orders on-call team",
        "oncall-inventory": "Inventory on-call team",
        "sre-lead": "SRE lead",
    };
    const formattedPayload =
        typeof approval.arguments === "string"
            ? approval.arguments
            : JSON.stringify(approval.arguments ?? {}, null, 2);

    return (
        <div className="mt-3 p-3.5 border border-(--accent) bg-(--paper) rounded-xs space-y-3">
            <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-(--accent) shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="flex-1">
                    <div className="text-xs font-semibold text-(--ink)">
                        {ticket ? "Approve this incident ticket?" : <>Approval required: <code className="font-mono">{approval.tool}</code></>}
                    </div>
                    <p className="mt-1 text-xs text-(--ink)/70">The AI cannot save this action until you approve it.</p>
                    {approval.tainted && (
                        <p className="mt-1 px-2 py-1 bg-red-50 border border-(--accent) rounded-xs text-[11px] font-mono font-semibold text-(--accent)">
                            WARNING: Suspicious prompt injection instruction was detected earlier in this session!
                        </p>
                    )}
                </div>
            </div>

            {ticket ? <div className="p-3 bg-white border border-(--line) space-y-1.5 text-xs">
                <strong className="block text-sm">{ticket.title || "Untitled incident"}</strong>
                <p className="whitespace-pre-wrap">{ticket.summary}</p>
                <p className="font-mono text-[11px]">{ticket.service_name || "Unassigned service"} · {ticket.severity || "Severity not set"} · {teamLabels[ticket.assignee] || ticket.assignee || "Unassigned"}</p>
            </div> : <pre className="p-2.5 bg-white border border-(--line) rounded-xs font-mono text-[11px] overflow-x-auto whitespace-pre-wrap text-(--ink)">
                {formattedPayload}
            </pre>}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-(--line)">
                <Button variant="ghost" size="md" icon={XCircle} onClick={onReject}>
                    Reject
                </Button>
                <Button variant="primary" size="md" icon={CheckCircle} onClick={onApprove}>
                    {ticket ? "Approve and create ticket" : "Approve"}
                </Button>
            </div>
        </div>
    );
}

function AgentResponseView({ res }) {
    const tools = res.tools_called || [];
    const agentWarnings = [];
    if (res.tainted) {
        agentWarnings.push("Security warning: Suspicious prompt injection instruction was detected in tool data and treated as untrusted data only.");
    }
    if (res.blocked_count > 0) {
        agentWarnings.push(`Policy warning: ${res.blocked_count} disallowed tool/path request(s) were blocked by guardrails.`);
    }
    if (res.hit_step_limit) {
        agentWarnings.push(`Execution warning: Agent reached the maximum step limit (${res.steps}) before completing.`);
    }

    return (
        <div className="space-y-3">
            <WarningBanner warnings={agentWarnings} />
            <CliFormattedText text={res.answer} />
            <div className="pt-2 border-t border-(--line) flex flex-wrap items-center gap-1.5">
                {res.steps !== undefined && <ScoreChip label="steps" value={res.steps} />}
                {tools.length > 0 && (
                    <ScoreChip label="tools" value={tools.join(", ")} />
                )}
            </div>
        </div>
    );
}

function ChatMessage({
    message,
    onRetry,
    onConfirmAction,
    onCancelAction,
    onSubmitMissingParams,
    onSelectCandidate,
    onApproveAgent,
    onRejectAgent,
}) {
    const isUser = message.role === "user";
    const isPending = message.status === "pending";
    const isError = message.status === "error";
    const res = message.intentResult;

    const [orderModalProductId, setOrderModalProductId] = useState(null);

    const resType = res?.type;
    const scores = res?.scores;
    const isAiRoute =
        resType === "AgentResponse" || res?.agent === "ai" || message.routeMode === "ai";
    const showRouteBadge = !isPending && !isError && res && res?.tool !== "system";

    function formatTitle() {
        if (isPending && message.pendingApproval) return "Agent Approval Gate";
        if (!res) return "Assistant Response";
        if (resType === "AgentResponse") return "AI Agent Investigation";
        if (res.data?.success === false) return "Access Denied / Verification Failed";
        if (resType === "Executed") return res.intent || formatToolLabel(res.tool) || "Executed";
        if (resType === "NeedsParams") return `Parameters Required (${formatToolLabel(res.tool)})`;
        if (resType === "NeedsConfirmation") return `Confirmation Required (${formatToolLabel(res.tool)})`;
        if (resType === "Ambiguous") return "Clarification Required";
        if (resType === "Rejected") return "Action Rejected / Access Denied";
        return "Assistant Response";
    }

    return (
        <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} w-full my-2`}>
            <div
                className={`max-w-[90%] rounded-xs text-xs transition-all ${
                    isUser
                        ? "bg-(--ink) text-white px-4 py-3"
                        : "bg-white text-(--ink) border border-(--line) px-4 py-3.5 shadow-none w-full max-w-3xl"
                }`}
            >
                {!isUser && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--line) pb-2 mb-2.5">
                        <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-xs uppercase tracking-wider text-(--ink)">
                                {formatTitle()}
                            </span>
                            {showRouteBadge && (
                                <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded-xs border ${
                                        isAiRoute
                                            ? "bg-(--paper) text-(--ink) border-(--ink)"
                                            : "bg-(--paper) text-(--accent) border-(--line)"
                                    }`}
                                >
                                    {isAiRoute ? (
                                        <>
                                            <Bot className="h-3 w-3" strokeWidth={1.75} />
                                            <span>AI agent</span>
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="h-3 w-3" strokeWidth={1.75} />
                                            <span>Fast path</span>
                                        </>
                                    )}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {res?.tool && <ScoreChip label="tool" value={res.tool} />}
                            {scores?.confidence !== undefined && (
                                <ScoreChip label="conf" value={scores.confidence} isPercent />
                            )}
                            {scores?.regex !== undefined && (
                                <ScoreChip label="regex" value={scores.regex} />
                            )}
                        </div>
                    </div>
                )}

                {isUser && <p className="text-sm leading-relaxed">{message.content}</p>}

                {isPending && (
                    <div>
                        <div className="flex items-center gap-2.5 py-1 text-[color-mix(in_srgb,var(--ink)_65%,white)]">
                            <Loader2 className="h-4 w-4 animate-spin text-(--accent)" strokeWidth={1.5} />
                            <span className="font-mono text-xs">
                                {message.pendingApproval
                                    ? "Waiting for operator approval before running mutating tool..."
                                    : "Resolving hybrid intent and querying MCP tools..."}
                            </span>
                        </div>
                        {message.pendingApproval && (
                            <AgentApprovalCard
                                approval={message.pendingApproval}
                                onApprove={() =>
                                    onApproveAgent?.(message.id, message.pendingApproval.request_id)
                                }
                                onReject={() =>
                                    onRejectAgent?.(message.id, message.pendingApproval.request_id)
                                }
                            />
                        )}
                        {message.errorText && <p role="alert" className="mt-2 text-xs text-(--accent)">{message.errorText}</p>}
                    </div>
                )}

                {!isUser && !isPending && !isError && res && (
                    <div>
                        {resType === "AgentResponse" && <AgentResponseView res={res} />}

                        {resType === "Executed" && (
                            <>
                                <DataResultView
                                    tool={res.tool}
                                    data={res.data}
                                    params={res.params}
                                    rawQuery={message.rawQuery || message.content}
                                    onStartOrderWithItem={(prodId) => setOrderModalProductId(prodId)}
                                />
                                {orderModalProductId && (
                                    <div className="mt-3">
                                        <OrderItemsBuilder
                                            initialProductId={orderModalProductId}
                                            onCancel={() => setOrderModalProductId(null)}
                                            onSubmit={(merged) => {
                                                setOrderModalProductId(null);
                                                onSubmitMissingParams(message.id, "create_order", merged);
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        )}

                        {resType === "NeedsParams" && (
                            <div>
                                <p className="text-xs leading-relaxed text-(--ink)">
                                    The tool <strong className="font-mono">{formatToolLabel(res.tool)}</strong> requires missing information before it can execute:
                                </p>
                                <NeedsParamsForm
                                    tool={res.tool}
                                    missing={res.missing}
                                    extracted={res.extracted}
                                    onSubmit={(merged) => onSubmitMissingParams(message.id, res.tool, merged)}
                                />
                            </div>
                        )}

                        {resType === "NeedsConfirmation" && (
                            <div className="my-2 p-3.5 border border-(--line) bg-(--paper) rounded-xs space-y-3">
                                <div className="flex items-start gap-2 text-(--accent)">
                                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                                    <div className="flex-1">
                                        <div className="text-xs font-semibold text-(--ink)">
                                            {res.summary}
                                        </div>
                                        <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,white)] mt-0.5 font-mono">
                                            This is a mutation tool. Confirm execution to commit changes to the ERP database.
                                        </p>
                                    </div>
                                </div>
                                {res.params && Object.keys(res.params).length > 0 && (
                                    <KeyValueGrid data={res.params} />
                                )}
                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-(--line)">
                                    <Button
                                        variant="ghost"
                                        size="md"
                                        onClick={() => onCancelAction(message.id)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="md"
                                        icon={CheckCircle}
                                        onClick={() => onConfirmAction(message.id, res.tool, res.params)}
                                    >
                                        Confirm Mutation
                                    </Button>
                                </div>
                            </div>
                        )}

                        {resType === "Ambiguous" && (
                            <div className="my-2 space-y-2">
                                <p className="text-xs text-(--ink)">
                                    Could not determine an unambiguous operational intent. Select an intended action:
                                </p>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {(res.candidates || []).map((cand) => (
                                        <button
                                            key={cand}
                                            type="button"
                                            onClick={() => onSelectCandidate(cand)}
                                            className="px-3 py-1.5 bg-white border border-(--line) hover:border-(--ink) text-xs font-mono rounded-xs transition-colors"
                                        >
                                            {cand}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {resType === "Rejected" && (
                            <div className="my-2 p-3 border border-(--line) bg-(--paper) rounded-xs flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-(--accent) shrink-0 mt-0.5" strokeWidth={1.5} />
                                <div>
                                    <span className="text-xs font-semibold text-(--ink)">
                                        Action Rejected
                                    </span>
                                    <p className="text-xs text-[color-mix(in_srgb,var(--ink)_70%,white)] mt-0.5">
                                        {res.reason}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isError && (
                    <div className="mt-3 pt-2 border-t border-(--line) flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-(--accent) text-xs">
                            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                            <span>{message.errorText || "Execution failed"}</span>
                        </div>
                        {onRetry && message.rawQuery && (
                            <Button
                                variant="danger"
                                size="sm"
                                icon={RotateCcw}
                                onClick={() => onRetry(message.rawQuery, message.id)}
                            >
                                Retry
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ChatMessage;

import React, { useState } from "react";
import {
    RotateCcw,
    AlertCircle,
    Loader2,
    CheckCircle,
    ShieldAlert,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import Button from "../common/Button";

function ScoreChip({ label, value, isPercent }) {
    if (value === undefined || value === null) return null;
    const formatted = isPercent
        ? `${Math.round(value * 100)}%`
        : typeof value === "number"
        ? value.toFixed(2)
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
                        {user.username || user.Username || "â€”"}
                    </span>
                </div>
                <div>
                    <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Security Role
                    </span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 text-xs font-mono border border-(--ink) text-(--ink) rounded-xs">
                        {user.role || user.Role || "â€”"}
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
    const orderNumber = data.orderNumber || data.OrderNumber || `ORD-${data.orderId || ""}`;
    const amount = Number(data.totalAmount ?? data.TotalAmount ?? 0);
    const itemCount = data.items ?? data.itemCount ?? 0;

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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <span className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_60%,white)] block">
                        Order Identifier
                    </span>
                    <span className="font-mono text-base font-bold text-(--ink)">
                        {orderNumber}
                    </span>
                </div>
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
    const sku = item.sku || item.SKU || "â€”";
    const name = item.name || item.Name || "â€”";
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
                            const orderNumber = ord.orderNumber ?? ord.OrderNumber ?? "â€”";
                            const username = ord.username ?? ord.Username ?? ord.userId ?? "â€”";
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
                                            {username}
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
                                            {createdAt ? new Date(createdAt).toLocaleDateString() : "â€”"}
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

function InventoryTable({ inventory }) {
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
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-(--line) text-xs">
                        {inventory.map((inv, idx) => {
                            const id = inv.id ?? inv.Id ?? idx;
                            const sku = inv.sku ?? inv.SKU ?? "â€”";
                            const name = inv.name ?? inv.Name ?? "â€”";
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
                            const uname = u.username ?? u.Username ?? "â€”";
                            const role = u.role ?? u.Role ?? "â€”";
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
                                        {created ? new Date(created).toLocaleDateString() : "â€”"}
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
                                {k}
                            </td>
                            <td className="py-1.5 font-bold text-(--ink)">
                                {v === null ? "â€”" : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function NeedsParamsForm({ tool, missing, extracted, onSubmit }) {
    const [formData, setFormData] = useState(() => {
        const initial = { ...(extracted || {}) };
        for (const field of missing || []) {
            if (initial[field] === undefined) initial[field] = "";
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
            if (k === "unitPrice") parsed[k] = parseFloat(parsed[k]) || 0;
            if (k === "quantityAvailable" || k === "reorderLevel") parsed[k] = parseInt(parsed[k], 10) || 0;
            if (k === "itemsJson" && typeof parsed[k] === "string") {
                try {
                    parsed[k] = JSON.parse(parsed[k]);
                } catch (_) {}
            }
        }
        onSubmit(parsed);
    }

    return (
        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 p-3.5 bg-(--paper) border border-(--line) rounded-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-(--ink) font-semibold">
                Required Parameters for `{tool}`:
            </div>
            <div className="grid grid-cols-1 gap-2.5">
                {(missing || []).map((field) => (
                    <div key={field} className="flex flex-col gap-1">
                        <label className="text-xs font-mono uppercase text-[color-mix(in_srgb,var(--ink)_65%,white)]">
                            {field} <span className="text-(--accent)">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData[field] ?? ""}
                            onChange={(e) => handleChange(field, e.target.value)}
                            placeholder={`Enter ${field}...`}
                            required
                            className="h-(--input-btn-h) px-3 text-sm bg-white border border-(--line) rounded-xs focus:outline-none focus:border-(--accent) font-mono"
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-end pt-1">
                <Button type="submit" variant="primary" size="md">
                    Submit Parameters
                </Button>
            </div>
        </form>
    );
}

function DataResultView({ tool, data, rawQuery }) {
    if (!data) {
        return (
            <div className="p-3 bg-(--paper) border border-(--line) rounded-xs text-xs font-mono">
                No data returned.
            </div>
        );
    }

    if (data.user && !Array.isArray(data.user)) {
        return (
            <UserProfileCard
                user={data.user}
                expiresAtUtc={data.expiresAtUtc}
                message={data.message}
            />
        );
    }

    if (data.orderNumber || data.OrderNumber || (data.orderId && data.totalAmount !== undefined)) {
        return <OrderReceiptCard data={data} />;
    }

    if (data.inventory && !Array.isArray(data.inventory)) {
        return <ProductDetailCard item={data.inventory} message={data.message} />;
    }

    if (data.orders && Array.isArray(data.orders)) {
        if (data.orders.length === 0) {
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
        return <OrdersTable orders={data.orders} />;
    }

    if (data.inventory && Array.isArray(data.inventory)) {
        if (data.inventory.length === 0) {
            return (
                <div className="my-2 p-4 border border-(--line) bg-(--paper) rounded-xs text-center">
                    <p className="text-sm font-semibold text-(--ink)">
                        No inventory products found for: "{rawQuery || tool}"
                    </p>
                    <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,white)] mt-1 font-mono">
                        Zero inventory items recorded in database.
                    </p>
                </div>
            );
        }
        return <InventoryTable inventory={data.inventory} />;
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
        return <UsersTable users={data.users} />;
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
            return <OrdersTable orders={data} />;
        }
        if (data[0].sku || data[0].SKU) {
            return <InventoryTable inventory={data} />;
        }
        if (data[0].username || data[0].Username) {
            return <UsersTable users={data} />;
        }
    }

    if (data.message && typeof data.message === "string") {
        return (
            <div className="my-2 p-3 bg-white border border-(--line) rounded-xs flex items-center gap-2.5">
                <CheckCircle className="h-4 w-4 text-(--accent) shrink-0" strokeWidth={1.5} />
                <span className="text-xs font-mono text-(--ink)">{data.message}</span>
            </div>
        );
    }

    return <KeyValueGrid data={data} />;
}

function ChatMessage({
    message,
    onRetry,
    onConfirmAction,
    onCancelAction,
    onSubmitMissingParams,
    onSelectCandidate,
}) {
    const isUser = message.role === "user";
    const isPending = message.status === "pending";
    const isError = message.status === "error";
    const res = message.intentResult;

    const resType = res?.type;
    const scores = res?.scores;

    function formatTitle() {
        if (!res) return "Assistant Response";
        if (resType === "Executed") return res.intent || formatToolLabel(res.tool) || "Executed";
        if (resType === "NeedsParams") return `Parameters Required (${formatToolLabel(res.tool)})`;
        if (resType === "NeedsConfirmation") return `Confirmation Required (${formatToolLabel(res.tool)})`;
        if (resType === "Ambiguous") return "Clarification Required";
        if (resType === "Rejected") return "Query Rejected";
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
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {res?.tool && <ScoreChip label="tool" value={res.tool} />}
                            {scores?.confidence !== undefined && (
                                <ScoreChip label="conf" value={scores.confidence} isPercent />
                            )}
                            {scores?.regex !== undefined && (
                                <ScoreChip label="regex" value={scores.regex} />
                            )}
                            {scores?.semantic !== undefined && (
                                <ScoreChip label="semantic" value={scores.semantic} />
                            )}
                        </div>
                    </div>
                )}

                {isUser && <p className="text-sm leading-relaxed">{message.content}</p>}

                {isPending && (
                    <div className="flex items-center gap-2.5 py-1 text-[color-mix(in_srgb,var(--ink)_65%,white)]">
                        <Loader2 className="h-4 w-4 animate-spin text-(--accent)" strokeWidth={1.5} />
                        <span className="font-mono text-xs">
                            Resolving hybrid intent and querying live ERP MCP tools...
                        </span>
                    </div>
                )}

                {!isUser && !isPending && !isError && res && (
                    <div>
                        {resType === "Executed" && (
                            <DataResultView
                                tool={res.tool}
                                data={res.data}
                                rawQuery={message.rawQuery}
                            />
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

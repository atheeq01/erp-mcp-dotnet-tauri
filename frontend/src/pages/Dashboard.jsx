import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    AlertTriangle,
    ShoppingBag,
    Boxes,
    TrendingUp,
    ArrowRight,
    Plus,
    Bot,
} from "lucide-react";
import { callMcpTool } from "../services/mcpService";
import { useAuth } from "../hooks/useAuth";
import DataTable from "../components/common/DataTable";
import Button from "../components/common/Button";

function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [inventory, setInventory] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadDashboardData() {
        setLoading(true);
        setError("");

        try {
            const [invRes, ordRes] = await Promise.all([
                callMcpTool("get_inventory").catch(() => []),
                callMcpTool("get_orders").catch(() => []),
            ]);

            const invList = Array.isArray(invRes)
                ? invRes
                : invRes.inventory ?? invRes.items ?? [];
            const ordList = Array.isArray(ordRes)
                ? ordRes
                : ordRes.orders ?? ordRes.items ?? [];

            setInventory(invList);
            setOrders(ordList);
        } catch (err) {
            setError(err?.message || "Failed to load dashboard metrics.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDashboardData();
    }, []);

    const lowStockItems = inventory.filter(
        (item) => Number(item.quantityAvailable ?? item.QuantityAvailable ?? 0) <= 20
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    const ordersToday = orders.filter((o) => {
        const date = o.createdAtUtc ?? o.CreatedAtUtc;
        return date && date.startsWith(todayStr);
    });

    const totalRevenue = orders.reduce(
        (sum, o) => sum + Number(o.totalAmount ?? o.TotalAmount ?? 0),
        0
    );

    const totalStockUnits = inventory.reduce(
        (sum, i) => sum + Number(i.quantityAvailable ?? i.QuantityAvailable ?? 0),
        0
    );

    const recentOrderColumns = [
        {
            key: "orderNumber",
            header: "Order Number",
            render: (val, row) => (
                <span className="font-mono font-medium text-[var(--ink)]">
                    {val ?? row.OrderNumber ?? "—"}
                </span>
            ),
        },
        {
            key: "username",
            header: "Placed By",
            render: (val, row) =>
                val ?? row.userId ?? row.UserId ?? "—",
        },
        {
            key: "orderItems",
            header: "Items",
            align: "center",
            render: (val, row) => {
                const items = val ?? row.OrderItems ?? row.items ?? [];
                return <span className="font-mono tabular-nums">{items.length}</span>;
            },
        },
        {
            key: "totalAmount",
            header: "Total Amount",
            align: "right",
            render: (val, row) => {
                const amt = Number(val ?? row.TotalAmount ?? 0);
                return (
                    <span className="font-mono font-semibold tabular-nums text-[var(--ink)]">
                        ${amt.toFixed(2)}
                    </span>
                );
            },
        },
        {
            key: "createdAtUtc",
            header: "Date Logged",
            align: "right",
            render: (val, row) => {
                const raw = val ?? row.CreatedAtUtc;
                if (!raw) return "—";
                return (
                    <span className="font-mono tabular-nums text-[color-mix(in_srgb,var(--ink)_65%,white)]">
                        {new Date(raw).toLocaleDateString()}
                    </span>
                );
            },
        },
    ];

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
                <div>
                    <span className="label-caps">SPIL Operational Status</span>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] mt-0.5">
                        Overview & Daily Activity
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {["Admin", "Sales"].includes(user?.role) && (
                        <Button
                            variant="primary"
                            size="md"
                            icon={Plus}
                            onClick={() => navigate("/orders")}
                        >
                            New Order
                        </Button>
                    )}

                    {["Admin", "Store"].includes(user?.role) && (
                        <Button
                            variant="outline"
                            size="md"
                            icon={Boxes}
                            onClick={() => navigate("/inventory")}
                        >
                            Manage Stock
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="md"
                        icon={Bot}
                        onClick={() => navigate("/chat")}
                    >
                        Stock Assistant
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white border border-[var(--line)] rounded-[2px] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="label-caps text-[color-mix(in_srgb,var(--ink)_70%,white)]">
                            Low Stock Alert
                        </span>
                        <AlertTriangle
                            className={`h-4 w-4 ${
                                lowStockItems.length > 0
                                    ? "text-[var(--accent)]"
                                    : "text-[color-mix(in_srgb,var(--ink)_30%,white)]"
                            }`}
                            strokeWidth={1.5}
                        />
                    </div>
                    <div className="mt-4">
                        <span
                            className={`font-mono text-3xl font-bold tabular-nums ${
                                lowStockItems.length > 0
                                    ? "text-[var(--accent)]"
                                    : "text-[var(--ink)]"
                            }`}
                        >
                            {loading ? "—" : lowStockItems.length}
                        </span>
                        <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,white)] mt-1 font-mono">
                            SKUs with ≤ 20 units remaining
                        </p>
                    </div>
                </div>

                <div className="p-5 bg-white border border-[var(--line)] rounded-[2px] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="label-caps text-[color-mix(in_srgb,var(--ink)_70%,white)]">
                            Orders Today
                        </span>
                        <ShoppingBag className="h-4 w-4 text-[var(--ink)]" strokeWidth={1.5} />
                    </div>
                    <div className="mt-4">
                        <span className="font-mono text-3xl font-bold tabular-nums text-[var(--ink)]">
                            {loading ? "—" : ordersToday.length}
                        </span>
                        <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,white)] mt-1 font-mono">
                            Orders registered today
                        </p>
                    </div>
                </div>

                <div className="p-5 bg-white border border-[var(--line)] rounded-[2px] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="label-caps text-[color-mix(in_srgb,var(--ink)_70%,white)]">
                            Total Order Volume
                        </span>
                        <TrendingUp className="h-4 w-4 text-[var(--ink)]" strokeWidth={1.5} />
                    </div>
                    <div className="mt-4">
                        <span className="font-mono text-3xl font-bold tabular-nums text-[var(--ink)]">
                            {loading ? "—" : `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                        <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,white)] mt-1 font-mono">
                            Total across {orders.length} orders
                        </p>
                    </div>
                </div>

                <div className="p-5 bg-white border border-[var(--line)] rounded-[2px] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="label-caps text-[color-mix(in_srgb,var(--ink)_70%,white)]">
                            Physical Units in Stock
                        </span>
                        <Boxes className="h-4 w-4 text-[var(--ink)]" strokeWidth={1.5} />
                    </div>
                    <div className="mt-4">
                        <span className="font-mono text-3xl font-bold tabular-nums text-[var(--ink)]">
                            {loading ? "—" : totalStockUnits.toLocaleString()}
                        </span>
                        <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,white)] mt-1 font-mono">
                            Across {inventory.length} distinct SKUs
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-display text-base font-bold tracking-tight text-[var(--ink)]">
                            Recent Order Ledger
                        </h3>
                        <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,white)]">
                            Latest activity recorded across transactions.
                        </p>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        icon={ArrowRight}
                        onClick={() => navigate("/orders")}
                    >
                        View All Orders
                    </Button>
                </div>

                <DataTable
                    columns={recentOrderColumns}
                    data={orders.slice(-5).reverse()}
                    loading={loading}
                    error={error}
                    onRetry={loadDashboardData}
                    searchPlaceholder="Filter recent orders..."
                    emptyMessage="No recent orders found."
                />
            </div>
        </div>
    );
}

export default Dashboard;

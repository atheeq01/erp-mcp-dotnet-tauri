import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { callMcpTool } from "../services/mcpService";
import { useAuth } from "../hooks/useAuth";
import DataTable from "../components/common/DataTable";
import Button from "../components/common/Button";
import FormDrawer from "../components/forms/FormDrawer";
import EntityForm from "../components/forms/EntityForm";
import { orderConfig } from "../components/forms/entityConfigs";

function Orders() {
    const { user } = useAuth();
    const canCreate = ["Admin", "Sales"].includes(user?.role);

    const [orders, setOrders] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);

    async function loadOrdersData() {
        setLoading(true);
        setError("");

        try {
            const [ordersRes, inventoryRes] = await Promise.all([
                callMcpTool("get_orders"),
                callMcpTool("get_inventory"),
            ]);

            const ordList = Array.isArray(ordersRes)
                ? ordersRes
                : ordersRes.orders ?? ordersRes.items ?? [];
            const invList = Array.isArray(inventoryRes)
                ? inventoryRes
                : inventoryRes.inventory ?? inventoryRes.items ?? [];

            setOrders(ordList);
            setInventory(invList);
        } catch (err) {
            setError(err?.message || "Failed to load orders.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadOrdersData();
    }, []);

    async function handleCreateOrder(values) {
        const itemsPayload = values.items.map((i) => ({
            inventoryId: Number(i.inventoryId),
            quantity: Number(i.quantity),
        }));

        await callMcpTool("create_order", {
            itemsJson: JSON.stringify(itemsPayload),
        });

        setDrawerOpen(false);
        await loadOrdersData();
    }

    const columns = [
        {
            key: "orderNumber",
            header: "Order Identifier",
            sortable: true,
            render: (val, row) => (
                <span className="font-mono font-medium text-[var(--ink)]">
                    {val ?? row.OrderNumber ?? "—"}
                </span>
            ),
        },
        {
            key: "username",
            header: "Sales Representative",
            sortable: true,
            render: (val, row) =>
                val ?? row.userId ?? row.UserId ?? "—",
        },
        {
            key: "orderItems",
            header: "Lines",
            align: "center",
            width: "100px",
            render: (val, row) => {
                const count = (val ?? row.OrderItems ?? row.items ?? []).length;
                return <span className="font-mono tabular-nums">{count}</span>;
            },
        },
        {
            key: "totalAmount",
            header: "Grand Total",
            sortable: true,
            align: "right",
            width: "140px",
            render: (val, row) => {
                const total = Number(val ?? row.TotalAmount ?? 0);
                return (
                    <span className="font-mono font-bold tabular-nums text-[var(--ink)]">
                        ${total.toFixed(2)}
                    </span>
                );
            },
        },
        {
            key: "createdAtUtc",
            header: "Timestamp (UTC)",
            sortable: true,
            align: "right",
            width: "180px",
            render: (val, row) => {
                const raw = val ?? row.CreatedAtUtc;
                if (!raw) return "—";
                return (
                    <span className="font-mono tabular-nums text-[color-mix(in_srgb,var(--ink)_65%,white)]">
                        {new Date(raw).toLocaleString()}
                    </span>
                );
            },
        },
    ];

    return (
        <div className="mx-auto max-w-6xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
                <div>
                    <span className="label-caps">Transactions & Invoices</span>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] mt-0.5">
                        Customer Orders
                    </h2>
                </div>

                {canCreate && (
                    <Button
                        variant="primary"
                        icon={Plus}
                        onClick={() => setDrawerOpen(true)}
                    >
                        Create Order
                    </Button>
                )}
            </div>

            <DataTable
                columns={columns}
                data={orders}
                loading={loading}
                error={error}
                onRetry={loadOrdersData}
                searchPlaceholder="Search order number or user..."
                searchFields={["orderNumber", "username", "OrderNumber"]}
                emptyMessage="No customer orders recorded yet."
            />

            <FormDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title="Create New Customer Order"
                subtitle="Select inventory products and enter requested quantities. Stock is checked atomically."
            >
                <EntityForm
                    config={orderConfig}
                    onSubmit={handleCreateOrder}
                    onCancel={() => setDrawerOpen(false)}
                    extraProps={{ inventory }}
                    submitLabel="Confirm & Place Order"
                />
            </FormDrawer>
        </div>
    );
}

export default Orders;

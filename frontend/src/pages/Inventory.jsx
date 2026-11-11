import React, { useEffect, useState, useMemo } from "react";
import { Plus, Edit2, Ban } from "lucide-react";
import { callMcpTool } from "../services/mcpService";
import { useAuth } from "../hooks/useAuth";
import DataTable from "../components/common/DataTable";
import StatusBadge from "../components/common/StatusBadge";
import Button from "../components/common/Button";
import FormDrawer from "../components/forms/FormDrawer";
import EntityForm from "../components/forms/EntityForm";
import { productConfig } from "../components/forms/entityConfigs";

function Inventory() {
    const { user } = useAuth();
    const canManage = ["Admin", "Store"].includes(user?.role);

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    async function loadInventory() {
        setLoading(true);
        setError("");

        try {
            const result = await callMcpTool("get_inventory");
            const inventory = Array.isArray(result)
                ? result
                : result.inventory ?? result.items ?? [];
            setItems(inventory);
        } catch (err) {
            setError(err?.message || "Failed to load inventory products.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadInventory();
    }, []);

    function handleCreateOpen() {
        setEditingItem(null);
        setDrawerOpen(true);
    }

    function handleEditOpen(item) {
        setEditingItem({
            id: item.id ?? item.Id,
            sku: item.sku ?? item.SKU ?? "",
            name: item.name ?? item.Name ?? "",
            description: item.description ?? item.Description ?? "",
            quantityAvailable: Number(item.quantityAvailable ?? item.QuantityAvailable ?? 0),
            unitPrice: Number(item.unitPrice ?? item.UnitPrice ?? 0),
        });
        setDrawerOpen(true);
    }

    async function handleSave(formData) {
        if (editingItem) {
            await callMcpTool("update_inventory", {
                inventoryId: editingItem.id,
                ...formData,
                isActive: true,
            });
        } else {
            await callMcpTool("create_inventory", {
                ...formData,
                isActive: true,
            });
        }

        setDrawerOpen(false);
        setEditingItem(null);
        await loadInventory();
    }

    async function handleDeactivate(id) {
        if (!window.confirm("Confirm deactivating this inventory product?")) return;

        try {
            await callMcpTool("deactivate_inventory", { inventoryId: id });
            await loadInventory();
        } catch (err) {
            alert(err?.message || "Deactivation failed.");
        }
    }

    const totalUnits = useMemo(
        () =>
            items.reduce(
                (sum, i) => sum + Number(i.quantityAvailable ?? i.QuantityAvailable ?? 0),
                0
            ),
        [items]
    );

    const activeCount = useMemo(
        () => items.filter((i) => (i.isActive ?? i.IsActive ?? true)).length,
        [items]
    );

    const columns = [
        {
            key: "sku",
            header: "SKU / Code",
            sortable: true,
            width: "160px",
            render: (val, row) => (
                <span className="font-mono font-medium text-[var(--ink)]">
                    {val ?? row.SKU ?? "—"}
                </span>
            ),
        },
        {
            key: "name",
            header: "Product Specification",
            sortable: true,
            render: (val, row) => {
                const desc = row.description ?? row.Description;
                return (
                    <div>
                        <span className="font-semibold text-[var(--ink)] block">
                            {val ?? row.Name}
                        </span>
                        {desc && (
                            <span className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,white)] line-clamp-1">
                                {desc}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: "quantityAvailable",
            header: "Stock Units",
            sortable: true,
            align: "right",
            width: "120px",
            render: (val, row) => {
                const qty = Number(val ?? row.QuantityAvailable ?? 0);
                const isLow = qty <= 20;
                return (
                    <span
                        className={`font-mono font-semibold tabular-nums ${
                            isLow ? "text-[var(--accent)]" : "text-[var(--ink)]"
                        }`}
                    >
                        {qty.toLocaleString()}
                    </span>
                );
            },
        },
        {
            key: "unitPrice",
            header: "Unit Price",
            sortable: true,
            align: "right",
            width: "120px",
            render: (val, row) => {
                const price = Number(val ?? row.UnitPrice ?? 0);
                return (
                    <span className="font-mono tabular-nums text-[var(--ink)]">
                        ${price.toFixed(2)}
                    </span>
                );
            },
        },
        {
            key: "isActive",
            header: "Status",
            align: "center",
            width: "100px",
            render: (val, row) => {
                const active = val ?? row.IsActive ?? true;
                return (
                    <StatusBadge tone={active ? "default" : "attention"}>
                        {active ? "Active" : "Inactive"}
                    </StatusBadge>
                );
            },
        },
        ...(canManage
            ? [
                  {
                      key: "actions",
                      header: "Actions",
                      align: "right",
                      width: "140px",
                      render: (_, row) => {
                          const id = row.id ?? row.Id;
                          const active = row.isActive ?? row.IsActive ?? true;
                          return (
                              <div className="flex items-center justify-end gap-2">
                                  <button
                                      type="button"
                                      onClick={() => handleEditOpen(row)}
                                      className="p-1 text-[var(--ink)] hover:text-[var(--accent)]"
                                      title="Edit product"
                                  >
                                      <Edit2 className="h-4 w-4" strokeWidth={1.5} />
                                  </button>
                                  {active && (
                                      <button
                                          type="button"
                                          onClick={() => handleDeactivate(id)}
                                          className="p-1 text-[color-mix(in_srgb,var(--ink)_45%,white)] hover:text-[var(--accent)]"
                                          title="Deactivate item"
                                      >
                                          <Ban className="h-4 w-4" strokeWidth={1.5} />
                                      </button>
                                  )}
                              </div>
                          );
                      },
                  },
              ]
            : []),
    ];

    return (
        <div className="mx-auto max-w-6xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
                <div>
                    <span className="label-caps">Stock & Catalog Control</span>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] mt-0.5">
                        Inventory Ledger
                    </h2>
                </div>

                {canManage && (
                    <Button
                        variant="primary"
                        icon={Plus}
                        onClick={handleCreateOpen}
                    >
                        Add Product
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white border border-[var(--line)] rounded-[2px] flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_65%,white)] font-semibold">
                        Registered SKUs
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums text-[var(--ink)]">
                        {loading ? "—" : items.length}
                    </span>
                </div>

                <div className="p-4 bg-white border border-[var(--line)] rounded-[2px] flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_65%,white)] font-semibold">
                        Active Products
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums text-[var(--ink)]">
                        {loading ? "—" : activeCount}
                    </span>
                </div>

                <div className="p-4 bg-white border border-[var(--line)] rounded-[2px] flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_65%,white)] font-semibold">
                        Physical Stock Units
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums text-[var(--ink)]">
                        {loading ? "—" : totalUnits.toLocaleString()}
                    </span>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
                error={error}
                onRetry={loadInventory}
                searchPlaceholder="Search by SKU or product name..."
                searchFields={["sku", "name", "SKU", "Name"]}
                emptyMessage="No inventory products recorded."
            />

            <FormDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={editingItem ? "Edit Product Specification" : "Add Inventory Product"}
                subtitle="Enter SKU, product description, unit price, and initial quantity."
            >
                <EntityForm
                    config={productConfig}
                    initialData={editingItem}
                    onSubmit={handleSave}
                    onCancel={() => setDrawerOpen(false)}
                />
            </FormDrawer>
        </div>
    );
}

export default Inventory;

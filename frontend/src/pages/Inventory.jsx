import React, { useEffect, useState, useMemo } from "react";
import { Plus, Edit2, Ban, RotateCcw } from "lucide-react";
import { callMcpTool } from "../services/mcpService";
import { useAuth } from "../hooks/useAuth";
import DataTable from "../components/common/DataTable";
import StatusBadge from "../components/common/StatusBadge";
import Button from "../components/common/Button";
import ConfirmDialog from "../components/common/ConfirmDialog";
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
    const [confirmAction, setConfirmAction] = useState(null);

    async function loadInventory() {
        setLoading(true);
        setError("");

        try {
            const result = await callMcpTool("get_inventory", { includeInactive: true });
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
        void loadInventory();
    }, []);

    function handleCreateOpen() {
        setEditingItem(null);
        setDrawerOpen(true);
    }

    function handleEditOpen(item) {
        setEditingItem({
            id: item.id ?? item.Id,
            sku: item.sku ?? "",
            name: item.name ?? "",
            description: item.description ?? "",
            quantityAvailable: Number(item.quantityAvailable ?? 0),
            unitPrice: Number(item.unitPrice ?? 0),
            isActive: item.isActive ?? true,
        });
        setDrawerOpen(true);
    }

    async function handleSave(formData) {
        if (editingItem) {
            await callMcpTool("update_inventory", {
                inventoryId: editingItem.id,
                ...formData,
                isActive: Boolean(formData.isActive ?? true),
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

    function promptDeactivate(item) {
        setConfirmAction({
            type: "deactivate",
            item,
            loading: false,
            error: "",
        });
    }

    function promptReactivate(item) {
        setConfirmAction({
            type: "reactivate",
            item,
            loading: false,
            error: "",
        });
    }

    async function executeConfirmAction() {
        if (!confirmAction) return;
        const { type, item } = confirmAction;
        const id = item.id;

        setConfirmAction((prev) => ({ ...prev, loading: true, error: "" }));

        try {
            if (type === "deactivate") {
                await callMcpTool("deactivate_inventory", { inventoryId: id });
            } else if (type === "reactivate") {
                await callMcpTool("update_inventory", {
                    inventoryId: id,
                    sku: item.sku,
                    name: item.name,
                    description: item.description ?? "",
                    quantityAvailable: Number(item.quantityAvailable ?? 0),
                    unitPrice: Number(item.unitPrice ?? 0),
                    isActive: true,
                });
            }
            setConfirmAction(null);
            await loadInventory();
        } catch (err) {
            setConfirmAction((prev) => ({
                ...prev,
                loading: false,
                error: err?.message || `${type === "deactivate" ? "Deactivation" : "Reactivation"} failed.`,
            }));
        }
    }

    const totalUnits = useMemo(
        () =>
            items.reduce(
                (sum, i) => sum + Number(i.quantityAvailable ?? 0),
                0
            ),
        [items]
    );

    const activeCount = useMemo(
        () => items.filter((i) => (i.isActive ?? true)).length,
        [items]
    );

    const columns = [
        {
            key: "sku",
            header: "SKU / Code",
            sortable: true,
            width: "160px",
            render: (val, row) => (
                <span className="font-mono font-medium text-(--ink)">
                    {val ?? row.sku ?? "—"}
                </span>
            ),
        },
        {
            key: "name",
            header: "Product Specification",
            sortable: true,
            render: (val, row) => {
                const desc = row.description ?? row.description;
                return (
                    <div>
                        <span className="font-semibold text-(--ink) block">
                            {val ?? row.name}
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
                const qty = Number(val ?? row.quantityAvailable ?? 0);
                const isLow = qty <= 20;
                return (
                    <span
                        className={`font-mono font-semibold tabular-nums ${
                            isLow ? "text-(--accent)" : "text-(--ink)"
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
                const price = Number(val ?? row.unitPrice ?? 0);
                return (
                    <span className="font-mono tabular-nums text-(--ink)">
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
                const active = val ?? row.isActive ?? true;
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
                          const active = row.isActive ?? row.isActive ?? true;
                          return (
                              <div className="flex items-center justify-end gap-2">
                                  <button
                                      type="button"
                                      onClick={() => handleEditOpen(row)}
                                      className="p-1 text-(--ink) hover:text-(--accent)"
                                      title="Edit product"
                                  >
                                      <Edit2 className="h-4 w-4" strokeWidth={1.5} />
                                  </button>
                                  {active ? (
                                      <button
                                          type="button"
                                          onClick={() => promptDeactivate(row)}
                                          className="p-1 text-[color-mix(in_srgb,var(--ink)_45%,white)] hover:text-(--accent)"
                                          title="Deactivate item"
                                      >
                                          <Ban className="h-4 w-4" strokeWidth={1.5} />
                                      </button>
                                  ) : (
                                      <button
                                          type="button"
                                          onClick={() => promptReactivate(row)}
                                          className="p-1 text-(--accent) hover:text-(--ink)"
                                          title="Reactivate product"
                                      >
                                          <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--line) pb-4">
                <div>
                    <span className="label-caps">Stock & Catalog Control</span>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-(--ink) mt-0.5">
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
                <div className="p-4 bg-white border border-(--line) rounded-xs flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_65%,white)] font-semibold">
                        Registered SKUs
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums text-(--ink)">
                        {loading ? "—" : items.length}
                    </span>
                </div>

                <div className="p-4 bg-white border border-(--line) rounded-xs flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_65%,white)] font-semibold">
                        Active Products
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums text-(--ink)">
                        {loading ? "—" : activeCount}
                    </span>
                </div>

                <div className="p-4 bg-white border border-(--line) rounded-xs flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_65%,white)] font-semibold">
                        Physical Stock Units
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums text-(--ink)">
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
                searchFields={["sku", "name"]}
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

            <ConfirmDialog
                isOpen={Boolean(confirmAction)}
                onClose={() => !confirmAction?.loading && setConfirmAction(null)}
                onConfirm={executeConfirmAction}
                loading={confirmAction?.loading}
                error={confirmAction?.error}
                variant={confirmAction?.type === "deactivate" ? "danger" : "primary"}
                icon={confirmAction?.type === "deactivate" ? Ban : RotateCcw}
                title={confirmAction?.type === "deactivate" ? "Deactivate Product" : "Reactivate Product"}
                subtitle="CATALOG STATUS UPDATE"
                confirmLabel={confirmAction?.type === "deactivate" ? "Deactivate Product" : "Reactivate Product"}
                cancelLabel="Keep Current State"
                message={
                    confirmAction?.type === "deactivate" ? (
                        <div className="space-y-3">
                            <p className="text-sm text-(--ink) leading-relaxed">
                                Are you sure you want to deactivate this product?
                            </p>
                            <div className="p-3 bg-(--paper) border border-(--line) rounded-xs font-mono text-xs space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[color-mix(in_srgb,var(--ink)_60%,white)] uppercase text-[10px]">Product:</span>
                                    <span className="font-bold text-(--ink)">
                                        {confirmAction?.item?.name ?? "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[color-mix(in_srgb,var(--ink)_60%,white)] uppercase text-[10px]">SKU:</span>
                                    <span className="font-bold text-(--ink)">
                                        {confirmAction?.item?.sku ?? "—"}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,white)] font-mono leading-relaxed">
                                Deactivating archives this product. Existing order records are preserved, but no new orders can include this item until reactivated.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-(--ink) leading-relaxed">
                                Reactivate this product to restore it to the active catalog?
                            </p>
                            <div className="p-3 bg-(--paper) border border-(--line) rounded-xs font-mono text-xs space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[color-mix(in_srgb,var(--ink)_60%,white)] uppercase text-[10px]">Product:</span>
                                    <span className="font-bold text-(--ink)">
                                        {confirmAction?.item?.name ?? "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[color-mix(in_srgb,var(--ink)_60%,white)] uppercase text-[10px]">SKU:</span>
                                    <span className="font-bold text-(--ink)">
                                        {confirmAction?.item?.sku ?? "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[color-mix(in_srgb,var(--ink)_60%,white)] uppercase text-[10px]">Stock Available:</span>
                                    <span className="font-bold text-(--ink) tabular-nums">
                                        {Number(confirmAction?.item?.quantityAvailable ?? 0).toLocaleString()} units
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,white)] font-mono leading-relaxed">
                                Reactivating makes this product immediately visible and orderable by sales operators across the ERP system.
                            </p>
                        </div>
                    )
                }
            />
        </div>
    );
}

export default Inventory;

import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { callMcpTool } from "../services/mcpService";
import DataTable from "../components/common/DataTable";
import StatusBadge from "../components/common/StatusBadge";
import Button from "../components/common/Button";
import FormDrawer from "../components/forms/FormDrawer";
import EntityForm from "../components/forms/EntityForm";
import { userConfig } from "../components/forms/entityConfigs";

function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);

    async function loadUsers() {
        setLoading(true);
        setError("");

        try {
            const result = await callMcpTool("get_users");
            const userList = Array.isArray(result)
                ? result
                : result.users ?? result.items ?? [];
            setUsers(userList);
        } catch (err) {
            setError(err?.message || "Failed to load user accounts.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, []);

    async function handleCreateUser(formData) {
        await callMcpTool("create_user", {
            username: formData.username,
            password: formData.password,
            role: formData.role,
        });

        setDrawerOpen(false);
        await loadUsers();
    }

    const columns = [
        {
            key: "username",
            header: "Username",
            sortable: true,
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--ink)]">
                        {val ?? row.Username ?? "—"}
                    </span>
                </div>
            ),
        },
        {
            key: "role",
            header: "Assigned Role",
            sortable: true,
            width: "160px",
            render: (val, row) => {
                const role = val ?? row.Role ?? "—";
                return (
                    <span className="font-mono text-xs text-[var(--ink)]">
                        {role}
                    </span>
                );
            },
        },
        {
            key: "isActive",
            header: "Status",
            align: "center",
            width: "120px",
            render: (val, row) => {
                const active = val ?? row.IsActive ?? true;
                return (
                    <StatusBadge tone={active ? "default" : "attention"}>
                        {active ? "Active" : "Disabled"}
                    </StatusBadge>
                );
            },
        },
        {
            key: "createdAtUtc",
            header: "Registered Date",
            sortable: true,
            align: "right",
            width: "160px",
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
        <div className="mx-auto max-w-6xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
                <div>
                    <span className="label-caps">Access & Security</span>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] mt-0.5">
                        User Accounts
                    </h2>
                </div>

                <Button
                    variant="primary"
                    icon={Plus}
                    onClick={() => setDrawerOpen(true)}
                >
                    Create User
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={users}
                loading={loading}
                error={error}
                onRetry={loadUsers}
                searchPlaceholder="Search usernames or roles..."
                searchFields={["username", "role", "Username", "Role"]}
                emptyMessage="No system users recorded."
            />

            <FormDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title="Create New User Account"
                subtitle="Assign access credentials and role permissions for Sales or Store personnel."
            >
                <EntityForm
                    config={userConfig}
                    onSubmit={handleCreateUser}
                    onCancel={() => setDrawerOpen(false)}
                    submitLabel="Create User Account"
                />
            </FormDrawer>
        </div>
    );
}

export default Users;

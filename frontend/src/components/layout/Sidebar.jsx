import React from "react";
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Boxes,
    FileSpreadsheet,
    Users,
    Bot,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const navigationItems = [
    {
        label: "Dashboard",
        path: "/dashboard",
        roles: ["Admin", "Sales", "Store"],
        icon: LayoutDashboard,
    },
    {
        label: "Inventory",
        path: "/inventory",
        roles: ["Admin", "Sales", "Store"],
        icon: Boxes,
    },
    {
        label: "Orders",
        path: "/orders",
        roles: ["Admin", "Sales"],
        icon: FileSpreadsheet,
    },
    {
        label: "Users",
        path: "/users",
        roles: ["Admin"],
        icon: Users,
    },
    {
        label: "AI Assistant",
        path: "/chat",
        roles: ["Admin", "Sales", "Store"],
        icon: Bot,
    },
];

function Sidebar() {
    const { user } = useAuth();

    const allowedItems = navigationItems.filter(
        (item) => !item.roles || item.roles.includes(user?.role)
    );

    return (
        <aside
            style={{ width: "var(--sidebar-w)" }}
            className="shrink-0 min-h-screen bg-(--ink) text-(--line) flex flex-col justify-between border-r border-black select-none z-20"
        >
            <div>
                <div
                    style={{ height: "var(--nav-item-h)" }}
                    className="flex items-center px-5 border-b border-[color-mix(in_srgb,var(--ink)_80%,white)]"
                >
                    <div className="flex items-center gap-2.5">
                        <span className="font-display font-extrabold text-base tracking-tight text-white">
                            SPIL MINI ERP
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-mono tracking-widest uppercase border border-(--line) text-(--line) rounded-xs">
                            v1.0
                        </span>
                    </div>
                </div>

                <nav className="p-3 space-y-1">
                    <p className="px-3 pt-2 pb-1.5 text-[11px] uppercase font-mono tracking-widest text-[color-mix(in_srgb,var(--line)_50%,black)]">
                        System Modules
                    </p>

                    {allowedItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                style={{
                                    height: "var(--nav-item-h)",
                                    fontSize: "var(--nav-item-text)",
                                }}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3.5 font-medium transition-colors rounded-xs ${
                                        isActive
                                            ? "border-l-[3px] border-(--accent) text-white bg-transparent pl-[11px]"
                                            : "border-l-[3px] border-transparent text-(--line) hover:text-white hover:bg-[color-mix(in_srgb,var(--ink)_85%,white)]"
                                    }`
                                }
                            >
                                <Icon
                                    style={{ width: "var(--icon-size)", height: "var(--icon-size)" }}
                                    className="shrink-0"
                                    strokeWidth={1.5}
                                />
                                <span>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 border-t border-[color-mix(in_srgb,var(--ink)_80%,white)] bg-black/30">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-(--line)">Operator</span>
                    <span className="px-2 py-0.5 font-mono text-[11px] bg-white/10 text-white rounded-xs">
                        {user?.username || "Guest"}
                    </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[color-mix(in_srgb,var(--line)_60%,black)] font-mono">
                    <span>Role: {user?.role || "Standard"}</span>
                    <span className="text-(--accent)">ONLINE</span>
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;

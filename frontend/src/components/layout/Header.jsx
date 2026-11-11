import React from "react";
import { useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import StatusBadge from "../common/StatusBadge";
import Button from "../common/Button";

const pageTitles = {
    "/dashboard": "Operational Dashboard",
    "/inventory": "Inventory Control",
    "/orders": "Customer Orders",
    "/users": "User Administration",
    "/chat": "AI Operations Assistant",
};

function Header() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const title = pageTitles[location.pathname] || "SPIL Control Panel";

    return (
        <header
            style={{ height: "var(--topbar-h)" }}
            className="shrink-0 flex items-center justify-between px-6 bg-[var(--paper)] border-b border-[var(--line)] select-none z-10"
        >
            <div className="flex items-center gap-3">
                <h1 className="font-display text-base font-bold tracking-tight text-[var(--ink)]">
                    {title}
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--ink)]">
                        {user?.username}
                    </span>
                    <StatusBadge tone="default">{user?.role}</StatusBadge>
                </div>

                <div className="h-4 w-px bg-[var(--line)]" />

                <Button
                    variant="outline"
                    size="sm"
                    icon={LogOut}
                    onClick={logout}
                    title="Terminate session"
                >
                    Logout
                </Button>
            </div>
        </header>
    );
}

export default Header;

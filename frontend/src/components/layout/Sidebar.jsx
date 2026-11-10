
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const navigation = [
    {
        label: "Dashboard",
        path: "/dashboard",
        roles: ["Admin", "Sales", "Store"],
        icon: "⌂",
    },
    {
        label: "Inventory",
        path: "/inventory",
        roles: ["Admin", "Sales", "Store"],
        icon: "▦",
    },
    {
        label: "Orders",
        path: "/orders",
        roles: ["Admin", "Sales"],
        icon: "▤",
    },
    {
        label: "Users",
        path: "/users",
        roles: ["Admin"],
        icon: "♙",
    },
    {
        label: "AI Assistant",
        path: "/chat",
        roles: ["Admin", "Sales", "Store"],
        icon: "✧",
    },
];

function Sidebar() {
    const { user } = useAuth();

    const menuItems = navigation.filter((item) =>
        item.roles.includes(user?.role)
    );

    return (
        <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-green-950 text-white">

            <div className="border-b border-green-800 px-6 py-6">
                <h1 className="text-xl font-bold tracking-wide">
                    SPIL <span className="text-green-400">ERP</span>
                </h1>

                <p className="mt-1 text-xs text-green-300">
                    Enterprise Management
                </p>
            </div>

            <nav className="flex-1 space-y-2 px-4 py-6">
                <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-green-400">
                    Main Menu
                </p>

                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                                isActive
                                    ? "bg-green-700 text-white"
                                    : "text-green-100 hover:bg-green-900"
                            }`
                        }
                    >
                        <span className="text-lg">{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="border-t border-green-800 p-5">
                <p className="text-xs text-green-400">
                    SPIL Mini ERP
                </p>
                <p className="mt-1 text-xs text-green-200">
                    Desktop Application
                </p>
            </div>
        </aside>
    );
}

export default Sidebar;

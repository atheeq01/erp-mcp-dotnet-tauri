import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const modules = [
    {
        title: "Inventory",
        description: "View and manage inventory products.",
        path: "/inventory",
        roles: ["Admin", "Sales", "Store"],
    },
    {
        title: "Orders",
        description: "View and create customer orders.",
        path: "/orders",
        roles: ["Admin", "Sales"],
    },
    {
        title: "User Management",
        description: "Manage system user accounts.",
        path: "/users",
        roles: ["Admin"],
    },
    {
        title: "AI Assistant",
        description: "Interact with the ERP assistant.",
        path: "/chat",
        roles: ["Admin", "Sales", "Store"],
    },
];

function Dashboard() {
    const { user } = useAuth();

    const availableModules = modules.filter((module) =>
        module.roles.includes(user?.role)
    );

    return (
        <div className="mx-auto max-w-7xl">

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">
                    Dashboard
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    Welcome back, {user?.username}. Here is your workspace.
                </p>
            </div>

            <section className="rounded-xl bg-green-900 p-8 text-white shadow-sm">
                <p className="text-sm text-green-200">
                    SPIL Mini ERP
                </p>

                <h2 className="mt-3 text-3xl font-bold">
                    Business Management
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-green-100">
                    Manage inventory, orders and users from one
                    centralized desktop application.
                </p>
            </section>

            <section className="mt-8">
                <h2 className="mb-4 text-lg font-semibold text-slate-800">
                    Your Modules
                </h2>

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {availableModules.map((module) => (
                        <Link
                            key={module.path}
                            to={module.path}
                            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-green-400 hover:shadow-md"
                        >
                            <h3 className="font-semibold text-slate-900">
                                {module.title}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                {module.description}
                            </p>

                            <p className="mt-5 text-sm font-semibold text-green-700">
                                Open module →
                            </p>
                        </Link>
                    ))}
                </div>
            </section>

        </div>
    );
}

export default Dashboard;

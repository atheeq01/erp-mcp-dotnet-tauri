
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Button from "../components/common/Button";

function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        await logout();
        navigate("/login");
    }

    return (
        <main className="min-h-screen bg-slate-100 p-8">

            <div className="mx-auto max-w-5xl">

                <header className="flex items-center justify-between rounded-xl bg-white p-6 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            SPIL Mini ERP
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Dashboard
                        </p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                        Logout
                    </button>
                </header>

                <section className="mt-8 rounded-xl bg-white p-8 shadow-sm">

                    <p className="text-sm text-slate-500">
                        Welcome back,
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-slate-900">
                        {user?.username}
                    </h2>

                    <div className="mt-4 inline-block rounded-full bg-green-100 px-4 py-2 text-sm font-semibold capitalize text-green-800">
                        {user?.role}
                    </div>

                    <p className="mt-6 text-slate-500">
                        Your authentication is working. ERP modules
                        will be available here.
                    </p>

                </section>

            </div>
        </main>
    );
}

export default Dashboard;

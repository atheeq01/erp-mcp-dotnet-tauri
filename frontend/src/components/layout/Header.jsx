
import { useAuth } from "../../hooks/useAuth";

function Header() {
    const { user, logout } = useAuth();

    async function handleLogout() {
        await logout();
    }

    return (
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">

            <div>
                <h2 className="text-lg font-semibold text-slate-800">
                    Welcome to SPIL ERP
                </h2>

                <p className="text-sm text-slate-500">
                    Manage your business operations
                </p>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">
                        {user?.username}
                    </p>

                    <p className="text-xs text-green-700">
                        {user?.role}
                    </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-bold text-green-800">
                    {user?.username?.charAt(0).toUpperCase()}
                </div>

                <button
                    onClick={handleLogout}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                    Logout
                </button>
            </div>
        </header>
    );
}

export default Header;

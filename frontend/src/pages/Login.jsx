
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Input from "../components/common/Input";
import Button from "../components/common/Button";

function Login() {
    const navigate = useNavigate();
    const { login, loading } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        try {
            await login(username, password);
            navigate("/dashboard");
        } catch (err) {
            setError(err?.message || String(err));
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">

            <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">

                {/* Left panel */}
                <section className="hidden flex-col justify-between bg-green-900 p-12 text-white md:flex">

                    <div>
                        <div className="mb-12 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-bold text-green-900">
                                S
                            </div>

                            <span className="text-xl font-bold">
                                SPIL Mini ERP
                            </span>
                        </div>

                        <h1 className="text-4xl font-bold leading-tight">
                            Manage your business operations in one place.
                        </h1>

                        <p className="mt-5 leading-7 text-green-100">
                            Manage inventory, orders and users through
                            a simple desktop application.
                        </p>
                    </div>

                    <p className="text-sm text-green-200">
                        Secure ERP Management System
                    </p>
                </section>

                {/* Login form */}
                <section className="flex items-center justify-center p-8 sm:p-12">

                    <div className="w-full max-w-sm">

                        <div className="mb-8">
                            <p className="text-sm font-semibold uppercase tracking-wider text-green-700">
                                Welcome back
                            </p>

                            <h2 className="mt-2 text-3xl font-bold text-slate-900">
                                Sign in
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                Enter your account details to continue.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">

                            <Input
                                label="Username"
                                value={username}
                                onChange={setUsername}
                                placeholder="Enter your username"
                                autoComplete="username"
                                required
                            />

                            <Input
                                label="Password"
                                type="password"
                                value={password}
                                onChange={setPassword}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                required
                            />

                            {error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                loading={loading}
                                disabled={!username.trim() || !password}
                            >
                                Sign in to your account
                            </Button>

                        </form>

                        <p className="mt-8 text-center text-xs text-slate-400">
                            SPIL Mini ERP · Secure Desktop Application
                        </p>

                    </div>
                </section>
            </div>
        </main>
    );
}

export default Login;

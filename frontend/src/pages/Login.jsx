import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { checkSetupStatus } from "../services/mcpService";
import TextField from "../components/forms/fields/TextField";
import PasswordField from "../components/forms/fields/PasswordField";
import Button from "../components/common/Button";

function Login() {
    const navigate = useNavigate();
    const { login, loading } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        checkSetupStatus()
            .then((res) => {
                if (active && res?.isSetupRequired) {
                    navigate("/setup", { replace: true });
                }
            })
            .catch(() => {
                // If checking fails, user stays on login
            });

        return () => {
            active = false;
        };
    }, [navigate]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!username.trim() || !password) {
            setError("Please enter both username and password.");
            return;
        }

        try {
            await login(username.trim(), password);
            navigate("/dashboard");
        } catch (err) {
            setError(err?.message || "Authentication failed. Check credentials.");
        }
    }

    return (
        <main className="min-h-screen w-screen flex items-center justify-center bg-(--paper) p-4 sm:p-8">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white border border-(--line) rounded-xs overflow-hidden">
                <section className="bg-(--ink) text-white p-8 sm:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-(--line)">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-display text-base font-extrabold tracking-tight text-white">
                                SPIL MINI ERP
                            </span>
                            <span className="h-2 w-2 rounded-xs bg-(--accent)" />
                        </div>

                        <div className="mt-12 space-y-4">
                            <span className="text-xs uppercase font-mono tracking-widest text-(--line) opacity-80">
                                Enterprise Terminal
                            </span>
                            <h1 className="font-display text-3xl font-bold tracking-tight text-white leading-tight">
                                Confident, quiet control for your business.
                            </h1>
                            <p className="text-sm text-(--line) leading-relaxed max-w-sm">
                                Inventory tracking, atomic order processing, and user administration built for local desktop reliability.
                            </p>
                        </div>
                    </div>

                    <div className="pt-12 text-xs font-mono text-(--line) opacity-70 flex items-center justify-between">
                        <span>Offline First Â· Tauri Core</span>
                        <span>v1.0</span>
                    </div>
                </section>

                <section className="p-8 sm:p-12 flex flex-col justify-center bg-white">
                    <div className="max-w-sm w-full mx-auto space-y-6">
                        <div className="border-b border-(--line) pb-3">
                            <span className="label-caps">Operator Authentication</span>
                            <h2 className="font-display text-xl font-bold tracking-tight text-(--ink) mt-0.5">
                                Sign In
                            </h2>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 border border-(--accent) bg-white text-xs text-(--accent) rounded-xs">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.5} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <TextField
                                id="login-username"
                                name="username"
                                label="Operator Username"
                                value={username}
                                onChange={(val) => setUsername(val)}
                                placeholder="e.g. admin or store_user"
                                required
                                autoComplete="username"
                                disabled={loading}
                            />

                            <PasswordField
                                id="login-password"
                                name="password"
                                label="Account Password"
                                value={password}
                                onChange={(val) => setPassword(val)}
                                placeholder="Enter password"
                                required
                                autoComplete="current-password"
                                disabled={loading}
                            />

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                    loading={loading}
                                    icon={ArrowRight}
                                    disabled={!username.trim() || !password}
                                >
                                    Authenticate & Enter
                                </Button>
                            </div>
                        </form>

                        <div className="pt-4 border-t border-(--line) text-center">
                            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,white)] font-mono">
                                Authenticated via local .NET MCP micro-daemon
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default Login;

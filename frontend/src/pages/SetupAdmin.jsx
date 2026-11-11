import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { setupInitialAdmin } from "../services/mcpService";
import TextField from "../components/forms/fields/TextField";
import PasswordField from "../components/forms/fields/PasswordField";
import Button from "../components/common/Button";

function SetupAdmin() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!username.trim()) {
            setError("Admin username is required.");
            return;
        }

        if (!password || password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setSubmitting(true);

        try {
            const result = await setupInitialAdmin(username.trim(), password);

            if (result?.success === false) {
                setError(result?.message || "Failed to create administrator account.");
                return;
            }

            // Immediately authenticate as the newly created Admin
            await login(username.trim(), password);
            navigate("/dashboard");
        } catch (err) {
            setError(err?.message || "Setup failed. Check database connection.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen w-screen flex items-center justify-center bg-(--paper) p-4 sm:p-8">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white border border-(--line) rounded-xs overflow-hidden shadow-xs">
                {/* Left Brand Panel */}
                <section className="bg-(--ink) text-white p-8 sm:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-(--line)">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-display text-base font-extrabold tracking-tight text-white">
                                SPIL MINI ERP
                            </span>
                            <span className="h-2 w-2 rounded-xs bg-(--accent)" />
                        </div>

                        <div className="mt-12 space-y-4">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 rounded-xs border border-white/15">
                                <ShieldCheck className="h-4 w-4 text-(--accent)" />
                                <span className="text-[11px] uppercase font-mono tracking-widest text-white/90">
                                    First-Time Installation
                                </span>
                            </div>

                            <h1 className="font-display text-3xl font-bold tracking-tight text-white leading-tight">
                                Initialize Master Administrator.
                            </h1>

                            <p className="text-sm text-(--line) leading-relaxed max-w-sm">
                                No administrator account exists in this database instance yet. Establish your master credentials to secure and provision this enterprise terminal.
                            </p>
                        </div>
                    </div>

                    <div className="pt-12 text-xs font-mono text-(--line) opacity-70 flex items-center justify-between">
                        <span>Database Auto-Migrated</span>
                        <span>SSMS Ready</span>
                    </div>
                </section>

                {/* Right Form Panel */}
                <section className="p-8 sm:p-12 flex flex-col justify-center bg-white">
                    <div className="max-w-sm w-full mx-auto space-y-6">
                        <div className="border-b border-(--line) pb-3">
                            <span className="label-caps">System Initialization</span>
                            <h2 className="font-display text-xl font-bold tracking-tight text-(--ink) mt-0.5">
                                Create Admin Account
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
                                id="setup-username"
                                name="username"
                                label="Admin Username"
                                value={username}
                                onChange={(val) => setUsername(val)}
                                placeholder="admin"
                                required
                                autoComplete="username"
                                disabled={submitting}
                            />

                            <PasswordField
                                id="setup-password"
                                name="password"
                                label="Master Password (min 8 chars)"
                                value={password}
                                onChange={(val) => setPassword(val)}
                                placeholder="Enter strong password"
                                required
                                autoComplete="new-password"
                                disabled={submitting}
                            />

                            <PasswordField
                                id="setup-confirm-password"
                                name="confirmPassword"
                                label="Confirm Password"
                                value={confirmPassword}
                                onChange={(val) => setConfirmPassword(val)}
                                placeholder="Re-enter password"
                                required
                                autoComplete="new-password"
                                disabled={submitting}
                            />

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                    loading={submitting}
                                    icon={ArrowRight}
                                    disabled={!username.trim() || !password || !confirmPassword}
                                >
                                    Complete Setup & Sign In
                                </Button>
                            </div>
                        </form>

                        <div className="pt-4 border-t border-(--line) text-center">
                            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,white)] font-mono">
                                Password is salted & hashed with PBKDF2 in SQL Server
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default SetupAdmin;

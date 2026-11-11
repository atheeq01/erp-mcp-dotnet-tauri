import React, { useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";

function PasswordField({
    id,
    name,
    label,
    value,
    onChange,
    placeholder = "••••••••",
    hint = "",
    error = "",
    required = false,
    disabled = false,
    autoComplete = "current-password",
    className = "",
    ...rest
}) {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = useId();
    const fieldId = id || name || generatedId;
    const hintId = `${fieldId}-hint`;
    const errorId = `${fieldId}-error`;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label
                    htmlFor={fieldId}
                    className="text-xs uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_80%,white)]"
                >
                    {label}
                    {required && <span className="text-[var(--accent)] ml-1">*</span>}
                </label>
            )}

            <div className="relative">
                <input
                    id={fieldId}
                    name={name}
                    type={showPassword ? "text" : "password"}
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value, e)}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    autoComplete={autoComplete}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                        error ? errorId : hint ? hintId : undefined
                    }
                    className={`w-full h-[var(--input-btn-h)] pl-3 pr-10 text-sm font-mono bg-white text-[var(--ink)] border rounded-[2px] placeholder:text-[color-mix(in_srgb,var(--ink)_40%,white)] transition-colors focus:outline-none focus:border-[var(--accent)] disabled:bg-[var(--paper)] disabled:cursor-not-allowed ${
                        error ? "border-[var(--accent)]" : "border-[var(--line)]"
                    }`}
                    {...rest}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[color-mix(in_srgb,var(--ink)_50%,white)] hover:text-[var(--ink)] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                    )}
                </button>
            </div>

            {error ? (
                <p id={errorId} className="text-xs text-[var(--accent)] font-medium">
                    {error}
                </p>
            ) : hint ? (
                <p id={hintId} className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,white)]">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

export default PasswordField;

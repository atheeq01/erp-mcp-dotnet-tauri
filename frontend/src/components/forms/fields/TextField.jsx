import React, { useId } from "react";

function TextField({
    id,
    name,
    label,
    value,
    onChange,
    placeholder = "",
    hint = "",
    error = "",
    required = false,
    disabled = false,
    autoComplete,
    className = "",
    inputClassName = "",
    ...rest
}) {
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
                    {required && <span className="text-(--accent) ml-1">*</span>}
                </label>
            )}

            <input
                id={fieldId}
                name={name}
                type="text"
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
                className={`h-(--input-btn-h) px-3 text-sm bg-white text-(--ink) border rounded-xs placeholder:text-[color-mix(in_srgb,var(--ink)_40%,white)] transition-colors focus:outline-none focus:border-(--accent) disabled:bg-(--paper) disabled:cursor-not-allowed ${
                    error ? "border-(--accent)" : "border-(--line)"
                } ${inputClassName}`}
                {...rest}
            />

            {error ? (
                <p id={errorId} className="text-xs text-(--accent) font-medium">
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

export default TextField;

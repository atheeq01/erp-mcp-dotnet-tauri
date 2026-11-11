import React, { useId } from "react";

function NumberField({
    id,
    name,
    label,
    value,
    onChange,
    placeholder = "",
    hint = "",
    error = "",
    min,
    max,
    step,
    required = false,
    disabled = false,
    className = "",
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
                type="number"
                min={min}
                max={max}
                step={step}
                value={value ?? ""}
                onChange={(e) => {
                    const val = e.target.value === "" ? "" : Number(e.target.value);
                    onChange(val, e);
                }}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                aria-invalid={Boolean(error)}
                aria-describedby={
                    error ? errorId : hint ? hintId : undefined
                }
                className={`h-(--input-btn-h) px-3 text-sm font-mono tabular-nums bg-white text-(--ink) border rounded-xs placeholder:text-[color-mix(in_srgb,var(--ink)_40%,white)] transition-colors focus:outline-none focus:border-(--accent) disabled:bg-(--paper) disabled:cursor-not-allowed ${
                    error ? "border-(--accent)" : "border-(--line)"
                }`}
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

export default NumberField;

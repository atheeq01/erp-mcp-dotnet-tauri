import React, { useId } from "react";
import { ChevronDown } from "lucide-react";

function SelectField({
    id,
    name,
    label,
    value,
    onChange,
    options = [],
    placeholder = "Select an option...",
    hint = "",
    error = "",
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

            <div className="relative">
                <select
                    id={fieldId}
                    name={name}
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value, e)}
                    disabled={disabled}
                    required={required}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                        error ? errorId : hint ? hintId : undefined
                    }
                    className={`w-full h-(--input-btn-h) pl-3 pr-8 text-sm bg-white text-(--ink) border rounded-xs appearance-none transition-colors focus:outline-none focus:border-(--accent) disabled:bg-(--paper) disabled:cursor-not-allowed ${
                        error ? "border-(--accent)" : "border-(--line)"
                    }`}
                    {...rest}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((opt) => {
                        const optVal = typeof opt === "object" ? opt.value : opt;
                        const optLabel = typeof opt === "object" ? opt.label : opt;
                        return (
                            <option key={optVal} value={optVal}>
                                {optLabel}
                            </option>
                        );
                    })}
                </select>
                <ChevronDown
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-[color-mix(in_srgb,var(--ink)_50%,white)]"
                    strokeWidth={1.5}
                />
            </div>

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

export default SelectField;

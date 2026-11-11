import React from "react";
import { Loader2 } from "lucide-react";

function Button({
    children,
    type = "button",
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    fullWidth = false,
    onClick,
    className = "",
    icon: Icon,
    ...rest
}) {
    let baseStyles =
        "inline-flex items-center justify-center gap-2 font-medium tracking-tight transition-colors duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 rounded-[2px]";

    if (fullWidth) {
        baseStyles += " w-full";
    }

    const sizeStyles = {
        sm: "h-8 px-3 text-xs",
        md: "h-[var(--input-btn-h)] px-4 text-sm",
        lg: "h-12 px-5 text-base",
    }[size] || "h-[var(--input-btn-h)] px-4 text-sm";

    const variantStyles = {
        primary:
            "bg-[var(--ink)] text-white border border-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_85%,white)] active:bg-[color-mix(in_srgb,var(--ink)_70%,white)]",
        accent:
            "bg-[var(--accent)] text-white border border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_85%,black)] active:bg-[color-mix(in_srgb,var(--accent)_70%,black)]",
        outline:
            "bg-white text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper)] hover:border-[color-mix(in_srgb,var(--line)_60%,var(--ink))] active:bg-[color-mix(in_srgb,var(--paper)_80%,var(--line))]",
        ghost:
            "bg-transparent text-[var(--ink)] border border-transparent hover:bg-[var(--paper)] hover:border-[var(--line)] active:bg-[color-mix(in_srgb,var(--paper)_70%,var(--line))]",
        danger:
            "bg-white text-[var(--accent)] border border-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--paper)_80%,white)] active:bg-[var(--paper)]",
    }[variant] || "";

    return (
        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
            {...rest}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" strokeWidth={1.5} />
            ) : Icon ? (
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            ) : null}
            {children}
        </button>
    );
}

export default Button;

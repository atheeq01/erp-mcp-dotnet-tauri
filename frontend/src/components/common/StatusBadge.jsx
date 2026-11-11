import React from "react";

const TONE_CLASSES = {
    attention: "border-[var(--accent)] text-[var(--accent)] bg-transparent",
    muted: "border-[var(--line)] text-[color-mix(in_srgb,var(--ink)_55%,white)] bg-transparent",
    default: "border-[var(--ink)] text-[var(--ink)] bg-transparent",
};

function StatusBadge({
    children,
    tone = "default",
    className = "",
}) {
    const toneClasses = TONE_CLASSES[tone] || TONE_CLASSES.default;

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-mono uppercase tracking-wider rounded-[2px] border font-medium ${toneClasses} ${className}`}
        >
            {children}
        </span>
    );
}

export default StatusBadge;

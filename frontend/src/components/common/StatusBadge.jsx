import React from "react";

const TONE_CLASSES = {
    attention: "border-(--accent) text-(--accent) bg-transparent",
    muted: "border-(--line) text-[color-mix(in_srgb,var(--ink)_55%,white)] bg-transparent",
    default: "border-(--ink) text-(--ink) bg-transparent",
};

function StatusBadge({
    children,
    tone = "default",
    className = "",
}) {
    const toneClasses = TONE_CLASSES[tone] || TONE_CLASSES.default;

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-mono uppercase tracking-wider rounded-xs border font-medium ${toneClasses} ${className}`}
        >
            {children}
        </span>
    );
}

export default StatusBadge;

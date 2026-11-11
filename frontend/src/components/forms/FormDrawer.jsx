import React, { useEffect } from "react";
import { X } from "lucide-react";

function FormDrawer({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
}) {
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        }
        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                className="fixed inset-0 bg-black/40 transition-opacity duration-200"
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="drawer-title"
                style={{ width: "var(--drawer-w)", maxWidth: "100vw" }}
                className="relative z-10 flex h-full flex-col bg-white border-l border-(--line) shadow-none animate-in slide-in-from-right duration-200"
            >
                <div className="flex items-center justify-between border-b border-(--line) bg-(--paper) px-6 py-4">
                    <div>
                        <h2
                            id="drawer-title"
                            className="font-display text-base font-bold tracking-tight text-(--ink)"
                        >
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,white)] mt-0.5 font-mono">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xs p-1.5 text-[color-mix(in_srgb,var(--ink)_60%,white)] hover:text-(--ink) hover:bg-[color-mix(in_srgb,var(--paper)_80%,var(--line))] transition-colors"
                        aria-label="Close form drawer"
                    >
                        <X className="h-5 w-5" strokeWidth={1.5} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">{children}</div>
            </div>
        </div>
    );
}

export default FormDrawer;

import React, { useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import Button from "./Button";

function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    subtitle = null,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "primary", // "primary" | "accent" | "danger"
    icon: Icon = null,
    loading = false,
    error = null,
}) {
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === "Escape" && isOpen && !loading) {
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
    }, [isOpen, onClose, loading]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-150"
                onClick={() => !loading && onClose()}
                aria-hidden="true"
            />

            {/* Modal Dialog Box */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
                className="relative z-10 w-full max-w-md bg-white border border-(--line) shadow-2xl rounded-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-(--line) bg-(--paper) px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                        {Icon && (
                            <div
                                className={`p-1.5 rounded-xs ${
                                    variant === "danger"
                                        ? "bg-red-50 text-(--accent) border border-red-200"
                                        : "bg-white text-(--ink) border border-(--line)"
                                }`}
                            >
                                <Icon className="h-4 w-4" strokeWidth={1.5} />
                            </div>
                        )}
                        <div>
                            <h2
                                id="dialog-title"
                                className="font-display text-sm font-bold tracking-tight text-(--ink)"
                            >
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="text-[11px] font-mono text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="rounded-xs p-1 text-[color-mix(in_srgb,var(--ink)_50%,white)] hover:text-(--ink) hover:bg-[color-mix(in_srgb,var(--paper)_80%,var(--line))] transition-colors disabled:opacity-40"
                        aria-label="Close dialog"
                    >
                        <X className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                    {typeof message === "string" ? (
                        <p className="text-sm text-(--ink) leading-relaxed">
                            {message}
                        </p>
                    ) : (
                        message
                    )}

                    {error && (
                        <div className="p-3 border border-(--accent) bg-red-50 text-red-900 rounded-xs flex items-start gap-2 text-xs font-mono">
                            <AlertCircle className="h-4 w-4 text-(--accent) shrink-0 mt-0.5" strokeWidth={1.5} />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3.5 bg-(--paper) border-t border-(--line) flex items-center justify-end gap-2.5">
                    <Button
                        variant="outline"
                        size="md"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant}
                        size="md"
                        loading={loading}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmDialog;

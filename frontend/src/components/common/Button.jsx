
function Button({
                    children,
                    type = "button",
                    loading = false,
                    disabled = false,
                    onClick,
                    className = "",
                }) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`flex w-full items-center justify-center rounded-lg bg-green-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        >
            {loading ? "Please wait..." : children}
        </button>
    );
}

export default Button;


function Input({
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    required = false,
    autoComplete,
}) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
                {label}
            </label>

            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                required={required}
                autoComplete={autoComplete}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-green-700 focus:ring-2 focus:ring-green-100"
            />
        </div>
    );
}

export default Input;

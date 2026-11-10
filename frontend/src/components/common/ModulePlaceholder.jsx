
function ModulePlaceholder({ title, description }) {
    return (
        <section>
            <h1 className="text-2xl font-bold text-slate-900">
                {title}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
                {description}
            </p>

            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h2 className="font-semibold text-slate-700">
                    Module ready for implementation
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                    We will connect this page to the .NET MCP tools.
                </p>
            </div>
        </section>
    );
}

export default ModulePlaceholder;

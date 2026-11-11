import React from "react";
import { ArrowRight, Boxes, FileSpreadsheet, Users, DollarSign } from "lucide-react";

function ChatEmptyState({ onSelectPrompt }) {
    const prompts = [
        {
            icon: Boxes,
            title: "Check Low Stock Items",
            query: "show low stock",
            description: "Audits all items at or below safety reorder threshold (â‰¤ 25 units)",
        },
        {
            icon: DollarSign,
            title: "Current Inventory",
            query: "get inventory",
            description: "Lists all current inventory products and stock balances",
        },
        {
            icon: FileSpreadsheet,
            title: "Orders Overview",
            query: "get the orders",
            description: "Retrieves order records logged in the system",
        },
        {
            icon: Users,
            title: "List System Users",
            query: "list users",
            description: "Displays employee accounts, security roles, and active status",
        },
    ];

    return (
        <div className="mx-auto max-w-2xl py-8 px-4 flex flex-col items-center text-center">
            <div className="w-full border-b border-(--line) pb-4 mb-6">
                <span className="label-caps">SPIL Assistant Query Terminal</span>
                <h2 className="font-display text-xl font-bold text-(--ink) mt-1">
                    Direct ERP Operations & Auditing
                </h2>
                <p className="text-sm text-[color-mix(in_srgb,var(--ink)_60%,white)] max-w-md mx-auto mt-1">
                    Execute real-time database queries through authenticated MCP tools. Select a quick command or type your own instructions.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {prompts.map((p, idx) => {
                    const Icon = p.icon;
                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => onSelectPrompt(p.query)}
                            className="group p-4 bg-white border border-(--line) rounded-xs hover:border-(--ink) transition-colors duration-150 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-(--accent)" strokeWidth={1.5} />
                                        <span className="font-display text-sm font-bold text-(--ink)">
                                            {p.title}
                                        </span>
                                    </div>
                                    <ArrowRight className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--ink)_30%,white)] group-hover:text-(--accent) group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
                                </div>
                                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_65%,white)] leading-relaxed">
                                    {p.description}
                                </p>
                            </div>
                            <div className="mt-3 pt-2 border-t border-(--line)">
                                <code className="text-xs font-mono text-(--ink)">
                                    {p.query}
                                </code>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default ChatEmptyState;

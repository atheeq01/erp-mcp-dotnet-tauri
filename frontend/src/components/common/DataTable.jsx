import React, { useState, useMemo } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import Skeleton from "./Skeleton";
import Button from "./Button";
import { useDebounce } from "../../hooks/useDebounce";

function DataTable({
    columns = [],
    data = [],
    keyExtractor = (item, index) => item.id ?? item.Id ?? index,
    loading = false,
    error = null,
    onRetry = null,
    searchPlaceholder = "Search records...",
    searchFields = [],
    emptyMessage = "No records found.",
    initialSortKey = null,
    initialSortDirection = "asc",
    actionButton = null,
    toolbarExtra = null,
}) {
    const [rawSearch, setRawSearch] = useState("");
    const debouncedSearch = useDebounce(rawSearch, 200);

    const [sortConfig, setSortConfig] = useState({
        key: initialSortKey,
        direction: initialSortDirection,
    });

    function handleSort(key) {
        setSortConfig((prev) => {
            if (prev.key === key) {
                return {
                    key,
                    direction: prev.direction === "asc" ? "desc" : "asc",
                };
            }
            return { key, direction: "asc" };
        });
    }

    const filteredData = useMemo(() => {
        if (!debouncedSearch.trim()) return data;
        const q = debouncedSearch.toLowerCase().trim();

        return data.filter((item) => {
            if (searchFields && searchFields.length > 0) {
                return searchFields.some((field) => {
                    const val = item[field];
                    if (val === null || val === undefined) return false;
                    return String(val).toLowerCase().includes(q);
                });
            }
            return Object.values(item).some((val) => {
                if (val === null || val === undefined) return false;
                if (typeof val === "object") return false;
                return String(val).toLowerCase().includes(q);
            });
        });
    }, [data, debouncedSearch, searchFields]);

    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData;

        return [...filteredData].sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];

            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;

            if (typeof valA === "number" && typeof valB === "number") {
                return sortConfig.direction === "asc" ? valA - valB : valB - valA;
            }

            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();

            return sortConfig.direction === "asc"
                ? strA.localeCompare(strB)
                : strB.localeCompare(strA);
        });
    }, [filteredData, sortConfig]);

    if (error) {
        return (
            <div className="p-8 border border-[var(--accent)] bg-white rounded-[2px] text-center my-4">
                <div className="flex items-center justify-center gap-2 text-[var(--accent)] mb-2">
                    <AlertCircle className="h-5 w-5" strokeWidth={1.5} />
                    <span className="font-semibold text-sm">Failed to Load Records</span>
                </div>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_65%,white)] mb-4 max-w-md mx-auto">
                    {error.message || String(error)}
                </p>
                {onRetry && (
                    <Button variant="danger" size="sm" onClick={onRetry}>
                        Retry Operation
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color-mix(in_srgb,var(--ink)_45%,white)] pointer-events-none"
                        strokeWidth={1.5}
                    />
                    <input
                        type="text"
                        value={rawSearch}
                        onChange={(e) => setRawSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full h-[var(--input-btn-h)] pl-9 pr-3 text-sm bg-white border border-[var(--line)] rounded-[2px] focus:outline-none focus:border-[var(--accent)] placeholder:text-[color-mix(in_srgb,var(--ink)_40%,white)] transition-colors"
                    />
                </div>

                <div className="flex items-center gap-3">
                    {toolbarExtra}
                    {actionButton}
                </div>
            </div>

            <div className="overflow-x-auto border border-[var(--line)] bg-white rounded-[2px]">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-[var(--paper)] border-b border-[var(--line)]">
                            {columns.map((col) => {
                                const isSorted = sortConfig.key === col.key;
                                return (
                                    <th
                                        key={col.key}
                                        onClick={col.sortable ? () => handleSort(col.key) : undefined}
                                        style={{ width: col.width }}
                                        className={`px-4 py-3 text-[11px] font-mono uppercase tracking-wider font-semibold text-[color-mix(in_srgb,var(--ink)_75%,white)] select-none whitespace-nowrap ${
                                            col.sortable
                                                ? "cursor-pointer hover:text-[var(--ink)]"
                                                : ""
                                        } ${
                                            col.align === "right"
                                                ? "text-right"
                                                : col.align === "center"
                                                ? "text-center"
                                                : "text-left"
                                        }`}
                                        aria-sort={
                                            isSorted
                                                ? sortConfig.direction === "asc"
                                                    ? "ascending"
                                                    : "descending"
                                                : undefined
                                        }
                                    >
                                        <div
                                            className={`inline-flex items-center gap-1.5 ${
                                                col.align === "right"
                                                    ? "justify-end"
                                                    : col.align === "center"
                                                    ? "justify-center"
                                                    : "justify-start"
                                            }`}
                                        >
                                            <span>{col.header}</span>
                                            {col.sortable && (
                                                <span className="shrink-0 text-[color-mix(in_srgb,var(--ink)_40%,white)]">
                                                    {isSorted ? (
                                                        sortConfig.direction === "asc" ? (
                                                            <ArrowUp className="h-3.5 w-3.5 text-[var(--accent)]" strokeWidth={1.5} />
                                                        ) : (
                                                            <ArrowDown className="h-3.5 w-3.5 text-[var(--accent)]" strokeWidth={1.5} />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" strokeWidth={1.5} />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-[var(--line)] font-sans">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, rIdx) => (
                                <tr key={`skeleton-${rIdx}`} style={{ height: "var(--table-row-h)" }}>
                                    {columns.map((col, cIdx) => (
                                        <td key={`skeleton-col-${cIdx}`} className="px-4 py-3">
                                            <Skeleton height="18px" width={cIdx === 0 ? "60%" : "80%"} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : sortedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-14 text-center text-[color-mix(in_srgb,var(--ink)_50%,white)]"
                                >
                                    <p className="font-medium text-sm">{emptyMessage}</p>
                                    {rawSearch && (
                                        <p className="text-xs mt-1 text-[color-mix(in_srgb,var(--ink)_40%,white)]">
                                            Try adjusting your search terms.
                                        </p>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            sortedData.map((item, index) => {
                                const rowKey = keyExtractor(item, index);
                                return (
                                    <tr
                                        key={rowKey}
                                        style={{ height: "var(--table-row-h)" }}
                                        className="hover:bg-[color-mix(in_srgb,var(--paper)_40%,white_60%)] transition-colors duration-100 text-[var(--table-body-text)]"
                                    >
                                        {columns.map((col) => {
                                            const cellVal = item[col.key];
                                            return (
                                                <td
                                                    key={`${rowKey}-${col.key}`}
                                                    className={`px-4 py-3 text-[var(--ink)] ${
                                                        col.align === "right"
                                                             ? "text-right"
                                                            : col.align === "center"
                                                            ? "text-center"
                                                            : "text-left"
                                                    }`}
                                                >
                                                    {col.render ? col.render(cellVal, item, index) : (cellVal ?? "—")}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && sortedData.length > 0 && (
                <div className="flex items-center justify-between text-xs text-[color-mix(in_srgb,var(--ink)_50%,white)] px-1">
                    <span className="font-mono tabular-nums">
                        Showing {sortedData.length} of {data.length} records
                    </span>
                    {rawSearch && (
                        <span>
                            Filtered by &ldquo;{rawSearch}&rdquo;
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export default DataTable;

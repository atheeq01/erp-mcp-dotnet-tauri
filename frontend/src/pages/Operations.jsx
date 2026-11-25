import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Check, CircleAlert, ClipboardList, FileText, Plus, RefreshCw, ShieldCheck, Ticket, X } from "lucide-react";
import Button from "../components/common/Button";
import { createOperationsTicket, getOperationsOverview, getOperationsServiceDetail, listOperationsTickets } from "../services/mcpService";

const SERVICE_NAMES = ["auth-service", "order-service", "inventory-service"];
const ASSIGNEES = [
    { value: "oncall-auth", label: "Auth on-call team" },
    { value: "oncall-orders", label: "Orders on-call team" },
    { value: "oncall-inventory", label: "Inventory on-call team" },
    { value: "sre-lead", label: "SRE lead" },
];
const assigneeLabel = value => ASSIGNEES.find(item => item.value === value)?.label || value || "Unassigned";
const defaultAssignee = serviceName => serviceName === "auth-service" ? "oncall-auth" : serviceName === "inventory-service" ? "oncall-inventory" : "oncall-orders";
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TABS = [
    ["triage", "Triage", Activity],
    ["release", "Release", ShieldCheck],
    ["tickets", "Tickets", Ticket],
];

function errorText(error) {
    if (typeof error === "string") return error;
    return error?.message || "The telemetry request failed. Try again.";
}

function dateText(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function Tone({ value }) {
    const text = String(value || "UNKNOWN").toUpperCase();
    const urgent = ["CRITICAL", "HIGH", "BLOCKED", "FATAL", "ERROR", "FAILED", "DEGRADED", "OPEN"].includes(text);
    const healthy = ["HEALTHY", "READY", "RESOLVED"].includes(text);
    const style = urgent ? "border-(--accent) text-(--accent) bg-red-50" : healthy ? "border-emerald-700 text-emerald-800 bg-emerald-50" : "border-(--line) text-(--ink) bg-(--paper)";
    return <span className={`inline-flex px-2 py-0.5 border text-[11px] font-mono font-semibold ${style}`}>{text}</span>;
}

function Document({ text }) {
    return <div className="space-y-2 text-sm text-(--ink)">
        {String(text || "No document available.").split("\n").filter(Boolean).map((line, index) => {
            if (line.startsWith("# ")) return <h3 key={index} className="font-display text-lg font-bold mt-4 first:mt-0">{line.slice(2)}</h3>;
            if (line.startsWith("## ")) return <h4 key={index} className="font-display text-base font-bold mt-4">{line.slice(3)}</h4>;
            const clean = line.replace(/\*\*/g, "").replace(/^[-*] \[[ x]\] /, "").replace(/^[-*] /, "");
            return <p key={index} className={line.startsWith("-") ? "pl-4 border-l-2 border-(--line)" : ""}>{clean}</p>;
        })}
    </div>;
}

function Metric({ label, value, suffix }) {
    return <div className="border border-(--line) bg-white p-4 min-w-0">
        <span className="label-caps block">{label}</span>
        <div className="mt-2 font-mono text-2xl font-bold tabular-nums truncate">{value ?? "—"}<span className="text-xs font-normal ml-1">{suffix}</span></div>
    </div>;
}

export default function Operations() {
    const [overview, setOverview] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(true);
    const [ticketLoadError, setTicketLoadError] = useState("");
    const [ticketError, setTicketError] = useState("");
    const [ticketFilter, setTicketFilter] = useState("all");
    const [detail, setDetail] = useState(null);
    const [service, setService] = useState("order-service");
    const [severityFilter, setSeverityFilter] = useState("ALL");
    const [tab, setTab] = useState("triage");
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(true);
    const [error, setError] = useState("");
    const [detailError, setDetailError] = useState("");
    const [ticketForm, setTicketForm] = useState({ service_name: "order-service", title: "", severity: "HIGH", summary: "", assignee: "oncall-orders" });
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const titleInputRef = useRef(null);
    const [reviewing, setReviewing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [notice, setNotice] = useState("");

    const refreshOverview = useCallback(async () => {
        setLoading(true);
        setError("");
        try { setOverview(await getOperationsOverview()); }
        catch (e) { setError(errorText(e)); }
        finally { setLoading(false); }
    }, []);

    const refreshTickets = useCallback(async () => {
        setTicketsLoading(true);
        setTicketLoadError("");
        try {
            const result = await listOperationsTickets();
            if (!Array.isArray(result?.tickets)) throw new Error("The ticket list returned an invalid response.");
            setTickets(result.tickets);
        } catch (e) { setTicketLoadError(errorText(e)); }
        finally { setTicketsLoading(false); }
    }, []);

    const refreshDetail = useCallback(async () => {
        setDetailLoading(true);
        setDetailError("");
        try { setDetail(await getOperationsServiceDetail(service, severityFilter)); }
        catch (e) { setDetailError(errorText(e)); setDetail(null); }
        finally { setDetailLoading(false); }
    }, [service, severityFilter]);

    useEffect(() => { void refreshOverview(); }, [refreshOverview]);
    useEffect(() => { void refreshTickets(); }, [refreshTickets]);
    useEffect(() => {
        if (tab !== "tickets") return;
        void refreshTickets();
        const timer = setInterval(refreshTickets, 10000);
        return () => clearInterval(timer);
    }, [tab, refreshTickets]);
    useEffect(() => { void refreshDetail(); }, [refreshDetail]);
    useEffect(() => {
        document.querySelector("main")?.scrollTo({ top: 0 });
    }, [tab, service]);
    useEffect(() => {
        if (isComposerOpen && !reviewing) titleInputRef.current?.focus();
    }, [isComposerOpen, reviewing]);
    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(""), 5000);
        return () => clearTimeout(timer);
    }, [notice]);

    const services = overview?.services?.services || [];
    const visibleTickets = ticketFilter === "all" ? tickets : tickets.filter(ticket => ticket.service_name === ticketFilter);
    const openCount = tickets.filter(ticket => ticket.status === "OPEN").length;
    const selectedService = services.find(item => item.name === service);
    const releaseLine = useMemo(() => String(overview?.checklist || "").split("\n").find(line => line.includes(`**${service}**`)) || "", [overview, service]);
    const releaseStatus = releaseLine.match(/Status:\s*\*\*([^*]+)\*\*/)?.[1] || "NOT RECORDED";

    function chooseService(name) {
        setService(name);
        if (tab === "tickets") setTicketFilter(name);
    }

    function openComposer() {
        setIsComposerOpen(true);
        setReviewing(false);
        setTicketError("");
        setNotice("");
        setTicketForm({
            service_name: service,
            title: "",
            severity: "HIGH",
            summary: "",
            assignee: defaultAssignee(service),
        });
    }

    async function createTicket() {
        setCreating(true);
        setTicketError("");
        try {
            const result = await createOperationsTicket({ ...ticketForm, confirmed: true });
            if (result?.success !== true || !result?.ticket_id) throw new Error("Ticket creation was not confirmed by telemetry MCP.");
            setNotice(`${result.ticket_id} created.`);
            if (result.ticket) setTickets(current => [result.ticket, ...current.filter(ticket => ticket.ticket_id !== result.ticket_id)]);
            setTicketFilter("all");
            setTicketForm(form => ({ ...form, title: "", summary: "" }));
            setReviewing(false);
            setIsComposerOpen(false);
            setTab("tickets");
            await refreshTickets();
        } catch (e) { setTicketError(errorText(e)); }
        finally { setCreating(false); }
    }

    return <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-(--line) pb-5">
            <div>
                <span className="label-caps">MCP Telemetry · Mock environment</span>
                <h2 className="font-display text-3xl font-bold tracking-tight mt-1">Incident command center</h2>
                <p className="text-sm text-[color-mix(in_srgb,var(--ink)_65%,white)] mt-1">Inspect evidence, review release status, and record incidents.</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button icon={Plus} onClick={openComposer}>Create incident ticket</Button>
                <Button variant="outline" icon={RefreshCw} onClick={() => { void refreshOverview(); void refreshDetail(); void refreshTickets(); }} loading={loading}>Refresh data</Button>
            </div>
        </div>

        {error && <div role="alert" className="border border-(--accent) bg-white px-4 py-3 text-sm text-(--accent)">{error}</div>}
        {notice && <div role="status" className="flex items-center justify-between gap-3 border border-emerald-700 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><span>{notice}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")} className="shrink-0 p-1 hover:bg-emerald-100"><X className="h-4 w-4" /></button></div>}

        {isComposerOpen && <section id="ticket-composer" aria-label="Create incident ticket" className="border border-(--ink) bg-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <span className="label-caps">New record</span>
                    <h3 className="font-display text-2xl font-bold mt-1">Create incident ticket</h3>
                    <p className="text-sm text-(--ink)/65 mt-1">Record an incident and choose who is responsible for following it up.</p>
                </div>
                <Button variant="ghost" size="sm" icon={X} onClick={() => { setIsComposerOpen(false); setTicketError(""); }}>Close</Button>
            </div>
            {ticketError && <p role="alert" className="text-sm text-(--accent)">Could not create ticket: {ticketError}</p>}
            {!reviewing ? <form onSubmit={e => { e.preventDefault(); setReviewing(true); }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-xs font-mono">Service<select aria-label="Service" value={ticketForm.service_name} onChange={e => {
                    const name = e.target.value;
                    setTicketForm(form => ({ ...form, service_name: name, assignee: defaultAssignee(name) }));
                }} className="block w-full mt-1 border border-(--line) px-3 py-2 text-sm">{SERVICE_NAMES.map(name => <option key={name}>{name}</option>)}</select></label>
                <label className="text-xs font-mono">Severity<select aria-label="Severity" value={ticketForm.severity} onChange={e => setTicketForm({ ...ticketForm, severity: e.target.value })} className="block w-full mt-1 border border-(--line) px-3 py-2 text-sm">{SEVERITIES.map(value => <option key={value}>{value}</option>)}</select></label>
                <label className="text-xs font-mono md:col-span-2">Title<input aria-label="Title" ref={titleInputRef} required maxLength={160} value={ticketForm.title} onChange={e => setTicketForm({ ...ticketForm, title: e.target.value })} className="block w-full mt-1 border border-(--line) px-3 py-2 text-sm font-ui" placeholder="Describe the operational impact" /></label>
                <label className="text-xs font-mono md:col-span-2">Technical summary<textarea aria-label="Technical summary" required minLength={20} maxLength={4000} rows={4} value={ticketForm.summary} onChange={e => setTicketForm({ ...ticketForm, summary: e.target.value })} className="block w-full mt-1 border border-(--line) px-3 py-2 text-sm resize-y" placeholder="What happened, what is affected, and the evidence" /></label>
                <label className="text-xs font-mono">Responsible team<select aria-label="Responsible team" value={ticketForm.assignee} onChange={e => setTicketForm({ ...ticketForm, assignee: e.target.value })} className="block w-full mt-1 border border-(--line) px-3 py-2 text-sm">{ASSIGNEES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                <div className="md:col-span-2"><Button type="submit" icon={ArrowRight}>Review details</Button></div>
            </form> : <div className="border border-(--line) bg-(--paper) p-4 space-y-3">
                <strong className="block">Review before creating</strong>
                <p className="font-semibold">{ticketForm.title}</p>
                <div className="flex flex-wrap items-center gap-2"><Tone value={ticketForm.severity} /><span className="font-mono text-xs">{ticketForm.service_name} · {assigneeLabel(ticketForm.assignee)}</span></div>
                <p className="text-sm whitespace-pre-wrap">{ticketForm.summary}</p>
                <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setReviewing(false)}>Back to edit</Button><Button icon={Check} onClick={createTicket} loading={creating}>Confirm creation</Button></div>
            </div>}
        </section>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Metric label="Monitored services" value={loading ? "—" : services.length} />
            <Metric label="Open incidents" value={loading ? "—" : openCount} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[15rem_minmax(0,1fr)] gap-5 items-start">
            <aside className="grid grid-cols-1 sm:grid-cols-3 xl:block gap-2 xl:space-y-2" aria-label="Monitored services">
                <h3 className="label-caps sm:col-span-3 xl:mb-3">Services</h3>
                {SERVICE_NAMES.map(name => {
                    const item = services.find(entry => entry.name === name);
                    return <button key={name} type="button" onClick={() => chooseService(name)} aria-pressed={service === name}
                        className={`w-full text-left border p-3 transition-colors ${service === name ? "border-(--ink) bg-white shadow-sm" : "border-(--line) bg-white/60 hover:bg-white"}`}>
                        <span className="block font-semibold text-sm break-words">{name}</span>
                        <span className="flex items-center justify-between mt-2"><Tone value={item?.status || "loading"} /><span className="text-xs font-mono">{item?.version || "—"}</span></span>
                    </button>;
                })}
                <Link to="/chat" className="sm:col-span-3 flex items-center gap-2 text-sm font-medium px-1 pt-2 hover:underline">Ask AI to investigate <ArrowRight className="h-4 w-4" /></Link>
            </aside>

            <section className="min-w-0 border border-(--line) bg-white">
                <div className="px-5 pt-5 border-b border-(--line)">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
                        <div><span className="label-caps">Selected service</span><h3 className="font-display text-2xl font-bold mt-0.5">{service}</h3></div>
                        <div className="flex items-center gap-2"><Tone value={detail?.health?.status || selectedService?.status} /><span className="font-mono text-xs">{selectedService?.version || "—"}</span></div>
                    </div>
                    <div role="tablist" aria-label="Operations sections" className="flex gap-1 overflow-x-auto">
                        {TABS.map(([key, label, Icon]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 ${tab === key ? "border-(--accent) text-(--ink)" : "border-transparent text-[color-mix(in_srgb,var(--ink)_55%,white)] hover:text-(--ink)"}`}>
                            <Icon className="h-4 w-4" />{label}
                        </button>)}
                    </div>
                </div>

                <div className="p-5 min-h-80 space-y-5">
                    {detailError && <div role="alert" className="text-sm text-(--accent) flex items-center gap-2"><CircleAlert className="h-4 w-4" />{detailError}</div>}
                    {detailLoading && ["triage", "release"].includes(tab) && <p className="text-sm text-(--ink)">Loading service telemetry…</p>}

                    {tab === "triage" && !detailLoading && detail && <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Metric label="Error rate" value={detail.health?.error_rate_pct} suffix="%" />
                            <Metric label="P95 latency" value={detail.health?.p95_latency_ms} suffix="ms" />
                            <Metric label="Connections" value={`${detail.health?.active_connections ?? "—"}/${detail.health?.max_connections ?? "—"}`} />
                            <Metric label="Circuit breaker" value={detail.health?.circuit_breaker} />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-display text-lg">Recent logs</h4>
                            <label className="text-xs font-mono">Severity <select aria-label="Log severity" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="ml-2 border border-(--line) bg-white px-2 py-1.5">{["ALL", "INFO", "WARN", "ERROR", "FATAL"].map(value => <option key={value}>{value}</option>)}</select></label>
                        </div>
                        <div className="border border-(--line) divide-y divide-(--line) max-h-80 overflow-y-auto">
                            {(detail.logs?.logs || []).length === 0 && <p className="p-4 text-sm">No logs match this filter.</p>}
                            {(detail.logs?.logs || []).map(log => <div key={log.id} className="p-3 grid grid-cols-[6rem_minmax(0,1fr)] gap-3 text-xs">
                                <div className="space-y-1"><Tone value={log.severity} /><span className="block font-mono text-[10px] text-(--ink)/60">{dateText(log.timestamp)}</span></div>
                                <p className="break-words whitespace-pre-wrap">{log.message}</p>
                            </div>)}
                        </div>
                        <div><h4 className="font-display text-lg mb-3">Deployment history</h4><div className="space-y-2">{(detail.deployments?.deployments || []).map(deployment => <div key={deployment.id} className="border border-(--line) bg-(--paper) p-3 text-sm">
                            <div className="flex flex-wrap items-center gap-2"><strong className="font-mono">{deployment.version}</strong><Tone value={deployment.status} /><span className="font-mono text-xs">{deployment.commit}</span><span className="ml-auto text-xs">{dateText(deployment.timestamp)}</span></div>
                            <p className="mt-2">{deployment.notes}</p>
                            <p className="mt-1 text-xs font-mono">Rollback: {deployment.rollback_available ? `Available → ${deployment.rollback_target_version || "target pending"}` : "Unavailable"}</p>
                        </div>)}</div></div>
                    </>}

                    {tab === "release" && !detailLoading && detail && <>
                        <div className="flex flex-wrap items-center gap-3 border border-(--line) bg-(--paper) p-4"><span className="label-caps">Recorded readiness</span><Tone value={releaseStatus} /><span className="text-sm">{releaseLine.replace(/\*/g, "").replace(/^[- ]+/, "")}</span></div>
                        <p className="text-xs text-(--ink)/65">Release status is read-only. When the AI proposes a ticket, approve or reject it in the chat before it is created.</p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <section className="border border-(--line) p-4"><div className="flex items-center gap-2 mb-4"><FileText className="h-4 w-4" /><h4 className="font-display text-lg">Release checklist</h4></div><Document text={overview?.checklist} /></section>
                            <section className="border border-(--line) p-4"><div className="flex items-center gap-2 mb-4"><ClipboardList className="h-4 w-4" /><h4 className="font-display text-lg">Service runbook</h4></div><Document text={detail.runbook} /></section>
                        </div>
                    </>}

                    {tab === "tickets" && <>
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div><h4 className="font-display text-lg">Incident tickets</h4><p className="text-xs text-(--ink)/60">{visibleTickets.length} of {tickets.length} tickets</p></div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-mono">Show <select aria-label="Filter tickets by service" value={ticketFilter} onChange={e => setTicketFilter(e.target.value)} className="ml-2 border border-(--line) bg-white px-2 py-1.5"><option value="all">All services</option>{SERVICE_NAMES.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
                                <Button variant="outline" size="sm" icon={RefreshCw} onClick={refreshTickets} loading={ticketsLoading}>Refresh tickets</Button>
                            </div>
                        </div>
                        {ticketLoadError && <p role="alert" className="text-sm text-(--accent)">Could not load tickets: {ticketLoadError}</p>}
                        <div className="space-y-2">
                            {ticketsLoading && tickets.length === 0 && <p className="text-sm border border-(--line) p-4">Loading tickets…</p>}
                            {!ticketsLoading && !ticketLoadError && visibleTickets.length === 0 && <p className="text-sm border border-(--line) p-4">No tickets match this filter.</p>}
                            {visibleTickets.map(ticket => <article key={ticket.ticket_id} className="border border-(--line) p-4"><div className="flex flex-wrap items-center gap-2"><strong className="font-mono text-sm">{ticket.ticket_id}</strong><Tone value={ticket.severity} /><Tone value={ticket.status} /><span className="ml-auto text-xs">{dateText(ticket.created_at)}</span></div><h5 className="font-semibold mt-2">{ticket.title}</h5><p className="text-sm mt-1 whitespace-pre-wrap">{ticket.summary}</p><p className="text-xs font-mono mt-2">{ticket.service_name || "Unassigned service"} · Responsible: {assigneeLabel(ticket.assignee)}</p></article>)}
                        </div>
                                            </>}


                </div>
            </section>
        </div>
    </div>;
}

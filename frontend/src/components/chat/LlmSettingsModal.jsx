import React, { useEffect, useState } from "react";
import { X, Settings, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";
import Button from "../common/Button";
import { getLlmSettings, saveLlmSettings, resetLlmSettings } from "../../services/mcpService";

export const PROVIDER_PRESETS = {
    default: {
        label: ".env Default (Keep Config)",
        baseUrl: "",
        chatModels: [],
        embeddingModels: ["gemini-embedding-001", "text-embedding-3-small"],
    },
    gemini: {
        label: "Google Gemini",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
        chatModels: [
            "gemini-4-hydrogen",
            "gemini-4-neon",
            "gemini-4-argon",
            "gemini-4-carbon",
            "gemini-3.8-flash",
            "gemini-3.5-flash-lite",
        ],
        embeddingModels: ["gemini-embedding-001", "gemini-embedding-2"],
    },
    openai: {
        label: "OpenAI (ChatGPT)",
        baseUrl: "https://api.openai.com/v1",
        chatModels: [
            "gpt-5.4-mini",
            "gpt-5.4",
            "gpt-6-luna",
            "gpt-6.1-terra",
            "gpt-6.2-sol",
            "gpt-6.2-astra",
        ],
        embeddingModels: ["text-embedding-3-small", "text-embedding-3-large"],
    },
    claude: {
        label: "Anthropic Claude",
        baseUrl: "https://api.anthropic.com/v1/",
        chatModels: [
            "claude-sonnet-5-5",
            "claude-haiku-5-5",
            "claude-opus-5-5",
            "claude-fable-5-2",
            "claude-sonnet-4-6",
        ],
        embeddingModels: ["voyage-3-lite", "voyage-3", "text-embedding-3-small"],
    },
    openrouter: {
        label: "OpenRouter",
        baseUrl: "https://openrouter.ai/api/v1",
        chatModels: [
            "google/gemini-4-hydrogen",
            "anthropic/claude-sonnet-5.5",
            "openai/gpt-6-luna",
            "openai/gpt-6.1-sol",
            "openai/gpt-6-astra",
            "deepseek/deepseek-v4.1-flash",
        ],
        embeddingModels: [
            "openai/text-embedding-3-small",
            "openai/text-embedding-3-large",
            "google/gemini-embedding-001",
        ],
    },
};

function formatErr(err) {
    if (!err) return "Failed to update settings.";
    if (typeof err === "string") return err;
    if (err.kind && err.message) return `[${err.kind}] ${err.message}`;
    return err.message || String(err);
}

function LlmSettingsModal({ isOpen, onClose, onUpdated }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [statusMsg, setStatusMsg] = useState("");

    const [envDefaults, setEnvDefaults] = useState({
        baseUrl: "",
        model: "",
        embeddingModel: "",
        apiKeyHint: "",
    });

    const [provider, setProvider] = useState("default");
    const [baseUrl, setBaseUrl] = useState("");
    const [model, setModel] = useState("");
    const [customModel, setCustomModel] = useState("");
    const [embeddingModel, setEmbeddingModel] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setError("");
        setStatusMsg("");

        getLlmSettings()
            .then((view) => {
                applyViewToForm(view);
            })
            .catch((err) => {
                setError(formatErr(err));
            })
            .finally(() => setLoading(false));
    }, [isOpen]);

    function applyViewToForm(view) {
        const p = PROVIDER_PRESETS[view.provider] ? view.provider : "default";
        setEnvDefaults({
            baseUrl: view.env_default_base_url,
            model: view.env_default_model,
            embeddingModel: view.env_default_embedding_model,
            apiKeyHint: view.api_key_hint,
        });
        setProvider(p);
        setBaseUrl(view.base_url);
        setEmbeddingModel(view.embedding_model);

        const preset = PROVIDER_PRESETS[p];
        if (p === "default") {
            setModel(view.env_default_model);
            setCustomModel("");
        } else if (preset.chatModels.includes(view.model)) {
            setModel(view.model);
            setCustomModel("");
        } else {
            setModel("__custom__");
            setCustomModel(view.model);
        }
    }

    function handleProviderChange(nextProvider) {
        setProvider(nextProvider);
        setError("");
        setStatusMsg("");
        const preset = PROVIDER_PRESETS[nextProvider];
        if (nextProvider === "default") {
            setBaseUrl(envDefaults.baseUrl);
            setModel(envDefaults.model);
            setCustomModel("");
            setEmbeddingModel(envDefaults.embeddingModel);
        } else {
            setBaseUrl(preset.baseUrl);
            setModel(preset.chatModels[0]);
            setCustomModel("");
            setEmbeddingModel(preset.embeddingModels[0]);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError("");
        setStatusMsg("");

        const chosenModel =
            provider === "default"
                ? null
                : model === "__custom__"
                ? customModel.trim()
                : model;

        if (provider !== "default" && !chosenModel) {
            setError("Please select or enter a chat model.");
            setSaving(false);
            return;
        }

        try {
            const view = await saveLlmSettings({
                provider,
                base_url: provider === "default" ? null : baseUrl.trim(),
                model: chosenModel,
                embedding_model: embeddingModel.trim() || null,
            });
            applyViewToForm(view);
            setStatusMsg("Saved LLM configuration.");
            onUpdated?.(view);
        } catch (err) {
            setError(formatErr(err));
        } finally {
            setSaving(false);
        }
    }

    async function handleReset() {
        setSaving(true);
        setError("");
        setStatusMsg("");
        try {
            const view = await resetLlmSettings();
            applyViewToForm(view);
            setStatusMsg("Reset to .env default configuration.");
            onUpdated?.(view);
        } catch (err) {
            setError(formatErr(err));
        } finally {
            setSaving(false);
        }
    }

    if (!isOpen) return null;

    const activePreset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.default;
    const embeddingChoices = Array.from(
        new Set([
            ...activePreset.embeddingModels,
            ...(embeddingModel ? [embeddingModel] : []),
        ])
    );

    const fieldClass =
        "w-full px-3 py-2 bg-white border border-(--line) rounded-xs text-xs font-mono text-(--ink) focus:outline-none focus:border-(--ink)";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl bg-white border border-(--ink) rounded-xs shadow-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 bg-(--paper) border-b border-(--line)">
                    <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-(--accent)" strokeWidth={1.75} />
                        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-(--ink)">
                            LLM Provider & Model Settings (Admin)
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-(--ink) hover:text-(--accent)"
                        title="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-5 space-y-4">
                    {loading && (
                        <div className="text-xs font-mono text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                            Loading current configuration...
                        </div>
                    )}

                    {error && (
                        <div className="p-2.5 bg-red-50/70 border border-(--accent) rounded-xs flex items-start gap-2 text-xs font-mono text-(--ink)">
                            <AlertCircle className="h-4 w-4 text-(--accent) shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {statusMsg && (
                        <div className="p-2.5 bg-(--paper) border border-(--line) rounded-xs flex items-center gap-2 text-xs font-mono text-(--ink)">
                            <CheckCircle className="h-4 w-4 text-(--accent) shrink-0" />
                            <span>{statusMsg}</span>
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_65%,white)] block mb-1.5">
                            Provider Preset
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(PROVIDER_PRESETS).map(([key, info]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleProviderChange(key)}
                                    className={`px-2.5 py-2 text-left text-xs font-mono border rounded-xs transition-colors ${
                                        provider === key
                                            ? "bg-(--ink) text-white border-(--ink) font-semibold"
                                            : "bg-(--paper) text-(--ink) border-(--line) hover:border-(--ink)"
                                    }`}
                                >
                                    {info.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {provider !== "default" ? (
                        <>
                            <div>
                                <label className="text-[10px] font-mono uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_65%,white)] block mb-1">
                                    OpenAI-Compatible Base URL
                                </label>
                                <input
                                    type="text"
                                    value={baseUrl}
                                    onChange={(e) => setBaseUrl(e.target.value)}
                                    className={fieldClass}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-mono uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_65%,white)] block mb-1">
                                        Chat Model ({activePreset.chatModels.length} presets)
                                    </label>
                                    <select
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        className={fieldClass}
                                    >
                                        {activePreset.chatModels.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                        <option value="__custom__">Custom model ID...</option>
                                    </select>
                                    {model === "__custom__" && (
                                        <input
                                            type="text"
                                            value={customModel}
                                            onChange={(e) => setCustomModel(e.target.value)}
                                            placeholder="Enter exact model ID..."
                                            className={`${fieldClass} mt-2`}
                                            required
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-mono uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_65%,white)] block mb-1">
                                        Embedding Model (Default Set)
                                    </label>
                                    <select
                                        value={embeddingModel}
                                        onChange={(e) => setEmbeddingModel(e.target.value)}
                                        className={fieldClass}
                                    >
                                        {embeddingChoices.map((em) => (
                                            <option key={em} value={em}>
                                                {em}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-3 bg-(--paper) border border-(--line) rounded-xs text-xs font-mono space-y-1">
                            <div>
                                <span className="text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                                    Base URL:{" "}
                                </span>
                                <span className="text-(--ink)">{envDefaults.baseUrl || "-"}</span>
                            </div>
                            <div>
                                <span className="text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                                    Chat Model:{" "}
                                </span>
                                <span className="font-semibold text-(--ink)">
                                    {envDefaults.model || "-"}
                                </span>
                            </div>
                            <div>
                                <span className="text-[color-mix(in_srgb,var(--ink)_60%,white)]">
                                    Embedding Model:{" "}
                                </span>
                                <span className="text-(--ink)">
                                    {envDefaults.embeddingModel || "-"}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="pt-1 border-t border-(--line) text-xs font-mono text-(--ink)">
                        {envDefaults.apiKeyHint}. Credentials are loaded when the agent starts.
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-(--line)">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={RotateCcw}
                            onClick={handleReset}
                            disabled={saving || loading}
                        >
                            Reset to .env Default
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                                Close
                            </Button>
                            <Button type="submit" variant="primary" size="sm" disabled={saving || loading}>
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default LlmSettingsModal;

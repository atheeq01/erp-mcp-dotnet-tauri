import React, { useRef, useEffect, useState, useCallback } from "react";
import { Trash2, ArrowDown, Settings } from "lucide-react";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../hooks/useAuth";
import ChatMessage from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";
import ChatEmptyState from "../components/chat/ChatEmptyState";
import LlmSettingsModal from "../components/chat/LlmSettingsModal";
import Button from "../components/common/Button";

function Chat() {
    const {
        messages,
        isPending,
        sendMessage,
        cancelRequest,
        clearConversation,
        confirmAction,
        cancelAction,
        submitMissingParams,
        respondToAgentApproval,
    } = useChat();

    const { user } = useAuth();
    const isAdmin = user?.role === "Admin";

    const scrollContainerRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [activeModelLabel, setActiveModelLabel] = useState("");

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const threshold = 60;
        const atBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;

        setIsAtBottom(atBottom);
    }, []);

    useEffect(() => {
        if (isAtBottom && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages, isAtBottom]);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
            setIsAtBottom(true);
        }
    };

    function handleSend(text) {
        setIsAtBottom(true);
        sendMessage(text);
    }

    function handleRetry(rawQuery, messageId) {
        setIsAtBottom(true);
        sendMessage(rawQuery, messageId);
    }

    const showEmptyState = messages.length <= 1;

    return (
        <div className="flex flex-col h-[calc(100vh-var(--topbar-h)-3rem)] -m-6 bg-(--paper)">
            <div className="shrink-0 flex items-center justify-between px-6 py-2.5 bg-white border-b border-(--line)">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-(--accent)" />
                    <span className="font-mono text-xs font-semibold text-(--ink)">
                        Hybrid MCP Terminal
                    </span>
                    <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_50%,white)]">
                        - Regex Fast-Path + AI Ops Agent
                    </span>
                    {isAdmin && activeModelLabel && (
                        <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-(--paper) border border-(--line) rounded-xs text-(--ink)">
                            {activeModelLabel}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={Settings}
                            onClick={() => setSettingsOpen(true)}
                            title="Configure LLM provider, model, embedding model, and API key"
                        >
                            LLM Settings
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={clearConversation}
                        title="Clear chat history"
                    >
                        Clear History
                    </Button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 space-y-3 relative"
            >
                <div className="mx-auto max-w-4xl flex flex-col justify-end min-h-full">
                    {messages.map((msg) => (
                        <ChatMessage
                            key={msg.id}
                            message={msg}
                            onRetry={handleRetry}
                            onConfirmAction={confirmAction}
                            onCancelAction={cancelAction}
                            onSubmitMissingParams={submitMissingParams}
                            onSelectCandidate={handleSend}
                            onApproveAgent={(msgId, reqId) =>
                                respondToAgentApproval(msgId, true, reqId)
                            }
                            onRejectAgent={(msgId, reqId) =>
                                respondToAgentApproval(msgId, false, reqId)
                            }
                        />
                    ))}

                    {showEmptyState && (
                        <ChatEmptyState onSelectPrompt={handleSend} />
                    )}
                </div>

                {!isAtBottom && (
                    <button
                        type="button"
                        onClick={scrollToBottom}
                        className="fixed bottom-24 right-10 p-2 bg-white text-(--ink) border border-(--line) rounded-xs shadow-sm hover:border-(--ink) transition-all flex items-center gap-1.5 text-xs font-mono select-none"
                    >
                        <ArrowDown className="h-3.5 w-3.5 text-(--accent)" strokeWidth={1.5} />
                        <span>Latest</span>
                    </button>
                )}
            </div>

            <ChatInput
                onSend={handleSend}
                onCancel={cancelRequest}
                isPending={isPending}
            />

            {isAdmin && (
                <LlmSettingsModal
                    isOpen={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    onUpdated={(view) =>
                        setActiveModelLabel(
                            `${view.model} (.env key)`
                        )
                    }
                />
            )}
        </div>
    );
}

export default Chat;

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import {
    processIntent,
    executeConfirmedIntent,
    callMcpTool,
    sendApprovalResponse,
} from "../services/mcpService";

const ChatContext = createContext(null);

function formatTauriError(err) {
    if (!err) return "Unknown error occurred.";
    if (typeof err === "string") return err;
    if (err.kind && err.message) return `[${err.kind}] ${err.message}`;
    if (err.message) return String(err.message);
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
}

export function ChatProvider({ children }) {
    const [messages, setMessages] = useState([
        {
            id: "system-welcome",
            role: "assistant",
            timestamp: new Date().toISOString(),
            status: "done",
            intentResult: {
                type: "Executed",
                tool: "system",
                intent: "Operator Assistant Initialized",
                scores: { regex: 1.0, confidence: 1.0 },
                params: {},
                data: {
                    message: "SPIL Operational Assistant is ready. Enter queries for inventory, orders, low stock, or users."
                }
            }
        },
    ]);

    const [isPending, setIsPending] = useState(false);
    const activeRequestRef = useRef(null);
    const cancelledRequestIdsRef = useRef(new Set());
    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    useEffect(() => {
        let unlisten = null;
        listen("approval_request", (event) => {
            const payload = event.payload;
            const messageId = payload?.client_request_id;
            if (messageId && cancelledRequestIdsRef.current.has(messageId)) {
                sendApprovalResponse(false, payload.request_id).catch(() => {});
                return;
            }
            if (!messageId) return;
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId && msg.status === "pending"
                        ? { ...msg, pendingApproval: payload }
                        : msg
                )
            );
        })
            .then((fn) => {
                unlisten = fn;
            })
            .catch(() => {
                // Non-Tauri browser preview: no event listener needed
            });

        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    const respondToAgentApproval = useCallback(async (messageId, approved, requestId) => {
        try {
            const result = await sendApprovalResponse(approved, requestId);
            if (!result?.delivered) throw new Error("This approval request has expired.");
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId ? { ...msg, pendingApproval: null, errorText: null } : msg
                )
            );
        } catch (err) {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId ? { ...msg, errorText: formatTauriError(err) } : msg
                )
            );
        }
    }, []);

    const cancelRequest = useCallback(() => {
        const active = activeRequestRef.current;
        if (active) {
            cancelledRequestIdsRef.current.add(active.id);
            active.controller.abort();
            activeRequestRef.current = null;
        }
        const pendingApprovals = messagesRef.current
            .filter((msg) => msg.status === "pending" && msg.pendingApproval?.request_id)
            .map((msg) => msg.pendingApproval.request_id);
        pendingApprovals.forEach((requestId) => {
            sendApprovalResponse(false, requestId).catch(() => {});
        });
        setIsPending(false);
        setMessages((prev) =>
            prev.map((msg) =>
                msg.status === "pending"
                    ? {
                          ...msg,
                          status: "error",
                          pendingApproval: null,
                          errorText: "Stopped waiting for this response. Proposed writes were rejected.",
                      }
                    : msg
            )
        );
    }, []);

    const clearConversation = useCallback(() => {
        if (activeRequestRef.current) cancelRequest();
        setMessages([
            {
                id: `welcome-${Date.now()}`,
                role: "assistant",
                timestamp: new Date().toISOString(),
                status: "done",
                intentResult: {
                    type: "Executed",
                    tool: "system",
                    intent: "Conversation Reset",
                    scores: { regex: 1.0, confidence: 1.0 },
                    params: {},
                    data: {
                        message: "History cleared. Live ERP tools ready."
                    }
                }
            },
        ]);
    }, [cancelRequest]);

    const sendMessage = useCallback(
        async (content, retryMessageId = null) => {
            const trimmed = content.trim();
            if (!trimmed) return;

            if (activeRequestRef.current) return;
            const assistantMsgId = `asst-${crypto.randomUUID()}`;

            if (retryMessageId) {
                setMessages((prev) => prev.filter((m) => m.id !== retryMessageId));
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `usr-${crypto.randomUUID()}`,
                        role: "user",
                        content: trimmed,
                        timestamp: new Date().toISOString(),
                        status: "sent",
                    },
                ]);
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: assistantMsgId,
                    role: "assistant",
                    timestamp: new Date().toISOString(),
                    status: "pending",
                    rawQuery: trimmed,
                    intentResult: null,
                },
            ]);

            setIsPending(true);
            const controller = new AbortController();
            activeRequestRef.current = { id: assistantMsgId, controller };

            const historyPayload = messagesRef.current
                .filter((m) => m.id !== "system-welcome" && !String(m.id).startsWith("welcome-") && m.id !== retryMessageId)
                .map((m) => {
                    if (m.role === "user" && m.content) {
                        return { role: "user", content: m.content };
                    }
                    if (m.role === "assistant" && m.intentResult?.answer) {
                        return { role: "assistant", content: m.intentResult.answer };
                    }
                    return null;
                })
                .filter(Boolean)
                .slice(-8);

            try {
                const result = await processIntent(trimmed, historyPayload, assistantMsgId);

                if (controller.signal.aborted) {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === assistantMsgId
                                ? {
                                      ...msg,
                                      status: "error",
                                      pendingApproval: null,
                                      errorText: "Stopped waiting for this response. Proposed writes were rejected.",
                                  }
                                : msg
                        )
                    );
                    return;
                }

                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantMsgId
                            ? {
                                  ...msg,
                                  status: "done",
                                  pendingApproval: null,
                                  routeMode: result?.type === "AgentResponse" ? "ai" : "fastpath",
                                  intentResult: result,
                              }
                            : msg
                    )
                );
            } catch (err) {
                if (err.name === "AbortError" || controller.signal.aborted) {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === assistantMsgId
                                ? {
                                      ...msg,
                                      status: "error",
                                      errorText: "Stopped waiting for this response. Proposed writes were rejected.",
                                  }
                                : msg
                        )
                    );
                } else {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === assistantMsgId
                                ? {
                                      ...msg,
                                      status: "error",
                                      pendingApproval: null,
                                      errorText: formatTauriError(err),
                                  }
                                : msg
                        )
                    );
                }
            } finally {
                if (activeRequestRef.current?.id === assistantMsgId) {
                    setIsPending(false);
                    activeRequestRef.current = null;
                }
            }
        },
        []
    );

    const confirmAction = useCallback(async (messageId, tool, params) => {
        setIsPending(true);
        try {
            const data = await executeConfirmedIntent(tool, params);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId
                        ? {
                              ...msg,
                              intentResult: {
                                  type: "Executed",
                                  tool,
                                  intent: `Confirmed: ${tool}`,
                                  scores: { regex: 1.0, confidence: 1.0 },
                                  params,
                                  data,
                              },
                          }
                        : msg
                )
            );
        } catch (err) {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId
                        ? {
                              ...msg,
                              status: "error",
                              errorText: formatTauriError(err),
                          }
                        : msg
                )
            );
        } finally {
            setIsPending(false);
        }
    }, []);

    const cancelAction = useCallback((messageId) => {
        setMessages((prev) =>
            prev.map((msg) =>
                msg.id === messageId
                    ? {
                          ...msg,
                          intentResult: {
                              type: "Rejected",
                              reason: "Mutation cancelled by operator.",
                          },
                      }
                    : msg
            )
        );
    }, []);

    const submitMissingParams = useCallback(async (messageId, tool, mergedParams) => {
        setIsPending(true);
        try {
            const data = await callMcpTool(tool, mergedParams);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId
                        ? {
                              ...msg,
                              intentResult: {
                                  type: "Executed",
                                  tool,
                                  intent: `Completed: ${tool}`,
                                  scores: { regex: 1.0, confidence: 1.0 },
                                  params: mergedParams,
                                  data,
                              },
                          }
                        : msg
                )
            );
        } catch (err) {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId
                        ? {
                              ...msg,
                              status: "error",
                              errorText: formatTauriError(err),
                          }
                        : msg
                )
            );
        } finally {
            setIsPending(false);
        }
    }, []);

    return (
        <ChatContext.Provider
            value={{
                messages,
                isPending,
                sendMessage,
                cancelRequest,
                clearConversation,
                confirmAction,
                cancelAction,
                submitMissingParams,
                respondToAgentApproval,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
}

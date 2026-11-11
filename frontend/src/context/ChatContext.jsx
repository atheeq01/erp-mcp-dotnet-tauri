import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { processIntent, executeConfirmedIntent, callMcpTool } from "../services/mcpService";

const ChatContext = createContext(null);

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
                scores: { regex_score: 1.0, semantic_score: 1.0, confidence: 1.0 },
                params: {},
                data: {
                    message: "SPIL Operational Assistant is ready. Enter queries for inventory, orders, low stock, or users."
                }
            }
        },
    ]);

    const [isPending, setIsPending] = useState(false);
    const abortControllerRef = useRef(null);

    const cancelRequest = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsPending(false);
        setMessages((prev) =>
            prev.map((msg) =>
                msg.status === "pending"
                    ? {
                          ...msg,
                          status: "error",
                          errorText: "Execution aborted by operator.",
                      }
                    : msg
            )
        );
    }, []);

    const clearConversation = useCallback(() => {
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
                    scores: { regex_score: 1.0, semantic_score: 1.0, confidence: 1.0 },
                    params: {},
                    data: {
                        message: "History cleared. Live ERP tools ready."
                    }
                }
            },
        ]);
    }, []);

    const sendMessage = useCallback(
        async (content, retryMessageId = null) => {
            const trimmed = content.trim();
            if (!trimmed) return;

            const assistantMsgId = `asst-${Date.now()}`;

            if (retryMessageId) {
                setMessages((prev) => prev.filter((m) => m.id !== retryMessageId));
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `usr-${Date.now()}`,
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
            abortControllerRef.current = controller;

            try {
                const result = await processIntent(trimmed);

                if (controller.signal.aborted) {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === assistantMsgId
                                ? {
                                      ...msg,
                                      status: "error",
                                      errorText: "Query was cancelled by user.",
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
                                      errorText: "Query was cancelled by user.",
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
                                      errorText: err?.message || String(err),
                                  }
                                : msg
                        )
                    );
                }
            } finally {
                setIsPending(false);
                abortControllerRef.current = null;
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
                                  scores: { regex_score: 1.0, semantic_score: 1.0, confidence: 1.0 },
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
                              errorText: err?.message || String(err),
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
                                  scores: { regex_score: 1.0, semantic_score: 1.0, confidence: 1.0 },
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
                              errorText: err?.message || String(err),
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

import React, { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import Button from "../common/Button";

function ChatInput({ onSend, onCancel, isPending }) {
    const [text, setText] = useState("");
    const textareaRef = useRef(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, 180);
        textarea.style.height = `${Math.max(newHeight, 48)}px`;
    }, [text]);

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function handleSend() {
        if (!text.trim() || isPending) return;
        onSend(text.trim());
        setText("");

        if (textareaRef.current) {
            textareaRef.current.style.height = "48px";
        }
    }

    return (
        <div className="w-full border-t border-(--line) bg-(--paper) p-3">
            <div className="mx-auto max-w-4xl flex items-end gap-2 bg-white border border-(--line) rounded-xs p-2 focus-within:border-(--accent) transition-colors">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter command or question (e.g. 'get orders', 'make order', 'show low stock')..."
                    disabled={isPending}
                    className="flex-1 max-h-44 resize-none bg-transparent px-3 py-2 text-sm text-(--ink) placeholder:text-[color-mix(in_srgb,var(--ink)_40%,white)] focus:outline-none disabled:cursor-not-allowed leading-relaxed"
                />

                <div className="flex items-center gap-2 pb-1 pr-1">
                    {isPending ? (
                        <Button
                            variant="danger"
                            size="md"
                            icon={Square}
                            onClick={onCancel}
                            title="Cancel request"
                        >
                            Cancel
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            size="md"
                            icon={Send}
                            onClick={handleSend}
                            disabled={!text.trim()}
                            title="Send instruction"
                        >
                            Send
                        </Button>
                    )}
                </div>
            </div>
            <div className="mx-auto max-w-4xl flex items-center justify-between pt-1 px-1 text-[11px] text-[color-mix(in_srgb,var(--ink)_45%,white)] font-mono">
                <span>Shift + Enter for new line</span>
                <span>Hybrid Intent Engine (all-MiniLM-L6-v2)</span>
            </div>
        </div>
    );
}

export default ChatInput;

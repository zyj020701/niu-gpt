import React, { useMemo, useRef, useEffect, useState, useCallback, FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { C, FONT_SANS, R, SHADOW_1, SHADOW_2, SHADOW_3 } from "./theme";
import {
  classifyError,
  createSafeFetch,
  extractText,
  FRIENDLY_TEXT,
  FriendlyError,
} from "./errors";
import { Avatar, MarkdownMessage, TypingDots, ChatErrorBoundary } from "./parts";

const ChatInner: React.FC = () => {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", fetch: createSafeFetch() }),
    []
  );

  const [errorInfo, setErrorInfo] = useState<FriendlyError | null>(null);

  const { messages, sendMessage, stop, status } = useChat({
    transport,
    onError: (err) => {
      const info = classifyError(err);
      if (info.message) setErrorInfo(info);
    },
  });

  const [input, setInput] = useState("");
  const isBusy = status === "submitted" || status === "streaming";
  const lastUserTextRef = useRef<string>("");

  const doSend = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      lastUserTextRef.current = t;
      setErrorInfo(null);
      try {
        sendMessage({ text: t });
      } catch (err) {
        const info = classifyError(err);
        if (info.message) setErrorInfo(info);
      }
    },
    [sendMessage]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    const text = input.trim();
    if (!text) return;
    setInput("");
    doSend(text);
  };

  const onResend = () => {
    if (isBusy) return;
    let text = lastUserTextRef.current;
    if (!text) {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (lastUser)
        text = extractText(lastUser.parts as Array<{ type: string; text?: string }>);
    }
    if (!text) return;
    doSend(text);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOffline = () =>
      setErrorInfo({ kind: "network", message: FRIENDLY_TEXT.network, retryable: true });
    const onOnline = () =>
      setErrorInfo((prev) => (prev && prev.kind === "network" ? null : prev));
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, errorInfo]);

  const canResend =
    !!errorInfo &&
    errorInfo.retryable &&
    !isBusy &&
    (lastUserTextRef.current.length > 0 || messages.some((m) => m.role === "user"));

  const showTyping =
    isBusy && (messages.length === 0 || messages[messages.length - 1]?.role === "user");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 760,
        height: 640,
        margin: "0 auto",
        border: `1px solid ${C.border}`,
        borderRadius: R.lg,
        background: C.card,
        fontFamily: FONT_SANS,
        color: C.fg,
        overflow: "hidden",
        boxShadow: SHADOW_3,
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${C.border}`,
          background: C.headerBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: R.md,
              background: C.brand,
              color: C.brandFg,
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: SHADOW_1,
            }}
          >
            N
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>niuGPT · 助手</span>
            <span style={{ fontSize: 12, color: C.mutedFg }}>
              {isBusy ? "正在回复…" : "在线"}
            </span>
          </div>
        </div>
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          padding: 20,
          overflowY: "auto",
          background: C.bg,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {messages.length === 0 && !errorInfo && (
          <div
            style={{
              margin: "auto",
              textAlign: "center",
              color: C.mutedFg,
              fontSize: 13,
              lineHeight: "20px",
              padding: 24,
              maxWidth: 360,
            }}
          >
            <div style={{ fontSize: 15, color: C.fg, fontWeight: 600, marginBottom: 6 }}>
              开始一段新对话
            </div>
            <div>输入你的问题，例如：「用一句话解释量子纠缠」</div>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          const text = extractText(m.parts as Array<{ type: string; text?: string }>);
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                gap: 10,
                flexDirection: isUser ? "row-reverse" : "row",
                alignItems: "flex-start",
              }}
            >
              <Avatar role={isUser ? "user" : "assistant"} />
              <div
                style={{
                  maxWidth: "78%",
                  padding: "10px 14px",
                  borderRadius: R.lg,
                  fontSize: 14,
                  lineHeight: "22px",
                  wordBreak: "break-word",
                  boxShadow: isUser ? SHADOW_2 : SHADOW_1,
                  background: isUser ? C.brand : C.card,
                  color: isUser ? C.brandFg : C.fg,
                  border: isUser ? "1px solid transparent" : `1px solid ${C.border}`,
                  borderTopRightRadius: isUser ? R.sm : R.lg,
                  borderTopLeftRadius: isUser ? R.lg : R.sm,
                }}
              >
                {isUser ? (
                  <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
                ) : (
                  <MarkdownMessage text={text} />
                )}
              </div>
            </div>
          );
        })}

        {showTyping && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Avatar role="assistant" />
            <div
              style={{
                padding: "10px 14px",
                borderRadius: R.lg,
                borderTopLeftRadius: R.sm,
                border: `1px solid ${C.border}`,
                background: C.card,
                boxShadow: SHADOW_1,
              }}
            >
              <TypingDots />
            </div>
          </div>
        )}

        {errorInfo && errorInfo.message && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              role="alert"
              style={{
                flex: 1,
                padding: "10px 14px",
                background: C.destBg,
                color: C.destFg,
                border: `1px solid ${C.destBorder}`,
                borderRadius: R.lg,
                fontSize: 14,
                lineHeight: "20px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: SHADOW_1,
              }}
            >
              <span aria-hidden>⚠️</span>
              <span>{errorInfo.message}</span>
            </div>
            {canResend && (
              <button
                type="button"
                onClick={onResend}
                title="重新发送最后一条消息"
                style={{
                  padding: "8px 12px",
                  background: C.card,
                  color: C.destFg,
                  border: `1px solid ${C.destBorder}`,
                  borderRadius: R.md,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: FONT_SANS,
                  boxShadow: SHADOW_1,
                }}
              >
                🔄 重发
              </button>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          display: "flex",
          gap: 8,
          padding: 12,
          borderTop: `1px solid ${C.border}`,
          background: C.card,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="向 niuGPT 提问…"
          disabled={isBusy}
          style={{
            flex: 1,
            padding: "10px 14px",
            border: `1px solid ${C.border}`,
            borderRadius: R.md,
            fontSize: 14,
            lineHeight: "20px",
            outline: "none",
            background: isBusy ? C.muted : C.bg,
            color: C.fg,
            fontFamily: FONT_SANS,
            boxShadow: SHADOW_1,
          }}
        />
        {isBusy ? (
          <button
            type="button"
            onClick={() => stop()}
            style={{
              padding: "10px 16px",
              background: C.card,
              color: C.fg,
              border: `1px solid ${C.border}`,
              borderRadius: R.md,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: FONT_SANS,
              boxShadow: SHADOW_1,
            }}
          >
            停止
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            style={{
              padding: "10px 18px",
              background: input.trim() ? C.brand : C.muted,
              color: input.trim() ? C.brandFg : C.mutedFg,
              border: "1px solid transparent",
              borderRadius: R.md,
              fontSize: 14,
              fontWeight: 600,
              cursor: input.trim() ? "pointer" : "not-allowed",
              fontFamily: FONT_SANS,
              boxShadow: input.trim() ? SHADOW_2 : "none",
            }}
          >
            发送
          </button>
        )}
      </form>
    </div>
  );
};

export const Chat = () => (
  <ChatErrorBoundary>
    <ChatInner />
  </ChatErrorBoundary>
);

export default Chat;

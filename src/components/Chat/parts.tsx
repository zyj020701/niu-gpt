import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { C, FONT_SANS, FONT_MONO, R, SHADOW_1 } from "./theme";

/** 圆形头像（用户 = 品牌色，AI = 中性灰） */
export const Avatar: React.FC<{ role: "user" | "assistant" }> = ({ role }) => {
  const isUser = role === "user";
  return (
    <div
      aria-hidden
      style={{
        flex: "0 0 auto",
        width: 32,
        height: 32,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        fontSize: 13,
        fontWeight: 600,
        color: isUser ? C.brandFg : C.secondaryFg,
        background: isUser ? C.brand : C.secondary,
        border: `1px solid ${isUser ? "transparent" : C.border}`,
        boxShadow: isUser ? SHADOW_1 : "none",
        fontFamily: FONT_SANS,
      }}
    >
      {isUser ? "你" : "AI"}
    </div>
  );
};

/** Markdown 渲染（AI 消息） */
export const MarkdownMessage: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ fontFamily: FONT_SANS, fontSize: 14, lineHeight: "22px", color: C.fg }}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code(props) {
          const { className, children } = props as { className?: string; children?: React.ReactNode };
          const inline = (props as { inline?: boolean }).inline;
          if (inline) {
            return (
              <code
                style={{
                  background: C.muted,
                  color: C.fg,
                  padding: "1px 6px",
                  borderRadius: R.sm,
                  fontSize: 12.5,
                  fontFamily: FONT_MONO,
                }}
              >
                {children}
              </code>
            );
          }
          return (
            <pre
              style={{
                background: C.codeBg,
                color: C.codeFg,
                padding: 12,
                borderRadius: R.md,
                overflowX: "auto",
                fontSize: 12.5,
                lineHeight: "20px",
                fontFamily: FONT_MONO,
                margin: "8px 0",
              }}
            >
              <code className={className}>{children}</code>
            </pre>
          );
        },
        p(props) {
          return <p style={{ margin: "4px 0" }} {...props} />;
        },
        ul(props) {
          return <ul style={{ paddingLeft: 20, margin: "6px 0" }} {...props} />;
        },
        ol(props) {
          return <ol style={{ paddingLeft: 20, margin: "6px 0" }} {...props} />;
        },
        a(props) {
          return (
            <a
              style={{ color: C.brand, textDecoration: "underline", textUnderlineOffset: 2 }}
              {...props}
            />
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  </div>
);

/** 打字光标动画 */
export const TypingDots: React.FC = () => (
  <span
    aria-label="AI 正在输入"
    style={{ display: "inline-flex", gap: 3, alignItems: "center", height: 20 }}
  >
    <style>{`@keyframes niugpt-blink{0%,80%,100%{opacity:.2}40%{opacity:1}}`}</style>
    <span style={{ width: 6, height: 6, borderRadius: 999, background: C.mutedFg, animation: "niugpt-blink 1.2s 0s infinite ease-in-out" }} />
    <span style={{ width: 6, height: 6, borderRadius: 999, background: C.mutedFg, animation: "niugpt-blink 1.2s 0.15s infinite ease-in-out" }} />
    <span style={{ width: 6, height: 6, borderRadius: 999, background: C.mutedFg, animation: "niugpt-blink 1.2s 0.3s infinite ease-in-out" }} />
  </span>
);

/** 错误边界：兜底防白屏 */
export class ChatErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[Chat] render error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 16,
            color: C.destFg,
            background: C.destBg,
            border: `1px solid ${C.destBorder}`,
            borderRadius: R.lg,
            fontSize: 14,
            fontFamily: FONT_SANS,
          }}
        >
          页面出现异常，请刷新后重试。
        </div>
      );
    }
    return this.props.children;
  }
}
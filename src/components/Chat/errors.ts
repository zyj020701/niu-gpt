/** 错误分类 & 中文友好提示 */
export type ChatErrorKind = "network" | "auth" | "rate_limit" | "server" | "unknown";
export interface FriendlyError {
  kind: ChatErrorKind;
  message: string;
  retryable: boolean;
}

export const FRIENDLY_TEXT: Record<ChatErrorKind, string> = {
  network: "网络连接断开，请检查网络后重试",
  auth: "服务授权失败，请联系管理员",
  rate_limit: "请求过于频繁，请30秒后再试",
  server: "服务暂时异常，已自动记录，请稍后重试",
  unknown: "对话出现异常，请稍后重试",
};

export function classifyError(err: unknown): FriendlyError {
  if (err instanceof DOMException && err.name === "AbortError") {
    return { kind: "unknown", message: "", retryable: false };
  }
  const a = err as { status?: number; statusCode?: number; kind?: ChatErrorKind };
  if (a && typeof a.kind === "string" && a.kind in FRIENDLY_TEXT) {
    return { kind: a.kind, message: FRIENDLY_TEXT[a.kind], retryable: a.kind !== "auth" };
  }
  const s = a?.status ?? a?.statusCode ?? 0;
  if (s === 401 || s === 403) return { kind: "auth", message: FRIENDLY_TEXT.auth, retryable: false };
  if (s === 429) return { kind: "rate_limit", message: FRIENDLY_TEXT.rate_limit, retryable: true };
  if (s >= 500 && s <= 599) return { kind: "server", message: FRIENDLY_TEXT.server, retryable: true };

  const raw = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  if (
    err instanceof TypeError ||
    raw.includes("failed to fetch") ||
    raw.includes("networkerror") ||
    raw.includes("network error") ||
    raw.includes("load failed") ||
    raw.includes("err_internet_disconnected") ||
    (typeof navigator !== "undefined" && navigator.onLine === false)
  ) {
    return { kind: "network", message: FRIENDLY_TEXT.network, retryable: true };
  }
  const m = raw.match(/\b(401|403|429|5\d{2})\b/);
  if (m) {
    const c = Number(m[1]);
    if (c === 401 || c === 403) return { kind: "auth", message: FRIENDLY_TEXT.auth, retryable: false };
    if (c === 429) return { kind: "rate_limit", message: FRIENDLY_TEXT.rate_limit, retryable: true };
    if (c >= 500) return { kind: "server", message: FRIENDLY_TEXT.server, retryable: true };
  }
  return { kind: "unknown", message: FRIENDLY_TEXT.unknown, retryable: true };
}

/** 安全 fetch：主动检测离线、把非 2xx 变成带 status/kind 的 Error */
export function createSafeFetch(): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const e = new Error(FRIENDLY_TEXT.network) as Error & { kind: ChatErrorKind };
      e.kind = "network";
      throw e;
    }
    let res: Response;
    try {
      res = await fetch(input, init);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      const e = new Error(FRIENDLY_TEXT.network) as Error & { kind: ChatErrorKind };
      e.kind = "network";
      throw e;
    }
    if (!res.ok) {
      const kind: ChatErrorKind =
        res.status === 401 || res.status === 403
          ? "auth"
          : res.status === 429
          ? "rate_limit"
          : res.status >= 500
          ? "server"
          : "unknown";
      const e = new Error(FRIENDLY_TEXT[kind] || `HTTP ${res.status}`) as Error & {
        status: number;
        kind: ChatErrorKind;
      };
      e.status = res.status;
      e.kind = kind;
      throw e;
    }
    return res;
  }) as typeof fetch;
}

export function extractText(parts: Array<{ type: string; text?: string }>): string {
  return parts.filter((p) => p.type === "text").map((p) => p.text ?? "").join("");
}
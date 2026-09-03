/**
 * ============================================================================
 * Vercel Serverless Function: POST /api/chat
 * ----------------------------------------------------------------------------
 * 仓库里 `app/api/chat/route.ts` 是 Next.js App Router 的写法（导出 POST、
 * runtime、maxDuration）。但本项目部署到 Vercel 时不是一个 Next.js 应用，
 * 而是把 **Storybook 静态站点**（storybook-static）当作产物发布。
 *
 * Vercel 对「非框架项目」的约定是：根目录 `api/` 下的文件会自动变成
 * Serverless Function。
 *
 * 注意：这里的逻辑**自包含**，且 `ai` / `@ai-sdk/openai` 改成在 POST 内部
 * **动态 import()**，并整段 try/catch。原因：
 *   1) Vercel 构建函数时是独立打包，pnpm 默认的符号链接 node_modules(.pnpm)
 *      可能导致第三方依赖在函数运行时加载失败（FUNCTION_INVOCATION_FAILED）；
 *   2) 顶部静态 import 一旦抛错，整个函数（含 GET 诊断）都会 500 白屏；
 *      动态 import + try/catch 后，任何错误都能以 JSON 形式返回真实原因。
 * 同时仓库根目录的 .npmrc 设置了 node-linker=hoisted 作为双保险。
 *
 * 部署后需要在 Vercel Project Settings → Environment Variables 配置：
 *   OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL
 * ============================================================================
 */
export const maxDuration = 60;

import type { UIMessage } from "ai";

/**
 * POST /api/chat —— 流式聊天（UIMessage Stream Protocol）
 */
export async function POST(request: Request) {
  let messages: UIMessage[] = [];
  try {
    const body = (await request.json()) as { messages?: UIMessage[] };
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return json({ error: "请求体不是合法 JSON" }, 400);
  }
  if (messages.length === 0) {
    return json({ error: "messages 参数必填，且需为非空数组" }, 400);
  }

  const baseURL = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const modelName = process.env.OPENAI_MODEL;
  if (!baseURL || !apiKey || !modelName) {
    return json(
      {
        error:
          "缺少环境变量 OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL：请在 Vercel → Settings → Environment Variables 配置（勾选 Production），并对最新部署 Redeploy。",
        env: {
          OPENAI_BASE_URL: !!baseURL,
          OPENAI_API_KEY: !!apiKey,
          OPENAI_MODEL: !!modelName,
        },
      },
      500
    );
  }

  try {
    // 动态 import：避免第三方依赖在函数运行时加载失败导致整个函数 500 白屏
    const { streamText, convertToModelMessages } = await import("ai");
    const { createOpenAI } = await import("@ai-sdk/openai");

    const provider = createOpenAI({ baseURL, apiKey });
    const result = streamText({
      model: provider.chat(modelName),
      messages: await convertToModelMessages(messages),
      abortSignal: request.signal, // 透传用户「停止」信号
    });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.toLowerCase().includes("abort") ||
      (err instanceof Error && err.name === "AbortError")
    ) {
      return new Response(null, { status: 204 });
    }
    // 返回真实错误，方便定位（Key 无效 / 模型名错误 / 网络等）
    return json(
      { error: message, name: err instanceof Error ? err.name : undefined },
      500
    );
  }
}

/**
 * ============================================================================
 * GET /api/chat —— 线上诊断接口（不影响聊天功能）
 * ----------------------------------------------------------------------------
 * 部署后用浏览器直接打开：
 *   https://你的域名/api/chat            查看三个环境变量是否被函数读到
 *   https://你的域名/api/chat?test=1     再真实请求一次模型服务（max_tokens=1，
 *                                        几乎不耗额度），返回上游 HTTP 状态与响应
 *
 * 用来快速定位「服务暂时异常(5xx)」到底是：
 *   - 环境变量没配上 / 没 Redeploy（最常见）
 *   - baseURL 写错 / 模型名不存在
 *   - API Key 无效（上游返回 401/403）
 *   - 函数访问不到模型服务（网络/地址非 https）
 * ============================================================================
 */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const baseURL = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  const mask = (v?: string) =>
    !v ? "" : v.length <= 10 ? "****" : v.slice(0, 6) + "..." + v.slice(-4);

  const env = {
    OPENAI_BASE_URL: baseURL || null,
    OPENAI_MODEL: model || null,
    OPENAI_API_KEY_present: !!apiKey,
    OPENAI_API_KEY_preview: mask(apiKey),
  };

  const wantTest = new URL(request.url).searchParams.get("test") === "1";

  if (!wantTest) {
    const ready = Boolean(baseURL && apiKey && model);
    return json({
      ok: ready,
      env,
      hint: ready
        ? "环境变量已就位。加 ?test=1 可真实测试模型连通性与鉴权。"
        : "缺少环境变量：请在 Vercel → Settings → Environment Variables 配置 OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL（勾选 Production），然后对最新提交 Redeploy（不要复用旧构建缓存）。",
    });
  }

  if (!baseURL || !apiKey || !model) {
    return json({ ok: false, env, error: "env missing" }, 500);
  }

  try {
    const url = baseURL.replace(/\/+$/, "") + "/chat/completions";
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
        stream: false,
      }),
    });
    const text = await r.text();
    return json({
      ok: r.ok,
      upstream_status: r.status,
      upstream_url: url,
      model,
      body_preview: text.slice(0, 800),
      hint: r.ok
        ? "模型连通正常。若聊天仍报错，请把 /api/chat?test=1 的结果反馈。"
        : "上游返回非 2xx：401/403=Key 无效；404=baseURL 或模型名错误；429=限流。",
    });
  } catch (err) {
    return json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        hint: "函数无法请求模型服务：通常是 baseURL 写错、地址非 https、或网络不可达。",
      },
      502
    );
  }
}
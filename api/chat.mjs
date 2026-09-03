/**
 * Vercel Serverless Function: POST /api/chat —— 原生 ESM (.mjs)
 * ----------------------------------------------------------------------------
 * 关键点：`ai` v5 与 `@ai-sdk/openai` 是**纯 ESM 包**。
 * 若用 TypeScript（@vercel/node 编译成 CommonJS），对 `ai` 的 import 会被转成
 * require()，而 require() 无法加载纯 ESM 模块，运行时报：
 *   "require() of ES Module .../ai/dist/index.js ... not supported"。
 * 因此本文件改用 **.mjs（原生 ESM）**，并在 POST 内动态 import('ai')，
 * 由 Node 运行时以原生 ESM 方式加载，彻底绕开 CJS/ESM 互操作问题。
 *
 * 需要在 Vercel → Settings → Environment Variables 配置（勾选 Production）：
 *   OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL
 */

export const config = { maxDuration: 60 };

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/**
 * POST /api/chat —— 流式聊天（UIMessage Stream Protocol）
 */
export async function POST(request) {
  let messages = [];
  try {
    const body = await request.json();
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
    // 动态 import：原生 ESM 加载纯 ESM 包；且任何加载失败都能被 try/catch 捕获并透传
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
    return json(
      { error: message, name: err instanceof Error ? err.name : undefined },
      500
    );
  }
}

/**
 * GET /api/chat —— 线上诊断接口（不影响聊天）
 *   /api/chat          查看环境变量是否被函数读到
 *   /api/chat?test=1   真实请求一次模型（max_tokens=1），返回上游状态与响应
 */
export async function GET(request) {
  const baseURL = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  const mask = (v) =>
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
        : "缺少环境变量：请在 Vercel → Settings → Environment Variables 配置 OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL（勾选 Production），然后对最新提交 Redeploy。",
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

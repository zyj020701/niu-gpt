import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * ============================================================================
 * 生死线 1️⃣ ：把接口的最大执行时间设为 60 秒
 *
 * Vercel 免费版 Serverless Function 默认只有 10 秒，
 * 长回答会被平台强行切断（客户端表现为流突然结束、报 504）。
 * 通过 export const maxDuration，Next.js（App Router）会把该值
 * 透传给 Vercel Runtime，把上限拉到 60 秒。
 * ============================================================================
 */
export const maxDuration = 60;

/**
 * 建议使用 Node.js Runtime：
 *  - Edge Runtime 也能跑 streamText，但对 OpenAI 兼容第三方 baseURL、
 *    以及某些 fetch/timeout 行为兼容性更差；
 *  - Node runtime 更稳，60s 上限也一致。
 */
export const runtime = "nodejs";

/**
 * 从 .env 读取「模型地址 / API Key / 模型名称」。
 * ---------------------------------------------------------------
 * .env 需要配置：
 *   OPENAI_BASE_URL=https://api.openai.com/v1     # 或任何 OpenAI 兼容网关
 *   OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxx
 *   OPENAI_MODEL=gpt-4o-mini                       # 或 deepseek-chat、qwen-plus 等
 * ---------------------------------------------------------------
 * createOpenAI() 允许我们覆写 baseURL，从而适配所有「符合 OpenAI 接口协议」的
 * 大模型服务（OpenAI、DeepSeek、Moonshot、通义千问兼容模式、OneAPI 网关等）。
 */
function getModel() {
  const baseURL = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const modelName = process.env.OPENAI_MODEL;

  if (!baseURL) {
    throw new Error(
      "环境变量 OPENAI_BASE_URL 未配置，请在 .env 中设置模型地址（OpenAI 兼容接口）"
    );
  }
  if (!apiKey) {
    throw new Error("环境变量 OPENAI_API_KEY 未配置，请在 .env 中设置模型 API Key");
  }
  if (!modelName) {
    throw new Error("环境变量 OPENAI_MODEL 未配置，请在 .env 中设置模型名称");
  }

  const provider = createOpenAI({
    baseURL,
    apiKey,
  });

  // 显式走 /chat/completions，兼容阿里云百炼、DeepSeek、Moonshot、OneAPI 等
  // 只实现了传统 chat 协议、未实现 OpenAI Responses API 的服务。
  return provider.chat(modelName);
}

/**
 * POST /api/chat
 *
 * 请求体（Vercel AI SDK useChat 默认格式）：
 *   { messages: UIMessage[], id?: string, ... }
 *
 * 响应：UIMessage Stream Protocol（SSE 流式）
 */
export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages 参数必填，且需为非空数组" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    /**
     * ========================================================================
     * 生死线 3️⃣ ：必须用 streamText 生成流式回答
     *
     * generateText 是「一次性返回」的 API，等大模型输出完成后才把整段文本
     * 一次性回给客户端，没有打字机效果；
     *
     * streamText 会把上游模型的每一个 delta 边生成边下发，
     * 通过 result.toUIMessageStreamResponse() 转成前端 useChat 能直接消费的
     * UIMessage Stream Protocol（SSE）。
     * ========================================================================
     *
     * ========================================================================
     * 生死线 2️⃣ ：把前端"中断信号"透传给大模型
     *
     * 前端 useChat 调用 stop() 时，DefaultChatTransport 会 abort 掉这次 fetch，
     * Runtime 会把这个信号体现在 req.signal 上。
     * 我们把 req.signal 传给 streamText 的 abortSignal，
     * SDK 内部会把它继续透传给上游模型 HTTP 请求。
     *
     * 结果：用户按下"停止"按钮后，
     *   - 前端立刻停止渲染；
     *   - 后端立刻中断对模型服务的请求；
     *   - 不会继续被计费"烧钱"。
     * ========================================================================
     */
    const result = streamText({
      model: getModel(),
      messages: await convertToModelMessages(messages),
      abortSignal: req.signal, // ← 关键：透传中断信号
    });

    // 将 streamText 的结果转为 UIMessage Stream Protocol 的流式响应，
    // 与前端 useChat + DefaultChatTransport 完全对齐。
    return result.toUIMessageStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // 用户主动中断，不算错误
    if (
      message.includes("aborted") ||
      message.toLowerCase().includes("abort")
    ) {
      return new Response(null, { status: 204 });
    }
    console.error("[/api/chat] error:", err);

    /**
     * 尽力还原上游真实 HTTP 状态码：
     *   - 401 / 403 → 服务授权失败
     *   - 429       → 请求过于频繁
     *   - 5xx       → 服务器异常
     * 这样前端就能根据 status 精确地给出对应的中文友好提示。
     */
    const anyErr = err as {
      statusCode?: number;
      status?: number;
      responseHeaders?: Record<string, string>;
      data?: { error?: { message?: string } };
      cause?: { statusCode?: number; status?: number };
    };
    let status: number =
      anyErr.statusCode ??
      anyErr.status ??
      anyErr.cause?.statusCode ??
      anyErr.cause?.status ??
      0;

    if (!status) {
      // 从错误信息里粗略提取 3 位状态码
      const m = message.match(/\b(401|403|404|408|409|422|429|5\d{2})\b/);
      if (m) status = Number(m[1]);
    }
    if (!status) status = 500;

    return new Response(JSON.stringify({ error: message || "internal server error" }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
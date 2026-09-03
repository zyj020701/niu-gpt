import type { StorybookConfig } from "@storybook/react-vite";
import type { Plugin, Connect } from "vite";
import type { ServerResponse } from "http";
import { config as loadEnv } from "dotenv";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// 加载 .env 到 process.env（Storybook/Vite 的 Node 侧默认不会自动读取 .env）
loadEnv();

/**
 * ============================================================================
 * 一个 Vite 插件：在 Storybook 的 dev server 里挂载 POST /api/chat 接口。
 *
 * 为什么需要它？
 * ----------------------------------------------------------------------------
 * 本项目通过 Storybook (Vite) 运行前端，并没有 Next.js runtime，
 * 所以 `app/api/chat/route.ts` 那份 Next.js 路由文件在开发时不会被执行。
 * 我们在 Vite 的 dev middleware 里"复刻"同一份逻辑：
 *   1) 用 createOpenAI({ baseURL, apiKey }) 构造 OpenAI 兼容 provider；
 *   2) 用 streamText() 生成流；
 *   3) 通过 toUIMessageStreamResponse() 输出 UIMessage Stream Protocol（SSE），
 *      供前端 useChat + DefaultChatTransport 直接消费；
 *   4) 把 req 的中断信号透传给 streamText 的 abortSignal，
 *      前端点"停止"时，服务端会立即断开对上游模型的请求。
 * ============================================================================
 */
function apiChatPlugin(): Plugin {
  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    if (!req.url?.startsWith("/api/chat")) {
      return next();
    }
    console.log("[api-chat] hit:", req.method, req.url);
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method Not Allowed");
      return;
    }

    // 1) 读取 body
    let raw = "";
    try {
      raw = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
      });
    } catch (err) {
      sendJson(res, 400, { error: "read body failed: " + String(err) });
      return;
    }

    let messages: UIMessage[] = [];
    try {
      const body = raw ? JSON.parse(raw) : {};
      messages = Array.isArray(body.messages) ? body.messages : [];
    } catch {
      sendJson(res, 400, { error: "invalid JSON body" });
      return;
    }
    if (messages.length === 0) {
      sendJson(res, 400, { error: "messages 参数必填，且需为非空数组" });
      return;
    }

    // 2) 读取环境变量
    const baseURL = process.env.OPENAI_BASE_URL;
    const apiKey = process.env.OPENAI_API_KEY;
    const modelName = process.env.OPENAI_MODEL;
    if (!baseURL || !apiKey || !modelName) {
      sendJson(res, 500, {
        error:
          "缺少环境变量：请在 .env 中配置 OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL",
      });
      return;
    }

    // 3) 中断控制：一次 fetch 只对应一个 AbortController
    //    - 前端 useChat.stop() 会 abort 浏览器端的 fetch → TCP 连接断开
    //    - Node 会在 req/res 上触发 close 事件 → 我们 abort AbortController
    //    - streamText 收到 abortSignal 会立刻终止对上游模型的 HTTP 请求
    //    - 我们同时主动 cancel Web ReadableStream reader
    //      让"下一个字都不再蹦"这个诉求真正做到
    const ac = new AbortController();
    let aborted = false;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    const doAbort = (from: string) => {
      if (aborted) return;
      aborted = true;
      console.log("[/api/chat] abort by:", from);
      try {
        ac.abort();
      } catch {
        /* noop */
      }
      // 主动取消对上游的读取，让 streamText 立即结束
      try {
        void reader?.cancel().catch(() => undefined);
      } catch {
        /* noop */
      }
    };

    // 客户端断开连接（例如 useChat.stop() 触发 fetch abort）→ 立即中止
    req.on("aborted", () => doAbort("req.aborted"));
    req.on("close", () => {
      // 只有在还没写完时才算"客户端主动断开"
      if (!res.writableEnded) doAbort("req.close");
    });
    res.on("close", () => {
      if (!res.writableEnded) doAbort("res.close");
    });

    try {
      // 4) 调用 streamText（生死线 ③：必须用 streamText）
      const provider = createOpenAI({ baseURL, apiKey });
      // 关键：显式使用 .chat() 走 /chat/completions
      //   —— v5 里 provider(modelId) 默认走 OpenAI Responses API (/responses)，
      //      但大量"OpenAI 兼容"服务（阿里云百炼、DeepSeek、Moonshot、多数 OneAPI
      //      网关）只实现了传统的 /chat/completions，会直接返回 401/404。
      //      用 .chat(modelName) 强制走 chat 协议即可全平台通吃。
      const result = streamText({
        model: provider.chat(modelName),
        messages: await convertToModelMessages(messages),
        abortSignal: ac.signal, // 生死线 ②：透传中断信号
      });

      // 5) 转成 UIMessage Stream Protocol 的 Web Response
      const webResponse = result.toUIMessageStreamResponse();
      res.statusCode = webResponse.status;
      webResponse.headers.forEach((v, k) => res.setHeader(k, v));
      // 让每个 chunk 立即被浏览器收到（关闭反向代理缓冲、禁用 gzip 缓冲）
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      (res as unknown as { flushHeaders?: () => void }).flushHeaders?.();

      if (!webResponse.body) {
        res.end();
        return;
      }

      // 6) 用"手动读取循环"代替 pipe()，每写一个 chunk 都主动检查 abort，
      //    确保用户点停止后一个字节都不再写出。
      reader = (
        webResponse.body as unknown as ReadableStream<Uint8Array>
      ).getReader();

      while (true) {
        if (aborted) break;
        let chunk: ReadableStreamReadResult<Uint8Array>;
        try {
          chunk = await reader.read();
        } catch (e) {
          // reader 被 cancel 时会抛错，这是预期
          console.log(
            "[/api/chat] reader.read() threw (likely aborted):",
            e instanceof Error ? e.message : String(e)
          );
          break;
        }
        if (chunk.done) break;
        if (aborted) break;
        if (!chunk.value) continue;
        const ok = res.write(chunk.value);
        if (!ok) {
          // 背压：等待 drain 或中断
          await new Promise<void>((resolve) => {
            const onDrain = () => {
              res.off("close", onClose);
              resolve();
            };
            const onClose = () => {
              res.off("drain", onDrain);
              resolve();
            };
            res.once("drain", onDrain);
            res.once("close", onClose);
          });
        }
      }

      if (!res.writableEnded) res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isAbort =
        aborted ||
        message.toLowerCase().includes("abort") ||
        (err instanceof Error && err.name === "AbortError");

      if (isAbort) {
        console.log("[/api/chat] finished with abort");
        if (!res.writableEnded) res.end();
        return;
      }
      console.error("[/api/chat] error:", err);
      if (!res.writableEnded) {
        sendJson(res, 500, { error: message });
      }
    }
  };

  return {
    name: "api-chat-dev-middleware",
    enforce: "pre",
    configureServer(server) {
      // 直接 use()：装在 Vite 内部中间件之前，SPA fallback 不会吞掉 /api/chat
      // 返回一个 post 钩子里再 use() 一次：装在 Storybook 后加的中间件之前
      server.middlewares.use(handler);
      return () => {
        server.middlewares.use(handler);
      };
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
      return () => {
        server.middlewares.use(handler);
      };
    },
  };
}

function sendJson(res: ServerResponse, status: number, obj: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (viteConfig) => {
    viteConfig.plugins = viteConfig.plugins ?? [];
    viteConfig.plugins.push(apiChatPlugin());
    return viteConfig;
  },
};

export default config;
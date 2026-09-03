/**
 * ============================================================================
 * Vercel Serverless Function: POST /api/chat
 * ----------------------------------------------------------------------------
 * 仓库里 `app/api/chat/route.ts` 是 Next.js App Router 的写法（导出 POST、
 * runtime、maxDuration）。但本项目部署到 Vercel 时不是一个 Next.js 应用，
 * 而是把 **Storybook 静态站点**（storybook-static）当作产物发布。
 *
 * Vercel 对「非框架项目」的约定是：根目录 `api/` 下的文件会自动变成
 * Serverless Function。为了不重复实现一遍流式逻辑，这里直接从 Next.js
 * 路由文件里复用同一份 POST 处理函数（逻辑完全一致：streamText +
 * UIMessage Stream Protocol + abortSignal 透传）。
 *
 * 部署后需要在 Vercel Project Settings → Environment Variables 配置：
 *   OPENAI_BASE_URL / OPENAI_API_KEY / OPENAI_MODEL
 * ============================================================================
 */
export { POST, runtime, maxDuration } from "../app/api/chat/route";
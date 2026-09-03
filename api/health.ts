/**
 * GET /api/health —— 极简健康检查（零第三方依赖）。
 * 用来确认 Vercel Serverless 函数运行时本身是否正常。
 * 部署后访问：https://你的域名/api/health
 */
export const maxDuration = 15;

export async function GET() {
  return new Response(
    JSON.stringify(
      {
        ok: true,
        time: new Date().toISOString(),
        region: process.env.VERCEL_REGION || null,
        env: {
          OPENAI_BASE_URL: !!process.env.OPENAI_BASE_URL,
          OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
          OPENAI_MODEL: !!process.env.OPENAI_MODEL,
        },
      },
      null,
      2
    ),
    { headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}
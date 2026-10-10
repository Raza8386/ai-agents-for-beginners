import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { evaluate } from "@/lib/evaluate";
import { createClaudeJudge, DEFAULT_JUDGE_MODEL } from "@/lib/judge";
import { createRateLimiter } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { EvaluateRequestSchema } from "@/lib/types";

export const runtime = "nodejs";

const allow = createRateLimiter(10, 60_000);

const judgeModel = process.env.JUDGE_MODEL || DEFAULT_JUDGE_MODEL;
const judge = process.env.ANTHROPIC_API_KEY ? createClaudeJudge(new Anthropic(), judgeModel) : null;

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!allow(ip ?? "unknown")) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = EvaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { prompt, response, mode, turnstileToken } = parsed.data;

  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json({ error: "Bot check failed. Please retry the challenge." }, { status: 403 });
  }

  try {
    const report = await evaluate({ prompt, response, mode, judge, judgeModel });
    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "The judge model is busy. Please retry shortly." }, { status: 503 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Judge API error", err.status, err.message);
      return NextResponse.json({ error: "The judge model is unavailable." }, { status: 502 });
    }
    throw err;
  }
}

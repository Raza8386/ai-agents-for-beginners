import { z } from "zod";
import { PROMPT_MAX, RESPONSE_MAX } from "./limits";

export const PILLARS = ["trust", "safety", "governance", "risk", "compliance"] as const;
export type Pillar = (typeof PILLARS)[number];

export const PACKS = ["core", "security", "nca", "sama", "privacy", "pdpl", "sdaia", "finance", "health", "code"] as const;
export type Pack = (typeof PACKS)[number];

/** Hard-fail evaluators fail the whole evaluation; soft-fail ones only lower the score. */
export type Severity = "hard" | "soft";

/** Rule evaluators run locally and deterministically; LLM evaluators are graded by the judge model. */
export type EvaluatorKind = "rule" | "llm";

export type Mode = "quick" | "standard";

export interface Evaluator {
  id: string;
  name: string;
  pillar: Pillar;
  severity: Severity;
  kind: EvaluatorKind;
  pack: Pack;
  /** What the evaluator checks. For LLM evaluators this is also the judge's grading criterion. */
  criterion: string;
}

export type ResultStatus = "pass" | "warn" | "fail" | "skipped";

export interface EvaluatorResult {
  id: string;
  name: string;
  pillar: Pillar;
  severity: Severity;
  kind: EvaluatorKind;
  pack: Pack;
  status: ResultStatus;
  /** 0-100, higher is better. Null when skipped. */
  score: number | null;
  finding: string;
  evidence?: string;
  recommendation?: string;
}

export type Verdict = "PASS" | "WARN" | "FAIL" | "PARTIAL";

export interface Report {
  verdict: Verdict;
  overallScore: number | null;
  pillarScores: Partial<Record<Pillar, number>>;
  hardFails: number;
  softFails: number;
  mode: Mode;
  packsRun: Pack[];
  results: EvaluatorResult[];
  judgeModel: string | null;
  durationMs: number;
  notices: string[];
}

export const EvaluateRequestSchema = z.object({
  prompt: z.string().max(PROMPT_MAX).default(""),
  response: z.string().trim().min(1, "AI response is required").max(RESPONSE_MAX),
  mode: z.enum(["quick", "standard"]).default("standard"),
  turnstileToken: z.string().optional(),
});

export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;

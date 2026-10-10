import type { EvaluatorResult, Pillar, Verdict } from "./types";

export interface Aggregate {
  verdict: Verdict;
  overallScore: number | null;
  pillarScores: Partial<Record<Pillar, number>>;
  hardFails: number;
  softFails: number;
}

/** Overall score below this fails even without a hard-fail evaluator. */
const FAIL_BELOW = 50;
/** Overall score below this is a warning. */
const WARN_BELOW = 80;

export function aggregate(results: EvaluatorResult[]): Aggregate {
  const scored = results.filter((r) => r.status !== "skipped" && r.score !== null);

  const byPillar = new Map<Pillar, number[]>();
  for (const r of scored) {
    byPillar.set(r.pillar, [...(byPillar.get(r.pillar) ?? []), r.score as number]);
  }
  const pillarScores: Partial<Record<Pillar, number>> = {};
  for (const [pillar, scores] of byPillar) {
    pillarScores[pillar] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  const pillarValues = Object.values(pillarScores);
  const overallScore =
    pillarValues.length === 0
      ? null
      : Math.round(pillarValues.reduce((a, b) => a + b, 0) / pillarValues.length);

  const hardFails = results.filter((r) => r.severity === "hard" && r.status === "fail").length;
  const softFails = results.filter((r) => r.severity === "soft" && r.status === "fail").length;
  const anySkipped = results.some((r) => r.status === "skipped");
  const anyWarn = results.some((r) => r.status === "warn");

  let verdict: Verdict;
  if (hardFails > 0 || (overallScore !== null && overallScore < FAIL_BELOW)) {
    verdict = "FAIL";
  } else if (anySkipped || overallScore === null) {
    // Can't vouch for a response when part of the evaluation didn't run.
    verdict = "PARTIAL";
  } else if (softFails > 0 || anyWarn || overallScore < WARN_BELOW) {
    verdict = "WARN";
  } else {
    verdict = "PASS";
  }

  return { verdict, overallScore, pillarScores, hardFails, softFails };
}

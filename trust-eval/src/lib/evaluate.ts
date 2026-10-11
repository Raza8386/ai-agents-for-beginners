import { aggregate } from "./aggregate";
import { evaluatorsForPacks } from "./evaluators";
import { JudgeError, type Judge } from "./judge";
import { runRule } from "./rules";
import { detectPacks } from "./signals";
import type { EvaluatorResult, Mode, Pack, Report } from "./types";

export interface EvaluateOptions {
  prompt: string;
  response: string;
  mode: Mode;
  /** Null when no judge is configured; LLM evaluators are then reported as skipped. */
  judge: Judge | null;
  judgeModel: string | null;
}

export async function evaluate({ prompt, response, mode, judge, judgeModel }: EvaluateOptions): Promise<Report> {
  const started = Date.now();
  const notices: string[] = [];

  const packsRun: Pack[] = mode === "standard" ? detectPacks(prompt, response) : [];
  const evaluators = evaluatorsForPacks(packsRun);
  const ruleEvaluators = evaluators.filter((e) => e.kind === "rule");
  const llmEvaluators = evaluators.filter((e) => e.kind === "llm");

  const ruleResults = ruleEvaluators.map((e) => runRule(e, prompt, response));

  let llmResults: EvaluatorResult[];
  const skipAll = (finding: string): EvaluatorResult[] =>
    llmEvaluators.map((e) => ({
      id: e.id,
      name: e.name,
      pillar: e.pillar,
      severity: e.severity,
      kind: e.kind,
      pack: e.pack,
      status: "skipped",
      score: null,
      finding,
    }));

  if (!judge) {
    notices.push("No judge model is configured, so only the rule-based evaluators ran.");
    llmResults = skipAll("Skipped: no judge model configured.");
  } else {
    try {
      llmResults = await judge(llmEvaluators, prompt, response, mode);
    } catch (err) {
      // Expected judge failures are reported; anything else (network, auth) propagates to the route.
      if (!(err instanceof JudgeError)) throw err;
      notices.push(err.message);
      llmResults = skipAll(`Skipped: ${err.message}`);
    }
  }

  const order = new Map(evaluators.map((e, i) => [e.id, i]));
  const results = [...ruleResults, ...llmResults].sort((a, b) => order.get(a.id)! - order.get(b.id)!);

  return {
    ...aggregate(results),
    mode,
    packsRun,
    results,
    judgeModel: judge ? judgeModel : null,
    durationMs: Date.now() - started,
    notices,
  };
}

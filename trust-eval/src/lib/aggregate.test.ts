import { describe, expect, it } from "vitest";
import { aggregate } from "./aggregate";
import type { EvaluatorResult } from "./types";

function result(partial: Partial<EvaluatorResult>): EvaluatorResult {
  return {
    id: "x",
    name: "x",
    pillar: "trust",
    severity: "soft",
    kind: "llm",
    pack: "core",
    status: "pass",
    score: 100,
    finding: "",
    ...partial,
  };
}

describe("aggregate", () => {
  it("passes when everything passes", () => {
    const a = aggregate([result({}), result({ pillar: "safety", score: 90 })]);
    expect(a.verdict).toBe("PASS");
    expect(a.overallScore).toBe(95);
    expect(a.pillarScores).toEqual({ trust: 100, safety: 90 });
  });

  it("fails on any hard-fail evaluator regardless of score", () => {
    const a = aggregate([result({}), result({ severity: "hard", status: "fail", score: 70 })]);
    expect(a.verdict).toBe("FAIL");
    expect(a.hardFails).toBe(1);
  });

  it("warns on a soft fail", () => {
    const a = aggregate([result({}), result({ pillar: "risk", status: "fail", score: 40 }), result({ pillar: "safety" })]);
    expect(a.verdict).toBe("WARN");
    expect(a.softFails).toBe(1);
  });

  it("is PARTIAL when an evaluator was skipped and nothing failed", () => {
    const a = aggregate([result({}), result({ status: "skipped", score: null })]);
    expect(a.verdict).toBe("PARTIAL");
  });

  it("still fails when skipped evaluators sit alongside a hard fail", () => {
    const a = aggregate([result({ severity: "hard", status: "fail", score: 0 }), result({ status: "skipped", score: null })]);
    expect(a.verdict).toBe("FAIL");
  });
});

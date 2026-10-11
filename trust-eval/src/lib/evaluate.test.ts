import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import { JudgeError, parseJudgeText, toResults, type Judge } from "./judge";
import { EVALUATORS } from "./evaluators";

const passingJudge: Judge = async (evaluators) =>
  evaluators.map((e) => ({ id: e.id, name: e.name, pillar: e.pillar, severity: e.severity, kind: e.kind, pack: e.pack, status: "pass", score: 95, finding: "ok" }));

describe("evaluate", () => {
  it("runs core and triggered packs in standard mode", async () => {
    const report = await evaluate({ prompt: "firewall policy", response: "Default deny inbound.", mode: "standard", judge: passingJudge, judgeModel: "m" });
    expect(report.packsRun).toEqual(["security"]);
    expect(report.results.some((r) => r.id === "security.insecure_advice")).toBe(true);
    expect(report.verdict).toBe("PASS");
  });

  it("runs core only in quick mode", async () => {
    const report = await evaluate({ prompt: "firewall policy", response: "Default deny inbound.", mode: "quick", judge: passingJudge, judgeModel: "m" });
    expect(report.packsRun).toEqual([]);
    expect(report.results.every((r) => r.pack === "core")).toBe(true);
  });

  it("reports PARTIAL with a notice when no judge is configured", async () => {
    const report = await evaluate({ prompt: "", response: "Hello there.", mode: "standard", judge: null, judgeModel: null });
    expect(report.verdict).toBe("PARTIAL");
    expect(report.notices[0]).toMatch(/no judge/i);
    expect(report.results.filter((r) => r.kind === "llm").every((r) => r.status === "skipped")).toBe(true);
  });

  it("turns a judge refusal into skipped results instead of an error", async () => {
    const refusing: Judge = async () => {
      throw new JudgeError("The judge model declined to evaluate this content.");
    };
    const report = await evaluate({ prompt: "", response: "Hello.", mode: "quick", judge: refusing, judgeModel: "m" });
    expect(report.verdict).toBe("PARTIAL");
    expect(report.notices).toContain("The judge model declined to evaluate this content.");
  });

  it("still fails on a rule hard-fail when the judge is unavailable", async () => {
    const report = await evaluate({ prompt: "", response: "key: AKIAABCDEFGHIJKLMNOP", mode: "quick", judge: null, judgeModel: null });
    expect(report.verdict).toBe("FAIL");
  });
});

describe("judge output handling", () => {
  const evaluators = EVALUATORS.filter((e) => e.kind === "llm" && e.pack === "core");

  it("clamps scores, drops unknown ids and skips missing ones", () => {
    const output = parseJudgeText(
      JSON.stringify({
        results: [
          { id: "core.relevance", status: "pass", score: 140, finding: "fine", evidence: "", recommendation: "" },
          { id: "made.up", status: "fail", score: 0, finding: "x", evidence: "", recommendation: "" },
        ],
      }),
    );
    const results = toResults(evaluators, output);
    expect(results).toHaveLength(evaluators.length);
    expect(results.find((r) => r.id === "core.relevance")!.score).toBe(100);
    expect(results.find((r) => r.id === "core.relevance")!.evidence).toBeUndefined();
    expect(results.filter((r) => r.status === "skipped")).toHaveLength(evaluators.length - 1);
  });

  it("rejects malformed judge output", () => {
    expect(() => parseJudgeText("not json")).toThrow(JudgeError);
    expect(() => parseJudgeText(JSON.stringify({ results: [{ id: 1 }] }))).toThrow(JudgeError);
  });
});

describe("NCA pack", () => {
  it("runs the NCA evaluators for a Saudi security question in standard mode", async () => {
    const report = await evaluate({
      prompt: "We are a Saudi government entity. How should we host our platform in the cloud?",
      response: "Use MFA for admins and keep security logs for 12 months.",
      mode: "standard",
      judge: passingJudge,
      judgeModel: "m",
    });
    expect(report.packsRun).toEqual(["security", "nca"]);
    expect(report.results.filter((r) => r.pack === "nca").map((r) => r.id)).toEqual([
      "nca.governance",
      "nca.identity_access",
      "nca.network_monitoring",
      "nca.data_hosting",
      "nca.incident_continuity",
      "nca.citation_accuracy",
    ]);
  });
});

describe("SAMA and PDPL packs", () => {
  it("runs the SAMA evaluators for a Saudi bank security question", async () => {
    const report = await evaluate({ prompt: "Cloud hosting for a Saudi bank's core systems", response: "Encrypt data and use MFA.", mode: "standard", judge: passingJudge, judgeModel: "m" });
    expect(report.packsRun).toContain("sama");
    expect(report.results.filter((r) => r.pack === "sama")).toHaveLength(5);
  });

  it("runs the PDPL evaluators for a PDPL question", async () => {
    const report = await evaluate({ prompt: "Can we send customer data abroad under the PDPL?", response: "Only with safeguards.", mode: "standard", judge: passingJudge, judgeModel: "m" });
    expect(report.packsRun).toEqual(["privacy", "pdpl"]);
    expect(report.results.filter((r) => r.pack === "pdpl")).toHaveLength(6);
  });
});

describe("SDAIA pack", () => {
  it("runs the seven SDAIA evaluators for Saudi AI deployment advice", async () => {
    const report = await evaluate({ prompt: "Should our Saudi bank use AI for credit decisions?", response: "Yes, with human review.", mode: "standard", judge: passingJudge, judgeModel: "m" });
    expect(report.packsRun).toContain("sdaia");
    expect(report.results.filter((r) => r.pack === "sdaia")).toHaveLength(7);
  });
});

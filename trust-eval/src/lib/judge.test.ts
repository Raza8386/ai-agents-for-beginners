import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { EVALUATORS } from "./evaluators";
import { createClaudeJudge, JudgeError } from "./judge";

const evaluators = EVALUATORS.filter((e) => e.id === "core.relevance" || e.id === "core.harmful_content");

function stubClient(message: object) {
  const create = vi.fn().mockResolvedValue(message);
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, create };
}

describe("createClaudeJudge", () => {
  it("sends the structured-output request and maps the reply", async () => {
    const reply = {
      results: [
        { id: "core.relevance", status: "pass", score: 92, finding: "On topic.", evidence: "", recommendation: "" },
        { id: "core.harmful_content", status: "fail", score: 10, finding: "Gives harmful steps.", evidence: "step 1", recommendation: "Remove it." },
      ],
    };
    const { client, create } = stubClient({
      stop_reason: "end_turn",
      content: [{ type: "thinking", thinking: "" }, { type: "text", text: JSON.stringify(reply) }],
    });

    const results = await createClaudeJudge(client, "claude-opus-5-5")(evaluators, "p", "r", "quick");

    const params = create.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.output_config.effort).toBe("low");
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.fallbacks).toBe("default");
    expect(params.messages[0].content).toContain("<ai_response>\nr\n</ai_response>");
    expect(results.map((r) => r.status)).toEqual(["pass", "fail"]);
    expect(results[1].evidence).toBe("step 1");
  });

  it("raises a JudgeError on refusal", async () => {
    const { client } = stubClient({ stop_reason: "refusal", content: [] });
    await expect(createClaudeJudge(client, "m")(evaluators, "", "r", "standard")).rejects.toBeInstanceOf(JudgeError);
  });

  it("does not call the API when there is nothing to judge", async () => {
    const { client, create } = stubClient({});
    expect(await createClaudeJudge(client, "m")([], "", "r", "standard")).toEqual([]);
    expect(create).not.toHaveBeenCalled();
  });
});

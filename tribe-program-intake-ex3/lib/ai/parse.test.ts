import { describe, it, expect } from "vitest";

import { parseAiResponse } from "./parse";

/**
 * Contract for the AI response parser.
 *
 * The LLM is asked to return a JSON object with a 2-3 sentence `summary`,
 * exactly 3 `tags`, and a `risks` bullet list. Parsing is the one AI failure
 * mode that's hard to catch by clicking through the UI, so we pin it down here.
 *
 * Expected shape of the parser's return value:
 *   {
 *     status: "ok" | "needs_review",
 *     summary: string,
 *     tags: string[],
 *     risks: string[],
 *     raw: string,        // always the original input, so nothing is lost
 *   }
 *
 * Rule: the parser must NEVER throw. Anything it can't turn into the expected
 * structure becomes status "needs_review" with the raw output retained, which
 * is what routes the intake to the manual-review path in the UI.
 */
describe("parseAiResponse", () => {
  const wellFormed = JSON.stringify({
    summary: "A fintech startup needs a payments dashboard. Scope is moderate. Timeline is tight.",
    tags: ["fintech", "payments", "dashboard"],
    risks: ["Tight timeline", "Unclear budget", "Compliance requirements"],
  });

  it("parses well-formed AI output into the expected structure", () => {
    const result = parseAiResponse(wellFormed);

    expect(result.status).toBe("ok");
    expect(result.summary).toMatch(/payments dashboard/i);
    expect(result.tags).toEqual(["fintech", "payments", "dashboard"]);
    expect(result.tags).toHaveLength(3);
    expect(result.risks.length).toBeGreaterThan(0);
  });

  it("tolerates a JSON object wrapped in markdown code fences", () => {
    // LLMs commonly wrap JSON in ```json ... ``` — this should still parse.
    const fenced = "```json\n" + wellFormed + "\n```";
    const result = parseAiResponse(fenced);

    expect(result.status).toBe("ok");
    expect(result.tags).toHaveLength(3);
  });

  it("flags non-JSON / freeform prose for manual review without throwing", () => {
    const prose = "Here is the summary you asked for: the project looks fine.";

    expect(() => parseAiResponse(prose)).not.toThrow();
    const result = parseAiResponse(prose);

    expect(result.status).toBe("needs_review");
    expect(result.raw).toBe(prose); // submission/AI output is never lost
  });

  it("flags valid JSON that is missing required fields for manual review", () => {
    const missingRisks = JSON.stringify({
      summary: "Some summary.",
      tags: ["a", "b", "c"],
      // risks omitted
    });

    const result = parseAiResponse(missingRisks);

    expect(result.status).toBe("needs_review");
    expect(result.raw).toBe(missingRisks);
  });

  it("flags malformed / truncated JSON for manual review without throwing", () => {
    const truncated = '{"summary": "Cut off mid-resp';

    expect(() => parseAiResponse(truncated)).not.toThrow();
    expect(parseAiResponse(truncated).status).toBe("needs_review");
  });

  it("flags empty output for manual review", () => {
    expect(parseAiResponse("").status).toBe("needs_review");
  });
});

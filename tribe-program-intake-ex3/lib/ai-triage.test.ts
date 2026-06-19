import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Share the create() spy into the hoisted vi.mock factory (Vitest 4 pattern:
// the factory is hoisted above imports, so an outer `const` would be in the
// temporal dead zone — vi.hoisted is the supported way to bridge that).
const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create } };
  },
}));

import { runAiTriage } from "@/lib/ai-triage";

const input = {
  title: "Payments dashboard",
  description: "A fintech startup needs a dashboard.",
  budgetRange: "$20k-$40k",
  timeline: "6 weeks",
  industry: "Fintech",
};

function completionWith(content: string) {
  return { choices: [{ message: { content } }] };
}

describe("runAiTriage", () => {
  // Provide a present key by default so each test reaches the mocked create().
  // Stub only the env here — do NOT reset the `create` spy in a beforeEach;
  // that interacts with the async-throw case below to trip Vitest 4's
  // unhandled-rejection guard even though runAiTriage catches it. (Each test
  // sets its own create() return, which overrides the previous.)
  beforeEach(() => vi.stubEnv("DEEPSEEK_API_KEY", "test-key"));
  afterEach(() => vi.unstubAllEnvs());

  it("returns needs_review without calling the API when the key is missing", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    create.mockResolvedValue(completionWith("should not be reached"));
    const result = await runAiTriage(input);
    expect(result.status).toBe("needs_review");
    if (result.status === "needs_review") expect(result.error).toMatch(/not configured/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns needs_review and never throws when the API call rejects", async () => {
    // Throw from inside an async impl (not mockRejectedValue / Promise.reject,
    // which create the rejected promise too eagerly).
    create.mockImplementation(async () => { throw new Error("network down"); });
    const result = await runAiTriage(input);
    expect(result.status).toBe("needs_review");
    if (result.status === "needs_review") expect(result.error).toBe("network down");
  });

  it("returns needs_review when the model returns non-JSON content", async () => {
    create.mockResolvedValue(completionWith("Here is your summary, all good."));
    const result = await runAiTriage(input);
    expect(result.status).toBe("needs_review");
  });

  it("returns needs_review when the model returns empty content", async () => {
    create.mockResolvedValue(completionWith(""));
    const result = await runAiTriage(input);
    expect(result.status).toBe("needs_review");
  });

  it("returns completed with parsed fields for valid-shaped JSON", async () => {
    create.mockResolvedValue(
      completionWith(
        JSON.stringify({
          summary: "A fintech dashboard project.",
          tags: ["fintech", "dashboard", "payments"],
          risks: ["Tight timeline", "Integration complexity"],
        }),
      ),
    );
    const result = await runAiTriage(input);
    expect(result.status).toBe("completed");
    if (result.status === "completed") {
      expect(result.summary).toMatch(/dashboard/i);
      expect(result.tags).toHaveLength(3);
      expect(result.risks.length).toBeGreaterThan(0);
    }
  });
});

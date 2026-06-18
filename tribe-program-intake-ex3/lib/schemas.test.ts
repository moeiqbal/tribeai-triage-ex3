import { describe, it, expect } from "vitest";

import { intakeCreateSchema, aiTriageOutputSchema } from "./schemas";

/**
 * Schema contracts. Negative cases first: these are the server-side guards
 * that keep a bad request out of the DB (intakeCreateSchema) and keep a
 * malformed AI response from being stored as if it were valid
 * (aiTriageOutputSchema). The valid case comes last as the sanity check.
 */
describe("intakeCreateSchema", () => {
  const valid = {
    title: "Payments dashboard",
    description: "A fintech startup needs a dashboard.",
    budgetRange: "$20k-$40k",
    timeline: "6 weeks",
    industry: "Fintech",
  };

  it("rejects an empty/whitespace-only required field", () => {
    expect(intakeCreateSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
  });

  it("rejects a missing required field", () => {
    const { industry, ...missing } = valid;
    void industry;
    expect(intakeCreateSchema.safeParse(missing).success).toBe(false);
  });

  it("rejects a field over its max length", () => {
    expect(intakeCreateSchema.safeParse({ ...valid, title: "x".repeat(201) }).success).toBe(false);
  });

  it("trims and accepts a well-formed intake", () => {
    const result = intakeCreateSchema.safeParse({ ...valid, title: "  Padded title  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("Padded title");
  });
});

describe("aiTriageOutputSchema", () => {
  const valid = {
    summary: "A short summary.",
    tags: ["a", "b", "c"],
    risks: ["one risk"],
  };

  it("rejects when tags is not exactly length 3", () => {
    expect(aiTriageOutputSchema.safeParse({ ...valid, tags: ["a", "b"] }).success).toBe(false);
    expect(aiTriageOutputSchema.safeParse({ ...valid, tags: ["a", "b", "c", "d"] }).success).toBe(false);
  });

  it("rejects when risks is missing", () => {
    const { risks, ...missing } = valid;
    void risks;
    expect(aiTriageOutputSchema.safeParse(missing).success).toBe(false);
  });

  it("rejects when risks is empty", () => {
    expect(aiTriageOutputSchema.safeParse({ ...valid, risks: [] }).success).toBe(false);
  });

  it("rejects when summary is empty", () => {
    expect(aiTriageOutputSchema.safeParse({ ...valid, summary: "" }).success).toBe(false);
  });

  it("accepts a well-formed AI output", () => {
    expect(aiTriageOutputSchema.safeParse(valid).success).toBe(true);
  });
});

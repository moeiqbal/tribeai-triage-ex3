import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock the DB and the AI caller so the route is tested in isolation (no real
// SQLite, no network). vi.hoisted bridges the spies into the hoisted factories.
const { create, findMany, update } = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
}));
const { runAiTriage } = vi.hoisted(() => ({ runAiTriage: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { intake: { create, findMany, update } },
}));
vi.mock("@/lib/ai-triage", () => ({ runAiTriage }));

import { GET, POST } from "@/app/api/intakes/route";

const validBody = {
  title: "Payments dashboard",
  description: "A fintech startup needs a dashboard.",
  budgetRange: "$20k-$40k",
  timeline: "6 weeks",
  industry: "Fintech",
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/intakes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  create.mockReset();
  findMany.mockReset();
  update.mockReset();
  runAiTriage.mockReset();
});

describe("POST /api/intakes", () => {
  it("returns 400 with issues for an invalid body and never touches the DB", async () => {
    const res = await POST(postRequest({ title: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
    expect(Array.isArray(json.issues)).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed JSON body", async () => {
    const res = await POST(postRequest("{not json"));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("persists then stores a completed triage with tags/risks as JSON strings", async () => {
    create.mockResolvedValue({ id: 7 });
    runAiTriage.mockResolvedValue({
      status: "completed",
      summary: "ok",
      tags: ["a", "b", "c"],
      risks: ["r1"],
    });
    update.mockResolvedValue({ id: 7, aiStatus: "completed" });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(201);
    // raw intake persisted as pending BEFORE the AI call
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ aiStatus: "pending", title: validBody.title }),
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({
        aiStatus: "completed",
        aiTags: JSON.stringify(["a", "b", "c"]),
        aiRiskChecklist: JSON.stringify(["r1"]),
      }),
    });
  });

  it("persists the intake with needs_review when triage fails", async () => {
    create.mockResolvedValue({ id: 8 });
    runAiTriage.mockResolvedValue({ status: "needs_review", error: "boom" });
    update.mockResolvedValue({ id: 8, aiStatus: "needs_review" });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: expect.objectContaining({ aiStatus: "needs_review", aiError: "boom" }),
    });
  });
});

describe("GET /api/intakes", () => {
  it("returns 200 with the list", async () => {
    findMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
  });
});

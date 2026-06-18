import { vi, describe, it, expect, beforeEach } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { intake: { findUnique } },
}));

import { GET } from "@/app/api/intakes/[id]/route";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => findUnique.mockReset());

describe("GET /api/intakes/[id]", () => {
  it("returns 404 for a non-numeric id without querying the DB", async () => {
    const res = await GET(new Request("http://localhost/api/intakes/abc"), ctx("abc"));
    expect(res.status).toBe(404);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the intake does not exist", async () => {
    findUnique.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/intakes/999"), ctx("999"));
    expect(res.status).toBe(404);
  });

  it("returns 200 with the row for a known id", async () => {
    findUnique.mockResolvedValue({ id: 1, title: "Payments dashboard" });
    const res = await GET(new Request("http://localhost/api/intakes/1"), ctx("1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 1, title: "Payments dashboard" });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

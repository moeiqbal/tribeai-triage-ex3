import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return Response.json({ error: "Intake not found" }, { status: 404 });
  }
  const intake = await prisma.intake.findUnique({ where: { id: numericId } });
  if (!intake) return Response.json({ error: "Intake not found" }, { status: 404 });
  return Response.json(intake);
}

import { prisma } from "@/lib/prisma";
import { intakeCreateSchema } from "@/lib/schemas";
import { runAiTriage } from "@/lib/ai-triage";

export async function GET() {
  const intakes = await prisma.intake.findMany({ orderBy: { createdAt: "desc" } });
  return Response.json(intakes);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = intakeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  // 1. Persist raw intake BEFORE calling AI — never lose the submission.
  const intake = await prisma.intake.create({ data: { ...parsed.data, aiStatus: "pending" } });

  // 2. Triage (never throws).
  const result = await runAiTriage(parsed.data);

  // 3. Update same row with the outcome.
  const updated =
    result.status === "completed"
      ? await prisma.intake.update({
          where: { id: intake.id },
          data: {
            aiStatus: "completed",
            aiSummary: result.summary,
            aiTags: JSON.stringify(result.tags),
            aiRiskChecklist: JSON.stringify(result.risks), // `risks` → column `aiRiskChecklist`
          },
        })
      : await prisma.intake.update({
          where: { id: intake.id },
          data: { aiStatus: "needs_review", aiError: result.error },
        });

  return Response.json(updated, { status: 201 });
}

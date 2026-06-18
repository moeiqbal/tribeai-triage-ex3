import OpenAI from "openai";
import { type AiTriageOutput, type IntakeCreateInput } from "@/lib/schemas";
import { parseAiResponse } from "@/lib/ai/parse";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: "https://api.deepseek.com",
  timeout: 20_000, // bounds the synchronous POST so the form spinner can't hang
});

export type AiTriageResult =
  | ({ status: "completed" } & AiTriageOutput)        // AiTriageOutput = { summary, tags, risks }
  | { status: "needs_review"; error: string; raw?: string };

const SYSTEM_PROMPT = `You are a project-intake triage assistant. Given a project request, respond with ONLY a JSON object with this exact shape and nothing else:
{
  "summary": string,  // 2-3 sentence plain-English summary of the request
  "tags": string[],   // exactly 3 short topical tags
  "risks": string[]   // 1 or more short bullet strings flagging risks, unknowns, or open questions
}
Do not include markdown, code fences, or any text outside the JSON object.`;

export async function runAiTriage(input: IntakeCreateInput): Promise<AiTriageResult> {
  try {
    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Title: ${input.title}\nDescription: ${input.description}\nBudget range: ${input.budgetRange}\nTimeline: ${input.timeline}\nIndustry: ${input.industry}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseAiResponse(content); // parse-failure mode
    if (parsed.status !== "ok") {
      return { status: "needs_review", error: "AI response could not be parsed into the expected shape", raw: content };
    }
    return { status: "completed", summary: parsed.summary, tags: parsed.tags, risks: parsed.risks };
  } catch (err) {
    // call-failure mode (network/timeout/auth) — same user-facing outcome as parse failure.
    const message = err instanceof Error ? err.message : "Unknown error calling AI provider";
    return { status: "needs_review", error: message };
  }
}

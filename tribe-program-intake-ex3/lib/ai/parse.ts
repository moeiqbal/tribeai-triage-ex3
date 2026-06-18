import { aiTriageOutputSchema } from "@/lib/schemas";

export type ParsedAiResponse = {
  status: "ok" | "needs_review";
  summary: string;
  tags: string[];
  risks: string[];
  raw: string; // always the original input — nothing is lost
};

// LLMs commonly wrap JSON in ```json ... ``` fences; strip them before parsing.
function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (m ? m[1] : t).trim();
}

export function parseAiResponse(raw: string): ParsedAiResponse {
  const fallback: ParsedAiResponse = { status: "needs_review", summary: "", tags: [], risks: [], raw };
  try {
    const candidate = stripFences(raw);
    if (!candidate) return fallback;
    const json: unknown = JSON.parse(candidate); // throws on non-JSON/truncated → caught below
    const result = aiTriageOutputSchema.safeParse(json); // enforces summary, 3 tags, ≥1 risk
    if (!result.success) return fallback;
    return { status: "ok", ...result.data, raw };
  } catch {
    return fallback;
  }
}

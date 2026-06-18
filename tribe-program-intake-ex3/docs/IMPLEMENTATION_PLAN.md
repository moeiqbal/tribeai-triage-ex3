# Implementation Plan — Project Intake Triage MVP (Tribe Exercise 3)

## Context

Tribe async take-home: a thin end-to-end "Project Intake Triage" slice — create an intake,
persist it, run an AI triage pass, view results in a list/detail UI. SPEC.md is the MVP
contract; CLAUDE.md sets the rules (commit every phase with Conventional Commits; look up
library docs before coding). Repo is scaffolded and committed (`bb906a9`); no feature code yet.

This document is written to be executed phase-by-phase by a **non-thinking implementation agent**
(e.g. Claude Sonnet). Each phase is self-contained: exact files with full contents, exact commands,
explicit verification, the exact commit message, and the session-log entry to append. Execute
phases in order. Do not skip verification. Do not improvise beyond what a phase states; if a phase's
reality diverges from this plan (e.g. a generated import path differs), STOP and follow the phase's
"if this differs" note rather than guessing.

### How to execute (read first — applies to every phase)
1. **One phase at a time, in order.** Do not start a phase until the previous phase's verification
   passed and its commit landed.
2. **Doc lookup on any uncertainty.** If an API/signature is unclear or an error suggests the
   installed version differs from this plan, use the `find-docs` skill (ctx7) before changing code —
   per CLAUDE.md. Do not "fix" by guessing from training data (Next 16 / Prisma 7 / Zod 4 differ).
3. **Commit at the end of each phase** with the exact Conventional Commit message given. Run from the
   app folder `tribe-program-intake-ex3/tribe-program-intake-ex3/`. Commits go to the repo whose root
   is one level up (`TribeAi-root/tribe-program-intake-ex3/`).
4. **Append a session-log entry** to `docs/SESSION_TRANSFER_LOG.md` after the phase commits (format
   in "Session Transfer Log" below). The log is append-only — never edit or delete prior entries.
5. **Co-author trailer** on every commit:
   `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

### Stack ground truth (confirmed this session — do not re-derive)
- Next.js 16.2.9 App Router, React 19.2.4, TS, Tailwind 4.
- Prisma 7.8.0, **new `prisma-client` generator** (output `app/generated/prisma`, not yet generated).
  **Breaking vs. training data:** this generator throws `PrismaClientInitializationError` unless a
  **driver adapter** is passed to the constructor. SQLite ⇒ `@prisma/adapter-better-sqlite3@7.8.0`
  (exact match to client) + `better-sqlite3@12.11.1`.
- **Next 16 Route Handlers:** dynamic `params` is a **`Promise`** — `{ params }: { params:
  Promise<{ id: string }> }`, then `const { id } = await params`. In a Client Component page, resolve
  with React `use(params)`.
- Zod 4.4.3 + Vitest 4.1.9 already installed (vitest unconfigured, no tests). `openai` NOT installed
  → `openai@6.44.0`.
- **AI = DeepSeek** via the `openai` SDK, `baseURL: "https://api.deepseek.com"`. `.env` (this folder,
  gitignored) already has `DATABASE_URL` and `DEEPSEEK_API_KEY` — **no copy step needed**. DeepSeek
  supports `response_format: { type: "json_object" }` (NOT `json_schema`), is response-shape
  compatible (`choices[0].message.content`), and its docs warn JSON mode can return empty content ⇒
  Zod safety-net parse is mandatory. Model: `deepseek-chat`.
- Zod 4: `.safeParse()` in request code; top-level formats (`z.email()`); unified `error` param.

### Locked decisions
- **`id` = `Int @id @default(autoincrement())`** (user decision; not cuid/String).
- **`aiTags` / `aiRiskChecklist` = `String?`** holding JSON-stringified arrays (user decision; not
  native `Json`). App does `JSON.stringify` on write, guarded `JSON.parse` on read.
- **Tests = dedicated phase 7, negative-case-first per unit** (not interleaved TDD).
- **Playwright e2e = stretch goal only** (noted in DECISIONS.md; not a committed phase).
- **`aiStatus`** = plain `String` union `"pending" | "completed" | "needs_review"` (not a Prisma enum).
- **Plan is copied into the repo at `docs/IMPLEMENTATION_PLAN.md`; activity recorded in
  `docs/SESSION_TRANSFER_LOG.md`** (append-only).

---

## Phase 0 — Setup: docs/ folder + session log (do this first, on approval)
**Goal:** put the master plan and the activity log into the repo so every later agent has the record.
- Create folder `docs/`.
- Copy this finalized plan verbatim to `docs/IMPLEMENTATION_PLAN.md`.
- Create `docs/SESSION_TRANSFER_LOG.md` with the header + the Phase 0 entry (see "Session Transfer
  Log" section for the exact template).
- **Commit:** `docs(plan): add implementation plan and session transfer log`
- **Log entry:** Phase 0 — created docs/, copied plan, initialized log.

---

## Phase 1 — Data model
**Goal:** Intake table + a working Prisma client singleton (with the required driver adapter).

**Install (pin exactly):**
```bash
npm install @prisma/adapter-better-sqlite3@7.8.0 better-sqlite3@12.11.1
```

**Edit `prisma/schema.prisma`** — keep the existing generator/datasource blocks untouched, append:
```prisma
model Intake {
  id              Int      @id @default(autoincrement())
  title           String
  description     String
  budgetRange     String
  timeline        String
  industry        String
  createdAt       DateTime @default(now())
  aiStatus        String   @default("pending")  // "pending" | "completed" | "needs_review"
  aiSummary       String?
  aiTags          String?  // JSON-stringified string[] (parsed on read)
  aiRiskChecklist String?  // JSON-stringified string[] (parsed on read)
  aiError         String?
}
```

**Generate + migrate:**
```bash
npx prisma generate
npx prisma migrate dev --name init_intake
```

**Create `lib/prisma.ts`:**
```ts
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/app/generated/prisma";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```
**If this differs:** after `prisma generate`, open `app/generated/prisma/` and confirm the export
path. If `PrismaClient` is not exported from the package root, adjust the import to the actual entry
(e.g. `@/app/generated/prisma/client`). Verify via `find-docs` (`prisma` → "prisma-client generator
output import path") before changing anything else.

**Verify:** `npx tsc --noEmit` passes; `app/generated/prisma/` exists; `prisma/dev.db` created;
`prisma/migrations/` has an `init_intake` migration.
**Commit:** `feat(db): add Intake model with Prisma driver-adapter singleton`

## Phase 2 — Type contracts
**Goal:** single source of truth for request + AI-output shapes; inferred TS types.

**Create `lib/schemas.ts`:**
```ts
import { z } from "zod";

export const intakeCreateSchema = z.object({
  title: z.string().trim().min(1, { error: "Title is required" }).max(200),
  description: z.string().trim().min(1, { error: "Description is required" }).max(5000),
  budgetRange: z.string().trim().min(1, { error: "Budget range is required" }).max(100),
  timeline: z.string().trim().min(1, { error: "Timeline is required" }).max(100),
  industry: z.string().trim().min(1, { error: "Industry is required" }).max(100),
});
export type IntakeCreateInput = z.infer<typeof intakeCreateSchema>;

export const aiTriageOutputSchema = z.object({
  summary: z.string().trim().min(1),
  tags: z.array(z.string().trim().min(1)).length(3),
  riskChecklist: z.array(z.string().trim().min(1)).min(1),
});
export type AiTriageOutput = z.infer<typeof aiTriageOutputSchema>;
```
**Verify:** `npx tsc --noEmit` passes.
**Commit:** `feat(schemas): add Zod contracts for intake input and AI output`

## Phase 3 — AI triage
**Goal:** one function that calls DeepSeek and ALWAYS returns a typed result, never throws.

**Install:** `npm install openai@6.44.0` (env already wired — verify `.env` has `DEEPSEEK_API_KEY`).

**Create `lib/ai-triage.ts`:**
```ts
import OpenAI from "openai";
import {
  aiTriageOutputSchema,
  type AiTriageOutput,
  type IntakeCreateInput,
} from "@/lib/schemas";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  baseURL: "https://api.deepseek.com",
  timeout: 20_000, // bounds the synchronous POST so the form spinner can't hang
});

export type AiTriageResult =
  | ({ status: "completed" } & AiTriageOutput)
  | { status: "needs_review"; error: string };

const SYSTEM_PROMPT = `You are a project-intake triage assistant. Given a project request, respond with ONLY a JSON object with this exact shape and nothing else:
{
  "summary": string,        // 2-3 sentence plain-English summary of the request
  "tags": string[],         // exactly 3 short topical tags
  "riskChecklist": string[] // 1 or more short bullet strings flagging risks, unknowns, or open questions
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

    const content = completion.choices[0]?.message?.content;
    if (!content) return { status: "needs_review", error: "AI returned an empty response" };

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch {
      return { status: "needs_review", error: "AI response was not valid JSON" };
    }

    const result = aiTriageOutputSchema.safeParse(parsedJson);
    if (!result.success) {
      return { status: "needs_review", error: `AI response did not match expected shape: ${result.error.message}` };
    }

    return { status: "completed", ...result.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error calling AI provider";
    return { status: "needs_review", error: message };
  }
}
```
**Verify:** `npx tsc --noEmit` passes. (Live API call is exercised manually in phase 8; unit-tested
with a mock in phase 7 — do not call the real API here.)
**Commit:** `feat(ai): add DeepSeek triage call with JSON-mode and Zod safety net`

## Phase 4 — API routes
**Goal:** POST creates+persists+triages, GET lists, GET-by-id reads; submission never lost on AI fail.

**Create `app/api/intakes/route.ts`:**
```ts
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
            aiRiskChecklist: JSON.stringify(result.riskChecklist),
          },
        })
      : await prisma.intake.update({
          where: { id: intake.id },
          data: { aiStatus: "needs_review", aiError: result.error },
        });

  return Response.json(updated, { status: 201 });
}
```

**Create `app/api/intakes/[id]/route.ts`:**
```ts
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
```
**Verify:** `npx tsc --noEmit` passes; `npm run build` succeeds (route handlers compile).
**Commit:** `feat(api): add POST/GET intake routes with AI triage round-trip`

## Phase 5 — Frontend flow (Client Components throughout)
**Goal:** list, create form, detail — one consistent fetch pattern, visible states.

**Edit `app/layout.tsx`:** read the existing file first; change `metadata` title→`"Project Intake
Triage"` and description; wrap `{children}` with a shared header. Add this header just inside `<body>`
before children (keep existing font/className wiring intact):
```tsx
<header className="flex gap-4 border-b border-zinc-200 p-4">
  <a href="/" className="font-semibold">Intake Triage</a>
  <a href="/intakes/new" className="underline">New intake</a>
</header>
```

**Replace `app/page.tsx`** (list):
```tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Intake = { id: number; title: string; industry: string; createdAt: string; aiStatus: string };

export default function HomePage() {
  const [intakes, setIntakes] = useState<Intake[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null); setIntakes(null);
    try {
      const res = await fetch("/api/intakes");
      if (!res.ok) throw new Error("Failed to load intakes");
      setIntakes(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load intakes");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return (
    <div className="p-6">
      <p className="text-red-600">{error}</p>
      <button onClick={load} className="mt-2 rounded bg-black px-4 py-2 text-white">Retry</button>
    </div>
  );
  if (intakes === null) return <div className="p-6 text-zinc-500">Loading intakes…</div>;
  if (intakes.length === 0) return (
    <div className="p-6">
      <p className="text-zinc-600">No intakes yet.</p>
      <Link href="/intakes/new" className="mt-2 inline-block rounded bg-black px-4 py-2 text-white">Create your first intake</Link>
    </div>
  );
  return (
    <ul className="space-y-3 p-6">
      {intakes.map((i) => (
        <li key={i.id} className="rounded border border-zinc-200 p-4">
          <Link href={`/intakes/${i.id}`} className="font-medium underline">{i.title}</Link>
          <div className="mt-1 text-sm text-zinc-500">
            {i.industry} · {new Date(i.createdAt).toLocaleString()} ·{" "}
            <span className="rounded bg-zinc-100 px-2 py-0.5">{i.aiStatus}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

**Create `app/intakes/new/page.tsx`** (form):
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELDS = [
  { name: "title", label: "Title", textarea: false },
  { name: "description", label: "Description", textarea: true },
  { name: "budgetRange", label: "Budget range", textarea: false },
  { name: "timeline", label: "Timeline", textarea: false },
  { name: "industry", label: "Industry", textarea: false },
] as const;

type Field = (typeof FIELDS)[number]["name"];

export default function NewIntakePage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    title: "", description: "", budgetRange: "", timeline: "", industry: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allFilled = Object.values(values).every((v) => v.trim().length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !allFilled) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/intakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create intake");
      }
      const created = await res.json();
      router.push(`/intakes/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create intake");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 p-6">
      {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {FIELDS.map((f) => (
        <div key={f.name} className="flex flex-col">
          <label className="mb-1 text-sm font-medium">{f.label}</label>
          {f.textarea ? (
            <textarea className="rounded border border-zinc-300 p-2" rows={4}
              value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
          ) : (
            <input className="rounded border border-zinc-300 p-2"
              value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
          )}
        </div>
      ))}
      <button type="submit" disabled={submitting || !allFilled}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {submitting ? "Submitting…" : "Create intake"}
      </button>
    </form>
  );
}
```

**Create `app/intakes/[id]/page.tsx`** (detail):
```tsx
"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";

type Intake = {
  id: number; title: string; description: string; budgetRange: string; timeline: string;
  industry: string; createdAt: string; aiStatus: string; aiSummary: string | null;
  aiTags: string | null; aiRiskChecklist: string | null; aiError: string | null;
};

function parseList(raw: string | null): string[] | null {
  if (!raw) return null;
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : null; } catch { return null; }
}

export default function IntakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/intakes/${id}`);
        if (res.status === 404) throw new Error("not-found");
        if (!res.ok) throw new Error("Failed to load intake");
        setIntake(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load intake");
      }
    })();
  }, [id]);

  if (error === "not-found") return (
    <div className="p-6"><p>This intake doesn’t exist.</p><Link href="/" className="underline">Back to all intakes</Link></div>
  );
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!intake) return <div className="p-6 text-zinc-500">Loading…</div>;

  const tags = parseList(intake.aiTags);
  const risks = parseList(intake.aiRiskChecklist);
  const completed = intake.aiStatus === "completed" && tags && risks;

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{intake.title}</h1>
        <p className="text-sm text-zinc-500">{intake.industry} · {new Date(intake.createdAt).toLocaleString()}</p>
      </div>
      <dl className="space-y-2">
        <div><dt className="font-medium">Description</dt><dd>{intake.description}</dd></div>
        <div><dt className="font-medium">Budget range</dt><dd>{intake.budgetRange}</dd></div>
        <div><dt className="font-medium">Timeline</dt><dd>{intake.timeline}</dd></div>
      </dl>
      {completed ? (
        <div className="space-y-4">
          <div><h2 className="font-medium">AI summary</h2><p>{intake.aiSummary}</p></div>
          <div><h2 className="font-medium">Tags</h2>
            <ul className="flex gap-2">{tags!.map((t) => <li key={t} className="rounded bg-zinc-100 px-2 py-0.5 text-sm">{t}</li>)}</ul></div>
          <div><h2 className="font-medium">Risk checklist</h2>
            <ul className="list-disc pl-5">{risks!.map((r, idx) => <li key={idx}>{r}</li>)}</ul></div>
        </div>
      ) : (
        <div className="rounded border border-amber-300 bg-amber-50 p-4">
          <p className="font-medium text-amber-800">
            {intake.aiStatus === "pending"
              ? "AI triage has not completed for this intake yet."
              : "AI triage could not be completed. Your submission has been saved and is unaffected — a team member should review it manually."}
          </p>
          {intake.aiError && (
            <details className="mt-2 text-sm text-amber-700"><summary>Show technical details</summary><p className="mt-1">{intake.aiError}</p></details>
          )}
        </div>
      )}
      <Link href="/" className="inline-block underline">Back to all intakes</Link>
    </div>
  );
}
```
**Verify:** `npm run dev`, then click through create → list → detail in the browser; `npx tsc --noEmit`
clean.
**Commit:** `feat(ui): add intake list, create form, and detail pages`

## Phase 6 — UX states hardening
**Goal:** close the gaps the agent's review flagged. Most are already in phase 5's code (review banner,
double-submit guard, list Retry); this phase confirms them and adds the generic 404 + guarded parse.
- **Confirm** in `app/intakes/[id]/page.tsx`: amber banner for `needs_review` vs. `pending` text;
  `aiError` behind `<details>`; raw intake fields always render; `parseList` guard means a malformed
  stored string falls back to the banner instead of throwing.
- **Confirm** in `app/intakes/new/page.tsx`: `disabled={submitting || !allFilled}` AND
  `if (submitting || !allFilled) return;` guard at the top of `handleSubmit` (double-submit safety).
- **Confirm** in `app/page.tsx`: the error state's **Retry** button re-runs `load()` (headline error path).
- **Create `app/not-found.tsx`** (generic bad-route 404, distinct from data-404 in the detail page):
```tsx
import Link from "next/link";
export default function NotFound() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <Link href="/" className="underline">Back to all intakes</Link>
    </div>
  );
}
```
**Verify:** manual — break `DEEPSEEK_API_KEY`, create an intake → it persists, detail shows amber
banner, no crash; visit `/intakes/abc` and `/intakes/999999` → not-found; visit `/totally-bad-route`
→ `not-found.tsx`; empty DB → empty-list CTA.
**Commit:** `fix(ux): add manual-review banner, double-submit guard, and 404 page`

## Phase 7 — Tests (dedicated, negative-case-first per unit)
**Goal:** automated coverage of validation, AI fallback, and route behavior. Write the negative cases
in each file BEFORE the passing case.

**Create `vitest.config.ts`:**
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    alias: { "@/": new URL("./", import.meta.url).pathname },
  },
});
```
**Add to `package.json` scripts:** `"test": "vitest run"`, `"test:watch": "vitest"`.

**`lib/schemas.test.ts`** — negatives first: empty/missing/over-max field on `intakeCreateSchema`;
`tags.length !== 3`, missing `riskChecklist`, empty `riskChecklist`, empty `summary` on
`aiTriageOutputSchema`; then one valid pass each. Use `.safeParse(...).success` assertions.

**`lib/ai-triage.test.ts`** — `vi.mock("openai", ...)` so the constructed client's
`chat.completions.create` is a `vi.fn()`. Cases (negatives first): mock rejects (network error) →
`needs_review`, never throws; mock resolves content `"not json"` → `needs_review`; mock resolves empty
content → `needs_review`; mock resolves valid-shaped JSON string → `completed` with parsed fields.
Pattern:
```ts
import { vi, describe, it, expect, beforeEach } from "vitest";
const create = vi.fn();
vi.mock("openai", () => ({ default: class { chat = { completions: { create } }; } }));
beforeEach(() => create.mockReset());
// ...import { runAiTriage } from "@/lib/ai-triage" AFTER the mock
```

**`app/api/intakes/route.test.ts`** + **`app/api/intakes/[id]/route.test.ts`** — `vi.mock("@/lib/prisma")`
and `vi.mock("@/lib/ai-triage")`. Cases: POST invalid body → 400 with `issues`; POST valid + AI mock
`completed` → `prisma.intake.create` then `update` called with `aiStatus:"completed"` and
`aiTags`/`aiRiskChecklist` as JSON strings; POST valid + AI mock `needs_review` → row persists with
`aiStatus:"needs_review"`; GET list (mock returns `[]`) → 200 `[]`; `[id]` GET non-numeric id → 404;
GET unknown id (mock returns null) → 404; GET known id → 200 row. Build a `Request` with
`new Request("http://x", { method:"POST", body: JSON.stringify(...) })` and call the handler directly.
**Verify:** `npm test` → all green.
**Commit:** `test(core): add vitest config and negative-first coverage for schemas, AI triage, and API routes`

## Phase 8 — README.md
**Goal:** the three Final-Output-Doc sections, concrete to this repo. Rewrite `README.md`:
- **How to run:** prereqs (Node 20+, npm); `npm install`; env table (`DATABASE_URL=file:./dev.db`,
  `DEEPSEEK_API_KEY=…` — both already in gitignored `.env`); `npx prisma generate && npx prisma
  migrate dev`; `npm run dev`; open `http://localhost:3000`. One-line troubleshooting note: if
  `better-sqlite3` fails to install, build tools / Python (node-gyp) may be needed.
- **What you built:** create → persist → AI triage → list/detail; reliability guarantee (intake
  persists before/independent of AI outcome); the 3 `aiStatus` values.
- **Verification:** Automated (`npm test`, what's covered) + Manual checklist (happy path with AI
  fields populated; break the key → still persists with review banner, no crash; `/intakes/<bad-id>`;
  empty list; bad route 404).
**Verify:** links/commands in README actually work when followed.
**Commit:** `docs(readme): document setup, scope, and verification steps`

## Phase 9 — DECISIONS.md
**Goal:** the Decision Log. Create `DECISIONS.md`:
- **Plan:** the phase sequence executed.
- **Key decisions + why:** synchronous AI (no bg job); `aiStatus` String not enum; **Prisma 7
  driver-adapter requirement** (non-obvious breaking change); DeepSeek via openai SDK `baseURL`; Zod
  safety-net since DeepSeek lacks `json_schema`; `Int` autoincrement id + JSON-string array columns
  (user decisions); Client Components everywhere for one fetch pattern.
- **How verified:** vitest suite + manual checklist + Loom walkthrough.
- **Tradeoffs:** request blocks on the AI call (queue at scale); single AI attempt, no retry/backoff;
  no server-side schema enforcement (prompt + Zod instead).
- **1 more day:** background job + retry queue; Playwright e2e; "retry triage" button on a
  needs_review detail page (re-calls `runAiTriage` without re-creating the row); list pagination;
  `json_schema` if DeepSeek adds it.
**Commit:** `docs(decisions): record plan, tradeoffs, and follow-up scope`

---

## Session Transfer Log

**Location:** `docs/SESSION_TRANSFER_LOG.md` — **append-only.** After each phase commits, append one
entry. Never edit or delete earlier entries. This is the running record of all activity.

**File header (write once, in Phase 0):**
```markdown
# Session Transfer Log — Project Intake Triage

Append-only record of implementation activity. Newest entry at the bottom.
One entry per phase / agent execution.
```

**Entry template (append after every phase):**
```markdown
---
## Phase <N> — <title>
- **When:** <ISO timestamp>
- **Agent/model:** <e.g. Claude Sonnet 4.6>
- **Done:** <1-3 sentences on what was implemented>
- **Files touched:** <paths>
- **Commands run + result:** <e.g. `npm test` → 14 passed; `npx tsc --noEmit` → clean>
- **Commit:** <short hash + message>
- **Verification:** <pass/fail + what was checked>
- **Notes / deviations:** <anything that differed from the plan, or "none">
- **Next:** Phase <N+1> — <title>
```

---

## Global verification (end state)
- `npm test` → all vitest suites green.
- `npm run build` → succeeds.
- `npm run dev` + full manual checklist (phase 8) passes, including the AI-failure path (intake still
  persists, amber banner, no crash) and all UX states (loading/empty/error/not-found).
- `git log --oneline` shows one Conventional Commit per phase (0–9), incremental history intact.
- `docs/IMPLEMENTATION_PLAN.md` and `docs/SESSION_TRANSFER_LOG.md` present and current.

## File manifest
**New:** `lib/prisma.ts`, `lib/schemas.ts`, `lib/ai-triage.ts`, `app/api/intakes/route.ts`,
`app/api/intakes/[id]/route.ts`, `app/intakes/new/page.tsx`, `app/intakes/[id]/page.tsx`,
`app/not-found.tsx`, `vitest.config.ts`, `lib/schemas.test.ts`, `lib/ai-triage.test.ts`,
`app/api/intakes/route.test.ts`, `app/api/intakes/[id]/route.test.ts`, `DECISIONS.md`,
`docs/IMPLEMENTATION_PLAN.md`, `docs/SESSION_TRANSFER_LOG.md`.
**Edited:** `prisma/schema.prisma`, `app/page.tsx`, `app/layout.tsx`, `package.json`, `README.md`.
**Generated:** `app/generated/prisma/**`, `prisma/migrations/**`, `prisma/dev.db`.

# Handoff — resume at Phase 2

Cold-start prompt for the next agent (no prior conversation context required).
Paste the block below into a fresh session. Canonical procedure lives in
[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) and
[`SESSION_TRANSFER_LOG.md`](./SESSION_TRANSFER_LOG.md); this is a pointer, not a duplicate.

---

````text
You are the coordinating full-stack engineer continuing a Next.js take-home build
("Tribe Program Intake Triage"). A previous session completed Phases 0–1; you are
picking up at Phase 2 and continuing through the numbered phases.

## Working directory
/Users/mohammediqbal/Documents/TribeAi-root/tribe-program-intake-ex3/tribe-program-intake-ex3
(The git repo ROOT is ONE LEVEL UP at .../tribe-program-intake-ex3/ — so all git
paths are prefixed `tribe-program-intake-ex3/...`, e.g.
`git -C .. add tribe-program-intake-ex3/lib/schemas.ts`.)

## READ THESE FIRST (canonical, in this order)
1. docs/IMPLEMENTATION_PLAN.md  — the full phase-by-phase plan with exact file
   contents. This is the source of truth for WHAT to build. Find "## Phase 2".
2. docs/SESSION_TRANSFER_LOG.md  — append-only activity record. Read the latest
   entries to see exactly what's done and every deviation discovered so far.
3. CLAUDE.md and AGENTS.md (repo root) — project rules.

## NON-NEGOTIABLE OPERATING RULES
- ONE PHASE AT A TIME. After each phase: (a) verify, (b) commit, (c) append a
  session-log entry, then **STOP and ask the user to confirm before the next
  phase.** Do not run phases back-to-back.
- Commit per phase using Conventional Commits, with this trailer on EVERY commit:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  Stage explicit paths (never `git add -A`/`git add .`) — see "Uncommitted by
  design" below.
- Append (never edit/delete prior entries) a session-log entry to
  docs/SESSION_TRANSFER_LOG.md after each phase, using the template at the bottom
  of that file. Get the ISO timestamp via `date -u +"%Y-%m-%dT%H:%M:%SZ"`.
- This is Next.js 16.2.9 / Prisma 7.8.0 / Zod 4.4.3 — all POST-DATE your training
  data and have breaking changes. Before writing code against any of them, use the
  `find-docs` skill (ctx7) and/or read node_modules/next/dist/docs/. Do NOT code
  from memory. Don't-trust-but-verify.
- You are SOLE DRIVER on `main`. A second session previously committed
  concurrently and nearly caused a divergence. Before starting, run
  `git -C .. log --oneline -3 && git -C .. status --porcelain` and confirm HEAD is
  `5f4ce4e` (Phase 1 log) and the tree is clean. If HEAD moved or the tree is
  dirty, STOP and report to the user — do not proceed.
- Functionality over polish (Tribe explicitly does not grade UI polish). Keep it
  minimal; no scope beyond the plan.

## STATE: already done & committed (linear history)
bb906a9 scaffold → f711783 Phase0 docs → f332d36 README (parallel agent) →
c3a1f80 vitest wiring (parallel agent) → 17af95d plan amendment →
b29f641 relocate parser test → af3a997 reconciliation log → a3ef6c2 Phase 1 →
5f4ce4e Phase 1 log  ← current HEAD

- Phase 0: docs/IMPLEMENTATION_PLAN.md + docs/SESSION_TRANSFER_LOG.md.
- Phase 1: Intake model in prisma/schema.prisma, migration `init_intake` applied,
  lib/prisma.ts singleton (driver adapter wired). Deps installed:
  @prisma/adapter-better-sqlite3@7.8.0, better-sqlite3@12.11.1, dotenv, prisma@7.8.0.

## CRITICAL GOTCHAS LEARNED THIS SESSION (do not rediscover the hard way)
- Prisma client import path: the `prisma-client` generator emits NO package-root
  index. Import from `@/app/generated/prisma/client` (NOT `@/app/generated/prisma`).
  See lib/prisma.ts for the working pattern.
- `app/generated/prisma/` is GITIGNORED → after any fresh clone you must run
  `npx prisma generate`. `dev.db` is at the APP ROOT (not prisma/) and is gitignored.
- prisma.config.ts imports `dotenv/config` and `prisma/config`, so `dotenv` and
  `prisma` must be installed (they now are) or generate/migrate fails.
- FIELD NAMING (locked): the LLM JSON contract, the Zod schema, and the parser all
  use `risks`. The DB COLUMN is `aiRiskChecklist` — map `risks` → `aiRiskChecklist`
  only at the storage boundary (Phase 4). Tags column is `aiTags`. Both AI array
  columns are `String?` holding JSON.stringify'd arrays (parsed on read).
- aiStatus is a plain String union: "pending" | "completed" | "needs_review".
- AI parsing is its own pure unit: lib/ai/parse.ts → `parseAiResponse(raw)`
  (Phase 3). Its test lib/ai/parse.test.ts ALREADY EXISTS (committed) and is
  currently RED because it imports `./parse` which doesn't exist yet — this is
  expected until Phase 3. `npx tsc --noEmit` will show exactly that one error now;
  it is NOT a regression.
- Phase 7 partially pre-done by the parallel agent: vitest.config.ts (node env,
  include lib+app, `@/` alias), package.json `"test": "vitest run"`, and the parser
  test all exist. Phase 7 = make the parser green + ADD the remaining tests.
- Phase 8: README.md was already rewritten & committed (f332d36). Phase 8 =
  VERIFY its wording matches what was built; do NOT rewrite from scratch.
- .env already contains DATABASE_URL=file:./dev.db and DEEPSEEK_API_KEY (gitignored).
  AI = DeepSeek via the `openai` SDK with baseURL https://api.deepseek.com.

## Uncommitted by design
None right now (tree is clean). Going forward, commit only the files a phase owns
with explicit paths, so nothing leaks across phases.

## YOUR IMMEDIATE TASK — Phase 2: Type contracts
Create `lib/schemas.ts` (root lib/, NOT under app/) exactly as specified in Phase 2
of docs/IMPLEMENTATION_PLAN.md:
- `intakeCreateSchema` = z.object of the 5 string fields (title, description,
  budgetRange, timeline, industry), each `.trim().min(1, { error: "... is
  required" }).max(...)`. Export `IntakeCreateInput = z.infer<...>`.
- `aiTriageOutputSchema` = z.object({ summary: string.min(1), tags:
  array(string.min(1)).length(3), risks: array(string.min(1)).min(1) }). Export
  `AiTriageOutput = z.infer<...>`. (Field is `risks`, not `riskChecklist`.)
- Zod 4 syntax: `.safeParse()` in request code; unified `error` param (not
  `message`/`required_error`). Verify against current Zod 4 docs via find-docs if
  unsure.

Verify: `npx tsc --noEmit` — the ONLY error should still be the pre-existing
lib/ai/parse.test.ts `./parse` one; lib/schemas.ts itself must be clean.
Commit: `feat(schemas): add Zod contracts for intake input and AI output`
Then append the session-log entry and STOP for user confirmation before Phase 3.
````

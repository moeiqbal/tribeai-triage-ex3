@AGENTS.md

# Tribe Exercise 3 — Project Intake Triage

## What this is
Tribe async take-home: build a thin end-to-end slice — frontend, backend API,
persistence, one AI feature, basic UX states, reproducibility. Time-boxed
~2-3h (going over is fine — just keep recording and disclose it).

## Git workflow (mandatory)
- Commit at every phase, no exceptions — never let two phases pile up
  uncommitted. A "phase" is any of: scaffolding, schema/migration, an API
  route, the AI integration, a frontend view, a UX state, README/DECISIONS
  updates, etc. If you finished a coherent chunk of work, commit it before
  moving on.
- Use Conventional Commits (`type(scope): summary`), e.g. `feat`, `fix`,
  `chore`, `docs`, `refactor`, `test`. Scope should name the area touched
  (e.g. `feat(api): add POST /intakes route`).
- The summary line must say what changed and why it matters for someone
  skimming `git log` later — not "wip" or "updates". The body (when the
  change isn't self-explanatory from the summary) should note what was
  decided and any tradeoff taken.
- This satisfies the Final Output Doc's expectation of incremental history
  in the submitted repo (see Deliverables below) — a single end-of-session
  commit is not acceptable.

## Documentation lookups (mandatory)
- Before implementing anything against a library/framework/SDK you haven't
  already verified in this session — Next.js App Router APIs, Prisma
  schema/client usage, the OpenAI SDK, Tailwind config, etc. — use the
  `find-docs` skill (Context7) to pull current docs first. Do not implement
  from training-data memory and fix it later; look it up before writing the
  code.
- This project is especially exposed to stale training data: Next 16.2.9
  and Prisma 7.8.0 postdate training, and `prisma/schema.prisma` already
  uses the newer `"prisma-client"` generator. Treat any training-data
  assumption about their APIs as wrong until confirmed via find-docs or the
  installed docs in `node_modules`.
- Goal is minimizing doubt, not speed — a wrong assumption about a changed
  API costs more time than the lookup would have.

## Source of truth
- SPEC.md (this folder) is the MVP contract, reconciled below against the
  Brief / Pre-read / Final Output doc. Where SPEC.md and the Brief disagree
  on scope, SPEC.md wins; the Brief / Final Output doc win on submission
  format (deliverables, README/DECISIONS sections, etc).
- The Brief, Pre-read, and Final Output docs live two levels up at
  `../../Exercise 3 - *.md`. They're exercise reference material, not part
  of the deliverable, and are excluded via the root `.gitignore`.

## Stack (already chosen — matches Brief Option A, the recommended default)
- Next.js 16.2.9 (App Router), React 19.2.4, TypeScript, Tailwind 4
- Prisma 7.8.0 + SQLite (`DATABASE_URL=file:./dev.db`)
- Zod v4 (`npm install zod@^4.0.0`) for request/intake validation — use
  `z.object(...)` + `.safeParse()` (never `.parse()` in an API route, so a
  bad request returns a clean validation error instead of throwing) and
  `z.infer<typeof Schema>` to derive the TS type from the schema instead of
  duplicating it. Zod 4 moved string-format validators to the top level
  (`z.email()`, `z.uuid()`, etc., not `z.string().email()`) and replaced
  `message`/`required_error`/`invalid_type_error` with a single `error`
  param — don't write v3-style code.
- AI: **DeepSeek** (decision reverted — no OpenAI key was actually
  available; the DeepSeek key in the root `.env` is pre-validated and
  works, and provider choice doesn't matter for this exercise). Call it
  through the official `openai` npm SDK pointed at DeepSeek's
  OpenAI-compatible endpoint (`baseURL: "https://api.deepseek.com"`,
  `apiKey: process.env.DEEPSEEK_API_KEY`) rather than raw `fetch` — same
  request/response shape, less code. Use whatever the default/validated
  model turns out to be; don't block on picking between
  `deepseek-chat`/`deepseek-v4-flash`/`deepseek-v4-pro` (see Open TBDs).
  Action needed: `DEEPSEEK_API_KEY` currently only exists in the root
  `.env` — copy it into this folder's `.env` (gitignored) before wiring the
  AI route, since that's what Next.js actually reads at runtime.

## Critical: this isn't the Next.js/Prisma you trained on
- Next 16 and Prisma 7 postdate training data. `AGENTS.md` (imported above)
  mandates reading `node_modules/next/dist/docs/` before writing any
  Next.js code — actually do this, don't assume App Router conventions are
  unchanged.
- `prisma/schema.prisma` already uses generator provider `"prisma-client"`
  (not the older `"prisma-client-js"`), output to `app/generated/prisma`.
  Confirm current client import/query patterns from installed docs/CLI
  help before writing query code — don't assume the old API shape.
- See "Documentation lookups" above — this is the concrete case it exists
  for.

## MVP scope (from SPEC.md, reconciled with the Brief)
Core flow:
1. Create intake: title, description, budget range (string), timeline
   (string), industry (string) → server records `created_at`.
2. Persist the raw intake to SQLite immediately, before the AI call.
3. Call the LLM to generate: 2-3 sentence summary, 3 tags, risk checklist
   (bullets). Parse into a predictable structure (JSON preferred; freeform
   is acceptable per Brief, structured output is a bonus not a requirement).
4. Store the AI output (or a failure status) against the intake.
5. List view of all intakes.
6. Detail view per intake.

Reliability (SPEC.md is stricter than the Brief's minimum — honor SPEC.md):
- An intake must persist even if the AI call fails or is unavailable — never
  lose the user's submission.
- API validates required fields server-side.
- AI output is parsed into a structured form; on parse/call failure, store
  an AI status field (e.g. `failed` / `needs_review`) plus the raw
  error/response, and show the user a manual-review message rather than
  crashing.

UX states (required, prioritized over visual polish):
- Loading / submitting state
- Empty list state
- User-visible error state (at least one clear path)

Explicitly out of scope for this MVP (SPEC.md): auth, multi-user support,
production deployment, background jobs, polished UI.

## Deliverables checklist (Final Output Doc — all 5 required)
- [ ] Loom recording: full build, screen + audio, the entire session
- [ ] Walkthrough wrap-up (10-20 min, end of recording): product/UX flow +
      states demo; system overview (frontend↔backend, data model, where/how
      AI is called and stored); reliability/verification approach;
      tradeoffs + next steps
- [ ] Code zip of the local git repo (including `.git`) — repo root is
      `TribeAi-root/tribe-program-intake-ex3/` (one level up from this app
      folder), now protected by a root `.gitignore`. Zip name format:
      `<FirstName>_<LastName>_Tribe_IntakeTriage.zip`
- [ ] `README.md` (this folder) with sections: How to run (prereqs/install/
      env vars/commands/URL), What you built, Verification (tests or a
      manual checklist)
- [ ] `DECISIONS.md` (this folder) with: plan, key decisions + why, how
      verified, tradeoffs, what you'd do differently, "if I had 1 more day"

Repo currently has zero commits — see "Git workflow" above; commits start
with the first phase of work, not at the end.

## Open TBDs — do not guess, confirm before implementing
- TBD: exact DeepSeek model name to call. `DEEPSEEK_API_REFERENCE.md` is
  internally inconsistent (lists `deepseek-v4-flash`/`deepseek-v4-pro` as
  available, but separately claims `deepseek-chat` is the validated one) —
  don't trust it as-is. Per the user, this doesn't need to block
  implementation: try the default/documented model and move on rather than
  spending time picking the "best" one.
- TBD: whether AI output is enforced via a JSON schema (structured outputs)
  or freeform-then-parsed (either is acceptable per the Brief)
- TBD: bonus scope (Docker, tests, dashboard/CSV export, retries/
  guardrails) — none committed to yet

## Working agreement
- Functionality over polish — Tribe explicitly does not evaluate visual
  polish or framework choice.
- Prefer the simplest implementation that satisfies SPEC.md; don't add
  scope (auth, multi-user, etc.) that's explicitly out of scope.
- If a task is under 80% confidence, stop and ask rather than guessing;
  mark unresolved items TBD here instead of inventing an answer.

# Decision Log — Project Intake Triage

Companion to [`README.md`](./README.md) (how to run + verification) and
[`SPEC.md`](./SPEC.md) (the MVP contract). This file records *why* the build
looks the way it does.

---

## Plan — the phase sequence executed

The build was done in small, individually-committed phases, with a per-phase
entry appended to [`docs/SESSION_TRANSFER_LOG.md`](./docs/SESSION_TRANSFER_LOG.md):

0. Docs scaffolding (implementation plan + append-only session log).
1. **Data model** — `Intake` Prisma model + migration; hot-reload-safe client
   singleton.
2. **Type contracts** — Zod schemas for the request body and the AI output;
   inferred TS types.
3. **AI triage** — a pure, never-throwing response parser + a DeepSeek caller
   that delegates to it.
4. **API routes** — `POST`/`GET /api/intakes` and `GET /api/intakes/[id]`.
5. **Frontend flow** — list, create form, detail (Client Components).
6. **UX hardening** — manual-review banner, double-submit guard, 404 page.
7. **Tests** — schemas, triage, routes, and the parser (27 tests).
8. **README** — verified and aligned to the build.
9. **DECISIONS** — this file.

A mid-build smoke test (live API round-trip through every route) and a live
key/model validation were run between phases and are recorded in the session
log.

---

## Key decisions + why

- **Synchronous AI call inside the POST request (no background job).** On
  create, the route persists the raw intake, then awaits the LLM, then updates
  the same row. For a single-user, time-boxed MVP this is the simplest design
  that still satisfies the "never lose a submission" requirement. The cost
  (request latency, no queue) is a deliberate tradeoff, noted below.
- **Persist *before* triage; AI never throws.** The intake row is written with
  `aiStatus: "pending"` before the AI is called, and `runAiTriage` is built to
  always return a typed result (it catches every error) rather than throw. Both
  AI failure modes — the call failing (network/timeout/auth) and the output
  being unparseable — converge on `needs_review`, so a failure degrades to a
  manual-review banner instead of losing the submission or crashing.
- **`aiStatus` as a plain string union, not a DB enum.** Values are
  `pending` | `completed` | `needs_review`. SQLite has no native enum and the
  set is tiny and unlikely to churn; a string column keeps the schema and the
  Prisma client simple. The values are treated as a closed set in code.
- **Prisma 7 driver adapter (non-obvious breaking change).** Prisma 7 requires
  an explicit driver adapter — `@prisma/adapter-better-sqlite3` wired into the
  `PrismaClient` — rather than the implicit engine connection older versions
  used. The generated `prisma-client` generator also emits no package-root
  index, so the client is imported from `@/app/generated/prisma/client`. These
  postdate common training data and were verified against installed docs.
- **DeepSeek via the official `openai` SDK (`baseURL` override).** DeepSeek is
  OpenAI-compatible, so pointing the `openai` SDK at `https://api.deepseek.com`
  reuses a well-typed client instead of hand-rolling `fetch`. The model is
  `deepseek-chat` (validated live — it resolves to `deepseek-v4-flash`).
- **Zod as the AI-output safety net (no provider-side JSON schema).** The call
  requests `response_format: { type: "json_object" }`, but the shape isn't
  provider-enforced, so the parser strips markdown fences, `JSON.parse`s, and
  validates against a Zod schema (`summary`, exactly 3 `tags`, ≥1 `risks`).
  Anything that doesn't match becomes `needs_review` with the raw output kept.
- **`Int` autoincrement id; tags/risks stored as JSON strings.** Simple
  integer ids suit a single-table MVP. SQLite has no array type, so `aiTags`
  and `aiRiskChecklist` are `String?` columns holding `JSON.stringify`'d
  arrays, parsed on read. (The AI/Zod field is `risks`; the column is
  `aiRiskChecklist` — mapped only at the storage boundary.)
- **Client Components everywhere, one fetch pattern.** List, form, and detail
  all fetch the JSON API from the browser. This keeps a single, consistent data
  path and makes the loading/empty/error/needs-review states explicit and easy
  to demo, at the cost of no server-side rendering of data.

---

## How verified

- **Automated:** `npm test` → 27 Vitest tests across 5 files (schemas, AI
  parser, AI triage with the client mocked, and both route handlers), written
  negative-case-first.
- **Manual / live:** a runtime smoke test exercised every route end-to-end
  (valid create with a real DeepSeek round-trip → `completed`; validation 400s;
  404s). The AI-failure path was verified live by running with an invalid
  `DEEPSEEK_API_KEY`: the POST still returned 201, the intake persisted with
  `aiStatus: "needs_review"` and the 401 captured in `aiError`, no crash.
- **Build/types:** `npx tsc --noEmit` clean and `npm run build` succeeds.
- The README's manual checklist + the Loom walkthrough cover the UX states.

---

## Tradeoffs

- **The request blocks on the AI call.** Create latency tracks the LLM
  response, and a burst of submissions would queue on it. Fine for one user;
  it would not scale.
- **Single AI attempt, no retry/backoff.** A transient provider blip routes the
  intake straight to `needs_review` rather than retrying.
- **No provider-side schema enforcement.** Correct AI shape relies on the
  prompt plus the Zod safety net, not a guaranteed `json_schema` from the
  provider.
- **No server-rendered data.** Client-side fetching means a brief loading state
  on every page and no SSR/SEO for intake content (irrelevant for an internal
  tool, but a real difference).

---

## If I had one more day

- Move triage to a **background job + retry queue** so create returns instantly
  and transient AI failures self-heal.
- A **"retry triage" button** on a `needs_review` detail page that re-calls
  `runAiTriage` and updates the existing row (without re-creating the intake).
- **Playwright e2e** covering the real browser flow (create → list → detail)
  to complement the unit tests.
- **List pagination / search** for when the table grows.
- Switch to provider **`json_schema`** structured output if/when DeepSeek
  supports it, tightening the contract before the Zod net.

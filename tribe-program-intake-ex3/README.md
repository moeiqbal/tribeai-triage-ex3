# Project Intake Triage

A small internal tool that triages inbound project requests quickly and
consistently. A user submits a project intake; the app persists it, calls an
LLM to generate a summary, tags, and a risk checklist, and shows everything in
a list/detail UI. See [`SPEC.md`](./SPEC.md) for the MVP contract and
[`DECISIONS.md`](./DECISIONS.md) for the decision log.

---

## A) How to run

### Prerequisites
- **Node.js 20+** and npm
- An LLM API key (this project uses **DeepSeek** via the OpenAI-compatible SDK)

### Install
```bash
npm install
```

### Environment variables
Create a `.env` file in this folder (it is gitignored). Required:

| Variable           | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `DATABASE_URL`     | SQLite connection string, e.g. `file:./dev.db`       |
| `DEEPSEEK_API_KEY` | LLM key used to generate the summary/tags/risk list  |

```env
DATABASE_URL="file:./dev.db"
DEEPSEEK_API_KEY=sk-...
```

### Initialize the database
```bash
npx prisma migrate dev
```

### Run
```bash
npm run dev
```
Open **http://localhost:3000**.

---

## B) What you built
- **Product**: an internal triage tool — submit a project request, get an
  AI-assisted summary, tags, and risk checklist to speed up review.
- **Implemented flow**: create intake → list → detail.
- **AI feature**: on intake creation the app calls an LLM to generate a 2–3
  sentence summary, 3 tags, and a risk checklist (bullets); results are parsed
  into a structured form and stored against the intake.
- **UX states**: loading/submitting, empty list, and a clear user-visible
  error state.
- **Reliability**: the raw intake is persisted *before* the AI call, so a
  submission is never lost if the LLM fails or is unavailable; on AI
  failure the intake is flagged for manual review instead of crashing.

---

## C) Verification

Correctness is demonstrated two ways: a **manual verification checklist**
covering the end-to-end flow and UX states, plus a focused **unit test** on the
AI response parser (the one failure mode that's hard to catch by clicking
through). Each manual item names the SPEC requirement it exercises so the run
doubles as a compliance check.

### Manual verification checklist

#### 1. Empty state — fresh database
- [ ] Start from an initialized but empty database (no intakes).
- [ ] Start the app (`npm run dev`) and open the list page (`/`).
- [ ] The list view renders an explicit **empty state** (not a blank page,
      spinner, or error), with a clear call to action to create an intake.
- _Covers: UX → empty list state._

#### 2. Happy path — create a valid intake (form states)
- [ ] Open the create-intake form.
- [ ] Fill in all fields with valid data: title, description, budget range,
      timeline, industry.
- [ ] On submit, the **submit button enters a loading/disabled state** and the
      form shows a submitting indicator (no double-submit possible).
- [ ] The request succeeds and the app navigates to the new intake's detail
      page.
- _Covers: core flow (create + persist), UX → loading/submitting state._

#### 3. Detail page content after a successful submission
- [ ] After a successful submit, land on the **detail page** for that intake.
- [ ] The original submitted fields are shown (title, description, budget,
      timeline, industry, and the `created_at` timestamp).
- [ ] The **AI summary** (2–3 sentences) is visible.
- [ ] Exactly **3 tags** are visible.
- [ ] The **risk checklist renders as visible bullet points**.
- [ ] A **"Return to list"** (back) control is present and navigates back to
      the list.
- _Covers: AI feature output stored + displayed, detail view, navigation._

#### 4. List view + navigation into detail
- [ ] Return to the list view.
- [ ] The newly created intake appears in the **list of intakes**.
- [ ] Clicking any intake row opens its **detail** view.
- [ ] Create a second intake and confirm both appear and are independently
      openable (no cross-contamination of AI output between intakes).
- _Covers: list view, detail view, navigation, persistence across records._

#### 5. Validation — invalid / missing fields
- [ ] Attempt to submit the form with **missing required fields**.
- [ ] Attempt to submit with **invalid field values** (e.g. empty title,
      whitespace-only fields).
- [ ] A clear, **user-visible error** is shown and the submission is blocked.
- [ ] Confirm the API **rejects the same bad payload server-side** (not only
      client-side) — e.g. via the network tab or a direct request — returning a
      validation error rather than a 500 or a saved bad record.
- [ ] After a rejected attempt, correcting the fields and resubmitting
      succeeds.
- _Covers: UX → error state, reliability → server-side required-field
  validation._

#### 6. AI failure — submission must not be lost
- [ ] Temporarily make the LLM **unavailable** (e.g. unset/rename
      `DEEPSEEK_API_KEY` or use an invalid key) and restart the app.
- [ ] Submit an otherwise valid intake.
- [ ] The **intake is still persisted** (it appears in the list and has a
      detail page) — the user's submission is never lost.
- [ ] The detail view shows a **manual-review / AI-unavailable message**
      instead of crashing or showing a blank/broken AI section.
- [ ] The stored AI status reflects the failure (e.g. `failed` /
      `needs_review`) rather than pretending success.
- [ ] Restore the key, restart, and confirm new intakes triage normally again.
- _Covers: reliability → persist-before-AI, graceful AI-failure handling,
  manual-review fallback._

### Automated tests — AI response parsing

The one piece of logic that can silently break the AI feature is **parsing the
LLM response into our expected structure** (summary / 3 tags / risk bullets).
LLM output is non-deterministic, so we don't try to force the live model to emit
malformed output — instead we unit-test the parser directly and assert it
degrades gracefully.

```bash
npm test   # vitest
```

Parser coverage:
- [ ] Well-formed AI output parses into `{ summary, tags[3], risks[] }`.
- [ ] Malformed / non-JSON AI output yields a `needs_review` status (and retains
      the raw output) instead of throwing.

Note: the *user-facing* result of a parse failure is the same manual-review
message exercised end-to-end in checklist **#6** (AI unavailable). The unit test
proves that a successful-but-malformed AI response is routed into that same
fallback path — so together they cover both AI failure modes (call fails vs.
output unparseable) required by `SPEC.md`.

---

## Notes
- Out of scope for this MVP: auth, multi-user, production deployment,
  background jobs, polished UI (see `SPEC.md`).

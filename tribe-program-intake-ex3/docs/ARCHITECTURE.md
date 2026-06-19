# Architecture — Project Intake Triage

Diagrams of the user flow and system components **as built**. See
[`../README.md`](../README.md) for how to run and [`../DECISIONS.md`](../DECISIONS.md)
for why these choices were made.

---

## 1. System components

How the pieces fit together: Next.js Client Components in the browser talk to
Route Handlers, which delegate to the `lib/` domain logic, the DeepSeek API, and
SQLite (via Prisma).

```mermaid
flowchart TB
  subgraph Browser["Browser — Next.js Client Components"]
    Layout["app/layout.tsx<br/>shared header / nav"]
    List["app/page.tsx<br/>list view"]
    Form["app/intakes/new/page.tsx<br/>create form"]
    Detail["app/intakes/[id]/page.tsx<br/>detail view"]
    NotFound["app/not-found.tsx<br/>404"]
  end

  subgraph Server["Next.js Server — Route Handlers"]
    Collection["app/api/intakes/route.ts<br/>POST create · GET list"]
    Item["app/api/intakes/[id]/route.ts<br/>GET by id"]
  end

  subgraph Lib["lib/ — domain logic"]
    Schemas["schemas.ts<br/>Zod request + AI-output contracts"]
    Triage["ai-triage.ts<br/>runAiTriage() — never throws"]
    Parse["ai/parse.ts<br/>parseAiResponse() — pure"]
    PrismaC["prisma.ts<br/>PrismaClient singleton"]
  end

  DeepSeek["DeepSeek API<br/>via openai SDK<br/>(baseURL override)"]
  DB[("SQLite — dev.db<br/>Intake table")]

  Form -->|"POST /api/intakes"| Collection
  List -->|"GET /api/intakes"| Collection
  Detail -->|"GET /api/intakes/:id"| Item

  Collection --> Schemas
  Collection --> Triage
  Collection --> PrismaC
  Item --> PrismaC

  Triage --> Parse
  Triage --> DeepSeek
  Parse --> Schemas
  PrismaC -->|"driver adapter<br/>(better-sqlite3)"| DB
```

---

## 2. User flow — create an intake

The core path, including the **reliability guarantee**: the raw submission is
persisted *before* the AI call, and the AI call never throws — both failure
modes (call fails / output unparseable) degrade to `needs_review` instead of
losing the submission.

```mermaid
sequenceDiagram
  actor U as User
  participant F as Create form (client)
  participant API as POST /api/intakes
  participant Z as Zod (intakeCreateSchema)
  participant DB as SQLite (Prisma)
  participant T as runAiTriage
  participant DS as DeepSeek
  participant P as parseAiResponse

  U->>F: fill fields, submit
  F->>API: POST JSON body
  API->>Z: safeParse(body)

  alt invalid body
    Z-->>API: failure
    API-->>F: 400 + issues
    F-->>U: inline error, stays on form
  else valid body
    API->>DB: create(aiStatus = "pending")
    Note over API,DB: submission persisted BEFORE the AI call
    API->>T: runAiTriage(input)

    alt API call succeeds
      T->>DS: chat.completions.create (json_object)
      DS-->>T: raw content
      T->>P: parseAiResponse(content)
      P-->>T: ok (summary, 3 tags, risks) / needs_review
    else API call fails (network / timeout / auth)
      T->>DS: chat.completions.create
      DS--xT: error (caught — never thrown)
    end

    T-->>API: completed | needs_review
    API->>DB: update(AI fields | aiError)
    API-->>F: 201 + created intake
    F-->>U: redirect to /intakes/:id
  end
```

---

## 3. View flows — list & detail

Both views are Client Components that fetch the JSON API and render explicit
states (loading / empty / error / not-found / manual-review).

```mermaid
flowchart LR
  subgraph ListFlow["List — app/page.tsx"]
    L1["GET /api/intakes"] --> L2{response}
    L2 -->|loading| L3["Loading…"]
    L2 -->|"[]"| L4["Empty state + CTA"]
    L2 -->|error| L5["Error + Retry"]
    L2 -->|"items"| L6["rows → link to detail"]
  end

  subgraph DetailFlow["Detail — app/intakes/[id]/page.tsx"]
    D1["GET /api/intakes/:id"] --> D2{response}
    D2 -->|404| D3["Not-found message"]
    D2 -->|"aiStatus completed"| D4["Summary · 3 tags · risk checklist"]
    D2 -->|"aiStatus pending / needs_review"| D5["Amber manual-review banner<br/>(raw fields still shown)"]
  end

  L6 -->|click row| D1
```

---

## 4. `aiStatus` lifecycle

Every intake row carries one of three statuses. The raw intake fields are always
present regardless of status — the AI outcome is layered on top.

```mermaid
stateDiagram-v2
  [*] --> pending: intake row created (before AI)
  pending --> completed: AI returns valid JSON<br/>(summary, exactly 3 tags, 1+ risk)
  pending --> needs_review: call fails OR output unparseable<br/>(aiError retained)
  completed --> [*]: shown with summary / tags / risks
  needs_review --> [*]: shown with manual-review banner
```

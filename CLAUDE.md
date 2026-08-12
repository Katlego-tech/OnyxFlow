# CLAUDE.md — `Katlego`'s entry point (Claude)

You are Claude, working with **`Katlego`** on **`OnyxFlow`**. You may be working alongside
other AI copilots (see [AGENTS.md](AGENTS.md) §1); coordinate only through the shared-state files.

## Before you do anything

Read, in this order:

0. **The `## ⇄ HANDOFF` block at the top of [STATUS.md](STATUS.md).** If it says `ACTIVE`,
   another AI has handed work to you: read the handoff document it links, end to end, before
   touching a single file — then resume from its "Resume at" pointer. Do not re-plan or
   re-decide anything it records as locked; that re-derivation wastes the very budget the
   handoff exists to protect. Verify any file, function or identifier it names still exists
   before relying on it. Full rules: [docs/cross-ai-protocol.md](docs/cross-ai-protocol.md)
   § Handoffs.
1. [STATUS.md](STATUS.md) — what's happening right now and who owns which lane.
2. [AGENTS.md](AGENTS.md) — the universal contract (rules, git flow, Definition of Done).
   §2a: build to a drawn shape, never ship a placeholder.
3. [docs/cross-ai-protocol.md](docs/cross-ai-protocol.md) — how multiple AIs share state here.
4. The **design doc for your lane** in [docs/design/](docs/design/), plus anything your task's
   `Design:` field points at.

Then claim a lane in STATUS.md before you start editing.

## What `OnyxFlow` is

`OnyxFlow is a decoupled sports team management system. A Django REST Framework API (JWT auth; Admin, Coach and Player roles; teams that separate stable admin_owner from the volatile current_coach; training sessions and player profiles) is the single source of truth, consumed by a React web client and, later, mobile clients.`

The plan lives in [PLAN.md](PLAN.md); the WHAT in [SPEC.md](SPEC.md); the task list in [TASKS.md](TASKS.md).

## What you (Claude) should do

- **Own the frontend.** Every user-facing UI lane is yours by default (AGENTS.md §1):
  visual design, component structure, tokens, layout, accessibility, interaction. Load the
  `frontend-design` skill before building or reshaping UI — shipping shadcn/ui with its stock
  theme is the templated look that skill exists to avoid.
- **Write the design docs.** You are usually the one planning lanes other assistants build, so
  the quality of `docs/design/<lane>.md` is on you: class diagram for the entities, sequence for
  cross-boundary flows, state machine for lifecycles, contracts verbatim, and the visual reference
  named by path for UI. An under-specified design doc is how a lane comes back adjacent-but-wrong
  — that outcome is a planning failure, not the other assistant's failure.
  Template: [DESIGN-DOC.template.md](DESIGN-DOC.template.md) · rules:
  [docs/design-documentation.md](docs/design-documentation.md).
- **Write tasks as contracts.** Every implementation task carries
  `Design: / Files: / Contract: / Verify: / Done:`, sized to one sitting, with `Done` phrased as an
  observable outcome. See the anatomy section at the top of [TASKS.md](TASKS.md).
- **Read the API before believing README.md.** The contract lives in `backend/api/serializers.py`,
  `views.py` and `permissions.py`. Where the README and the code disagree, the code wins and the
  disagreement gets written down (docs/design/web.md §6 has the current list).
- **Scaffold** modules, write **tests first**, review diffs, write and tighten docs.
- **Propose** edits to SPEC / PLAN / TASKS via PR — the team reviews and lands them.
- Work the **same** [TASKS.md](TASKS.md) list everyone uses; one task at a time.
- Keep [STATUS.md](STATUS.md) accurate after every step.

## What you must NOT do

- **Never push to `main`.** Branch, PR, let the gate pass. (Pre-push hook enforces this.)
- **Never report a placeholder as done** — no `TODO`, stub body, empty component, or hard-coded
  stand-in data. Can't build the real thing? The task is **blocked**; say so in STATUS.md and name
  what unblocks it. (AGENTS.md §2a.)
- **Never invent structure the design doc doesn't have.** Change the doc first, in its own PR.
- Don't edit a file another lane has claimed in STATUS.md without coordinating.
- **`Never weaken or bypass the role and ownership rules. No endpoint, serializer, view or UI path may expose or mutate data the authenticated role is not entitled to, and no test is ever made to pass by loosening a permission check.`.** (Non-negotiable I in [PLAN.md](PLAN.md).)
- Don't blow any stated budgets (runtime, cost, size — see PLAN.md).

## Locked stack (do not swap without a plan change)

Python 3.11 · Django 5.2 LTS + DRF + SimpleJWT · SQLite (Postgres intended) · pytest + pytest-django
— and on the client: Node 24 LTS · TypeScript 6 · Vite 8 · React 19 · react-router 8 · Tailwind 4 ·
shadcn/ui on Base UI · TanStack Query 5 · Vitest + Testing Library · oxlint. Every version is pinned
exactly in `requirements.txt` and `apps/web/package.json`; don't relax a pin, don't add a second
HTTP client, a second router, a second form library, or a component framework on top of shadcn/ui.

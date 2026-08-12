# AGENTS.md — the OnyxFlow contract

This is the single contract every contributor follows — **human or AI, whichever tool**.
Read it before you touch anything. If a rule here conflicts with a habit, the rule wins.

Entry points funnel here: every per-tool file (e.g. [CLAUDE.md](CLAUDE.md), [GEMINI.md](GEMINI.md))
says "read AGENTS.md first." This file is the source of truth for *how we work*; the
**Non-negotiables** in [PLAN.md](PLAN.md) are the source of truth for *what cannot be compromised*.

> **New session / new tab / new AI? Do this before anything else:**
> 1. Read **[STATUS.md](STATUS.md)** — the live board: what's done, in progress, and next.
> 2. Read this file — the rules below.
> 3. Check the **lane labels** so you don't collide with someone else's work.
> 4. When you finish a meaningful step, **update STATUS.md** before you stop.

---

## 1. Team & lanes

| Person | Role | AI copilot(s) |
|--------|------|----------------|
| Katlego | Project leader | Claude |

This is a solo project, so lanes exist to stop *two of your own sessions* colliding — which happens
more often than two people do.

We do **not** hard-partition file ownership by person; we coordinate with **lane labels** in
[STATUS.md](STATUS.md) instead (`api`, `web`, `docs`, `infra`). Before
working a lane, claim it in the STATUS.md "Current focus" table so nobody else — human or AI — collides
with it.

**Rule:** never edit a file another active lane owns without saying so in STATUS.md first.

### Frontend work goes to Claude

Lanes are otherwise first-come — with one standing exception. **Any lane that produces
user-facing UI is assigned to Claude by default**: visual design, component structure,
styling and token systems, layout, accessibility, and interaction.

Why this one is pinned rather than claimed: the `frontend-design` skill in `.claude/skills/`
only loads for Claude, and it is the thing that keeps UI from drifting into the templated
look. A project's visual identity also degrades fastest when it is authored by several hands
in turn — palette and spacing decisions get re-litigated per session, and the result reads as
assembled rather than designed. One owner keeps it coherent.

In practice:

- Frontend lanes (`feat/<ui-lane>`) are Claude's unless the STATUS.md focus table says otherwise.
- Other AIs may still **use** existing components and read the token file; what they should not
  do is introduce a new palette, restyle a component, or hand-roll UI that bypasses the
  component layer.
- If another AI needs UI to finish its own lane, it wires up the existing components and notes
  in STATUS.md that the styling needs a Claude pass — rather than inventing a look in passing.
- Backend, data, infra and docs lanes carry no such default; claim whichever is free.

If the project has no frontend, this section is inert — delete it.

## 2. How we plan

Planning is driven directly by the team through living documents:

- [SPEC.md](SPEC.md) — the WHAT (user stories, acceptance criteria).
- [PLAN.md](PLAN.md) — the HOW (stack, non-negotiables, code layout, build phases).
- [docs/design/](docs/design/) — the SHAPES (class / sequence / state diagrams, per lane).
- [TASKS.md](TASKS.md) — the checkbox task list (`T001…`).
- [STATUS.md](STATUS.md) — the live board.

The full loop is in [docs/planning-workflow.md](docs/planning-workflow.md).

- **Shared state lives in exactly three places:** AGENTS.md (rules), STATUS.md (live board),
  TASKS.md (the task list). Everything else is derived. If it isn't reflected in these three, it
  didn't happen.
- **Single writer per task.** One task ID (`T0xx`) is worked by one person/AI at a time. Claim it in
  STATUS.md before you start; release it when the PR merges.

See [docs/cross-ai-protocol.md](docs/cross-ai-protocol.md) for the collision-avoidance detail.

## 2a. Build to a drawn shape, and never ship a placeholder

Two rules that apply to every contributor, and that exist because of one specific, repeated failure:
work comes back **adjacent to** what was asked — *a* screen instead of *the* screen, the agreed
function names with stubbed bodies, the right entity with invented fields — and gets reported as
done, because by the letter of the task it was.

**Before you build:**

- Non-trivial work has a **design doc** in [docs/design/](docs/design/) — class diagram for
  entities, sequence diagram for anything crossing a service or agent boundary, state machine for
  anything with a lifecycle, and the exact contracts between lanes. Written in Mermaid, merged
  before the implementation tasks are. Rules and the which-diagram-when table:
  [docs/design-documentation.md](docs/design-documentation.md).
- **If the task has no design reference and you can't tell exactly what shape to build, stop and
  say so.** Write the design doc (it's markdown; it takes minutes) or ask. Do not proceed on a
  plausible interpretation — a plausible-but-wrong implementation is the expensive outcome here,
  because it looks finished.
- **UI work builds to a named visual reference** — the mockup path, the screenshot, the screen it
  must match. If none exists, producing one is the first task, not an assumption you make quietly.

**When you finish:**

- **No placeholder counts as done.** Not `TODO`, not `FIXME`, not `pass` / `NotImplementedError`,
  not an empty component, not hard-coded sample data standing in for a real call, not a function
  returning a constant to make a test green. If the real thing can't be built yet, the task is
  **blocked** — say so in STATUS.md and name what unblocks it. Reporting a stub as complete is a
  correctness failure, not a shortcut.
- The only exception: a stub the task text **explicitly declared**, with a follow-up task ID
  already written for replacing it.
- **Implementation is checked against the diagram**, not the prose. Every class in the design
  exists with those fields; the call order matches the sequence; every drawn state is reachable and
  every undrawn transition is impossible. Code and diagram disagree → fix whichever is wrong, in
  the same PR.

## 3. `main` is always green

- **Branch-only.** Nobody pushes to `main`, ever. The pre-push hook rejects it.
- Enable the hooks once per clone: `git config core.hooksPath .githooks`.
- The [pre-push hook](.githooks/pre-push) runs the test gate locally; CI re-runs it on every PR.
  A red `main` blocks the whole team, so it never happens.

## 4. Branch & commit flow

- Branch names: `feat/<lane>`, `fix/<thing>`, `docs/<thing>`, `chore/<thing>`.
- Open a PR into `main`. The gate must be green. Get a quick review from another contributor.
- Commit format ties work back to a task ID: `type(lane): T0xx short description`
  (e.g. `feat(audio): T012 faster-whisper HIP transcription`).

Full detail: [docs/git-workflow.md](docs/git-workflow.md).

## 5. Update STATUS.md every step

After any meaningful step, update [STATUS.md](STATUS.md):
1. Tick / add the relevant checkbox and task ID (in [TASKS.md](TASKS.md)).
2. Update the lane's **Status** column and the phase timeline.
3. Add a dated line to the **Log** at the bottom.

Format the header line as: `_Last updated: YYYY-MM-DD — by <name> (via <tool>)_`.

If you don't update STATUS.md, the next session (human or AI) starts blind and you get conflicts.
**Treat STATUS.md as part of "done."**

## 6. Grounding & honesty rules

The thing that must never be fabricated here is **an authorisation decision**. This is a system whose
entire point is that three roles see three different slices of a club's data, so a permission that is
guessed, inferred, or quietly relaxed is not a bug in a feature — it is the feature failing.

- **Never weaken or bypass the role and ownership rules.** No endpoint, serializer, view or UI path
  may expose or mutate data the authenticated role is not entitled to, and no test is ever made to
  pass by loosening a permission check. This is **Non-negotiable I** in [PLAN.md](PLAN.md).
- **A client never decides who may do what.** It may hide a control it knows will 403 — that is a
  courtesy to the user, never the enforcement. If you find yourself writing a permission rule
  outside `backend/api/permissions.py` and the views, stop.
- **Don't invent API shapes.** Every field a client reads must exist in a serializer you have
  actually opened. `README.md` is not the contract; `backend/api/serializers.py` is. Where they
  disagree, say so in STATUS.md rather than coding to whichever is more convenient.
- **Budgets.** None set yet — no latency, cost or bundle-size ceiling has been agreed. If you add
  one, put the number in PLAN.md's Technical Context rather than in a comment.
- **Graceful degradation.** A failed request and an empty result must never render the same. The
  client distinguishes "we don't know" from "there's nothing here", and so should anything added to
  it.
- **Report failures honestly.** If a stage breaks or a result comes out weak, say so in STATUS.md.
  Don't paper over a broken run.

## 7. Repository map

```
OnyxFlow/
├── README.md · AGENTS.md · CLAUDE.md             shared-state entry points
├── STATUS.md                                     the live board
├── SPEC.md · PLAN.md · TASKS.md                  the planning documents
├── DESIGN-DOC.template.md                        the per-lane design-doc template
├── docs/                                         topic docs (incl. architecture-defaults.md)
│   └── design/web.md                             the React client's design doc
├── .claude/                                      agents, /feature-dev command, frontend-design skill
├── .githooks/pre-push                            the local test gate + main-branch protection
├── .github/workflows/ci.yml                      the CI test gate
├── requirements.txt · requirements-dev.txt · pytest.ini
├── backend/                                      the Django project + the `api` app — the whole domain
└── apps/web/                                     the React client        see docs/project-structure.md
```

Our default build shape (microservices · Kafka/RabbitMQ · shadcn/ui · Docker · latest-LTS-pinned)
lives in [docs/architecture-defaults.md](docs/architecture-defaults.md) — with per-project deviations
recorded in [PLAN.md](PLAN.md)'s Technical Context.

## 8. Definition of Done

A task is done when **all** of these hold:
- [ ] Code + tests written; tests were written **first**, failed for the right reason, and now pass.
- [ ] **It matches its design doc** — every class/field, every call in the sequence, every state
      (§2a). Doc corrected in the same PR if reality diverged.
- [ ] **No placeholders anywhere in the diff** — no `TODO`/`FIXME`, stub body, empty component,
      hard-coded stand-in data, or constant-returning function, except one the task explicitly
      declared *and* that has a follow-up task ID (§2a).
- [ ] For UI: visually matches the reference named in the task, not merely "a version of" it.
- [ ] Lint/format clean; the app still boots/imports; the golden-path example still works.
- [ ] Runs inside any stated budgets (no new regression in latency/memory/cost).
- [ ] STATUS.md updated (checkbox + lane status + Log line); task ID referenced in the commit.
- [ ] PR opened into `main`, CI green, reviewed by another contributor, merged.

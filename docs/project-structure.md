# Project structure

The current layout of this repo, kept in sync as the shape changes. [AGENTS.md](../AGENTS.md) §7 is
the short version and links here for the detail.

## The tree

```
OnyxFlow/
├── README.md                     human overview + quick start
├── AGENTS.md                     the rules (every session reads this)
├── CLAUDE.md                     Claude's entry point + the locked stack
├── STATUS.md                     LIVE board: done / in-progress / next  (read first, update last)
├── SPEC.md · PLAN.md · TASKS.md  the planning documents
├── DESIGN-DOC.template.md        copied per lane to docs/design/<lane>.md
├── AI_ENTRYPOINT.template.md     spare, for a contributor joining on another tool
├── docs/
│   ├── architecture-defaults.md  the microservices/messaging/shadcn defaults + this repo's deviations
│   ├── design-documentation.md   draw it before you build it
│   ├── design/
│   │   ├── README.md             the index
│   │   └── web.md                the React client's design doc
│   └── … (cross-ai-protocol, git-workflow, planning-workflow, testing-strategy)
├── .claude/                      agents, /feature-dev command, frontend-design skill
├── .githooks/pre-push            the local test gate + main-branch protection
├── .github/workflows/ci.yml      CI, re-running the same gate
│
├── requirements.txt              API runtime dependencies, pinned exactly
├── requirements-dev.txt          the above plus pytest + pytest-django
├── pytest.ini                    points pytest at backend.settings from the repo root
│
├── backend/                      the Django project — the entire domain
│   ├── manage.py
│   ├── api_test.py               live-server integration script (needs runserver; not part of pytest)
│   ├── backend/                  settings, urls, wsgi/asgi
│   └── api/                      the one app: models, serializers, views, permissions, signals, tests
│       └── migrations/
│
└── apps/web/                     the React client
    ├── index.html                includes the pre-paint theme script
    ├── vite.config.ts            Vite + Tailwind + the Vitest config
    ├── components.json           shadcn/ui configuration
    └── src/
        ├── index.css             THE TOKEN SYSTEM — every colour, face and radius starts here
        ├── App.tsx               providers + the route table
        ├── lib/                  api client, token store, the API types, formatting
        ├── auth/                 the session state machine, the context, the route guards
        ├── api/queries.ts        one TanStack Query hook per endpoint in use
        ├── components/           AppShell, LoadBand, SheetHeader, Empty/ErrorState, ThemeToggle
        │   └── ui/               shadcn/ui components (owned copies, edit freely)
        └── pages/                one file per screen
```

## Why this shape

**One service, not several.** `docs/architecture-defaults.md` §1 defaults to microservices; this
project deliberately does not. There is one bounded context — a club — and one deployable. Splitting
users, teams and training into separate services would add a network hop and a consistency problem
to a solo project with tens of users, and buy nothing back. Recorded in PLAN.md's Technical Context.

**No broker.** Nothing here is asynchronous. Every interaction is a request some caller is blocking
on. A queue arrives with notifications or scheduled reminders, and not before.

**A monorepo with the client beside the API.** They ship together and their contract changes
together — `docs/design/web.md` §6 is only trustworthy if a serializer change and the TypeScript type
that mirrors it land in the same PR. Two repos would make that a coordination problem.

**The API is the only place a rule lives.** `apps/web` holds no permission logic. Its route guards
choose which screen to render, never who is allowed to do what; the server decides that and the
client shows what it said. This is what makes a second client (mobile) cheap.

## Run it

```bash
# 1. The API. `python3 -m venv` is unavailable on this machine; uv is.
uv venv .venv
VIRTUAL_ENV=.venv uv pip install -r requirements-dev.txt
cd backend && ../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py runserver          # http://127.0.0.1:8000

# 2. The client, in a second terminal.
cd apps/web && npm install
npm run dev                                       # http://localhost:5173

# 3. The gate, before pushing.
.venv/bin/python -m pytest
cd apps/web && npm run lint && npm run typecheck && npm test && npm run build
```

## Status

Everything above is real and runs. The two things that are *not* built are the coach- and
squad-assignment controls, because no endpoint exists to list coaches or player profiles — see
TASKS.md T013/T014. They are absent from the UI rather than stubbed.

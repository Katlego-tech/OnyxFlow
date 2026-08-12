# `OnyxFlow` — Implementation Plan (the HOW)

**Companions:** [SPEC.md](SPEC.md) (the WHAT) · [docs/design/](docs/design/) (the shapes) ·
[TASKS.md](TASKS.md) (the task list)

---

## Summary

One Django REST Framework service owns the whole domain and every authorisation decision; clients
are thin consumers of it over JWT. The technical bet is that keeping the API as the single source of
truth — no domain rule duplicated into a client, ever — is what makes the second client (mobile)
cheap, and it is the reason the web app in `apps/web/` holds no permission logic of its own. The
hard constraint is the role and ownership model: `admin_owner` and `current_coach` are separate,
and no shortcut is allowed to blur them.

---

## Non-negotiables (project principles)

1. **Never weaken or bypass the role and ownership rules.** No endpoint, serializer, view or UI path
   may expose or mutate data the authenticated role is not entitled to, and no test is ever made to
   pass by loosening a permission check. A client may hide a control it knows will 403; that is a
   courtesy, never the enforcement.
2. **The API is the only source of truth.** A client never infers a permission, recomputes a domain
   rule, or holds state the API doesn't have. If a client needs to know something, the API says it.
3. **Test-first.** Each user story writes failing tests before implementation.
4. **Design before code, and no placeholders.** Non-trivial lanes have a merged design doc in
   [docs/design/](docs/design/) with the diagrams implementation is checked against; nothing ships
   with a `TODO`, a stub body, or hard-coded stand-in data. Can't build the real thing → the task
   is blocked, not done. (AGENTS.md §2a ·
   [docs/design-documentation.md](docs/design-documentation.md).)
5. **Phased delivery.** Independent user stories; each phase ends demoable.
6. **Coordinate through shared state.** STATUS.md, AGENTS.md, and TASKS.md are the only coordination
   surfaces; one writer per task.
7. **Branch-only, always-green `main`.** No direct pushes; every change lands via PR with a green gate.

---

## Technical Context

| Dimension | Value |
| --- | --- |
| **Language(s) + versions** | Python 3.11.15 · Node 24.18.0 (LTS line) · TypeScript 6.0.3 |
| **Architecture** | Single Django REST service plus a React SPA — a deliberate deviation from the microservices default. One bounded context, one deployable, solo project; service boundaries would be pure overhead here (`docs/architecture-defaults.md` §1). |
| **Messaging / async** | None. Nothing in this domain is asynchronous yet — every interaction is a request the caller blocks on. Revisit when notifications or scheduled reminders arrive. |
| **Frontend** | React 19.2.8 · Vite 8.1.5 · Tailwind 4.3.3 · shadcn/ui (`base-nova`, on Base UI) · TanStack Query 5 · react-router 8.3.0. Themed to the shadcn UI Kit *academy* dashboard (monochrome zinc, Geist, `0.5rem` radius, collapsible sidebar) — tokens ported from its shipped CSS into `apps/web/src/index.css`. |
| **Containerization** | None yet. `manage.py runserver` and the Vite dev server run directly; the client is a static bundle, which `docs/architecture-defaults.md` §4 names as a legitimate exception. The API is not yet containerized — recorded as a gap in STATUS.md, not as a decision. |
| **Runtime/deploy target** | Local development only so far. No deployment target chosen. |
| **Data layer** | SQLite via Django ORM (`backend/db.sqlite3`). `psycopg2-binary` is already a dependency, so Postgres is the intended production store; the switch is unmade. |
| **Key external services/models** | None. No third-party API, no model inference. |
| **Testing** | `pytest` 9.1.1 + `pytest-django` 4.12.0 (API) · Vitest 4.1.10 + Testing Library (client) · `oxlint` 1.76.0 · `tsc -b` as the type gate |
| **Perf/cost goals** | None set. The client bundle is ~553 kB raw / ~174 kB gzipped; worth a budget once there's a deploy target. |
| **Constraints** | The API's shape is fixed by what already exists — the client is built to it, not the other way round. Backend changes in a frontend lane are limited to additive, non-permission-affecting ones. |
| **Scale** | One club. Tens of users, hundreds of sessions. Nothing here is sized for more. |

---

## Project structure (as scaffolded)

Full write-up: [docs/project-structure.md](docs/project-structure.md).

```
OnyxFlow/
├── AGENTS.md · CLAUDE.md · STATUS.md · SPEC.md · PLAN.md · TASKS.md
├── docs/ (incl. design/web.md)
├── .claude/ · .githooks/pre-push · .github/workflows/ci.yml
├── requirements.txt · requirements-dev.txt · pytest.ini
├── backend/            Django project + the `api` app (the whole domain)
└── apps/web/           the React client
```

---

## Design documents

| Lane | Design doc | Covers |
| --- | --- | --- |
| `web` | [docs/design/web.md](docs/design/web.md) | client domain model, token-refresh sequence, session state machine, the verbatim endpoint contract, component tree, and the token system that is the visual reference |

---

## Build phases (MVP-first)

0. **Design** — ✅ `docs/design/web.md` merged before the client was written.
1. **Setup** — ✅ pinned dependencies, pytest + Vitest, the pre-push gate, CI.
2. **Foundational (blocking)** — ✅ `GET /api/me/`, the typed API client, the session state machine.
3. **US1/US2** — ✅ sign in, register in a role, restore across reloads.
4. **US3/US4** — ✅ teams (list, create, detail, rename, delete) and training (list, create, edit,
   delete), minus the two assignment capabilities blocked on missing endpoints.
5. **US5** — ✅ the player's own profile.
6. **Unblock the assignment lane** — T013/T014: decide who may enumerate coaches and player
   profiles, add the endpoints, then build the squad and coach controls.
7. **Hardening** — the open risks in STATUS.md: `SECRET_KEY` in source, `CORS_ALLOW_ALL_ORIGINS`,
   `DEBUG = True`, the readable-by-anyone team detail endpoint.

---

## Testing gate

- **Test-first:** every story phase writes failing tests before implementation.
- **Gate:** the [pre-push hook](.githooks/pre-push) runs `pytest`, then the client's `npm test` and
  `npm run build`; [CI](.github/workflows/ci.yml) re-runs the same plus lint and typecheck.

See [docs/testing-strategy.md](docs/testing-strategy.md).

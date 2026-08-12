# `OnyxFlow` — STATUS

> Source of truth for "what's going on right now." Read first, update last. Treat updating it as
> part of "done."

_Last updated: 2026-08-12 — by Katlego (via Claude)_

---

## ⇄ HANDOFF: **none**

> Leave this block here even when dormant — it is the first thing every AI reads, and it only
> works as a signal if it always lives in the same spot. Set it to `ACTIVE` and fill the rows
> when handing work to another AI or another session. See
> [docs/cross-ai-protocol.md](docs/cross-ai-protocol.md) § Handoffs.

| Field | Value |
|---|---|
| Status | 🟢 **none** |
| Raised | — |
| Reason | — |
| Document | — |
| Branch | — |
| Resume at | — |
| Blocking | — |

---

## 🎯 Current focus (claim your lane here)

| Lane | Owner | AI | Status |
|------|-------|----|--------|
| `web` | Katlego | Claude | ✅ built — T001–T014, T020–T022 done; unverified in a browser (T019) |
| `api` | — | — | free — T015–T018 open (all hardening) |
| `docs` | — | — | free |

## ⏭️ Next action

1. **Commit.** The whole of this work is still uncommitted — 24 paths in `git status --short`, on
   `chore/kit-gate-realignment`, a branch whose name predates all of it. Branch off it properly and
   land it before anything else; an unpushed working tree is the largest single risk on this board.
2. Look at the client in a browser (T019) — the one outstanding piece of verification. Run
   `python manage.py seed_demo`, then `npm run dev`, and sign in as `ada` / `OnyxFlow!2026`.
   No Chromium-family browser is installed on this machine; Firefox is.
3. Work T015–T017 before this is exposed anywhere but localhost.
4. T018 is a product decision, not a bug: decide what a coach's team list should contain.

## 🗓️ Timeline to `TBD`

| Phase | What | Target window | Status |
|-------|------|---------------|--------|
| Phase 0 | Design the `web` lane | 2026-07-28 | ✅ |
| Phase 1 | Pinned deps, test gate, CI | 2026-07-28 | ✅ |
| Phase 2 | `/api/me/`, typed API client | 2026-07-28 | ✅ |
| Phase 3 | US1/US2 — sign in, register | 2026-07-28 | ✅ |
| Phase 4 | US3/US4 — teams, training | 2026-07-28 | ✅ |
| Phase 5 | US5 — player profile | 2026-07-28 | ✅ |
| Phase 6 | Squad/coach assignment | 2026-07-28 | ✅ |
| Phase 7 | Hardening (T015–T019) | — | ⬜ |

## 🧱 What's built so far

- **The API** (pre-existing): three roles, JWT, teams with `admin_owner`/`current_coach` split,
  training sessions, player profiles, custom permission classes.
- **`GET /api/me/`** — added this session so a client can resolve the signed-in user's role. Five
  tests. JWT moved ahead of Session authentication so an expired token returns 401, not 403.
- **`apps/web`** — React 19 + Vite 8 + Tailwind 4 + shadcn/ui, every dependency pinned exactly,
  `npm audit` clean. Sign in, register in any of the three roles, teams (list/create/detail/rename/
  delete), training (list/create/edit/delete), the player's own profile, dark and light token sets,
  29 tests.
- **The theme** — ported from the shadcn UI Kit *academy* dashboard at the user's request: tokens
  read off that site's shipped CSS (monochrome zinc, `--primary` = `--base-950`, Geist, `0.5rem`
  radius) and a collapsible sidebar shell built on shadcn's `Sidebar`.
- **Assignment (T013/T014)** — `GET /api/coaches/` and `GET /api/players/`, both staff-only;
  `PlayerPublicSerializer` now exposes the profile `id` the write fields need. The team page assigns
  a coach and edits the squad; the session dialog assigns players.
- **`seed_demo` (T022)** — a management command that builds a demo club (1 admin, 2 coaches,
  9 players, 3 teams, 7 sessions) with a known password, and refuses to run with `DEBUG` off.
- **The gate** — `pytest.ini` at the root, the pre-push hook fixed to find this repo's venv and the
  client's own `node_modules`, and a CI workflow that re-runs everything.

## 🛠️ Environment & access

- Backend: `uv venv .venv && VIRTUAL_ENV=.venv uv pip install -r requirements-dev.txt`, then
  `cd backend && ../.venv/bin/python manage.py migrate && ../.venv/bin/python manage.py runserver`.
  (`python3 -m venv` does not work on this machine — `python3.10-venv` is not installed. `uv` is.)
- Client: `cd apps/web && npm install && npm run dev` → http://localhost:5173. Point it elsewhere
  with `VITE_API_BASE_URL` (see `apps/web/.env.example`).
- Port 8000 was already occupied during this session's smoke test; 8010 was used instead.

## ⚠️ Open decisions / risks

- **The directories are club-wide, because there is no club.** `GET /api/coaches/` and
  `GET /api/players/` return *every* coach and *every* profile in the database — there is no tenancy
  concept, which matches SPEC.md's one-club non-goal. The moment a second club exists, both
  endpoints and the unscoped `queryset=PlayerProfile.objects.all()` on the write fields need scoping.
- **Seed accounts share a published password.** `seed_demo` raises rather than running with `DEBUG`
  off, which is the only thing stopping it reaching a real deployment. Don't weaken that check.
- **`SECRET_KEY` is committed** in `backend/backend/settings.py`, `DEBUG = True`, and
  `ALLOWED_HOSTS = ["*"]`. Fine on localhost, not fine anywhere else (T015).
- **`CORS_ALLOW_ALL_ORIGINS = True`** with credentials allowed (T016). Left as-is deliberately —
  changing it is a backend decision outside the `web` lane — but it should not survive a deploy.
- **`GET /api/teams/{id}/` is readable by any authenticated user** (T017). `IsTeamOwner` allows all
  safe methods and the view adds no role check. The client never links to a team it didn't receive
  from `/api/teams/`, which is not a fix.
- **A coach cannot see a team they just created** (T018) — they become its `admin_owner`, but the
  coach branch of `TeamListCreateView.get_queryset` filters on `current_coach`.
- **Tokens live in `localStorage`.** Recorded trade-off, not an oversight: httpOnly cookies are
  stronger and need a backend cookie strategy this lane doesn't own (docs/design/web.md §8).
- **`PlayerProfile.height` has no unit and no validation.** The client displays the number it is
  given rather than inventing "cm".
- **The client has not been looked at in a browser** (T019). Verified by `tsc`, 29 unit tests, a
  full-app mount test and live calls against `runserver` — none of which is a visual pass. This
  matters more since the re-theme: "the tokens are the kit's values" is a fact I checked, "it looks
  like the kit" is not.
- **shadcn/ui now ships on Base UI, not Radix**, which `docs/architecture-defaults.md` §3 still
  names. The deviation is recorded in docs/design/web.md §8; the defaults doc is the thing that's
  out of date.

## 🗒️ Log

- 2026-07-28 — Katlego (via Claude) — Bootstrapped the Cultivation kit into the repo (AGENTS.md,
  CLAUDE.md, STATUS/SPEC/PLAN/TASKS, docs/, .claude/, pre-push hook).
- 2026-07-28 — Katlego (via Claude) — Pinned `requirements.txt` exactly, added `requirements-dev.txt`
  and `pytest.ini`, and made `pytest` runnable from the repo root.
- 2026-07-28 — Katlego (via Claude) — T006: added `GET /api/me/` test-first (five tests, failed with
  404 first), and reordered DRF's authentication classes so an expired token returns 401.
- 2026-07-28 — Katlego (via Claude) — T001: wrote `docs/design/web.md` before any client code, with
  the endpoint contract read off the serializers rather than the README.
- 2026-07-28 — Katlego (via Claude) — T003–T012: built `apps/web` end to end. 23 tests green,
  `tsc -b` clean, `npm audit` clean, verified against a live `runserver` on port 8010.
- 2026-07-28 — Katlego (via Claude) — T004/T005: fixed the pre-push hook for this repo's layout and
  added the CI workflow.
- 2026-07-28 — Katlego (via Claude) — T021: re-themed the client to the shadcn UI Kit academy
  dashboard on request. Tokens read off its shipped stylesheet rather than eyeballed; top-bar shell
  replaced with a collapsible sidebar; IBM Plex swapped for Geist. 24 tests green, build clean.
- 2026-07-28 — Katlego (via Claude) — T013/T014: unblocked assignment. Added `GET /api/coaches/` and
  `GET /api/players/` (staff-only) test-first — 13 tests failed on 404 and `KeyError: 'id'` first —
  and exposed the profile pk on `PlayerPublicSerializer`. Built `CoachSelect` and `PlayerPicker`.
  Permission policy chosen: staff only; recorded in docs/design/web.md §8.
- 2026-07-28 — Katlego (via Claude) — T022: added `seed_demo`. Verified the full assignment loop
  against a live server — coach assign/clear, squad set, session with players, and 403 for a player
  on both directories. 20 backend + 29 frontend tests green.
- 2026-08-12 — Katlego (via Claude) — T020: ran the placeholder sweep. Clean; the single bare `pass`
  is a deliberate exception swallow in `signals.py`. Re-ran both suites on picking the work back up —
  20 backend, 29 frontend, still green. Nothing has been committed yet; that is now next action #1.

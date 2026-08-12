# `OnyxFlow` — Tasks

**Plan:** [PLAN.md](PLAN.md) · **Spec:** [SPEC.md](SPEC.md) · **Designs:** [docs/design/](docs/design/)

> One of the three shared-state files (with [AGENTS.md](AGENTS.md) and [STATUS.md](STATUS.md)).
> **One writer per task** — claim it in STATUS.md before you start.

---

## How tasks are written here

A task is a **contract**, not a reminder. The person writing it and the person (or AI) building it
are usually not the same, and the builder will implement *exactly* what the task specifies — so a
task that under-specifies gets you something plausible-looking and wrong: the right file with a
`TODO` in it, a component that renders *a* screen rather than *the* screen, a function with the
agreed name and a stubbed body.

**The task is under-specified if a competent implementer who read nothing else could build
something structurally different from what you intend.** When that's true, the fix is not a longer
sentence — it's a design doc ([docs/design-documentation.md](docs/design-documentation.md)) and a
reference to it.

### Anatomy

```
- [ ] T0nn [P] [US1] <imperative one-line summary>
      Design:  docs/design/<lane>.md §<section>        <- the structure to build to
      Files:   <paths this task creates or changes>
      Contract:<exact signature / schema / props — or the design §ref that has it>
      Verify:  <the command or check that proves it works>
      Done:    <the observable end state, in the user's or caller's terms>
```

| Field | Required when | Why it's there |
| --- | --- | --- |
| **Design** | the task creates structure (types, services, screens, flows) | gives the implementer a diagram to build to instead of a guess |
| **Files** | always, unless genuinely unknowable | stops two lanes colliding; makes "did it touch the right thing" reviewable |
| **Contract** | anything another lane or task consumes | lets parallel lanes compose instead of each inventing an interface |
| **Verify** | always | a task with no check is a task nobody can close honestly |
| **Done** | always | phrased as an outcome, so "the file exists" can't pass for "it works" |

### Rules

1. **No placeholder deliverables.** A task may not be closed with `TODO`, `FIXME`, `pass`,
   `NotImplementedError`, an empty component, hard-coded fake data standing in for a real call, or
   a function that returns a constant to make a test green. If the real thing can't be built yet,
   the task is **blocked**, not done — say so in STATUS.md and name what unblocks it.
   *The one exception:* a deliberately stubbed dependency that the task text names as a stub, with
   a follow-up task ID already written for replacing it.
2. **Every task is a vertical slice.** "Create the module skeleton" is not a task; "parse a
   pain.001 payload into a `Transfer` and reject a malformed one" is. Scaffolding is part of the
   first behavioural task, not a task of its own.
3. **Sized to one sitting.** If a task can't be finished and verified in one working session,
   split it. Long tasks are where placeholders come from — the implementer runs out of room and
   leaves a marker.
4. **Tests first, and the test must fail for the right reason.** A test that passes against an
   empty implementation is not a test. Write it, watch it fail, then implement.
5. **UI tasks name their visual reference by path.** Never "build the dashboard" — always "build
   the dashboard in `<path>/screen.png`, matching layout, tokens and copy". See
   [docs/design-documentation.md](docs/design-documentation.md) § UI is a special case.
6. **One story label per task.** If a task serves two user stories, it's two tasks.
7. **`[P]` means genuinely parallel** — disjoint files *and* no unmet dependency. If two `[P]`
   siblings both touch the same file, one of them is mislabelled.

### Good vs. bad

> ❌ `- [ ] T014 [US2] Build the compliance dashboard`
>
> Produces: *a* dashboard. Some cards, some invented metrics, a chart library nobody chose.
>
> ✅
> ```
> - [ ] T014 [US2] Build the Compliance Health Dashboard screen
>       Design:  docs/design/compliance-ui.md §3 (component tree), §2 (reference)
>       Files:   apps/web/src/pages/ComplianceDashboard.tsx, apps/web/src/components/compliance/*
>       Contract:consumes GET /api/compliance/health -> ComplianceHealth (docs/design/compliance-ui.md §6)
>       Verify:  npm test -w apps/web && npm run dev, compare against legacy/mockups/compliance/screen.png
>       Done:    all six modules from the mockup render with live data from the endpoint; no
>                hard-coded metric values remain in the component
> ```

---

## Legend

Format: `[ID] [P?] [Story] Description`

- **[ID]** — task identifier `Tnnn`, monotonically increasing, never reused.
- **[P]** — parallelizable: touches different files from its siblings and has no unmet dependency.
- **[Story]** — the label the task serves (`US1`–`USn`, `SET` setup, `FND` foundational,
  `DSN` design/documentation, `POL` polish).
- Commit format: `feat(scope): Tnnn short description` (e.g. `feat(audio): T041 add HIP whisper loader`).

Each user-story phase is ordered **Design → Tests FIRST (must FAIL) → Implementation → Checkpoint**.

---

## Phase 0 — Design

- [x] T001 [DSN] Write the `web` lane design doc before any client code exists.
      Files:   docs/design/web.md, docs/design/README.md
      Verify:  every §6 contract row read off `backend/api/*.py`, not README.md
      Done:    domain model, refresh sequence, session state machine, endpoint contract, component
               tree and token system are written down; the two capabilities with no endpoint behind
               them are named as blocked rather than designed around

**Checkpoint:** ✅ `docs/design/web.md` merged; `docs/design/README.md` indexes it.

---

## Phase 1 — Setup

- [x] T002 [SET] Pin every backend dependency and stand up a runnable test gate.
      Files:   requirements.txt, requirements-dev.txt, pytest.ini
      Verify:  `.venv/bin/python -m pytest` collects and runs
      Done:    exact versions pinned (architecture-defaults §5); `pytest.ini` points at
               `backend.settings` and excludes `backend/api_test.py`, which needs a live server
- [x] T003 [P] [SET] Scaffold `apps/web` on the pinned latest-stable stack.
      Files:   apps/web/package.json, vite.config.ts, tsconfig*.json, components.json
      Verify:  `npm run typecheck && npm run build`
      Done:    Vite 8 + React 19 + TS 6 + Tailwind 4 + shadcn/ui build clean with every dependency
               pinned to an exact version and `npm audit` reporting zero vulnerabilities
- [x] T004 [SET] Make the pre-push gate match this repo's actual layout.
      Files:   .githooks/pre-push
      Verify:  the hook finds `.venv/bin/python` and `apps/web/node_modules`
      Done:    the template's root-only `node_modules` check is replaced by a per-workspace one, so
               the client's suite actually runs instead of silently skipping
- [x] T005 [P] [SET] Add CI that re-runs the same gate.
      Files:   .github/workflows/ci.yml
      Done:    two jobs — pytest, and lint + typecheck + test + build for the client

**Checkpoint:** ✅ both suites run locally; the gate is real.

---

## Phase 2 — Foundational (blocking)

- [x] T006 [FND] Give clients a way to learn the signed-in user's role.
      Design:  docs/design/web.md §8
      Files:   backend/api/views.py, backend/api/urls.py, backend/api/tests.py,
               backend/backend/settings.py
      Contract:`GET /api/me/` → `{id, username, role}`; 401 when anonymous
      Verify:  `python -m pytest` — the five tests failed with 404 before the view existed
      Done:    the endpoint returns exactly those three keys for each role and leaks nothing else;
               JWT moved ahead of Session in `DEFAULT_AUTHENTICATION_CLASSES` so an expired token
               returns 401 rather than a 403 indistinguishable from a role denial. No permission
               check changed.
- [x] T007 [FND] Build the typed API client and its refresh behaviour.
      Design:  docs/design/web.md §4, §6
      Files:   apps/web/src/lib/{api,tokens,types,format}.ts, apps/web/src/lib/api.test.ts
      Contract:`apiFetch<T>(path, options)`; `ApiError`; `SessionExpiredError`
      Verify:  `npm test` — 13 tests over the refresh flow and DRF error dialects
      Done:    one refresh per expiry no matter how many requests race it, the original request
               retried exactly once, tokens cleared and `SessionExpiredError` thrown when the
               refresh is rejected

**Checkpoint:** ✅ the client can talk to the API and survive an expiry.

---

## Phase 3 — US1/US2 Sessions and registration

- [x] T008 [US1] Implement the session state machine and its route guards.
      Design:  docs/design/web.md §5
      Files:   apps/web/src/auth/*, apps/web/src/auth/session.test.tsx
      Verify:  `npm test` — including "never flashes the sign-in screen while restoring"
      Done:    a reload restores the user from the stored token; a dead session clears it and drops
               to anonymous; a player is routed away from staff screens
- [x] T009 [US2] Build the sign-in and role-selecting registration screens.
      Design:  docs/design/web.md §7
      Files:   apps/web/src/pages/{LoginPage,RegisterPage}.tsx, apps/web/src/App.test.tsx
      Verify:  `npm test` — the app mounts and renders both screens
      Done:    both screens post to the real endpoints and report field-level API errors beside the
               form rather than in a toast that slides away

**Checkpoint:** ✅ US1 and US2 demoable end to end against `runserver`.

---

## Phase 4 — US3/US4 Teams and training

- [x] T010 [US3] Build the teams list, create dialog and detail screen.
      Design:  docs/design/web.md §2.1 (the load band), §6, §7
      Files:   apps/web/src/pages/{TeamsPage,TeamDetailPage}.tsx, apps/web/src/components/*
      Contract:`GET/POST /api/teams/`, `GET/PATCH/DELETE /api/teams/{id}/`
      Verify:  `npm run build`; against `runserver`, create → rename → delete a team as its owner
      Done:    squad size is drawn as a load band against the largest squad in view; rename and
               delete appear only for the `admin_owner`. Coach and squad shipped read-only here
               because no endpoint existed to change them; T013/T014 have since added the controls.
- [x] T011 [US4] Build the training list with create, edit and delete.
      Design:  docs/design/web.md §2.1, §6
      Files:   apps/web/src/pages/TrainingsPage.tsx
      Contract:`GET/POST /api/trainings/`, `PATCH/DELETE /api/trainings/{id}/`
      Verify:  `npm run build`; against `runserver`, schedule → edit → delete a session
      Done:    each session's length is drawn against the longest in view; a team the caller does
               not own is rejected with the API's own message, unmodified

**Checkpoint:** ✅ US3 and US4 demoable, minus the two blocked assignment capabilities.

---

## Phase 5 — US5 The player's own profile

- [x] T012 [US5] Build the profile screen.
      Design:  docs/design/web.md §6, §7
      Files:   apps/web/src/pages/ProfilePage.tsx
      Contract:`GET/PATCH /api/profiles/` → `{id, user, height, team_name}`
      Verify:  against `runserver` as a player, read the profile and set/clear the height
      Done:    height saves and clears; rating is absent because the endpoint does not return it,
               and the screen says so rather than showing an empty field

**Checkpoint:** ✅ US5 demoable.

---

## Phase 6 — Squad and coach assignment

- [x] T013 [US3] Add the coach directory and the coach-assignment control.
      Design:  docs/design/web.md §6 ("The two directories")
      Files:   backend/api/{views,urls}.py, backend/api/tests.py,
               apps/web/src/api/queries.ts, apps/web/src/pages/TeamDetailPage.tsx
      Contract:`GET /api/coaches/` -> `User[]` filtered to `role='coach'`; `IsAdminOrCoach`
      Verify:  `python -m pytest` — five tests, incl. a player receiving 403; then against
               `runserver`, assign and clear a coach from the team page
      Done:    a team's `current_coach` can be set and cleared from a picker; a player calling the
               endpoint gets 403; ownership is untouched by the change
- [x] T014 [US3] Add the player directory, expose the profile pk, and build the squad picker.
      Design:  docs/design/web.md §6
      Files:   backend/api/{serializers,views,urls}.py, backend/api/tests.py,
               apps/web/src/lib/types.ts, apps/web/src/components/PlayerPicker.tsx,
               apps/web/src/pages/{TeamDetailPage,TrainingsPage}.tsx
      Contract:`GET /api/players/` -> `PlayerPublic[]`, now carrying `id` (the PlayerProfile pk);
               `IsAdminOrCoach`
      Verify:  `python -m pytest` and `npm test` — incl. `PlayerPicker.test.tsx` asserting the
               emitted id is the profile pk and never `user.id`
      Done:    players can be added to and removed from a team and a session; the squad table keys
               off the profile id; a player calling the endpoint gets 403
- [x] T022 [SET] Seed a demo club so the UI can be looked at.
      Files:   backend/api/management/commands/seed_demo.py
      Verify:  `python manage.py seed_demo` twice — second run changes nothing
      Done:    1 admin, 2 coaches, 9 players, 3 teams of differing sizes and 7 sessions of differing
               lengths exist; every account's password is printed; the command raises `CommandError`
               rather than running with `DEBUG` off

---

## Phase 7 — Hardening

> The risks recorded in STATUS.md. None of these are frontend work; all of them are real.

- [ ] T015 [POL] Move `SECRET_KEY` out of `backend/backend/settings.py` into the environment, and
      turn `DEBUG` off outside development. `python-dotenv` is already a dependency and unused.
- [ ] T016 [POL] Replace `CORS_ALLOW_ALL_ORIGINS = True` with an explicit allowlist read from the
      environment, defaulting to the Vite dev origin.
- [ ] T017 [POL] Decide whether `GET /api/teams/{id}/` should be readable by any authenticated user.
      `IsTeamOwner` returns `True` for all safe methods and `TeamDetailView` adds no role check, so
      a player can read any team by guessing an id.
- [ ] T018 [POL] Decide what a coach's team list should contain. A coach who creates a team becomes
      its `admin_owner` while `current_coach` stays null, and `TeamListCreateView` filters a coach's
      list on `current_coach` — so a coach cannot see the team they just created.
- [x] T021 [POL] Re-theme the client to the shadcn UI Kit "academy" dashboard.
      Design:  docs/design/web.md §2.1 (rewritten — the brief now pins the direction)
      Files:   apps/web/src/index.css, apps/web/src/components/*, apps/web/src/pages/*
      Contract:the token set in `:root` / `.dark`, ported from that site's shipped CSS
      Verify:  `npm run typecheck && npm test && npm run build` — 24 tests green
      Done:    monochrome zinc ramp with `--primary` = `--base-950`, Geist + Geist Mono, `0.5rem`
               radius, and a collapsible shadcn `Sidebar` shell with card/table content. No hex
               literal outside `index.css`; the design doc records the direction as brief-specified
               rather than invented.

- [ ] T023 [SET] Make the pre-push gate check the *committed* tree, not the working tree.
      Design:  none — one change to scripts/gate.sh
      Files:   scripts/gate.sh
      Contract:the client checks run against `git archive HEAD` (or an equivalent clean export)
               rather than the working directory
      Verify:  delete a tracked source file from the index but leave it on disk; the gate must fail
      Done:    a file that exists locally and is not in the repository fails the gate rather than
               passing it. This is not hypothetical: `.gitignore` swallowed `apps/web/src/lib/`,
               the gate passed against the working tree, and CI caught it only after the merge.

- [ ] T019 [POL] Give `apps/web` a visual pass in a real browser at 375px and 1440px, in both token
      sets, against docs/design/web.md §2.1. The client has been verified by build, unit tests and
      live API calls, but not yet looked at. `python manage.py seed_demo` provides the data (T022).
- [x] T020 [POL] Sweep for placeholders: no `TODO`/`FIXME`/stub bodies/hard-coded sample data
      remain outside of tasks that explicitly declared them, and each declared one has an open
      follow-up task ID.
      Verify:  `grep -rnE 'TODO|FIXME|XXX|HACK'` over `apps/web/src` and `backend/api` → no hits;
               `grep` for bare `pass` / `...` / `NotImplementedError` bodies → one hit, and it is a
               deliberate `except PlayerProfile.DoesNotExist: pass` in `signals.py`, not a stub
      Done:    the only hard-coded roster in the tree is `seed_demo.py`, whose entire purpose is to
               be one (T022); no screen renders invented data in place of an API call

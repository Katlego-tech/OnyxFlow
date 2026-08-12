# `OnyxFlow` — Specification (the WHAT)

**Related:** [PLAN.md](PLAN.md) (the HOW) · [TASKS.md](TASKS.md) (the backlog)

---

## Overview

OnyxFlow is a sports team management system for a club. A Django REST Framework API owns the domain
— users in three roles, teams, squads and training sessions — and is the single source of truth for
every client. The React web client in `apps/web/` is the first of those clients; mobile is expected
to be the second, which is why no domain rule lives anywhere but the API.

The system's defining structural decision is that a **team's ownership and its coaching role are
separate fields**: `admin_owner` is stable, `current_coach` is volatile. A coach leaving does not
take the team record with them.

### Goals

- Register and authenticate Admins, Coaches and Players with stateless JWT, so any client works the
  same way.
- Let Admins and Coaches create teams and schedule training sessions against them.
- Let Players read and maintain their own profile.
- Enforce role and ownership rules server-side, on every path, with the client as a pure consumer.

### Non-goals

- No server-rendered Django templates. The API is decoupled; the browser client is a separate app.
- No attendance, results, fixtures, or performance analytics beyond the `rating` field that already
  exists.
- No multi-club tenancy. Every user is in one club.
- No offline support in the web client.

---

## Actors

### Admin

Registers at `/api/auth/register/admin/`. Creates teams and becomes their `admin_owner`. Only an
`admin_owner` may rename or delete a team. Schedules and edits training sessions.

### Coach

Registers at `/api/auth/register/coach/`. Can create teams and schedule sessions with the same
rights as an Admin, and is what `Team.current_coach` points at when assigned.

### Player

Registers at `/api/auth/register/player/`. A `PlayerProfile` is created automatically by a signal.
Reads and updates their own profile, and nothing else — team and session lists refuse them.

---

## User stories

### US1 — Sign in from any client (P1)

**As a** club member, **I want** to sign in with my username and password and stay signed in across
page reloads, **so that** I'm not re-authenticating every time I open the app.

**Acceptance criteria:**
- [x] `POST /api/token/` with valid credentials returns an access and a refresh token.
- [x] Reloading the browser client restores the session from the stored token without showing the
      sign-in screen first.
- [x] An expired access token is refreshed transparently, once, no matter how many requests hit the
      expiry at the same moment.
- [x] A rejected refresh signs the user out rather than leaving the app half-authenticated.

### US2 — Register in a role (P1)

**As a** new club member, **I want** to create an account as an Admin, Coach or Player, **so that**
I get the screens my job needs.

**Acceptance criteria:**
- [x] The three registration endpoints each create a user with that role and return a token pair.
- [x] Registering as a Player creates their `PlayerProfile` automatically.
- [x] A password mismatch or a weak password is reported against the field that caused it.

### US3 — Run the club's teams (P1)

**As an** Admin or Coach, **I want** to see the teams I'm responsible for and create new ones,
**so that** the club's structure is recorded in one place.

**Acceptance criteria:**
- [x] `GET /api/teams/` lists the caller's teams; a Player receives 403.
- [x] Creating a team makes the creator its `admin_owner`.
- [x] A team's detail view shows its owner, current coach, squad and creation date.
- [x] Only the `admin_owner` can rename or delete a team; nobody else is shown those controls.
- [x] The owner can assign, change and clear a team's `current_coach` from a picker backed by
      `GET /api/coaches/`; ownership is unaffected by the change.
- [x] The owner can add and remove squad members from a picker backed by `GET /api/players/`.
- [x] Neither directory is readable by a Player.

### US4 — Schedule training (P1)

**As an** Admin or Coach, **I want** to schedule sessions with a focus and a length and see them
against each other, **so that** I can read the training load at a glance.

**Acceptance criteria:**
- [x] `GET /api/trainings/` lists the caller's sessions; a Player receives 403.
- [x] A session can be created, edited and deleted with a focus, a length in minutes, and
      optionally a team the caller owns and a set of players.
- [x] Assigning a session to a team the caller does not own is rejected with the API's own message.
- [x] The list draws each session's length relative to the longest one in view.

### US5 — Keep my own profile (P2)

**As a** Player, **I want** to see and update my profile, **so that** my details are current without
asking a coach.

**Acceptance criteria:**
- [x] `GET /api/profiles/` returns only the caller's own profile.
- [x] Height can be updated, and cleared by saving an empty value.
- [x] The rating is not editable by the player — the endpoint does not expose it.

---

## Acceptance criteria (system-level)

- [x] Every authorisation decision is made by the API. The client hides controls it knows will fail,
      but hiding is never the enforcement.
- [x] An unauthenticated request returns 401 and a role denial returns 403, so a client can tell
      "refresh the token" apart from "you may not do that".
- [x] The web client compiles against a single declaration of the API's response shapes; no screen
      invents a field.
- [x] No screen ships hard-coded stand-in data. A capability with no endpoint behind it is absent
      and recorded as blocked, not mocked.
- [x] The client is usable at 375px, keyboard-navigable with visible focus, and honours
      `prefers-reduced-motion`.

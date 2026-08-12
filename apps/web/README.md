# OnyxFlow — web client

The React client for the OnyxFlow API. It is a pure consumer: every authorisation decision belongs
to the API, and nothing in here reimplements one.

Design doc — including the endpoint contract this is built against and the token system that is its
visual reference — is [`docs/design/web.md`](../../docs/design/web.md).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

The API is expected at `http://127.0.0.1:8000`. Point it elsewhere by copying `.env.example` to
`.env.local` and setting `VITE_API_BASE_URL`.

```bash
npm run typecheck  # tsc -b
npm run lint       # oxlint
npm test           # vitest run
npm run build      # tsc -b && vite build
```

## The stack, and why

| Choice | Why this one |
| --- | --- |
| Vite 8 + React 19 + TypeScript 6 | pinned to exact versions; `tsc -b` is a real gate, not a formality |
| Tailwind 4 + shadcn/ui | copy-paste-owned components, restyled onto this project's tokens rather than shipped with the stock theme |
| TanStack Query 5 | this app is almost entirely server state, and invalidation after a mutation is the whole problem |
| react-router 8 | `react-router-dom` 7.18.1 sits inside GHSA-qwww-vcr4-c8h2; v8 merged the DOM package in |
| `@fontsource-variable/geist` | Geist is the theme's face, self-hosted so first paint doesn't depend on a third party |

## How it's laid out

```
src/
├── index.css        the token system — every colour, face and radius starts here
├── App.tsx          providers + the route table
├── lib/
│   ├── types.ts     the API contract, declared once
│   ├── tokens.ts    the only module that touches storage
│   ├── api.ts       the only module that calls fetch
│   └── format.ts    shared formatting
├── auth/            the session state machine, its context, the route guards
├── api/queries.ts   one hook per endpoint in use
├── components/      AppShell, LoadBand, PageHeader, Empty/ErrorState, ThemeToggle
│   └── ui/          shadcn/ui components (owned copies — edit them)
└── pages/           one file per screen
```

Two rules worth knowing before you add to it:

1. **Only `lib/api.ts` calls `fetch`.** The token refresh is single-flight and lives there; a second
   caller doing its own fetch reintroduces the race it exists to prevent.
2. **Only `index.css` defines a colour.** A hex literal in a component is a defect — the whole point
   of the token system is that light and dark stay in step without anyone remembering to check.

## The theme

The tokens in `src/index.css` are the shadcn UI Kit **academy** theme
(<https://shadcnuikit.com/dashboard/academy>), read off that site's shipped stylesheet rather than
approximated: a monochrome zinc ramp where `--primary` is the darkest base step, so the interface
carries no hue and colour is reserved for `--destructive`. Geist for text, Geist Mono for numerals,
`0.5rem` radius, a collapsible left sidebar with the content area one step lighter than it.

## The load band

Lists draw each row's quantity as a bar against the largest value in the same view — session length,
squad size, player rating — filled with `--chart-1` so it reads as data, not as an accent. It's one
device, reused, and it always encodes real data: there is no decorative variant, and it isn't used
where there's nothing to compare against (which is why the profile screen doesn't have one).

## Assignment

The team page assigns a coach (`GET /api/coaches/`) and edits the squad (`GET /api/players/`, via
`PlayerPicker`); the session dialog assigns players the same way. Both directories are staff-only,
so `PlayerPicker` must never appear on a player-facing screen.

One thing to keep in mind when touching either: **`PlayerPublic.id` is the PlayerProfile pk, not
`user.id`.** The write fields want the former. They're different numbers for the same person and the
API accepts the wrong one happily, so `PlayerPicker.test.tsx` pins it.

## Seeded data

`cd backend && ../.venv/bin/python manage.py seed_demo` creates a club to look at — 1 admin,
2 coaches, 9 players, 3 teams of different sizes, 7 sessions of different lengths. Every account's
password is `OnyxFlow!2026`. The command refuses to run with `DEBUG` off.

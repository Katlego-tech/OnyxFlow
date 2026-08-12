# Testing strategy ("main is always green")

The whole workflow exists to guarantee one thing: **only ever push working, tested code to `main`.**
This is how parallel contributors (human or AI) avoid breaking each other's work and always have a
demo-ready product.

## The rule

> **No stage advances without passing tests. Every feature ships with its tests.**

A task in [TASKS.md](../TASKS.md) is not `[x]` done until its tests exist and pass.

## The two gates

1. **Local pre-push hook** (`.githooks/pre-push`) — runs the suite before every `git push`. Blocks
   the push if anything fails. Enable once per clone: `git config core.hooksPath .githooks`.
2. **CI** — re-runs the full suite on every push and PR to `main`. The backstop in case someone
   didn't enable the hook, plus anything too slow/expensive to run on every local push (real-model
   integration tests, latency benchmarks).

Both gates should skip gracefully while a layer doesn't exist yet (no backend → no pytest), then
activate automatically as code lands. See the sample hook in
[git-workflow.md](git-workflow.md#a-working-pre-push-hook-to-start-from).

## Test layers

| Layer | Tool | What it proves |
|-------|------|----------------|
| **Unit (API)** | `pytest` + `pytest-django` (`backend/api/tests.py`) | A view returns the right shape and the right status for each role. Run from the repo root; `pytest.ini` supplies the settings module. |
| **Permission** | `pytest`, and the 403/401 assertions in `backend/api_test.py` | The thing Non-negotiable I protects: each role can reach exactly what it should and nothing more. **Never** fixed by relaxing a permission class. |
| **Contract** | `tsc -b` in `apps/web` | The client compiles against one declaration of the API's shapes (`src/lib/types.ts`), so a serializer change that isn't mirrored fails the build rather than the browser. |
| **Unit (client)** | `vitest` | The token-refresh flow and the session state machine behave as `docs/design/web.md` §4–§5 draw them — including how many refreshes fire, not just that one did. |
| **Frontend render** | Testing Library (`src/App.test.tsx`) | The whole app mounts: provider order, aliases, and no component throwing on first render. |
| **Live integration** | `backend/api_test.py` against `runserver` | The full golden path over real HTTP. Excluded from `pytest` on purpose — it needs a server. |
| **Visual** | a human, in a browser | Screens match `docs/design/web.md` §2.1 at 375px and 1440px, in both token sets, with keyboard focus visible. Not yet done — TASKS.md T019. |

## Integration tests against real infrastructure

Unit tests mock the broker and datastore; integration tests should exercise the real ones. Stand
them up with the project's `docker-compose.yml` (the same one used for local dev — see
[architecture-defaults.md](architecture-defaults.md) §4) rather than mocking Kafka/RabbitMQ or the
DB, so the test proves the actual wire format and delivery semantics. Keep these in the CI lane, not
the pre-push hook, if they're slow to spin up — `docker compose up -d` in CI, tear down after. Pin
the broker/datastore image versions (architecture-defaults §5) so a test failure is never "the image
silently moved."

## Mocking AI/external calls in tests

Unit tests must not call real external models or paid APIs (slow, costs money, needs a key,
non-deterministic). Wrap every such call behind a service interface and inject a fake in tests that
returns canned, deterministic output. Keep a **small, opt-in live smoke test** (skipped unless the
relevant API key is set) to catch real integration drift — run it manually before a checkpoint/release,
not in every CI run.

## Grounding tests (if your project generates content from a source)

If any part of the system produces "facts" derived from user-supplied input (a document, a
transcript, a database), assert grounding explicitly rather than trusting the model's output on
faith:

```python
def test_extracted_entities_are_in_source(sample_input, extraction_service_fake):
    result = extraction_service_fake.extract(sample_input.text)
    for entity in result.entities:
        assert entity.name.lower() in sample_input.text.lower()
```

This is the single test category most worth having in any AI-generating pipeline — hallucinated
output in a real deliverable (a schedule, a report, a citation) is the failure mode that actually
hurts users, not a missed edge case.

## Golden-path regression tests

Lock a small, fixed set of representative inputs (e.g. 2-3 known examples covering distinct
categories) and assert structure + key properties of the output stay stable across changes. Cheap to
maintain, catches regressions that unit tests miss because they mock too much.

## Coverage expectations

- Business logic and anything that could silently produce wrong output: high coverage — this is the
  risk surface.
- Endpoints: at least a happy-path + an auth-failure + a validation-failure test each.
- Don't chase 100% on glue code; do cover anything that could ship a wrong answer quietly.

## Definition of Done (testing slice)

- [ ] New/changed behavior has tests; suite passes locally (hook green).
- [ ] CI green on the branch.
- [ ] Grounding preserved, if applicable (no path that lets the system invent unverified data untested).

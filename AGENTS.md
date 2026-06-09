# Code Style

## Simplicity

- Keep it simple - avoid overengineering
- Always strive for simple, concise solutions
- If a problem can be solved simpler, propose it

## Go Conventions

- Clean, lean code: DRY, extract common logic, keep functions focused
- run `go fix` on the .go files you've touched, to ensure up to date syntax.

# Frontend Conventions
- use `pb.send(...)` instead of `fetch(...)` when possible, the pocketbase js SDK integrates auth already.
- always use the generated pocketbase types `frontend/src/types/pocketbase-types.ts` where possible.
- if you made DB changes or migrations, always regenerate `frontend/src/types/pocketbase-types.ts` with `make fe-pb-types`

## Core Priorities
1. Performance first.
2. Reliability first.
3. Keep behavior predictable under load and during failures.

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Maintainability

Long term maintainability is a core priority.
If you add new functionality, first check if there are shared logic that can be extracted to a separate package.
Duplicate logic across mulitple files is a code smell and should be avoided. Don't be afraid to change existing code.
Don't take shortcuts by just adding local logic to solve a problem.



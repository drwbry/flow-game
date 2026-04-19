# Terminal Flow — Development Instructions

## Setup

- Node.js 18+
- `npm install` to install dependencies
- `npm test` to run Jest tests
- `npm run dev` to start dev server (Phase 1/2 UI)

## Architecture

Core game logic in `src/lib/engine/`:
- Each module (NodeManager, Economy, etc.) is independently testable
- GameEngine orchestrates modules in 1-second tick sequence
- All packet counts use 100x scale for integer math

## Testing

Run all tests: `npm test`
Run specific test: `npm test -- nodeManager.test.ts`
Watch mode: `npm test -- --watch`

Minimal viable TDD: test quantifiable rules (heat formula, deadline enforcement, sentiment math), skip obvious getters/setters.

## Commits

Commit after each task completes. Keep commits small and focused.

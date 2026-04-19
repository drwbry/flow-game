# Terminal Flow — Core Implementation Design

**Project:** Terminal Flow (Android idle game)  
**Date:** 2026-04-19  
**Scope:** Core game engine + 6 modules (Phase 1 + 2 logic)  
**Approach:** Core-first, minimal viable TDD

---

## Overview

This design covers the implementation of the Terminal Flow game's core logic: 6 independent modules orchestrated by a GameEngine, with minimal viable test coverage on quantifiable game rules. The goal is a bulletproof game loop that can be verified without UI, enabling Phase 1 and Phase 2 to be built on a solid foundation.

**Key decision:** Heat does NOT cause meltdown/offline; instead, high heat throttles throughput with a minimum floor of 100 packets/second. This preserves idle progression while rewarding active cooling.

---

## Architecture & Module Dependencies

Six modules are implemented in dependency order, each with a clean interface and local state:

### Module Order (dependency-first)

1. **NodeManager** — Foundation: node state, heat calculation, throughput throttling
2. **Economy** — Credit tracking, transaction history
3. **UpgradeSystem** — Tracks purchased upgrades, applies stat modifiers to nodes
4. **SentimentSystem** — Reputation (0–100), gates contract difficulty, tracks streaks
5. **ContractSystem** — SLA management, deadline enforcement, packet routing
6. **GameEngine** — Orchestrates all modules, runs 1-second tick loop, enforces global rules

Each module exports:
- Constructor: `new Module(stateSlice)`
- Getter: `getState(): StateSlice`
- Update methods: `process(), tick(), applyEffect()`, etc.
- No side effects or dependencies on other modules except through GameEngine

---

## Data Model

### Root Game State

```typescript
type GameState = {
  player: {
    credits: number
    totalPacketsProcessed: number
    sentiment: number // 0–100
    consecutiveSuccesses: number
  }
  nodes: Array<{
    id: string
    throughput: number // base packets/second, 100x scale
    heat: number // 0–100
    efficiency: number // 0.0–1.0, affects cooling
    status: "online" | "critical" // online if heat < 100, critical if >= 80
    upgrades: string[] // upgrade IDs
    lastMeltdownTime: number | null // no longer used for hard offline, kept for telemetry
  }>
  contracts: Array<{
    id: string
    targetVolume: number // 100x scale (e.g., 10,000 packets)
    currentVolume: number
    deadline: number // timestamp
    reward: number // credits
    penalty: number // credits
    status: "active" | "completed" | "failed"
    difficulty: "safe" | "hard"
  }>
  upgrades: Array<{
    id: string
    name: string
    cost: number
    effects: { throughput?: number; efficiency?: number; cooling?: number }
  }>
  metadata: {
    lastTickTime: number
    gameStartTime: number
  }
}
```

### Scaling Note

All packet counts and throughput use **100x scale** for integer arithmetic:
- Throughput: 200 (means 200 packets/sec, not 2)
- Safe contract: 10,000 packets (was 100 in narrative, now 10,000)
- Hard contract: 10,000 packets (same volume, tighter deadline)
- Minimum floor: 100 packets/sec at max heat

---

## Game Loop: The "Pulse"

Every 1 second:

1. **NodeManager.tick()** — For each node:
   - Calculate heat delta: `ΔH = (throughput × K) − (coolingCapacity × efficiency)`
   - Cap heat at 0–100
   - Mark as "critical" if heat ≥ 80
   - Calculate effective throughput: `max(base_throughput × (1 − heat/100), 100)`
   - Generate `effective_throughput` packets into the pool

2. **ContractSystem.tick()** — For each active contract:
   - Route completed packets (consume from pool, add to currentVolume)
   - Check for deadline expiry:
     - **Success:** `currentVolume ≥ targetVolume` → award credits, increment streak, trigger sentiment boost
     - **Failure:** `currentVolume < targetVolume` → apply penalty, reset streak, trigger sentiment penalty

3. **SentimentSystem.update()** — Process sentiment changes from contract results:
   - Success: +5 base, +1 per consecutive success (can reach +8 on 3-streak)
   - Failure: −15 (significant penalty, creates recovery arc)

4. **ContractSystem.generate()** — If contracts expired, generate 2–3 new ones:
   - Difficulty weighted by sentiment:
     - Sentiment 0–30: 80% safe, 20% hard
     - Sentiment 30–70: 50% safe, 50% hard
     - Sentiment 70–100: 20% safe, 80% hard

5. **Economy.settle()** — Calculate credits from completed packets:
   - `credits += packets_processed × (market_value_per_packet)`

6. **UI.update()** — Re-render with new state (Phase 1 & 2)

---

## Heat Throttling Mechanic

**Core principle:** Heat never stops progress, only slows it.

- **Throughput calculation:**
  ```
  effective_throughput = max(
    base_throughput × (1 − heat / 100),
    100  // minimum floor
  )
  ```

- **At heat = 0%:** 100% of base throughput (fastest)
- **At heat = 50%:** 50% of base throughput
- **At heat = 100%:** 1 packet/sec minimum (slowest, but still progressing)

**Active cooling (Phase 1):**
- Manual "Cool" button reduces heat by fixed amount (e.g., 30 points), 5-second cooldown
- Engaged players cool frequently to maintain high throughput
- Idle players accept slower, passive progression

**Phase 2 power management:**
- Global power limit forces tradeoffs: can't run all nodes at max throughput
- Power allocation slider redistributes throughput budget

---

## Test Strategy: Minimal Viable TDD

**What we test (quantifiable rules):**

- **NodeManager:** Heat delta calculation, effective throughput with floor, status transitions (online → critical)
- **ContractSystem:** Deadline enforcement, packet routing, success/failure triggering
- **SentimentSystem:** Sentiment deltas (+5, −15, streaks), difficulty weighting
- **UpgradeSystem:** Cost calculation, stat modifier application to nodes
- **Economy:** Credit tracking, penalties, revenue calculation
- **GameEngine:** Tick sequence (NodeManager → ContractSystem → Sentiment → Economy), module orchestration
- **Integration:** Full tick loop under stress (simultaneous contract deadlines, concurrent heat spikes)

**What we skip (obvious, tested by use):**
- Getters/setters
- Initialization logic
- Edge cases that can't happen (e.g., negative credits)
- Async/promise handling (core is synchronous)

**Test structure:**
- Jest for unit tests
- One integration test file exercising full tick loop
- Test constants tuned to spec (heat rate K, sentiment changes, contract rewards) — adjust these for balance iteration
- Tests should be deterministic and fast (all core logic is sync)

---

## Tech Stack

**Core:**
- **Next.js 14+** (React, TypeScript)
- **Zustand** for game state (lightweight, works well with modular game logic)
- **TypeScript** for type safety
- **Jest + React Testing Library** for tests

**UI (Phase 1 & 2):**
- **Tailwind CSS** for styling
- **Framer Motion** for animations

**Storage & Mobile (Phase 2+):**
- **IndexedDB** (browser API, no package needed)
- **Capacitor** for Android build

**Project structure:**
```
flow-game/
├── src/
│   ├── lib/
│   │   ├── engine/
│   │   │   ├── nodeManager.ts
│   │   │   ├── contractSystem.ts
│   │   │   ├── sentimentSystem.ts
│   │   │   ├── upgradeSystem.ts
│   │   │   ├── economy.ts
│   │   │   └── gameEngine.ts
│   │   └── persistence.ts
│   ├── store/ (Zustand store wrapping game state)
│   ├── components/ (UI components for Phase 1, then Phase 2)
│   └── pages/
├── __tests__/
│   ├── nodeManager.test.ts
│   ├── contractSystem.test.ts
│   ├── sentimentSystem.test.ts
│   ├── upgradeSystem.test.ts
│   ├── economy.test.ts
│   └── gameEngine.integration.test.ts
├── docs/
├── package.json
└── CLAUDE.md
```

---

## Error Handling & Edge Cases

**Heat at 100 (maximum throttle):**
- Throughput floor kicks in: 100 packets/second minimum
- Node status marked "critical"
- Player can manually cool to accelerate, or accept slow passive progress
- No hard meltdown, no revenue loss

**Simultaneous contract deadlines:**
- Each contract is evaluated independently
- Multiple success/failure events trigger independent sentiment changes
- Economy settles all credits in single step

**Insufficient credits for upgrade:**
- UpgradeSystem checks balance before applying cost
- No negative credits, no debt mechanics

**Offline progression (Phase 2):**
- On app resume: load state, calculate elapsed time, fast-forward tick loop (no UI)
- Show "Offline Earnings: +X credits" banner

**No "safe fail"** — if a module calculates wrong (e.g., heat formula breaks), the game should crash loudly in tests so we catch bugs, not silently produce wrong values.

---

## Success Criteria

**After core implementation (before Phase 1 UI):**
- All 6 modules have ≥80% test coverage on quantifiable rules
- GameEngine tick loop runs 1,000 ticks without error
- Heat throttling feels impactful (idle vs. active cooling shows measurable difference)
- Contract generation weights by sentiment correctly
- No crashes or silent failures in tests

**After Phase 1 UI:**
- Game is playable end-to-end (single node, manual cooling, contract completion)
- Idle players can progress without interaction
- Engaged players can feel the difference between active and passive play
- Heat throttling is clear in UI (throughput bar changes with heat)

**After Phase 2 UI:**
- Multi-node management adds strategic depth
- Power allocation forces meaningful tradeoffs
- Sentiment system gates difficulty appropriately
- Game loop sustains 60 FPS on mid-range Android devices (tested later with Capacitor)

---

## Implementation Sequence

1. **Scaffold Next.js + Zustand + Jest** — basic project structure
2. **Implement NodeManager** — heat calculation, effective throughput, status
3. **Write NodeManager tests** — verify heat formula, floor logic
4. **Implement Economy** — credit tracking
5. **Write Economy tests**
6. **Implement UpgradeSystem** — stat modifiers
7. **Write UpgradeSystem tests**
8. **Implement SentimentSystem** — reputation, difficulty weighting
9. **Write SentimentSystem tests**
10. **Implement ContractSystem** — deadline enforcement, routing
11. **Write ContractSystem tests**
12. **Implement GameEngine** — orchestration, tick loop
13. **Write GameEngine integration test** — full loop under stress
14. **Refactor & polish** — clean up interfaces, fix any issues found in integration testing
15. **Transition to Phase 1 UI** — invoke writing-plans for Phase 1 implementation

Each step is small enough to complete and verify independently.

---

## Extensibility

Phase 3 (AutomationEngine) will run after ContractSystem, before Economy, without modifying existing modules. No changes needed now.

Phase 2 power limits are designed in spec but not implemented until Phase 2 UI. Core logic has no hard cap on throughput — just heat throttling.

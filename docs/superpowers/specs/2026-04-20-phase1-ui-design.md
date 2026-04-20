# Terminal Flow — Phase 1 UI Design

**Date:** 2026-04-20
**Scope:** Phase 1 interactive UI — single node dashboard, manual cooling, contract tracking, upgrade shop
**Depends on:** Core engine (all 6 modules implemented and passing 93 tests)

---

## Overview

Phase 1 makes the game playable end-to-end in the browser. The player sees their node's heat and throughput in real time, manually cools to maintain throughput, watches contracts fill and expire, and spends credits on upgrades. The idle loop runs automatically — no play required to earn credits, but active cooling meaningfully improves throughput.

---

## Layout

Single column, full-height, dark terminal aesthetic. Sections stack vertically:

```
┌─────────────────────────────────┐
│  StatusBar (credits + sentiment) │
├─────────────────────────────────┤
│  NodeCard (heat, throughput,     │
│            COOL button)          │
├─────────────────────────────────┤
│  ContractList (active contracts) │
├─────────────────────────────────┤
│  UpgradeShop (buy upgrades)      │
└─────────────────────────────────┘
```

ASCII progress bars use `█` (filled) and `░` (empty), always 10 characters wide. Example: `████████░░` = 80%.

Color palette (terminal theme):
- Green `#4ade80` — healthy node, active elements
- Amber `#fbbf24` — contracts, neutral info
- Red `#ef4444` — critical node, urgent contracts
- Purple `#a5b4fc` — upgrades
- Background `#0a0a0a`, borders `#1f2937`

---

## New Engine Methods (GameEngine)

Two new methods are needed before the UI can be built. They require tests.

### `coolNode(nodeId: string): void`

Finds the node by ID in the NodeManager's internal state. Reduces heat by 30, floored at 0. Does not generate packets or trigger contract events — this is a manual player action between ticks.

```typescript
coolNode(nodeId: string): void {
  const nodes = this.nodeManager.getState().nodes
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return
  node.heat = Math.max(0, node.heat - 30)
}
```

### `purchaseUpgrade(upgradeId: string, nodeId: string): boolean`

Validates purchase (not already owned, sufficient credits), deducts credits, adds upgradeId to node.upgrades, applies stat modifiers immediately via UpgradeSystem.

```typescript
purchaseUpgrade(upgradeId: string, nodeId: string): boolean {
  const nodes = this.nodeManager.getState().nodes
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return false
  if (node.upgrades.includes(upgradeId)) return false

  const upgrade = this.state.upgrades.find(u => u.id === upgradeId)
  if (!upgrade) return false

  const credits = this.economy.getState().credits
  if (credits < upgrade.cost) return false

  this.economy.subtractCredits(upgrade.cost)
  node.upgrades.push(upgradeId)
  this.upgradeSystem.applyUpgradesToNode(node, [upgradeId]) // only the new upgrade — re-applying all would double-stack stats
  return true
}
```

Tests required:
- `coolNode` reduces heat by 30
- `coolNode` floors heat at 0 (can't go negative)
- `purchaseUpgrade` deducts credits and applies upgrade stats to node
- `purchaseUpgrade` returns false if credits insufficient (no deduction)
- `purchaseUpgrade` returns false if upgrade already owned (idempotent)

---

## Zustand Store Updates

Add two new actions to `src/store/gameStore.ts`:

```typescript
coolNode: (nodeId: string) => void
purchaseUpgrade: (upgradeId: string, nodeId: string) => void
```

Both call the corresponding GameEngine method and update store state via `set({ state: engine.getState() })`.

---

## Component Specs

### `StatusBar` (`src/components/game/StatusBar.tsx`)

Props: `credits: number`, `sentiment: number`

Renders a single horizontal bar:
- Left: `CREDITS: 1,240.5¢` (1 decimal place)
- Right: `SENTIMENT` label + ASCII bar (10 chars, e.g. `████████░░`) + numeric value

```
CREDITS: 1,240.5¢                    SENTIMENT ████████░░ 82/100
```

No interactivity. Updates every tick.

---

### `NodeCard` (`src/components/game/NodeCard.tsx`)

Props: `node: Node`, `onCool: () => void`

Displays:
- Header: `▶ NODE-01` + status badge (`● ONLINE` in green, `● CRITICAL` in red when `heat >= 80`)
- Throughput bar: `effective_throughput / base_throughput` as ASCII bar (10 chars) + `{effective} pps`
  - `effective_throughput = Math.max(100, node.throughput * (1 - node.heat / 100))`
- Heat bar: `heat / 100` as ASCII bar (10 chars) + `{heat}°`
- COOL button

**COOL button states:**

*Ready:* `[ COOL ]` — green border, clickable. On click: calls `onCool()`, starts 5-second local cooldown.

*On cooldown:* `[ COOL ] ████████░░` — gray border, disabled. The ASCII bar (10 chars) drains left-to-right as the cooldown expires. Implemented with `setInterval(100ms)` updating a `cooldownRemaining` state (counts from 5000 to 0). Bar chars = `Math.ceil((cooldownRemaining / 5000) * 10)`.

**Critical state:** When `node.status === 'critical'`, entire card uses red border (`#ef4444`) instead of green.

No tests (visual component, tested by use in browser).

---

### `ContractList` (`src/components/game/ContractList.tsx`)

Props: `contracts: Contract[]`

Renders only active contracts (filters `status === 'active'`). Empty state: `NO ACTIVE CONTRACTS — waiting for assignments...`

Each contract card shows:
- Header: `{id}` + difficulty badge (`SAFE` in green, `HARD` in amber)
- Time remaining: `{seconds}s ⏱` — computed as `Math.max(0, Math.ceil((contract.deadline - Date.now()) / 1000))`
- Progress bar: `currentVolume / targetVolume` as ASCII bar (10 chars) + `{current} / {target}`
- Footer: `reward: {reward}¢  penalty: {penalty}¢`

**Urgency state:** When `timeRemaining < 15`, card border and text shift to red (`#ef4444`), background to `#1a0000`, and a `⚠` appears before the time display.

Urgency is computed from `Date.now()` on each render — no additional state needed.

No tests (visual component).

---

### `UpgradeShop` (`src/components/game/UpgradeShop.tsx`)

Props: `upgrades: Upgrade[]`, `purchasedUpgradeIds: string[]`, `credits: number`, `onPurchase: (upgradeId: string) => void`

Renders all upgrades from the game state. Each row:
- Name + effect description (derived from `upgrade.effects`, e.g. `+50 throughput`)
- Cost: `{cost}¢`
- Status:
  - `[OWNED]` label if already in `purchasedUpgradeIds` — gray, not clickable
  - `[BUY]` button if `credits >= cost` — purple border, clickable
  - `[BUY]` button grayed out if `credits < cost` — disabled

`purchasedUpgradeIds` is derived in `page.tsx` by collecting all `upgradeId` values from all nodes' `upgrades` arrays.

No tests (visual component).

---

## Page Assembly (`app/page.tsx`)

Replaces the existing stub. Responsibilities:
1. Initialize game on mount via `store.initializeGame()`
2. Start 1-second tick loop via `setInterval` in `useEffect`
3. Assemble all four components in order
4. Wire `coolNode('node-1')` to NodeCard's `onCool` prop
5. Wire `purchaseUpgrade(upgradeId, 'node-1')` to UpgradeShop's `onPurchase` prop

The game auto-starts on mount — no Start/Pause toggle in Phase 1. Idle game should idle automatically.

`purchasedUpgradeIds` is computed from `state.nodes.flatMap(n => n.upgrades)`.

---

## Tick Loop in UI

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    store.tick()
  }, 1000)
  return () => clearInterval(interval)
}, [store.tick])
```

The NodeCard's COOL button cooldown uses a separate `setInterval(100ms)` local to the component — it does not interact with the game tick.

---

## File Structure

**New files:**
- `src/components/game/StatusBar.tsx`
- `src/components/game/NodeCard.tsx`
- `src/components/game/ContractList.tsx`
- `src/components/game/UpgradeShop.tsx`

**Modified files:**
- `src/lib/engine/gameEngine.ts` — add `coolNode`, `purchaseUpgrade`
- `src/store/gameStore.ts` — add `coolNode`, `purchaseUpgrade` actions
- `app/page.tsx` — replace stub with full game UI
- `__tests__/gameEngine.integration.test.ts` — add coolNode and purchaseUpgrade tests

---

## Success Criteria

- Game auto-starts and credits increase passively without any interaction
- Pressing COOL reduces heat visibly (heat bar drops, throughput bar rises on next tick)
- COOL button shows ASCII drain bar for 5 seconds after pressing
- Node card turns red when heat ≥ 80
- Contracts fill progressively, turn red when < 15s remaining, disappear when completed/failed
- New contracts generate automatically after old ones expire
- Upgrades can be purchased when credits are sufficient; stats update immediately (visible on next tick)
- No console errors in browser DevTools

---

## Out of Scope (Phase 2)

- Multi-node selector
- Power allocation
- Offline catch-up
- Animations (Framer Motion)
- Save/load persistence

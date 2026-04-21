# Terminal Flow — Phase 2 Design Feedback

**Date:** 2026-04-20  
**Context:** Playtesting feedback after Phase 1 UI shipped. All items below are either bugs to fix or design changes for Phase 2.

---

## Current State (as of Phase 1 ship)

**What's built and working:**
- Core engine: NodeManager, Economy, UpgradeSystem, SentimentSystem, ContractSystem, GameEngine (93 → 105 tests)
- Phase 1 UI: StatusBar, NodeCard (COOL button + cooldown), ContractList (urgency flash), UpgradeShop, page.tsx auto-tick loop
- Two cooling upgrades, one throughput upgrade in the initial catalog
- Single active node (`node-1`), single-column terminal aesthetic

**Known tech debt (from final code review):**
- `coolNode` in GameEngine mutates through `getState()` reference rather than a proper `NodeManager.coolNode()` method — fragile if `getState()` ever returns a clone
- `purchasedUpgradeIds` in `page.tsx` uses `flatMap` across all nodes but `onPurchase` hard-codes `node-1` — needs sync when multi-node arrives

---

## Bugs Found in Playtesting

### BUG-1: Starting credits too high
Player can buy all upgrades immediately on game start. The game loses its upgrade progression entirely.

**Fix:** Reduce starting credits. Starting credits should require a few minutes of idle play before the first upgrade is affordable. Suggested: 0 starting credits (or very low, e.g. 10¢), with the cheapest upgrade costing ~50¢.

### BUG-2: Cooling upgrades eliminate heat generation entirely
After purchasing both cooling upgrades, heat no longer generates. The node permanently stays cool, making the COOL button and heat management irrelevant.

**Root cause:** Heat formula is `ΔH = throughput × K − coolingCapacity`. The two cooling upgrades together push efficiency high enough that `coolingCapacity ≥ throughput × K`, so `ΔH ≤ 0` every tick. Heat clamps at 0 and never rises.

**Fix options (pick one during Phase 2 planning):**
- A) Cap the heat reduction from upgrades so they can reduce heat generation but never fully stop it (e.g. max 80% reduction)
- B) Decouple efficiency from heat formula — make efficiency a throughput multiplier instead of a cooling stat
- C) Make cooling upgrades reduce heat *more slowly* (smaller effect values) so multiple are needed across a longer progression arc

### BUG-3: Contract urgency turns fully red even when target is already met
Contracts flash red (border + background + all text) when `timeRemaining < 15`, regardless of whether `currentVolume >= targetVolume`.

**Intended behavior:**
- Contract is fulfilled (`currentVolume >= targetVolume`) and deadline approaching: only the timer text turns red — the rest of the card stays amber. Player is just watching it close out.
- Contract is NOT fulfilled and deadline approaching: full red card (border + background + ⚠ timer) — urgent warning.

**Fix:** In `ContractList.tsx`, split urgency into two conditions:
```tsx
const urgent = timeRemaining < 15
const fulfilled = contract.currentVolume >= contract.targetVolume
// Full red: urgent AND not fulfilled
// Timer-only red: urgent AND fulfilled
```

---

## Design Changes for Phase 2

### CHANGE-1: Sentiment drives contract quality, not displayed as a credit metric

**Current behavior:** Sentiment is displayed in the StatusBar as a bar. It internally gates contract difficulty weighting but players don't clearly understand how.

**Intended behavior:** Sentiment should be the player's reputation score. Higher sentiment unlocks access to better contracts (higher reward, tighter deadlines, more volume — higher risk/reward). It should not feel like a currency.

**UI change:** Sentiment bar stays in StatusBar, but tooltip or label should clarify it represents "reputation" gating contract quality.

**System change:** The ContractSystem's difficulty weighting logic already gates based on sentiment. Ensure that:
- Low sentiment (0–30): only safe contracts offered
- Mid sentiment (30–70): mix of safe and hard
- High sentiment (70–100): hard contracts available, with higher reward multipliers

This needs to be visible to the player — show what tier of contracts their sentiment unlocks.

### CHANGE-2: Contract selection — player chooses which contracts to accept

**Current behavior:** Contracts auto-generate and are immediately active. Player has no agency over which contracts they take.

**Intended design:**
- A pool of available contracts is generated (e.g. 3–5 offered at a time, refreshed when accepted or expired)
- Player selects which contracts to accept, up to a cap of **5 simultaneously active**
- This is the core risk/reward decision: accepting 5 contracts means failing any one of them triggers a penalty. Accepting 1 is safe but slow.
- Offered-but-not-accepted contracts expire after a timeout (e.g. 60 seconds) and are replaced

**UI implication:** ContractList needs two sections: "AVAILABLE" (offered, not yet accepted) and "ACTIVE" (accepted, in progress). Or a separate OfferBoard component.

**Engine implication:** ContractSystem needs to track `status: 'offered' | 'active' | 'completed' | 'failed'` instead of just `'active' | 'completed' | 'failed'`.

### CHANGE-3: Upgrade progression — unlockable tiers, not a fixed catalog

**Current behavior:** A fixed list of 3 upgrades is always visible. Once all are bought, there's nothing left to pursue.

**Intended design (idle clicker model):**
- Upgrades are organized into tiers. Each tier unlocks when the previous tier is fully purchased (or after a time/progress threshold).
- Always 2–4 upgrades available to buy; more unlock as the player progresses.
- Categories: throughput upgrades, cooling upgrades, efficiency upgrades, capacity upgrades (higher contract cap), automation upgrades (Phase 3).
- Cost should scale exponentially so there's always something to save toward.

**Implementation:** `UpgradeSystem` needs an unlock condition per upgrade (e.g. `requires: ['upgrade-id']` or `requiresCreditsEarned: 5000`). `UpgradeShop` renders only unlocked upgrades.

---

## Phase 2 Scope (proposed)

Based on the above, Phase 2 should address:

**Must fix (bugs):**
- BUG-1: Rebalance starting credits and upgrade costs
- BUG-2: Fix cooling upgrades so heat always generates
- BUG-3: Split urgency styling (fulfilled vs unfulfilled)

**Core gameplay changes:**
- CHANGE-1: Sentiment visually tied to contract tier access
- CHANGE-2: Contract offer/accept flow with 5-contract cap
- CHANGE-3: Tiered upgrade progression with unlock conditions

**Phase 2 out of scope (Phase 3):**
- Multi-node selector
- Power allocation
- Offline catch-up
- Animations (Framer Motion)
- Save/load persistence
- Automation engine

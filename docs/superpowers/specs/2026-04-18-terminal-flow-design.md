# Terminal Flow — Game Design Specification

**Project:** Terminal Flow (Android idle game)  
**Date:** 2026-04-18  
**Scope:** Phases 1–2 (MVP + multi-node contracts)  
**Platform:** Android (Capacitor-wrapped React/Next.js web app)

---

## Overview

Terminal Flow is a casual "check-in" idle logistics game with a 1980s terminal aesthetic. Players manage data nodes, route packet flows, fulfill service-level agreements (SLAs/contracts), and upgrade their network. The game progresses from single-node operation (Phase 1) to multi-node management with contract complexity (Phase 2).

**Success metric:** 20% of players return within 7 days.

---

## Design Principles

1. **Modular architecture** — Each game system (nodes, contracts, economy, upgrades) is independent and testable, enabling balance tuning and Phase 3 extensibility.
2. **Check-in gameplay** — Short sessions with offline progression; meaningful decisions available in 5 minutes, but depth available for longer exploration.
3. **Minimal narrative** — Flavor text provides world context and immersion, but gameplay is mechanical, not story-driven.
4. **Non-pay-to-win monetization** — Cosmetic skins and optional developer donate; no mechanics locked behind payment.

---

## System Architecture

The game consists of 5 modules orchestrated by a central GameEngine:

### 1. GameEngine
- Runs the 1-second tick system
- Coordinates module updates in sequence: NodeManager → ContractSystem → AutomationEngine (Phase 3) → Economy
- Enforces global rules (power limits, node meltdown conditions, SLA deadlines)
- Handles pause/resume and offline catch-up on app load

### 2. NodeManager
- Owns node state: `{ id, throughput, heat, efficiency, upgrades[] }`
- Calculates heat per tick: `ΔH = (throughput × K) − coolingCapacity`, where K is a tuning constant
- Tracks node status: online, offline (post-meltdown), critical (high heat)
- Node meltdown: heat > 100 → offline for 60 seconds, stops revenue generation

### 3. ContractSystem
- Manages active SLAs: `{ id, targetVolume, currentVolume, deadline, reward, penalty }`
- Each tick: routes completed packets to nearest deadline contracts first
- On deadline: if currentVolume ≥ targetVolume, award credits; otherwise, apply penalty
- Phase 2: adds power allocation constraints (global power limit prevents all nodes at 100%)

### 4. UpgradeSystem
- Tracks purchased upgrades and their effects on node stats
- Upgrades affect: throughput, efficiency, heat dissipation
- Each upgrade has a credit cost; once purchased, permanently owned

### 5. Economy
- Tracks player credits (earned from packets, spent on upgrades, lost to penalties)
- Calculates revenue: packets processed × market value per packet
- Maintains transaction history for debugging/analytics

---

## Data Model

### Game State
```
{
  player: {
    credits: number,
    totalPacketsProcessed: number,
  },
  nodes: [
    {
      id: string,
      throughput: number,
      heat: number (0–100),
      efficiency: number (0.0–1.0),
      status: "online" | "offline" | "critical",
      upgrades: string[], // upgrade IDs
      lastMeltdownTime: timestamp (null if never)
    }
  ],
  contracts: [
    {
      id: string,
      targetVolume: number,
      currentVolume: number,
      deadline: timestamp,
      reward: number,
      penalty: number,
      status: "active" | "completed" | "failed"
    }
  ],
  upgrades: [
    {
      id: string,
      name: string,
      cost: number,
      effects: { throughput?: number, efficiency?: number, cooling?: number }
    }
  ],
  metadata: {
    lastTickTime: timestamp,
    gameStartTime: timestamp,
    offlineEarnings: number // shown on app resume
  }
}
```

---

## Game Loop (The "Pulse")

Every 1 second:

1. **NodeManager.tick()** — For each active node:
   - Generate packets = throughput
   - Calculate heat delta
   - Check for meltdown (heat > 100)

2. **ContractSystem.tick()** — For each active contract:
   - Route completed packets (consume from pool)
   - Reduce contract.currentVolume
   - Check for deadline expiry

3. **Economy.settle()** — Calculate credits earned from completed packets

4. **UI.update()** — Re-render dashboard with new values

---

## Phase 1: Single Node MVP

**Goal:** Prove core loop and engagement

**Features:**
- One node, glowing in center of screen
- Three health bars: Throughput (green), Heat (amber), Stability (yellow)
- Credits ticker at top
- Manual "Cool" button (reduces heat by fixed amount, 5-second cooldown)
- Upgrade shop: purchasable node upgrades (throughput +10%, efficiency boost, cooling improvement)
- First contract appears automatically to establish SLA concept

**Success condition:** Player understands the heat/throughput tradeoff and feels compelled to upgrade

---

## Phase 2: Multi-Node & Contracts

**Goal:** Add complexity and strategic depth

**Features:**
- 3 nodes visible in sidebar, selectable
- Each node has independent throughput/heat/upgrades
- Global power limit: total throughput across all nodes capped at a threshold
  - Forces tradeoff: scale up node A or B, not both at max
  - Shows power allocation slider (redistribute power budget)
- Contract generation: 2–3 active SLAs at a time, with varied deadlines and rewards
- Contract UI: shows target vs. current volume, deadline countdown
- Phase 1 manual cool button persists (quality of life)

**Success condition:** Player juggles multiple nodes, makes routing/priority decisions, experiences meaningful challenge from power limits

---

## UI Architecture

### Visual Style
- Monospaced font (e.g., IBM Plex Mono)
- Dark background (#0a0a0a), neon green text (#00ff00), amber accents (#ffaa00)
- Scan-line overlay (CSS or SVG)
- Glitch animations on events: node failure, contract deadline miss, meltdown
- Framer Motion for smooth heat pulses, contract countdowns

### Phase 1 Layout
```
┌─────────────────────────────┐
│  Credits: 5,420             │
├─────────────────────────────┤
│                             │
│         ◯ NODE 1            │
│      [═════] Throughput     │
│      [════] Heat            │
│      [════] Stability       │
│                             │
├─────────────────────────────┤
│ [Manual Cool] (5s cooldown) │
├─────────────────────────────┤
│ UPGRADES                    │
│ [+10% Throughput] 100 ◆     │
│ [Cooling Boost] 150 ◆       │
│ [Efficiency Core] 200 ◆     │
└─────────────────────────────┘
```

### Phase 2 Layout
```
┌──────────────────────────────────────────┐
│ Credits: 5,420  |  Power: 70/100         │
├──────────┬──────────────────┬────────────┤
│ NODES    │ NODE 1 DETAIL    │ CONTRACTS  │
│ ☐ Node 1 │ [═════] TH 50    │ Contract A │
│ ☐ Node 2 │ [════] HT 45     │ 450/500◆   │
│ ☐ Node 3 │ [════] ST 80     │ Expires: 2m│
│          │ [Manual Cool]    │            │
│          │ UPGRADES [+] [+] │ Contract B │
│          │                  │ 200/300◆   │
│          │ Power Alloc: ▓▓░ │ Expires: 5m│
│          │ (Node 1: 70%)    │            │
└──────────┴──────────────────┴────────────┘
```

### Components
- `<Node>` — individual node card with bars
- `<Contract>` — contract status card (volume, deadline)
- `<UpgradeShop>` — purchasable upgrades grid
- `<Dashboard>` — top-level layout
- `<PowerAllocator>` — slider for power distribution (Phase 2)

---

## Persistence & Offline Play

**Storage:** IndexedDB (survives app crashes, ~50MB capacity)

**On every game tick:** Current game state is serialized and written to IndexedDB

**On app resume:**
1. Load state from IndexedDB
2. Calculate elapsed time since last tick
3. Fast-forward: simulate skipped ticks offline (simplified calculation, no UI updates)
4. Show "Offline Earnings: +1,240 credits" banner
5. Resume normal gameplay

This creates the "check-in satisfaction" moment: players see passive progress made while away.

---

## Monetization

**Cosmetic Skins:** Players can purchase alternate color schemes and UI themes
- Available in shop for 2.99 USD each
- Does not affect gameplay
- Stored in player state, applied at render time

**Developer Donate:** Optional "Support Development" button linking to Ko-fi or similar
- Not a requirement for gameplay
- Positioned discreetly (e.g., settings menu)

**No ads, no pay-to-win mechanics.**

---

## Balance Targets

These tuning parameters will be adjusted post-launch based on 7-day retention data:

- **Heat generation rate (K):** Adjust to make manual cooling feel impactful
- **Upgrade costs:** Scale to maintain 10–20 minute progression to Phase 2 complexity
- **Contract rewards:** Set to create "express vs. safe" tradeoff
- **Power limit:** Should force genuine strategic choices by ~3 active contracts
- **Meltdown duration:** 60 seconds; adjust if too punishing or too lenient

---

## Extensibility: Phase 3 Automation

Phase 3 adds logic gates (auto-SLA routing, heat-sync rules) without restructuring existing modules.

**New AutomationEngine module:**
- Runs after ContractSystem, before Economy
- Executes rules: `{ condition, action }`
- Example: "If Node A heat > 80%, reduce Node B throughput by 20%"

**UI addition:** Logic tab where players toggle automation rules on/off

**No changes to existing modules required.**

---

## Testing & Balance

Each module will be unit-tested independently:
- NodeManager: heat calculation, meltdown logic
- ContractSystem: deadline enforcement, volume tracking
- UpgradeSystem: cost/effect application
- Economy: credit calculation

Integration tests verify the full tick loop under stress (multiple meltdowns, contract deadlines simultaneous).

Post-launch, telemetry tracks:
- Session length distribution
- Upgrade purchase patterns
- Contract completion rates
- Node meltdown frequency

Adjust balance parameters to maintain 20% 7-day retention.

---

## Technical Stack

- **Framework:** React with Next.js
- **State Management:** Zustand
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Storage:** IndexedDB
- **Mobile Wrapper:** Capacitor (for Android build, offline support, app store distribution)
- **Deployment:** Vercel (for web), Capacitor for APK build

---

## Success Criteria

**MVP Launch (Phases 1–2):**
- Core loop is fun and engaging
- 7-day retention: ≥ 20%
- No critical bugs in offline/online sync
- Performance: 60 FPS on mid-range Android devices

**Post-Launch:**
- Telemetry shows balanced progression (players reach Phase 2 complexity in expected timeframe)
- Contract mechanics create meaningful decisions
- Cosmetic skins drive additional engagement

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

1. **Modular architecture** — Each game system (nodes, contracts, economy, upgrades, sentiment) is independent and testable, enabling balance tuning and Phase 3 extensibility.
2. **Check-in gameplay** — Short sessions with offline progression; meaningful decisions available in 5 minutes, but depth available for longer exploration.
3. **Playstyle flexibility** — Idle players choose safe contracts and progress slowly; engaged players chase hard contracts with tight deadlines, requiring active heat/power management.
4. **Sentiment-driven tension** — Contract difficulty and availability is gated by reputation; failure is significant enough to reset progression, creating Frostpunk-like decision weight without frustration.
5. **Minimal narrative** — Flavor text provides world context and immersion, but gameplay is mechanical, not story-driven.
6. **Non-pay-to-win monetization** — Cosmetic skins and optional developer donate; no mechanics locked behind payment.

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
- Manages active SLAs and contract generation
- Active contract state: `{ id, targetVolume, currentVolume, deadline, reward, penalty, difficulty }`
- Each tick: routes completed packets to nearest deadline contracts first
- On deadline: if currentVolume ≥ targetVolume, award credits + sentiment boost; otherwise, apply penalty + sentiment hit
- Contract difficulty (safe/hard) is weighted by player sentiment: higher sentiment increases odds of hard contracts appearing
- Hard contracts have tight deadlines and high volume (require active play); safe contracts are lenient (idle-friendly)
- Phase 2: adds power allocation constraints (global power limit prevents all nodes at 100%)

### 4. UpgradeSystem
- Tracks purchased upgrades and their effects on node stats
- Upgrades affect: throughput, efficiency, heat dissipation
- Each upgrade has a credit cost; once purchased, permanently owned

### 5. Economy
- Tracks player credits (earned from packets, spent on upgrades, lost to penalties)
- Calculates revenue: packets processed × market value per packet
- Maintains transaction history for debugging/analytics

### 6. SentimentSystem
- Tracks player reputation: `sentiment` (0–100)
- Contract success: +5 sentiment, plus streak bonus (+1 per consecutive success)
- Contract failure: -15 sentiment (significant penalty, creates recovery arc)
- Weights contract generation: higher sentiment increases probability of hard contracts appearing in the available contract pool
- Hard contracts offer higher rewards but require active play (tight deadlines, high volume)

---

## Data Model

### Game State
```
{
  player: {
    credits: number,
    totalPacketsProcessed: number,
    sentiment: number (0–100),
    consecutiveSuccesses: number, // streak counter
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
   - Check for deadline expiry:
     - Success: award credits, increment consecutiveSuccesses, add to SentimentSystem
     - Failure: apply penalty, reset consecutiveSuccesses, subtract from SentimentSystem

3. **SentimentSystem.update()** — Process sentiment changes from contract results

4. **ContractSystem.generate()** — If contracts expired, generate 2–3 new ones weighted by sentiment

5. **Economy.settle()** — Calculate credits earned from completed packets

6. **UI.update()** — Re-render dashboard with new values

---

## Phase 1: Single Node MVP

**Goal:** Prove core loop, sentiment system, and playstyle flexibility

**Features:**
- One node, glowing in center of screen
- Three health bars: Throughput (green), Heat (amber), Stability (yellow)
- Sentiment meter (0–100) displayed prominently
- Credits ticker and consecutive success counter
- Manual "Cool" button (reduces heat by fixed amount, 5-second cooldown)
- Contract pool: 2–3 available contracts at a time, difficulty weighted by sentiment
  - Safe contracts: 100 packets / 120 second deadline, 50 credit reward (idle-friendly)
  - Hard contracts: 100 packets / 40 second deadline, 200 credit reward (requires manual cooling to sustain throughput)
- Upgrade shop: purchasable node upgrades (throughput +10%, efficiency boost, cooling improvement)

**Player progression:**
- New players start with all safe contracts (high success rate)
- Completing contracts → +sentiment, access to harder contracts with better rewards
- Failing a contract → -15 sentiment, back to mostly safe contracts (recovery arc)
- Engaged players push for hard contracts early, managing heat tightly
- Idle players accept the slower safe-contract grind

**Success condition:** Both playstyles work; players understand sentiment gates difficulty and rewards

---

## Phase 2: Multi-Node & Contracts

**Goal:** Add complexity and strategic depth; compound sentiment system with resource management

**Features:**
- 3 nodes visible in sidebar, selectable
- Each node has independent throughput/heat/upgrades
- Sentiment system persists and now gates harder contracts that span multiple nodes
- Contract generation: 2–3 active SLAs at a time, with varied deadlines and rewards
  - Hard contracts now require smart node allocation (power management) to meet tight deadlines
- Global power limit: total throughput across all nodes capped at a threshold
  - Forces tradeoff: scale up node A or B, not both at max
  - Shows power allocation slider (redistribute power budget)
- Contract UI: shows target vs. current volume, deadline countdown, which node(s) are handling it
- Phase 1 manual cool button persists per-node (quality of life)

**Gameplay consequence of sentiment:**
- High sentiment → harder multi-node contracts → requires balancing power between nodes + cooling management
- Low sentiment → safe contracts → easier to complete passively
- Failure on a multi-node contract is more costly (harder recovery), creates Frostpunk-like decision weight

**Success condition:** Player juggles multiple nodes, makes routing/priority decisions, experiences meaningful challenge from power limits + sentiment recovery arc

---

## The Sentiment System: Core Engagement Mechanic

**Problem:** Heat alone doesn't create enough decision tension to drive engagement and the 20% 7-day retention target.

**Solution:** Sentiment (reputation) gates contract difficulty, creating a playstyle-flexible engagement loop:

### How It Works

1. **Contract Pool Generation** — When a contract expires, 2–3 new ones are generated. Each contract's difficulty is randomly weighted based on current sentiment:
   - Sentiment 0–30: mostly safe (60%+ success, low reward)
   - Sentiment 70–100: premium hard contracts appear (60% success *if actively managed*, high reward)

2. **Safe vs. Hard Trade-off**
   - **Safe contracts:** 100 packets / 120 seconds / 50 credits
     - Idle-friendly; can mostly auto-complete
     - Good for low-sentiment recovery
   
   - **Hard contracts:** 100 packets / 40 seconds / 200 credits
     - Require tight heat management (Phase 1) or power balancing (Phase 2)
     - Access gated by sentiment
     - Higher reward justifies the engagement

3. **Success/Failure Consequences**
   - **Success:** +5 sentiment, +1 per consecutive success (compounding up to streak bonus)
     - Unlocks access to premium contracts
     - Reinforces skill: "I did well, now I get better challenges"
   
   - **Failure:** -15 sentiment (significant)
     - Locks player back into safe contracts
     - Creates recovery arc: need ~3 successful contracts to get back to high sentiment
     - This friction is *intentional* — it creates Frostpunk-like decision weight: "Is this hard contract worth the risk?"

### Design Goals

- **Idle players** can stick with safe contracts, progress slowly but safely
- **Engaged players** chase hard contracts, get rewarded with better credits/challenges, but one failure stings
- **Decision tension:** Every contract choice matters. Fail and you're grinding safe contracts to recover
- **Streak satisfaction:** Building a win streak unlocks better contracts and compounds rewards

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

- **Sentiment changes:** 
  - Success: +5 base, +1 per consecutive success (can reach +8 on 3-streak)
  - Failure: -15 (creates meaningful recovery arc; ~3 successful contracts to recover)
  - Adjust if recovery feels too fast (players always high sentiment) or too slow (frustrating)
  
- **Contract difficulty distribution:**
  - Sentiment 0–30: 80% safe, 20% hard
  - Sentiment 30–70: 50% safe, 50% hard
  - Sentiment 70–100: 20% safe, 80% hard
  - Adjust if engagement players feel blocked or if idle players feel pushed too hard

- **Heat generation rate (K):** Adjust to make manual cooling feel impactful on hard contracts

- **Contract deadlines:**
  - Safe: 120 seconds for 100 packets (leisurely 50 pps)
  - Hard: 40 seconds for 100 packets (requires ~250 pps throughput, forces active cooling)

- **Upgrade costs:** Scale to maintain 10–20 minute progression to Phase 2 complexity

- **Power limit:** Should force genuine strategic choices by ~3 active contracts in Phase 2

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

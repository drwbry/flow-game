# Terminal Flow Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Terminal Flow game engine with 6 core modules (NodeManager, Economy, UpgradeSystem, SentimentSystem, ContractSystem, GameEngine) using minimal viable TDD, with integration tests verifying the 1-second tick loop.

**Architecture:** Six independent modules with clean interfaces, initialized with state slices, updated in dependency order. GameEngine orchestrates the tick loop, enforcing global rules. Heat throttles throughput with a minimum 100 pps floor. All packet counts use 100x scale for integer arithmetic.

**Tech Stack:** Next.js 14, React, TypeScript, Zustand, Jest, Tailwind CSS, Framer Motion (added later)

---

## File Structure

**Core game engine:**
- `src/lib/engine/types.ts` — shared types (GameState, Node, Contract, etc.)
- `src/lib/engine/nodeManager.ts` — heat, throughput, status
- `src/lib/engine/economy.ts` — credit tracking
- `src/lib/engine/upgradeSystem.ts` — purchases, stat modifiers
- `src/lib/engine/sentimentSystem.ts` — reputation, difficulty weighting
- `src/lib/engine/contractSystem.ts` — SLA management, routing
- `src/lib/engine/gameEngine.ts` — orchestration, tick loop
- `src/lib/engine/gameState.ts` — initial state factory

**Tests:**
- `__tests__/nodeManager.test.ts`
- `__tests__/economy.test.ts`
- `__tests__/upgradeSystem.test.ts`
- `__tests__/sentimentSystem.test.ts`
- `__tests__/contractSystem.test.ts`
- `__tests__/gameEngine.integration.test.ts`

**Configuration & setup:**
- `package.json` — dependencies
- `jest.config.js` — test configuration
- `tsconfig.json` — TypeScript configuration
- `CLAUDE.md` — repo-level instructions
- `.gitignore` — standard Node.js ignores

---

## Task Breakdown

### Task 1: Scaffold Next.js Project & Configure Jest

**Files:**
- Create: `package.json`
- Create: `jest.config.js`
- Create: `tsconfig.json`
- Create: `CLAUDE.md`
- Create: `.gitignore`
- Create: `src/lib/engine/` directory

- [ ] **Step 1: Initialize Next.js project with TypeScript**

```bash
cd /home/dreux/projects/app-development/flow-game
npx create-next-app@latest . --typescript --tailwind --no-git
```

This creates the basic Next.js structure. Choose defaults except: TypeScript (yes), Tailwind (yes), App Router (yes), ESLint (yes).

- [ ] **Step 2: Install testing dependencies**

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest ts-jest
```

- [ ] **Step 3: Create Jest configuration**

Create `jest.config.js`:

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
}

module.exports = createJestConfig(customJestConfig)
```

- [ ] **Step 4: Create Jest setup file**

Create `jest.setup.js`:

```javascript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create CLAUDE.md for repo instructions**

Create `CLAUDE.md`:

```markdown
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
```

- [ ] **Step 6: Update tsconfig.json for strict mode**

Open `tsconfig.json` and set:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 7: Create engine directory structure**

```bash
mkdir -p src/lib/engine
touch src/lib/engine/types.ts
touch src/lib/engine/nodeManager.ts
touch src/lib/engine/economy.ts
touch src/lib/engine/upgradeSystem.ts
touch src/lib/engine/sentimentSystem.ts
touch src/lib/engine/contractSystem.ts
touch src/lib/engine/gameEngine.ts
touch src/lib/engine/gameState.ts
```

- [ ] **Step 8: Commit scaffolding**

```bash
git add -A
git commit -m "scaffold: initialize Next.js + Jest + TypeScript"
git push
```

---

### Task 2: Define Shared Types

**Files:**
- Create: `src/lib/engine/types.ts`

- [ ] **Step 1: Write types file with all shared types**

Create `src/lib/engine/types.ts`:

```typescript
// Node types
export interface Node {
  id: string
  throughput: number // base packets/second, 100x scale
  heat: number // 0–100
  efficiency: number // 0.0–1.0
  status: 'online' | 'critical'
  upgrades: string[] // upgrade IDs
  lastMeltdownTime: number | null
}

// Contract types
export interface Contract {
  id: string
  targetVolume: number // 100x scale
  currentVolume: number
  deadline: number // timestamp (ms)
  reward: number // credits
  penalty: number // credits
  status: 'active' | 'completed' | 'failed'
  difficulty: 'safe' | 'hard'
}

// Upgrade types
export interface Upgrade {
  id: string
  name: string
  cost: number
  effects: {
    throughput?: number
    efficiency?: number
    cooling?: number
  }
}

// Player types
export interface PlayerState {
  credits: number
  totalPacketsProcessed: number
  sentiment: number // 0–100
  consecutiveSuccesses: number
}

// Root game state
export interface GameState {
  player: PlayerState
  nodes: Node[]
  contracts: Contract[]
  upgrades: Upgrade[]
  metadata: {
    lastTickTime: number
    gameStartTime: number
  }
}

// Module interfaces
export interface INodeManager {
  getState(): { nodes: Node[] }
  tick(nodes: Node[]): void
}

export interface IEconomy {
  getState(): { player: PlayerState }
  addCredits(amount: number): void
  subtractCredits(amount: number): void
}

export interface IUpgradeSystem {
  getState(): { upgrades: Upgrade[] }
  applyUpgradesToNode(node: Node, upgradeIds: string[]): void
}

export interface ISentimentSystem {
  getState(): { player: PlayerState }
  recordSuccess(): void
  recordFailure(): void
  getContractDifficultyWeights(): { safe: number; hard: number }
}

export interface IContractSystem {
  getState(): { contracts: Contract[] }
  tick(contracts: Contract[], packetsAvailable: number): void
  generateNewContracts(difficulty: 'safe' | 'hard'): Contract[]
}

export interface IGameEngine {
  getState(): GameState
  tick(): void
}
```

- [ ] **Step 2: Commit types**

```bash
git add src/lib/engine/types.ts
git commit -m "feat: define shared game types"
git push
```

---

### Task 3: Implement NodeManager (Module 1)

**Files:**
- Create: `src/lib/engine/nodeManager.ts`
- Create: `__tests__/nodeManager.test.ts`

- [ ] **Step 1: Write failing tests for heat calculation**

Create `__tests__/nodeManager.test.ts`:

```typescript
import { NodeManager } from '../src/lib/engine/nodeManager'
import { Node } from '../src/lib/engine/types'

describe('NodeManager', () => {
  let nodeManager: NodeManager

  beforeEach(() => {
    const initialNode: Node = {
      id: 'node-1',
      throughput: 200,
      heat: 0,
      efficiency: 1.0,
      status: 'online',
      upgrades: [],
      lastMeltdownTime: null,
    }
    nodeManager = new NodeManager([initialNode])
  })

  describe('heat calculation', () => {
    it('should increase heat based on throughput and cooling', () => {
      const nodes = nodeManager.getState().nodes
      const initialHeat = nodes[0].heat

      // Mock: K = 0.1, no cooling initially
      nodeManager.tick(nodes)

      const newHeat = nodeManager.getState().nodes[0].heat
      // throughput 200, K=0.1, efficiency 1.0, no cooling
      // heat_delta = 200 * 0.1 - 0 = 20
      expect(newHeat).toBe(initialHeat + 20)
    })

    it('should cap heat at 100', () => {
      let nodes = nodeManager.getState().nodes
      nodes[0].heat = 95
      nodeManager.tick(nodes)

      nodes = nodeManager.getState().nodes
      expect(nodes[0].heat).toBeLessThanOrEqual(100)
    })

    it('should not go below 0', () => {
      let nodes = nodeManager.getState().nodes
      nodes[0].heat = 5
      // Simulate cooling that exceeds heat
      nodes[0].efficiency = 1.0 // max cooling
      nodeManager.tick(nodes)

      nodes = nodeManager.getState().nodes
      expect(nodes[0].heat).toBeGreaterThanOrEqual(0)
    })

    it('should mark node critical when heat >= 80', () => {
      let nodes = nodeManager.getState().nodes
      nodes[0].heat = 80
      nodeManager.tick(nodes)

      nodes = nodeManager.getState().nodes
      expect(nodes[0].status).toBe('critical')
    })

    it('should mark node online when heat < 80', () => {
      let nodes = nodeManager.getState().nodes
      nodes[0].heat = 79
      nodeManager.tick(nodes)

      nodes = nodeManager.getState().nodes
      expect(nodes[0].status).toBe('online')
    })
  })

  describe('effective throughput', () => {
    it('should return full throughput at heat 0', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].heat = 0
      const effective = nodeManager.getEffectiveThroughput(nodes[0])
      expect(effective).toBe(200)
    })

    it('should return 50% throughput at heat 50', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].heat = 50
      const effective = nodeManager.getEffectiveThroughput(nodes[0])
      expect(effective).toBe(100)
    })

    it('should enforce minimum floor of 100 at heat 100', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].heat = 100
      const effective = nodeManager.getEffectiveThroughput(nodes[0])
      expect(effective).toBe(100) // floor
    })

    it('should handle nodes with higher base throughput', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].throughput = 400
      nodes[0].heat = 50
      const effective = nodeManager.getEffectiveThroughput(nodes[0])
      expect(effective).toBe(200) // 400 * 0.5 = 200
    })
  })

  describe('generatePackets', () => {
    it('should generate packets based on effective throughput', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].heat = 0
      const packets = nodeManager.generatePackets(nodes[0])
      expect(packets).toBe(200) // full throughput
    })

    it('should generate minimum packets at high heat', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].heat = 100
      const packets = nodeManager.generatePackets(nodes[0])
      expect(packets).toBe(100) // floor
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- nodeManager.test.ts
```

Expected: FAIL — "Cannot find module '../src/lib/engine/nodeManager'"

- [ ] **Step 3: Write NodeManager implementation**

Create `src/lib/engine/nodeManager.ts`:

```typescript
import { Node, INodeManager } from './types'

const HEAT_RATE_K = 0.1 // packets * K = heat per tick
const HEAT_CAP = 100
const HEAT_CRITICAL_THRESHOLD = 80
const MINIMUM_THROUGHPUT_FLOOR = 100

export class NodeManager implements INodeManager {
  private nodes: Node[]

  constructor(initialNodes: Node[]) {
    this.nodes = JSON.parse(JSON.stringify(initialNodes))
  }

  getState(): { nodes: Node[] } {
    return { nodes: this.nodes }
  }

  tick(nodes: Node[]): void {
    this.nodes = nodes.map(node => {
      // Calculate heat delta
      const coolingCapacity = node.efficiency * 50 // cooling proportional to efficiency
      const heatDelta = node.throughput * HEAT_RATE_K - coolingCapacity
      const newHeat = Math.max(0, Math.min(HEAT_CAP, node.heat + heatDelta))

      // Determine status
      const status = newHeat >= HEAT_CRITICAL_THRESHOLD ? 'critical' : 'online'

      return {
        ...node,
        heat: newHeat,
        status,
      }
    })
  }

  getEffectiveThroughput(node: Node): number {
    const scaledDown = node.throughput * (1 - node.heat / 100)
    return Math.max(MINIMUM_THROUGHPUT_FLOOR, scaledDown)
  }

  generatePackets(node: Node): number {
    return this.getEffectiveThroughput(node)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- nodeManager.test.ts
```

Expected: PASS — all 8 tests pass

- [ ] **Step 5: Commit NodeManager**

```bash
git add src/lib/engine/nodeManager.ts __tests__/nodeManager.test.ts
git commit -m "feat: implement NodeManager with heat calculation and effective throughput"
git push
```

---

### Task 4: Implement Economy (Module 2)

**Files:**
- Create: `src/lib/engine/economy.ts`
- Create: `__tests__/economy.test.ts`

- [ ] **Step 1: Write failing tests for economy**

Create `__tests__/economy.test.ts`:

```typescript
import { Economy } from '../src/lib/engine/economy'
import { PlayerState } from '../src/lib/engine/types'

describe('Economy', () => {
  let economy: Economy

  beforeEach(() => {
    const initialPlayer: PlayerState = {
      credits: 1000,
      totalPacketsProcessed: 0,
      sentiment: 50,
      consecutiveSuccesses: 0,
    }
    economy = new Economy(initialPlayer)
  })

  describe('credit tracking', () => {
    it('should add credits', () => {
      economy.addCredits(500)
      const state = economy.getState()
      expect(state.player.credits).toBe(1500)
    })

    it('should subtract credits', () => {
      economy.subtractCredits(200)
      const state = economy.getState()
      expect(state.player.credits).toBe(800)
    })

    it('should not allow negative credits', () => {
      economy.subtractCredits(2000)
      const state = economy.getState()
      expect(state.player.credits).toBeGreaterThanOrEqual(0)
    })
  })

  describe('packet revenue', () => {
    it('should calculate revenue from packets processed', () => {
      const packetsProcessed = 1000
      const marketValuePerPacket = 1 // 1 credit per 1000 packets (simplified)
      const expectedRevenue = 1 // 1000 packets * 1 / 1000

      economy.settleRevenue(packetsProcessed)
      const state = economy.getState()
      expect(state.player.credits).toBeGreaterThan(1000)
    })

    it('should track total packets processed', () => {
      economy.settleRevenue(500)
      let state = economy.getState()
      expect(state.player.totalPacketsProcessed).toBe(500)

      economy.settleRevenue(300)
      state = economy.getState()
      expect(state.player.totalPacketsProcessed).toBe(800)
    })
  })

  describe('penalties', () => {
    it('should apply contract penalty', () => {
      economy.applyPenalty(100)
      const state = economy.getState()
      expect(state.player.credits).toBe(900)
    })

    it('should not go below 0 on penalty', () => {
      economy.applyPenalty(2000)
      const state = economy.getState()
      expect(state.player.credits).toBeGreaterThanOrEqual(0)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- economy.test.ts
```

Expected: FAIL — "Cannot find module '../src/lib/engine/economy'"

- [ ] **Step 3: Write Economy implementation**

Create `src/lib/engine/economy.ts`:

```typescript
import { PlayerState, IEconomy } from './types'

const MARKET_VALUE_PER_PACKET = 0.001 // 1 credit per 1000 packets

export class Economy implements IEconomy {
  private player: PlayerState

  constructor(initialPlayer: PlayerState) {
    this.player = JSON.parse(JSON.stringify(initialPlayer))
  }

  getState(): { player: PlayerState } {
    return { player: this.player }
  }

  addCredits(amount: number): void {
    this.player.credits += amount
  }

  subtractCredits(amount: number): void {
    this.player.credits = Math.max(0, this.player.credits - amount)
  }

  settleRevenue(packetsProcessed: number): void {
    const revenue = Math.floor(packetsProcessed * MARKET_VALUE_PER_PACKET)
    this.addCredits(revenue)
    this.player.totalPacketsProcessed += packetsProcessed
  }

  applyPenalty(penalty: number): void {
    this.subtractCredits(penalty)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- economy.test.ts
```

Expected: PASS — all tests pass

- [ ] **Step 5: Commit Economy**

```bash
git add src/lib/engine/economy.ts __tests__/economy.test.ts
git commit -m "feat: implement Economy with credit and revenue tracking"
git push
```

---

### Task 5: Implement UpgradeSystem (Module 3)

**Files:**
- Create: `src/lib/engine/upgradeSystem.ts`
- Create: `__tests__/upgradeSystem.test.ts`

- [ ] **Step 1: Write failing tests for upgrades**

Create `__tests__/upgradeSystem.test.ts`:

```typescript
import { UpgradeSystem } from '../src/lib/engine/upgradeSystem'
import { Upgrade, Node } from '../src/lib/engine/types'

describe('UpgradeSystem', () => {
  let upgradeSystem: UpgradeSystem
  const baseUpgrades: Upgrade[] = [
    {
      id: 'upgrade-throughput-1',
      name: '+10% Throughput',
      cost: 100,
      effects: { throughput: 1.1 },
    },
    {
      id: 'upgrade-cooling-1',
      name: 'Cooling Boost',
      cost: 150,
      effects: { efficiency: 1.2 },
    },
  ]

  beforeEach(() => {
    upgradeSystem = new UpgradeSystem(baseUpgrades)
  })

  describe('upgrade purchase', () => {
    it('should track purchased upgrades', () => {
      upgradeSystem.purchaseUpgrade('upgrade-throughput-1')
      const state = upgradeSystem.getState()
      expect(state.upgrades).toContain('upgrade-throughput-1')
    })

    it('should not allow duplicate purchases', () => {
      upgradeSystem.purchaseUpgrade('upgrade-throughput-1')
      upgradeSystem.purchaseUpgrade('upgrade-throughput-1')
      const state = upgradeSystem.getState()
      const count = state.upgrades.filter(u => u === 'upgrade-throughput-1').length
      expect(count).toBe(1)
    })
  })

  describe('upgrade application', () => {
    it('should apply throughput modifier', () => {
      upgradeSystem.purchaseUpgrade('upgrade-throughput-1')
      const node: Node = {
        id: 'node-1',
        throughput: 200,
        heat: 0,
        efficiency: 1.0,
        status: 'online',
        upgrades: ['upgrade-throughput-1'],
        lastMeltdownTime: null,
      }

      const modified = upgradeSystem.applyUpgradesToNode(node)
      expect(modified.throughput).toBe(220) // 200 * 1.1
    })

    it('should apply efficiency modifier', () => {
      upgradeSystem.purchaseUpgrade('upgrade-cooling-1')
      const node: Node = {
        id: 'node-1',
        throughput: 200,
        heat: 0,
        efficiency: 1.0,
        status: 'online',
        upgrades: ['upgrade-cooling-1'],
        lastMeltdownTime: null,
      }

      const modified = upgradeSystem.applyUpgradesToNode(node)
      expect(modified.efficiency).toBe(1.2)
    })

    it('should stack multiple upgrades', () => {
      upgradeSystem.purchaseUpgrade('upgrade-throughput-1')
      upgradeSystem.purchaseUpgrade('upgrade-cooling-1')
      const node: Node = {
        id: 'node-1',
        throughput: 200,
        heat: 0,
        efficiency: 1.0,
        status: 'online',
        upgrades: ['upgrade-throughput-1', 'upgrade-cooling-1'],
        lastMeltdownTime: null,
      }

      const modified = upgradeSystem.applyUpgradesToNode(node)
      expect(modified.throughput).toBe(220) // 200 * 1.1
      expect(modified.efficiency).toBe(1.2)
    })
  })

  describe('cost calculation', () => {
    it('should return upgrade cost', () => {
      const cost = upgradeSystem.getUpgradeCost('upgrade-throughput-1')
      expect(cost).toBe(100)
    })

    it('should return 0 for unknown upgrade', () => {
      const cost = upgradeSystem.getUpgradeCost('unknown-upgrade')
      expect(cost).toBe(0)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- upgradeSystem.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write UpgradeSystem implementation**

Create `src/lib/engine/upgradeSystem.ts`:

```typescript
import { Upgrade, Node, IUpgradeSystem } from './types'

export class UpgradeSystem implements IUpgradeSystem {
  private availableUpgrades: Map<string, Upgrade>
  private purchasedUpgradeIds: Set<string>

  constructor(availableUpgrades: Upgrade[]) {
    this.availableUpgrades = new Map(availableUpgrades.map(u => [u.id, u]))
    this.purchasedUpgradeIds = new Set()
  }

  getState(): { upgrades: string[] } {
    return { upgrades: Array.from(this.purchasedUpgradeIds) }
  }

  purchaseUpgrade(upgradeId: string): void {
    if (!this.purchasedUpgradeIds.has(upgradeId)) {
      this.purchasedUpgradeIds.add(upgradeId)
    }
  }

  applyUpgradesToNode(node: Node): Node {
    let modified = { ...node }

    for (const upgradeId of node.upgrades) {
      const upgrade = this.availableUpgrades.get(upgradeId)
      if (!upgrade) continue

      if (upgrade.effects.throughput) {
        modified.throughput *= upgrade.effects.throughput
      }
      if (upgrade.effects.efficiency) {
        modified.efficiency *= upgrade.effects.efficiency
      }
      if (upgrade.effects.cooling) {
        modified.efficiency *= upgrade.effects.cooling
      }
    }

    return modified
  }

  getUpgradeCost(upgradeId: string): number {
    return this.availableUpgrades.get(upgradeId)?.cost ?? 0
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- upgradeSystem.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit UpgradeSystem**

```bash
git add src/lib/engine/upgradeSystem.ts __tests__/upgradeSystem.test.ts
git commit -m "feat: implement UpgradeSystem with purchase tracking and stat modifiers"
git push
```

---

### Task 6: Implement SentimentSystem (Module 4)

**Files:**
- Create: `src/lib/engine/sentimentSystem.ts`
- Create: `__tests__/sentimentSystem.test.ts`

- [ ] **Step 1: Write failing tests for sentiment**

Create `__tests__/sentimentSystem.test.ts`:

```typescript
import { SentimentSystem } from '../src/lib/engine/sentimentSystem'
import { PlayerState } from '../src/lib/engine/types'

describe('SentimentSystem', () => {
  let sentimentSystem: SentimentSystem

  beforeEach(() => {
    const initialPlayer: PlayerState = {
      credits: 1000,
      totalPacketsProcessed: 0,
      sentiment: 50,
      consecutiveSuccesses: 0,
    }
    sentimentSystem = new SentimentSystem(initialPlayer)
  })

  describe('sentiment changes', () => {
    it('should increase sentiment on success', () => {
      sentimentSystem.recordSuccess()
      const state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(55) // 50 + 5
    })

    it('should decrease sentiment on failure', () => {
      sentimentSystem.recordFailure()
      const state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(35) // 50 - 15
    })

    it('should cap sentiment at 100', () => {
      const player: PlayerState = {
        credits: 1000,
        totalPacketsProcessed: 0,
        sentiment: 98,
        consecutiveSuccesses: 0,
      }
      sentimentSystem = new SentimentSystem(player)
      sentimentSystem.recordSuccess()
      const state = sentimentSystem.getState()
      expect(state.player.sentiment).toBeLessThanOrEqual(100)
    })

    it('should cap sentiment at 0', () => {
      const player: PlayerState = {
        credits: 1000,
        totalPacketsProcessed: 0,
        sentiment: 5,
        consecutiveSuccesses: 0,
      }
      sentimentSystem = new SentimentSystem(player)
      sentimentSystem.recordFailure()
      const state = sentimentSystem.getState()
      expect(state.player.sentiment).toBeGreaterThanOrEqual(0)
    })
  })

  describe('streak tracking', () => {
    it('should increment consecutive successes on success', () => {
      sentimentSystem.recordSuccess()
      let state = sentimentSystem.getState()
      expect(state.player.consecutiveSuccesses).toBe(1)

      sentimentSystem.recordSuccess()
      state = sentimentSystem.getState()
      expect(state.player.consecutiveSuccesses).toBe(2)
    })

    it('should reset streak on failure', () => {
      sentimentSystem.recordSuccess()
      sentimentSystem.recordSuccess()
      sentimentSystem.recordFailure()
      const state = sentimentSystem.getState()
      expect(state.player.consecutiveSuccesses).toBe(0)
    })

    it('should apply streak bonus up to +8', () => {
      // Success 1: 50 + 5 + 0 = 55
      sentimentSystem.recordSuccess()
      let state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(55)

      // Success 2: 55 + 5 + 1 = 61
      sentimentSystem.recordSuccess()
      state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(61)

      // Success 3: 61 + 5 + 2 = 68
      sentimentSystem.recordSuccess()
      state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(68)

      // Success 4+: streak bonus caps at +3 (base 5 + max streak bonus 3)
      sentimentSystem.recordSuccess()
      state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(76) // 68 + 5 + 3
    })
  })

  describe('difficulty weighting', () => {
    it('should weight safe contracts when sentiment is low', () => {
      const player: PlayerState = {
        credits: 1000,
        totalPacketsProcessed: 0,
        sentiment: 20,
        consecutiveSuccesses: 0,
      }
      sentimentSystem = new SentimentSystem(player)
      const weights = sentimentSystem.getContractDifficultyWeights()
      expect(weights.safe).toBeGreaterThan(weights.hard)
    })

    it('should weight hard contracts when sentiment is high', () => {
      const player: PlayerState = {
        credits: 1000,
        totalPacketsProcessed: 0,
        sentiment: 80,
        consecutiveSuccesses: 0,
      }
      sentimentSystem = new SentimentSystem(player)
      const weights = sentimentSystem.getContractDifficultyWeights()
      expect(weights.hard).toBeGreaterThan(weights.safe)
    })

    it('should balance at medium sentiment', () => {
      const player: PlayerState = {
        credits: 1000,
        totalPacketsProcessed: 0,
        sentiment: 50,
        consecutiveSuccesses: 0,
      }
      sentimentSystem = new SentimentSystem(player)
      const weights = sentimentSystem.getContractDifficultyWeights()
      expect(Math.abs(weights.safe - weights.hard)).toBeLessThan(0.2)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- sentimentSystem.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write SentimentSystem implementation**

Create `src/lib/engine/sentimentSystem.ts`:

```typescript
import { PlayerState, ISentimentSystem } from './types'

const SUCCESS_BASE = 5
const SUCCESS_STREAK_BONUS_MAX = 3
const FAILURE_PENALTY = 15
const SENTIMENT_CAP = 100
const SENTIMENT_FLOOR = 0

export class SentimentSystem implements ISentimentSystem {
  private player: PlayerState

  constructor(initialPlayer: PlayerState) {
    this.player = JSON.parse(JSON.stringify(initialPlayer))
  }

  getState(): { player: PlayerState } {
    return { player: this.player }
  }

  recordSuccess(): void {
    const streakBonus = Math.min(this.player.consecutiveSuccesses, SUCCESS_STREAK_BONUS_MAX)
    const sentimentGain = SUCCESS_BASE + streakBonus
    this.player.sentiment = Math.min(SENTIMENT_CAP, this.player.sentiment + sentimentGain)
    this.player.consecutiveSuccesses += 1
  }

  recordFailure(): void {
    this.player.sentiment = Math.max(SENTIMENT_FLOOR, this.player.sentiment - FAILURE_PENALTY)
    this.player.consecutiveSuccesses = 0
  }

  getContractDifficultyWeights(): { safe: number; hard: number } {
    const sentiment = this.player.sentiment

    if (sentiment <= 30) {
      return { safe: 0.8, hard: 0.2 }
    } else if (sentiment >= 70) {
      return { safe: 0.2, hard: 0.8 }
    } else {
      // Linear interpolation between 30 and 70
      const ratio = (sentiment - 30) / (70 - 30) // 0 to 1
      const hard = 0.2 + ratio * 0.6 // 0.2 to 0.8
      const safe = 1 - hard
      return { safe, hard }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- sentimentSystem.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit SentimentSystem**

```bash
git add src/lib/engine/sentimentSystem.ts __tests__/sentimentSystem.test.ts
git commit -m "feat: implement SentimentSystem with reputation and difficulty weighting"
git push
```

---

### Task 7: Implement ContractSystem (Module 5)

**Files:**
- Create: `src/lib/engine/contractSystem.ts`
- Create: `__tests__/contractSystem.test.ts`

- [ ] **Step 1: Write failing tests for contracts**

Create `__tests__/contractSystem.test.ts`:

```typescript
import { ContractSystem } from '../src/lib/engine/contractSystem'
import { Contract } from '../src/lib/engine/types'

describe('ContractSystem', () => {
  let contractSystem: ContractSystem
  const now = Date.now()

  beforeEach(() => {
    const initialContracts: Contract[] = [
      {
        id: 'contract-1',
        targetVolume: 10000,
        currentVolume: 0,
        deadline: now + 120000, // 120 seconds
        reward: 50,
        penalty: 0,
        status: 'active',
        difficulty: 'safe',
      },
    ]
    contractSystem = new ContractSystem(initialContracts)
  })

  describe('packet routing', () => {
    it('should route packets to contracts', () => {
      const contracts = contractSystem.getState().contracts
      contractSystem.tick(contracts, 5000) // 5000 packets available

      const updated = contractSystem.getState().contracts
      expect(updated[0].currentVolume).toBe(5000)
    })

    it('should route to deadline-first order', () => {
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 10000,
          currentVolume: 0,
          deadline: now + 40000, // closer deadline
          reward: 200,
          penalty: 0,
          status: 'active',
          difficulty: 'hard',
        },
        {
          id: 'contract-2',
          targetVolume: 10000,
          currentVolume: 0,
          deadline: now + 120000, // further deadline
          reward: 50,
          penalty: 0,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      contractSystem = new ContractSystem(contracts)
      contractSystem.tick(contracts, 3000)

      const updated = contractSystem.getState().contracts
      // Should route to contract-1 first (closer deadline)
      expect(updated[0].currentVolume).toBe(3000)
      expect(updated[1].currentVolume).toBe(0)
    })
  })

  describe('deadline enforcement', () => {
    it('should mark contract successful if target met at deadline', () => {
      let contracts = contractSystem.getState().contracts
      contracts[0].currentVolume = 10000 // target met
      contracts[0].deadline = Date.now() - 1000 // deadline passed

      contractSystem.tick(contracts, 0)

      const updated = contractSystem.getState().contracts
      expect(updated[0].status).toBe('completed')
    })

    it('should mark contract failed if target not met at deadline', () => {
      let contracts = contractSystem.getState().contracts
      contracts[0].currentVolume = 5000 // target not met
      contracts[0].deadline = Date.now() - 1000 // deadline passed

      contractSystem.tick(contracts, 0)

      const updated = contractSystem.getState().contracts
      expect(updated[0].status).toBe('failed')
    })

    it('should not evaluate active contracts with future deadlines', () => {
      let contracts = contractSystem.getState().contracts
      contracts[0].currentVolume = 0
      contracts[0].deadline = now + 120000 // future deadline

      contractSystem.tick(contracts, 0)

      const updated = contractSystem.getState().contracts
      expect(updated[0].status).toBe('active')
    })
  })

  describe('contract generation', () => {
    it('should generate safe contracts', () => {
      const safe = contractSystem.generateNewContracts('safe')
      expect(safe.length).toBeGreaterThan(0)
      expect(safe.every(c => c.difficulty === 'safe')).toBe(true)
    })

    it('should generate hard contracts', () => {
      const hard = contractSystem.generateNewContracts('hard')
      expect(hard.length).toBeGreaterThan(0)
      expect(hard.every(c => c.difficulty === 'hard')).toBe(true)
    })

    it('safe contracts should have loose deadlines', () => {
      const safe = contractSystem.generateNewContracts('safe')
      // Safe: 10000 packets / 120 seconds = ~83 pps, can be idle-friendly
      expect(safe[0].targetVolume).toBe(10000)
      expect(safe[0].deadline - Date.now()).toBeGreaterThan(100000)
    })

    it('hard contracts should have tight deadlines', () => {
      const hard = contractSystem.generateNewContracts('hard')
      // Hard: 10000 packets / 40 seconds = 250 pps, requires active play
      expect(hard[0].targetVolume).toBe(10000)
      expect(hard[0].deadline - Date.now()).toBeLessThan(50000)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- contractSystem.test.ts
```

Expected: FAIL

- [ ] **Step 3: Write ContractSystem implementation**

Create `src/lib/engine/contractSystem.ts`:

```typescript
import { Contract, IContractSystem } from './types'

const SAFE_DEADLINE_SECONDS = 120
const HARD_DEADLINE_SECONDS = 40
const CONTRACT_VOLUME = 10000
const SAFE_REWARD = 50
const SAFE_PENALTY = 25
const HARD_REWARD = 200
const HARD_PENALTY = 100

export class ContractSystem implements IContractSystem {
  private contracts: Contract[]
  private nextContractId = 1

  constructor(initialContracts: Contract[]) {
    this.contracts = JSON.parse(JSON.stringify(initialContracts))
  }

  getState(): { contracts: Contract[] } {
    return { contracts: this.contracts }
  }

  tick(contracts: Contract[], packetsAvailable: number): void {
    this.contracts = contracts
    let packetsRemaining = packetsAvailable

    // Sort by deadline (earliest first)
    const active = this.contracts.filter(c => c.status === 'active').sort((a, b) => a.deadline - b.deadline)

    // Route packets to active contracts
    for (const contract of active) {
      if (packetsRemaining <= 0) break

      const needed = contract.targetVolume - contract.currentVolume
      const toRoute = Math.min(packetsRemaining, needed)
      contract.currentVolume += toRoute
      packetsRemaining -= toRoute
    }

    // Check deadlines
    const now = Date.now()
    for (const contract of this.contracts) {
      if (contract.status === 'active' && now >= contract.deadline) {
        if (contract.currentVolume >= contract.targetVolume) {
          contract.status = 'completed'
        } else {
          contract.status = 'failed'
        }
      }
    }
  }

  generateNewContracts(difficulty: 'safe' | 'hard'): Contract[] {
    const count = Math.floor(Math.random() * 2) + 2 // 2–3 contracts
    const contracts: Contract[] = []

    for (let i = 0; i < count; i++) {
      const isHard = difficulty === 'hard'
      const deadline = Date.now() + (isHard ? HARD_DEADLINE_SECONDS : SAFE_DEADLINE_SECONDS) * 1000

      contracts.push({
        id: `contract-${this.nextContractId++}`,
        targetVolume: CONTRACT_VOLUME,
        currentVolume: 0,
        deadline,
        reward: isHard ? HARD_REWARD : SAFE_REWARD,
        penalty: isHard ? HARD_PENALTY : SAFE_PENALTY,
        status: 'active',
        difficulty,
      })
    }

    return contracts
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- contractSystem.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit ContractSystem**

```bash
git add src/lib/engine/contractSystem.ts __tests__/contractSystem.test.ts
git commit -m "feat: implement ContractSystem with deadline enforcement and packet routing"
git push
```

---

### Task 8: Implement GameEngine & Initial State Factory (Module 6)

**Files:**
- Create: `src/lib/engine/gameEngine.ts`
- Create: `src/lib/engine/gameState.ts`
- Create: `__tests__/gameEngine.integration.test.ts`

- [ ] **Step 1: Write gameState factory**

Create `src/lib/engine/gameState.ts`:

```typescript
import { GameState, Node, Contract, Upgrade } from './types'

const DEFAULT_UPGRADES: Upgrade[] = [
  {
    id: 'upgrade-throughput-10',
    name: '+10% Throughput',
    cost: 100,
    effects: { throughput: 1.1 },
  },
  {
    id: 'upgrade-cooling-20',
    name: 'Cooling Boost',
    cost: 150,
    effects: { efficiency: 1.2 },
  },
  {
    id: 'upgrade-efficiency-15',
    name: '+15% Efficiency',
    cost: 200,
    effects: { efficiency: 1.15 },
  },
]

export function createInitialGameState(overrides?: Partial<GameState>): GameState {
  const now = Date.now()

  const defaultNode: Node = {
    id: 'node-1',
    throughput: 200,
    heat: 0,
    efficiency: 1.0,
    status: 'online',
    upgrades: [],
    lastMeltdownTime: null,
  }

  const defaultState: GameState = {
    player: {
      credits: 1000,
      totalPacketsProcessed: 0,
      sentiment: 50,
      consecutiveSuccesses: 0,
    },
    nodes: [defaultNode],
    contracts: [],
    upgrades: DEFAULT_UPGRADES,
    metadata: {
      lastTickTime: now,
      gameStartTime: now,
    },
  }

  return { ...defaultState, ...overrides }
}
```

- [ ] **Step 2: Write GameEngine implementation**

Create `src/lib/engine/gameEngine.ts`:

```typescript
import { NodeManager } from './nodeManager'
import { Economy } from './economy'
import { UpgradeSystem } from './upgradeSystem'
import { SentimentSystem } from './sentimentSystem'
import { ContractSystem } from './contractSystem'
import { GameState, IGameEngine, Node, Contract } from './types'

export class GameEngine implements IGameEngine {
  private nodeManager: NodeManager
  private economy: Economy
  private upgradeSystem: UpgradeSystem
  private sentimentSystem: SentimentSystem
  private contractSystem: ContractSystem
  private state: GameState

  // Callbacks for events (UI updates)
  private onContractSuccess?: (contract: Contract) => void
  private onContractFailure?: (contract: Contract) => void

  constructor(initialState: GameState) {
    this.state = JSON.parse(JSON.stringify(initialState))

    this.nodeManager = new NodeManager(this.state.nodes)
    this.economy = new Economy(this.state.player)
    this.upgradeSystem = new UpgradeSystem(this.state.upgrades)
    this.sentimentSystem = new SentimentSystem(this.state.player)
    this.contractSystem = new ContractSystem(this.state.contracts)
  }

  getState(): GameState {
    return {
      player: this.economy.getState().player,
      nodes: this.nodeManager.getState().nodes,
      contracts: this.contractSystem.getState().contracts,
      upgrades: this.state.upgrades, // upgrades don't change during game
      metadata: {
        lastTickTime: Date.now(),
        gameStartTime: this.state.metadata.gameStartTime,
      },
    }
  }

  setEventCallbacks(
    onSuccess?: (contract: Contract) => void,
    onFailure?: (contract: Contract) => void
  ): void {
    this.onContractSuccess = onSuccess
    this.onContractFailure = onFailure
  }

  tick(): void {
    // 1. NodeManager: update heat, status
    let nodes = this.nodeManager.getState().nodes
    this.nodeManager.tick(nodes)
    nodes = this.nodeManager.getState().nodes

    // 2. Generate packets from all nodes
    let totalPackets = 0
    for (const node of nodes) {
      totalPackets += this.nodeManager.generatePackets(node)
    }

    // 3. ContractSystem: route packets, check deadlines
    let contracts = this.contractSystem.getState().contracts
    const contractsBefore = JSON.parse(JSON.stringify(contracts))
    this.contractSystem.tick(contracts, totalPackets)
    contracts = this.contractSystem.getState().contracts

    // 4. Process contract events (success/failure)
    for (let i = 0; i < contracts.length; i++) {
      const before = contractsBefore[i]
      const after = contracts[i]

      if (before.status === 'active' && after.status === 'completed') {
        this.economy.addCredits(after.reward)
        this.sentimentSystem.recordSuccess()
        if (this.onContractSuccess) this.onContractSuccess(after)
      }

      if (before.status === 'active' && after.status === 'failed') {
        this.economy.applyPenalty(after.penalty)
        this.sentimentSystem.recordFailure()
        if (this.onContractFailure) this.onContractFailure(after)
      }
    }

    // 5. Economy: settle revenue from packets
    this.economy.settleRevenue(totalPackets)

    // 6. Generate new contracts if needed
    const activeCount = contracts.filter(c => c.status === 'active').length
    if (activeCount < 2) {
      const weights = this.sentimentSystem.getContractDifficultyWeights()
      const difficulty = Math.random() < weights.hard ? 'hard' : 'safe'
      const newContracts = this.contractSystem.generateNewContracts(difficulty)
      contracts = [...contracts, ...newContracts]
    }

    // Update internal state
    this.state = this.getState()
  }
}
```

- [ ] **Step 3: Write integration test**

Create `__tests__/gameEngine.integration.test.ts`:

```typescript
import { GameEngine } from '../src/lib/engine/gameEngine'
import { createInitialGameState } from '../src/lib/engine/gameState'

describe('GameEngine Integration', () => {
  it('should run 1000 ticks without crash', () => {
    const state = createInitialGameState()
    const engine = new GameEngine(state)

    expect(() => {
      for (let i = 0; i < 1000; i++) {
        engine.tick()
      }
    }).not.toThrow()
  })

  it('should process packets and update player state', () => {
    const state = createInitialGameState()
    const engine = new GameEngine(state)

    const before = engine.getState()
    const initialCredits = before.player.credits

    engine.tick()

    const after = engine.getState()
    // Some revenue should have been generated
    expect(after.player.totalPacketsProcessed).toBeGreaterThan(0)
    expect(after.player.credits).toBeGreaterThanOrEqual(initialCredits)
  })

  it('should handle contract success and failure', () => {
    const state = createInitialGameState()
    let successCount = 0
    let failureCount = 0

    const engine = new GameEngine(state)
    engine.setEventCallbacks(
      () => successCount++,
      () => failureCount++
    )

    // Run ticks until contracts complete
    for (let i = 0; i < 200; i++) {
      engine.tick()
      if (successCount > 0 || failureCount > 0) break
    }

    expect(successCount + failureCount).toBeGreaterThan(0)
  })

  it('should maintain sentiment between 0 and 100', () => {
    const state = createInitialGameState()
    const engine = new GameEngine(state)

    for (let i = 0; i < 500; i++) {
      engine.tick()
      const current = engine.getState().player.sentiment
      expect(current).toBeGreaterThanOrEqual(0)
      expect(current).toBeLessThanOrEqual(100)
    }
  })

  it('should throttle throughput based on heat', () => {
    const state = createInitialGameState({
      nodes: [
        {
          id: 'node-1',
          throughput: 200,
          heat: 0,
          efficiency: 1.0,
          status: 'online',
          upgrades: [],
          lastMeltdownTime: null,
        },
      ],
    })
    const engine = new GameEngine(state)

    let packetsAt0Heat = 0
    let packetsAt100Heat = 0

    // Warm up the node to heat ~100
    for (let i = 0; i < 100; i++) {
      engine.tick()
    }

    // Check throughput at max heat
    packetsAt100Heat = engine.getState().nodes[0].throughput
    const effectiveThroughput =
      packetsAt100Heat * (1 - engine.getState().nodes[0].heat / 100)
    expect(effectiveThroughput).toBeLessThan(packetsAt0Heat || 200)
  })
})
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: All tests pass (including all 6 modules + integration)

- [ ] **Step 5: Commit GameEngine and integration tests**

```bash
git add src/lib/engine/gameEngine.ts src/lib/engine/gameState.ts __tests__/gameEngine.integration.test.ts
git commit -m "feat: implement GameEngine orchestration and integration tests"
git push
```

---

### Task 9: Zustand Store Setup

**Files:**
- Create: `src/store/gameStore.ts`

- [ ] **Step 1: Create Zustand store wrapping GameEngine**

Create `src/store/gameStore.ts`:

```typescript
import { create } from 'zustand'
import { GameEngine } from '../lib/engine/gameEngine'
import { GameState } from '../lib/engine/types'
import { createInitialGameState } from '../lib/engine/gameState'

interface GameStore {
  engine: GameEngine | null
  state: GameState | null
  initializeGame: () => void
  tick: () => void
  getState: () => GameState | null
}

export const useGameStore = create<GameStore>((set, get) => ({
  engine: null,
  state: null,

  initializeGame: () => {
    const initialState = createInitialGameState()
    const engine = new GameEngine(initialState)
    set({ engine, state: engine.getState() })
  },

  tick: () => {
    const { engine } = get()
    if (!engine) return

    engine.tick()
    set({ state: engine.getState() })
  },

  getState: () => {
    const { state } = get()
    return state
  },
}))
```

- [ ] **Step 2: Create a simple test page to verify store works**

Create `src/pages/index.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'

export default function Home() {
  const { initializeGame, tick, getState } = useGameStore()
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      tick()
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, tick])

  const state = getState()

  return (
    <div className="p-8 bg-black text-green-400 font-mono">
      <h1 className="text-2xl mb-4">Terminal Flow</h1>
      
      {state && (
        <>
          <div className="mb-4 space-y-2">
            <p>Credits: {state.player.credits}</p>
            <p>Sentiment: {state.player.sentiment}/100</p>
            <p>Packets Processed: {state.player.totalPacketsProcessed}</p>
            <p>Consecutive Successes: {state.player.consecutiveSuccesses}</p>
          </div>

          <div className="mb-4 space-y-2">
            <h2 className="text-xl">Nodes</h2>
            {state.nodes.map(node => (
              <div key={node.id} className="border border-green-400 p-2">
                <p>Node {node.id}</p>
                <p>Throughput: {node.throughput}</p>
                <p>Heat: {node.heat}/100</p>
                <p>Status: {node.status}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 space-y-2">
            <h2 className="text-xl">Active Contracts</h2>
            {state.contracts.filter(c => c.status === 'active').map(contract => (
              <div key={contract.id} className="border border-yellow-600 p-2">
                <p>Contract {contract.id}</p>
                <p>Progress: {contract.currentVolume}/{contract.targetVolume}</p>
                <p>Difficulty: {contract.difficulty}</p>
                <p>Reward: {contract.reward} credits</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className="px-4 py-2 border border-green-400 hover:bg-green-400 hover:text-black"
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit Zustand store**

```bash
git add src/store/gameStore.ts src/pages/index.tsx
git commit -m "feat: add Zustand store and basic dashboard page"
git push
```

---

### Task 10: Final Testing & Refinement

**Files:**
- None (testing only)

- [ ] **Step 1: Run full test suite**

```bash
npm test -- --coverage
```

Expected: All tests pass, ≥80% coverage on game modules

- [ ] **Step 2: Start dev server and verify game runs**

```bash
npm run dev
```

Then open http://localhost:3000 in your browser. You should see:
- Credits and sentiment displays
- Node status (throughput, heat)
- Active contracts
- Start/Pause button

Click Start and watch the game loop run. Credits should increase, heat should rise, contracts should progress.

- [ ] **Step 3: Verify no console errors**

Open browser DevTools (F12). You should see no JavaScript errors, only normal Next.js HMR logs.

- [ ] **Step 4: Test game feel**

Run for ~30 seconds. Verify:
- Credits increase over time (passive progression)
- Heat rises and stays below 100 (no crash)
- Sentiment stays between 0–100
- Contracts complete and fail naturally
- New contracts generate as old ones complete

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: complete core implementation with tests and basic UI"
git push
```

---

## Implementation Sequence Summary

1. ✅ Scaffold Next.js + Jest
2. ✅ Define shared types
3. ✅ Implement NodeManager (heat, throughput, status)
4. ✅ Implement Economy (credits, revenue)
5. ✅ Implement UpgradeSystem (purchases, modifiers)
6. ✅ Implement SentimentSystem (reputation, weighting)
7. ✅ Implement ContractSystem (deadlines, routing)
8. ✅ Implement GameEngine (orchestration)
9. ✅ Zustand store + basic dashboard
10. ✅ Full test run, dev server verification

---

## Next Steps (After Core Complete)

Once all tasks pass and the core loop is verified running:
- Invoke `superpowers:writing-plans` to plan **Phase 1 UI implementation** (single-node dashboard, manual cool button, contract UI, upgrade shop)
- Then plan **Phase 2 UI** (multi-node selector, power allocator)
- Then plan **persistence + Capacitor** (IndexedDB, offline catch-up, APK build)

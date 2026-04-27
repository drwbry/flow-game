import { GameState, Upgrade, Node } from './types'

export const DEFAULT_UPGRADES: Upgrade[] = [
  // Tier 1: always visible — affordable within a few minutes of idle play
  {
    id: 'throughput-1',
    name: 'Throughput Booster Alpha',
    cost: 50,
    tier: 1,
    requires: [],
    effects: { throughput: 50, heatRateModifier: 0.05 },
  },
  {
    id: 'cooling-1',
    name: 'Cooling System Alpha',
    cost: 75,
    tier: 1,
    requires: [],
    effects: { efficiency: 0.2, heatRateModifier: -0.10 },
  },

  // Tier 2: unlocks after first-tier purchases
  {
    id: 'throughput-2',
    name: 'Throughput Booster Beta',
    cost: 150,
    tier: 2,
    requires: ['throughput-1'],
    effects: { throughput: 100, heatRateModifier: 0.10 },
  },
  {
    id: 'cooling-2',
    name: 'Cooling System Beta',
    cost: 200,
    tier: 2,
    requires: ['cooling-1'],
    effects: { efficiency: 0.2, heatRateModifier: -0.15 },
  },
  {
    id: 'efficiency-1',
    name: 'Efficiency Module',
    cost: 175,
    tier: 2,
    requires: ['throughput-1'],
    effects: { efficiency: 0.1 },
  },

  // Tier 3: deep progression, exponentially more expensive
  {
    id: 'throughput-3',
    name: 'Throughput Booster Gamma',
    cost: 400,
    tier: 3,
    requires: ['throughput-2'],
    effects: { throughput: 200, heatRateModifier: 0.15 },
  },
  {
    id: 'cooling-3',
    name: 'Cooling System Gamma',
    cost: 500,
    tier: 3,
    requires: ['cooling-2'],
    effects: { efficiency: 0.2, heatRateModifier: -0.20 },
  },
  {
    id: 'efficiency-2',
    name: 'Advanced Efficiency Module',
    cost: 600,
    tier: 3,
    requires: ['efficiency-1', 'cooling-2'],
    effects: { efficiency: 0.15 },
  },
]

export function createInitialGameState(overrides?: Partial<GameState>): GameState {
  const now = Date.now()

  const initialNode: Node = {
    id: 'node-1',
    throughput: 200,
    heat: 0,
    efficiency: 0.0, // start with no cooling; upgrades improve this
    heatRateModifier: 1.0, // upgrades shift this; throughput raises it, cooling lowers it
    status: 'online',
    upgrades: [],
    lastMeltdownTime: null,
  }

  const defaultState: GameState = {
    player: {
      credits: 0,
      totalPacketsProcessed: 0,
      sentiment: 50,
      consecutiveSuccesses: 0,
    },
    nodes: [initialNode],
    contracts: [],
    upgrades: DEFAULT_UPGRADES,
    metadata: {
      lastTickTime: now,
      gameStartTime: now,
    },
  }

  if (!overrides) return defaultState

  return {
    ...defaultState,
    ...overrides,
    player: { ...defaultState.player, ...overrides.player },
    metadata: { ...defaultState.metadata, ...overrides.metadata },
  }
}

import { GameState, Upgrade, Node } from './types'

export const DEFAULT_UPGRADES: Upgrade[] = [
  {
    id: 'upgrade-throughput-1',
    name: 'Throughput Booster Alpha',
    cost: 100,
    effects: {
      throughput: 50,
    },
  },
  {
    id: 'upgrade-throughput-2',
    name: 'Throughput Booster Beta',
    cost: 200,
    effects: {
      throughput: 100,
    },
  },
  {
    id: 'upgrade-efficiency-1',
    name: 'Efficiency Module',
    cost: 150,
    effects: {
      efficiency: 0.1,
    },
  },
  {
    id: 'upgrade-cooling-20',
    name: 'Cooling System Alpha',
    cost: 120,
    effects: {
      efficiency: 0.5,
    },
  },
  {
    id: 'upgrade-cooling-beta',
    name: 'Cooling System Beta',
    cost: 250,
    effects: {
      efficiency: 0.4,
    },
  },
]

export function createInitialGameState(overrides?: Partial<GameState>): GameState {
  const now = Date.now()

  const initialNode: Node = {
    id: 'node-1',
    throughput: 200,
    heat: 0,
    efficiency: 0.0, // start with no cooling; upgrades improve this
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

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
    id: 'upgrade-cooling-1',
    name: 'Cooling System Alpha',
    cost: 120,
    effects: {
      cooling: 10,
    },
  },
  {
    id: 'upgrade-cooling-2',
    name: 'Cooling System Beta',
    cost: 250,
    effects: {
      cooling: 25,
    },
  },
]

export function createInitialGameState(): GameState {
  const now = Date.now()

  const initialNode: Node = {
    id: 'node-1',
    throughput: 200,
    heat: 0,
    efficiency: 1.0,
    cooling: 0,
    status: 'online',
    upgrades: [],
    lastMeltdownTime: null,
  }

  return {
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
}

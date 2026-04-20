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
  getState(): { credits: number }
  settleRevenue(packets: number): void
  applyPenalty(amount: number): void
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
  tick(packetsAvailable: number): void
  generateNewContracts(difficulty: 'safe' | 'hard'): Contract[]
}

export interface IGameEngine {
  getState(): GameState
  tick(): void
}

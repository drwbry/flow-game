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
  deadline: number        // set on acceptance (not on offer generation)
  offerExpiry?: number    // timestamp when offer disappears if not accepted (offered status only)
  reward: number // credits
  penalty: number // credits
  status: 'offered' | 'active' | 'completed' | 'failed'
  difficulty: 'safe' | 'hard'
}

// Upgrade types
export interface Upgrade {
  id: string
  name: string
  cost: number
  tier: number        // 1 = always visible; 2+ = visible only after requires[] are purchased
  requires: string[]  // upgrade IDs that must be owned before this appears in the shop
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
  addCredits(amount: number): void
  subtractCredits(amount: number): void
  settleRevenue(packets: number): void
  applyPenalty(amount: number): void
}

export interface IUpgradeSystem {
  getState(): { upgrades: Upgrade[] }
  applyUpgradesToNode(node: Node, upgradeIds: string[]): void
}

export interface ISentimentSystem {
  getState(): { sentiment: number; consecutiveSuccesses: number }
  recordSuccess(): void
  recordFailure(): void
  getContractDifficultyWeights(): { safe: number; hard: number }
}

export interface IContractSystem {
  getState(): { contracts: Contract[] }
  tick(packetsAvailable: number): void
  generateNewOffers(difficulty: 'safe' | 'hard', count: number): void
  acceptContract(contractId: string): boolean
}

export interface IGameEngine {
  getState(): GameState
  tick(): void
  coolNode(nodeId: string): void
  purchaseUpgrade(upgradeId: string, nodeId: string): boolean
  acceptContract(contractId: string): boolean
}

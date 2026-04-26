import { GameState, IGameEngine, Contract } from './types'
import { NodeManager } from './nodeManager'
import { Economy } from './economy'
import { UpgradeSystem } from './upgradeSystem'
import { SentimentSystem } from './sentimentSystem'
import { ContractSystem } from './contractSystem'

const COOL_HEAT_REDUCTION = 10
const OFFER_POOL_TARGET = 3

export class GameEngine implements IGameEngine {
  private state: GameState
  private nodeManager: NodeManager
  private economy: Economy
  private upgradeSystem: UpgradeSystem
  private sentimentSystem: SentimentSystem
  private contractSystem: ContractSystem
  private onContractSuccess?: (contract: Contract) => void
  private onContractFailure?: (contract: Contract) => void

  constructor(initialState: GameState) {
    this.state = JSON.parse(JSON.stringify(initialState))

    this.nodeManager = new NodeManager(this.state.nodes)
    this.economy = new Economy(this.state.player.credits)
    this.upgradeSystem = new UpgradeSystem(this.state.upgrades)
    this.sentimentSystem = new SentimentSystem(this.state.player.sentiment)
    this.contractSystem = new ContractSystem(this.state.contracts)
  }

  getState(): GameState {
    const nodeState = this.nodeManager.getState()
    const economyState = this.economy.getState()
    const upgradeState = this.upgradeSystem.getState()
    const sentimentState = this.sentimentSystem.getState()
    const contractState = this.contractSystem.getState()

    return {
      player: {
        credits: economyState.credits,
        totalPacketsProcessed: this.state.player.totalPacketsProcessed,
        sentiment: sentimentState.sentiment,
        consecutiveSuccesses: sentimentState.consecutiveSuccesses,
      },
      nodes: nodeState.nodes,
      contracts: contractState.contracts,
      upgrades: upgradeState.upgrades,
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

  coolNode(nodeId: string): void {
    const nodes = this.nodeManager.getState().nodes
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    node.heat = Math.max(0, node.heat - COOL_HEAT_REDUCTION)
  }

  purchaseUpgrade(upgradeId: string, nodeId: string): boolean {
    const nodes = this.nodeManager.getState().nodes
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return false
    if (node.upgrades.includes(upgradeId)) return false

    const upgrade = this.state.upgrades.find(u => u.id === upgradeId)
    if (!upgrade) return false
    if (!upgrade.requires.every(id => node.upgrades.includes(id))) return false

    if (this.economy.getState().credits < upgrade.cost) return false

    this.economy.subtractCredits(upgrade.cost)
    node.upgrades.push(upgradeId)
    this.upgradeSystem.applyUpgradesToNode(node, [upgradeId])
    return true
  }

  acceptContract(contractId: string): boolean {
    return this.contractSystem.acceptContract(contractId)
  }

  tick(): void {
    // Step 1: Update node heat and status
    const nodes = this.state.nodes
    this.nodeManager.tick(nodes)
    const updatedNodes = this.nodeManager.getState().nodes

    // Step 2: Generate packets from all nodes
    let totalPackets = 0
    for (const node of updatedNodes) {
      totalPackets += this.nodeManager.generatePackets(node)
    }
    this.state.player.totalPacketsProcessed += totalPackets

    // Step 3: Route packets, expire offers, enforce deadlines
    const contractsBefore = JSON.parse(JSON.stringify(this.contractSystem.getState().contracts))
    this.contractSystem.tick(totalPackets)
    const contractsAfter = this.contractSystem.getState().contracts

    // Step 4: Emit events for contracts that were active and just settled
    for (const before of contractsBefore) {
      if (before.status !== 'active') continue
      const after = contractsAfter.find(c => c.id === before.id)
      if (!after) continue

      if (after.status === 'completed') {
        this.economy.addCredits(after.reward)
        this.sentimentSystem.recordSuccess()
        if (this.onContractSuccess) this.onContractSuccess({ ...after })
      }

      if (after.status === 'failed') {
        this.economy.applyPenalty(after.penalty)
        this.sentimentSystem.recordFailure()
        if (this.onContractFailure) this.onContractFailure({ ...after })
      }
    }

    // Step 5: Maintain offer pool — keep 3 offers available at all times
    const offeredCount = contractsAfter.filter(c => c.status === 'offered').length
    if (offeredCount < OFFER_POOL_TARGET) {
      const weights = this.sentimentSystem.getContractDifficultyWeights()
      const difficulty = Math.random() < weights.hard ? 'hard' : 'safe'
      this.contractSystem.generateNewOffers(difficulty, OFFER_POOL_TARGET - offeredCount)
    }

    // Step 6: Settle passive packet revenue
    this.economy.settleRevenue(totalPackets)

    // Step 7: Update internal state snapshot
    this.state = this.getState()
  }
}

import { GameState, IGameEngine, Contract } from './types'
import { NodeManager } from './nodeManager'
import { Economy } from './economy'
import { UpgradeSystem } from './upgradeSystem'
import { SentimentSystem } from './sentimentSystem'
import { ContractSystem } from './contractSystem'

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
    // Deep clone to avoid mutations
    this.state = JSON.parse(JSON.stringify(initialState))

    // Initialize modules with state slices
    this.nodeManager = new NodeManager(this.state.nodes)
    this.economy = new Economy(this.state.player.credits)
    this.upgradeSystem = new UpgradeSystem(this.state.upgrades)
    this.sentimentSystem = new SentimentSystem(this.state.player.sentiment)
    this.contractSystem = new ContractSystem(this.state.contracts)
  }

  getState(): GameState {
    // Merge all module states into a single game state
    const nodeState = this.nodeManager.getState()
    const economyState = this.economy.getState()
    const upgradeState = this.upgradeSystem.getState()
    const sentimentState = this.sentimentSystem.getState()
    const contractState = this.contractSystem.getState()

    return {
      player: {
        ...sentimentState.player,
        credits: economyState.credits,
        totalPacketsProcessed: this.state.player.totalPacketsProcessed,
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

  tick(): void {
    // Step 1: Update node heat and status
    const nodes = this.state.nodes
    this.nodeManager.tick(nodes)
    const updatedNodes = this.nodeManager.getState().nodes

    // Step 2: Generate packets from all nodes
    let totalPackets = 0
    for (const node of updatedNodes) {
      const packetsGenerated = this.nodeManager.generatePackets(node)
      totalPackets += packetsGenerated
    }

    // Track total packets processed
    this.state.player.totalPacketsProcessed += totalPackets

    // Step 3: Route packets to contracts
    const contractsBefore = JSON.parse(JSON.stringify(this.state.contracts))
    this.contractSystem.tick(totalPackets)
    const contractsAfter = this.contractSystem.getState().contracts

    // Step 4: Process contract events (success/failure) for contracts that existed before tick
    // Note: Contract events are detected for contracts that existed before this tick.
    // Newly generated contracts (added at the end of this tick) will fire events on the next tick.
    for (let i = 0; i < contractsBefore.length; i++) {
      const before = contractsBefore[i]
      const after = contractsAfter.find(c => c.id === before.id)

      if (!after) continue // Contract was removed (shouldn't happen, but defensive)

      // Detect completion
      if (before.status === 'active' && after.status === 'completed') {
        this.economy.addCredits(after.reward)
        this.sentimentSystem.recordSuccess()
        if (this.onContractSuccess) {
          this.onContractSuccess({ ...after })
        }
      }

      // Detect failure
      if (before.status === 'active' && after.status === 'failed') {
        this.economy.applyPenalty(after.penalty)
        this.sentimentSystem.recordFailure()
        if (this.onContractFailure) {
          this.onContractFailure({ ...after })
        }
      }
    }

    // Step 5: Generate new contracts if needed
    const activeContracts = contractsAfter.filter(c => c.status === 'active')
    if (activeContracts.length < 2) {
      const sentimentState = this.sentimentSystem.getState()
      const weights = this.sentimentSystem.getContractDifficultyWeights()
      const difficulty = Math.random() < weights.hard ? 'hard' : 'safe'
      const newContracts = this.contractSystem.generateNewContracts(difficulty)
      contractsAfter.push(...newContracts)
    }

    // Step 6: Settle passive packet revenue
    this.economy.settleRevenue(totalPackets)

    // Step 7: Update internal state
    const fullState = this.getState()
    this.state = fullState
  }
}

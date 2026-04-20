import { IContractSystem, Contract } from './types'

const SAFE_DEADLINE_MS = 120 * 1000   // 120 seconds
const HARD_DEADLINE_MS = 40 * 1000    // 40 seconds

export class ContractSystem implements IContractSystem {
  private contracts: Contract[]
  private contractCounter = 0

  constructor(contracts?: Contract[]) {
    this.contracts = contracts ? [...contracts] : []
  }

  getState() {
    return {
      contracts: this.contracts,
    }
  }

  tick(packetsAvailable: number): void {
    let remainingPackets = packetsAvailable

    // First pass: route packets to active contracts sorted by deadline (most urgent first)
    const activeContracts = this.contracts
      .filter(c => c.status === 'active')
      .sort((a, b) => a.deadline - b.deadline)

    for (const contract of activeContracts) {
      if (remainingPackets <= 0) break
      const packetsNeeded = contract.targetVolume - contract.currentVolume
      const packetsToRoute = Math.min(packetsNeeded, remainingPackets)
      contract.currentVolume += packetsToRoute
      remainingPackets -= packetsToRoute
    }

    // Second pass: enforce deadlines on all contracts (after routing so packets can save a contract)
    for (const contract of this.contracts) {
      if (contract.deadline <= Date.now()) {
        if (contract.status === 'active') {
          contract.status =
            contract.currentVolume >= contract.targetVolume ? 'completed' : 'failed'
        }
      }
    }
  }

  generateNewContracts(difficulty: 'safe' | 'hard'): Contract[] {
    const now = Date.now()
    const contracts: Contract[] = []
    const count = Math.random() < 0.5 ? 2 : 3

    if (difficulty === 'safe') {
      for (let i = 0; i < count; i++) {
        contracts.push({
          id: `contract-${++this.contractCounter}`,
          targetVolume: 10000,
          currentVolume: 0,
          deadline: now + SAFE_DEADLINE_MS,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        })
      }
    } else {
      for (let i = 0; i < count; i++) {
        contracts.push({
          id: `contract-${++this.contractCounter}`,
          targetVolume: 10000,
          currentVolume: 0,
          deadline: now + HARD_DEADLINE_MS,
          reward: 100,
          penalty: 50,
          status: 'active',
          difficulty: 'hard',
        })
      }
    }

    return contracts
  }
}

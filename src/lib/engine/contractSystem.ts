import { IContractSystem, Contract } from './types'

export class ContractSystem implements IContractSystem {
  private contracts: Contract[]

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

    for (let i = 0; i < this.contracts.length; i++) {
      const contract = this.contracts[i]

      // Check deadline enforcement
      if (contract.deadline <= Date.now()) {
        if (contract.status === 'active') {
          contract.status =
            contract.currentVolume >= contract.targetVolume ? 'completed' : 'failed'
        }
      }

      // Route packets to active contracts
      if (contract.status === 'active' && remainingPackets > 0) {
        const packetsNeeded = contract.targetVolume - contract.currentVolume
        const packetsToRoute = Math.min(packetsNeeded, remainingPackets)
        contract.currentVolume += packetsToRoute
        remainingPackets -= packetsToRoute
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
          id: `contract-${now}-${i}`,
          targetVolume: 10000,
          currentVolume: 0,
          deadline: now + 1800000,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        })
      }
    } else {
      for (let i = 0; i < count; i++) {
        contracts.push({
          id: `contract-${now}-${i}`,
          targetVolume: 10000,
          currentVolume: 0,
          deadline: now + 900000,
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

import { IContractSystem, Contract } from './types'

const OFFER_EXPIRY_MS = 60 * 1000
const SAFE_DEADLINE_MS = 120 * 1000
const HARD_DEADLINE_MS = 40 * 1000
export const ACTIVE_CONTRACT_CAP = 5

export class ContractSystem implements IContractSystem {
  private contracts: Contract[]
  private contractCounter = 0

  constructor(contracts?: Contract[]) {
    this.contracts = contracts ? [...contracts] : []
  }

  getState() {
    return { contracts: this.contracts }
  }

  tick(packetsAvailable: number): void {
    const now = Date.now()

    // Remove expired offers — no penalty, they just disappear from the pool
    this.contracts = this.contracts.filter(
      c => !(c.status === 'offered' && c.offerExpiry !== undefined && c.offerExpiry <= now)
    )

    // Route packets to active contracts sorted by urgency (most urgent first)
    let remainingPackets = packetsAvailable
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

    // Enforce deadlines on active contracts (after routing so packets can save a contract)
    for (const contract of this.contracts) {
      if (contract.status === 'active' && contract.deadline <= now) {
        contract.status = contract.currentVolume >= contract.targetVolume ? 'completed' : 'failed'
      }
    }
  }

  generateNewOffers(difficulty: 'safe' | 'hard', count: number): void {
    const now = Date.now()
    const targetVolume = difficulty === 'safe' ? 10000 : 15000
    const reward = difficulty === 'safe' ? 50 : 100
    const penalty = difficulty === 'safe' ? 10 : 50

    for (let i = 0; i < count; i++) {
      this.contracts.push({
        id: `contract-${++this.contractCounter}`,
        targetVolume,
        currentVolume: 0,
        deadline: 0,
        offerExpiry: now + OFFER_EXPIRY_MS,
        reward,
        penalty,
        status: 'offered',
        difficulty,
      })
    }
  }

  acceptContract(contractId: string): boolean {
    const contract = this.contracts.find(c => c.id === contractId)
    if (!contract || contract.status !== 'offered') return false

    const activeCount = this.contracts.filter(c => c.status === 'active').length
    if (activeCount >= ACTIVE_CONTRACT_CAP) return false

    const deadlineDuration = contract.difficulty === 'safe' ? SAFE_DEADLINE_MS : HARD_DEADLINE_MS
    contract.status = 'active'
    contract.deadline = Date.now() + deadlineDuration
    delete contract.offerExpiry

    return true
  }
}

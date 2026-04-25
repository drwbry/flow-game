import { ContractSystem } from '../src/lib/engine/contractSystem'

const SAFE_DEADLINE_MS = 120 * 1000
const HARD_DEADLINE_MS = 40 * 1000

describe('ContractSystem', () => {
  describe('generateNewOffers', () => {
    it('generates safe offers with correct values and offered status', () => {
      const cs = new ContractSystem()
      cs.generateNewOffers('safe', 2)
      const { contracts } = cs.getState()

      expect(contracts).toHaveLength(2)
      expect(contracts[0].status).toBe('offered')
      expect(contracts[0].reward).toBe(50)
      expect(contracts[0].penalty).toBe(10)
      expect(contracts[0].targetVolume).toBe(10000)
      expect(contracts[0].offerExpiry).toBeGreaterThan(Date.now())
      expect(contracts[0].deadline).toBe(0)
    })

    it('generates hard offers with correct values', () => {
      const cs = new ContractSystem()
      cs.generateNewOffers('hard', 1)
      const { contracts } = cs.getState()

      expect(contracts[0].status).toBe('offered')
      expect(contracts[0].reward).toBe(100)
      expect(contracts[0].penalty).toBe(50)
      expect(contracts[0].targetVolume).toBe(15000)
    })

    it('assigns unique IDs to each offer', () => {
      const cs = new ContractSystem()
      cs.generateNewOffers('safe', 3)
      const ids = cs.getState().contracts.map(c => c.id)
      expect(new Set(ids).size).toBe(3)
    })

    it('generates different target volumes and rewards for safe vs hard', () => {
      const csSafe = new ContractSystem()
      const csHard = new ContractSystem()
      csSafe.generateNewOffers('safe', 1)
      csHard.generateNewOffers('hard', 1)

      const safe = csSafe.getState().contracts[0]
      const hard = csHard.getState().contracts[0]

      expect(safe.targetVolume).toBeLessThan(hard.targetVolume)
      expect(safe.reward).toBeLessThan(hard.reward)
      expect(safe.penalty).toBeLessThan(hard.penalty)
    })
  })

  describe('acceptContract', () => {
    it('moves offered contract to active and sets safe deadline', () => {
      const cs = new ContractSystem()
      cs.generateNewOffers('safe', 1)
      const id = cs.getState().contracts[0].id
      const before = Date.now()

      const result = cs.acceptContract(id)

      expect(result).toBe(true)
      const accepted = cs.getState().contracts.find(c => c.id === id)!
      expect(accepted.status).toBe('active')
      expect(accepted.deadline).toBeGreaterThanOrEqual(before + SAFE_DEADLINE_MS)
      expect(accepted.offerExpiry).toBeUndefined()
    })

    it('sets hard contract deadline correctly', () => {
      const cs = new ContractSystem()
      cs.generateNewOffers('hard', 1)
      const id = cs.getState().contracts[0].id
      const before = Date.now()

      cs.acceptContract(id)

      const accepted = cs.getState().contracts.find(c => c.id === id)!
      expect(accepted.deadline).toBeGreaterThanOrEqual(before + HARD_DEADLINE_MS)
    })

    it('returns false when contract ID does not exist', () => {
      const cs = new ContractSystem()
      expect(cs.acceptContract('nonexistent-id')).toBe(false)
    })

    it('returns false when contract is not in offered status', () => {
      const cs = new ContractSystem()
      cs.generateNewOffers('safe', 1)
      const id = cs.getState().contracts[0].id
      cs.acceptContract(id)
      expect(cs.acceptContract(id)).toBe(false)
    })

    it('enforces 5-contract active cap', () => {
      const cs = new ContractSystem()
      cs.generateNewOffers('safe', 6)
      const ids = cs.getState().contracts.map(c => c.id)

      for (let i = 0; i < 5; i++) {
        expect(cs.acceptContract(ids[i])).toBe(true)
      }
      expect(cs.acceptContract(ids[5])).toBe(false)

      const activeCount = cs.getState().contracts.filter(c => c.status === 'active').length
      expect(activeCount).toBe(5)
    })
  })

  describe('tick — offer expiry', () => {
    it('removes expired offers from state', () => {
      const cs = new ContractSystem()
      cs.generateNewOffers('safe', 2)

      cs.getState().contracts[0].offerExpiry = Date.now() - 1000

      cs.tick(0)

      const remaining = cs.getState().contracts
      expect(remaining).toHaveLength(1)
      expect(remaining[0].status).toBe('offered')
    })

    it('keeps unexpired offers in state', () => {
      const cs = new ContractSystem()
      cs.generateNewOffers('safe', 2)
      cs.tick(0)
      expect(cs.getState().contracts).toHaveLength(2)
    })
  })

  describe('tick — packet routing', () => {
    it('routes packets only to active contracts', () => {
      const cs = new ContractSystem()
      cs.generateNewOffers('safe', 1)
      const id = cs.getState().contracts[0].id
      cs.acceptContract(id)
      cs.tick(5000)
      const contract = cs.getState().contracts.find(c => c.id === id)!
      expect(contract.currentVolume).toBe(5000)
    })

    it('does not route packets to offered contracts', () => {
      const cs = new ContractSystem()
      cs.generateNewOffers('safe', 1)
      const id = cs.getState().contracts[0].id
      cs.tick(5000)
      const contract = cs.getState().contracts.find(c => c.id === id)!
      expect(contract.currentVolume).toBe(0)
    })

    it('routes packets to multiple active contracts sorted by urgency', () => {
      const now = Date.now()
      const cs = new ContractSystem([
        { id: 'far', targetVolume: 10000, currentVolume: 0, deadline: now + 120000, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
        { id: 'urgent', targetVolume: 10000, currentVolume: 0, deadline: now + 5000, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
      ])
      cs.tick(5000)
      const urgent = cs.getState().contracts.find(c => c.id === 'urgent')!
      const far = cs.getState().contracts.find(c => c.id === 'far')!
      expect(urgent.currentVolume).toBeGreaterThan(far.currentVolume)
    })

    it('does not assign more volume to a contract than its targetVolume', () => {
      const now = Date.now()
      const cs = new ContractSystem([
        { id: 'c1', targetVolume: 1000, currentVolume: 0, deadline: now + 120000, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
      ])

      cs.tick(9999) // far more packets than needed

      const contract = cs.getState().contracts.find(c => c.id === 'c1')!
      expect(contract.currentVolume).toBe(1000) // capped at targetVolume
    })

    it('does not error when more packets available than all contracts need combined', () => {
      const now = Date.now()
      const cs = new ContractSystem([
        { id: 'c1', targetVolume: 100, currentVolume: 0, deadline: now + 120000, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
        { id: 'c2', targetVolume: 100, currentVolume: 0, deadline: now + 120000, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
      ])

      expect(() => cs.tick(99999)).not.toThrow()
      const contracts = cs.getState().contracts
      expect(contracts.find(c => c.id === 'c1')!.currentVolume).toBe(100)
      expect(contracts.find(c => c.id === 'c2')!.currentVolume).toBe(100)
    })
  })

  describe('tick — deadline enforcement', () => {
    it('marks active contract as completed when fulfilled at deadline', () => {
      const now = Date.now()
      const cs = new ContractSystem([
        { id: 'done', targetVolume: 100, currentVolume: 100, deadline: now - 1, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
      ])
      cs.tick(0)
      expect(cs.getState().contracts.find(c => c.id === 'done')!.status).toBe('completed')
    })

    it('marks active contract as failed when unfulfilled at deadline', () => {
      const now = Date.now()
      const cs = new ContractSystem([
        { id: 'failed', targetVolume: 10000, currentVolume: 0, deadline: now - 1, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
      ])
      cs.tick(0)
      expect(cs.getState().contracts.find(c => c.id === 'failed')!.status).toBe('failed')
    })

    it('does not re-route packets to completed contracts on subsequent ticks', () => {
      const now = Date.now()
      const cs = new ContractSystem([
        { id: 'done', targetVolume: 100, currentVolume: 100, deadline: now - 1, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
      ])

      cs.tick(0) // first tick: completes the contract
      cs.tick(5000) // second tick: contract is completed, should not receive packets

      const contract = cs.getState().contracts.find(c => c.id === 'done')!
      expect(contract.status).toBe('completed')
      expect(contract.currentVolume).toBe(100) // unchanged
    })

    it('does not re-route packets to failed contracts on subsequent ticks', () => {
      const now = Date.now()
      const cs = new ContractSystem([
        { id: 'failed', targetVolume: 10000, currentVolume: 0, deadline: now - 1, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
      ])

      cs.tick(0) // first tick: fails the contract
      cs.tick(5000) // second tick: contract is failed, should not receive packets

      const contract = cs.getState().contracts.find(c => c.id === 'failed')!
      expect(contract.status).toBe('failed')
      expect(contract.currentVolume).toBe(0) // no packets routed to failed contract
    })

    it('handles deadline exactly at now without error', () => {
      const now = Date.now()
      const cs = new ContractSystem([
        { id: 'boundary', targetVolume: 100, currentVolume: 0, deadline: now, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
      ])

      expect(() => cs.tick(0)).not.toThrow()
      const contract = cs.getState().contracts.find(c => c.id === 'boundary')!
      expect(['completed', 'failed']).toContain(contract.status)
    })
  })

  describe('tick — multi-state correctness', () => {
    it('handles a mix of offered, active, completed, and failed contracts correctly', () => {
      const now = Date.now()
      // 'fail' has a past deadline and large targetVolume — it will absorb all routed packets
      // but still fail (5000 < 10000). 'active' has a future deadline so it doesn't resolve.
      const cs = new ContractSystem([
        { id: 'offer', targetVolume: 10000, currentVolume: 0, deadline: 0, offerExpiry: now + 60000, reward: 50, penalty: 10, status: 'offered', difficulty: 'safe' },
        { id: 'active', targetVolume: 10000, currentVolume: 0, deadline: now + 120000, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
        { id: 'completed', targetVolume: 100, currentVolume: 100, deadline: now - 1, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
        { id: 'fail', targetVolume: 10000, currentVolume: 0, deadline: now - 1, reward: 50, penalty: 10, status: 'active', difficulty: 'safe' },
      ])

      cs.tick(5000)

      const contracts = cs.getState().contracts
      expect(contracts.find(c => c.id === 'offer')!.status).toBe('offered') // unchanged
      expect(contracts.find(c => c.id === 'offer')!.currentVolume).toBe(0) // no packets
      expect(contracts.find(c => c.id === 'active')!.status).toBe('active') // still running
      expect(contracts.find(c => c.id === 'completed')!.status).toBe('completed')
      expect(contracts.find(c => c.id === 'fail')!.status).toBe('failed')
    })
  })
})

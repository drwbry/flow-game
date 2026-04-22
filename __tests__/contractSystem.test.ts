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
  })
})

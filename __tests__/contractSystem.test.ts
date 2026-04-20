import { ContractSystem } from '../src/lib/engine/contractSystem'
import { Contract } from '../src/lib/engine/types'

describe('ContractSystem', () => {
  let contractSystem: ContractSystem

  beforeEach(() => {
    contractSystem = new ContractSystem()
  })

  describe('initialization', () => {
    it('should initialize with empty contracts array', () => {
      const state = contractSystem.getState()
      expect(state.contracts).toEqual([])
    })

    it('should accept initial contracts in constructor', () => {
      const initialContracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 10000,
          currentVolume: 0,
          deadline: Date.now() + 1800000,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(initialContracts)
      const state = system.getState()
      expect(state.contracts).toHaveLength(1)
      expect(state.contracts[0].id).toBe('contract-1')
    })
  })

  describe('state getter', () => {
    it('should return state object with contracts property', () => {
      const state = contractSystem.getState()
      expect(state).toHaveProperty('contracts')
      expect(Array.isArray(state.contracts)).toBe(true)
    })

    it('should return consistent state across multiple calls', () => {
      const state1 = contractSystem.getState()
      const state2 = contractSystem.getState()
      expect(state1.contracts).toEqual(state2.contracts)
    })
  })

  describe('generateNewContracts', () => {
    it('should generate 2-3 safe contracts with correct parameters', () => {
      const contracts = contractSystem.generateNewContracts('safe')
      expect(contracts.length).toBeGreaterThanOrEqual(2)
      expect(contracts.length).toBeLessThanOrEqual(3)
      contracts.forEach((contract) => {
        expect(contract.targetVolume).toBe(10000)
        expect(contract.currentVolume).toBe(0)
        expect(contract.reward).toBe(50)
        expect(contract.penalty).toBe(10)
        expect(contract.status).toBe('active')
        expect(contract.difficulty).toBe('safe')
      })
    })

    it('should generate safe contracts with deadline ~120 seconds from now', () => {
      const before = Date.now()
      const contracts = contractSystem.generateNewContracts('safe')
      const after = Date.now()

      contracts.forEach((contract) => {
        const expectedDeadlineMin = before + 120000
        const expectedDeadlineMax = after + 120000
        expect(contract.deadline).toBeGreaterThanOrEqual(expectedDeadlineMin)
        expect(contract.deadline).toBeLessThanOrEqual(expectedDeadlineMax)
      })
    })

    it('should generate 2-3 hard contracts with correct parameters', () => {
      const contracts = contractSystem.generateNewContracts('hard')
      expect(contracts.length).toBeGreaterThanOrEqual(2)
      expect(contracts.length).toBeLessThanOrEqual(3)
      contracts.forEach((contract) => {
        expect(contract.targetVolume).toBe(10000)
        expect(contract.currentVolume).toBe(0)
        expect(contract.reward).toBe(100)
        expect(contract.penalty).toBe(50)
        expect(contract.status).toBe('active')
        expect(contract.difficulty).toBe('hard')
      })
    })

    it('should generate hard contracts with deadline ~40 seconds from now', () => {
      const before = Date.now()
      const contracts = contractSystem.generateNewContracts('hard')
      const after = Date.now()

      contracts.forEach((contract) => {
        const expectedDeadlineMin = before + 40000
        const expectedDeadlineMax = after + 40000
        expect(contract.deadline).toBeGreaterThanOrEqual(expectedDeadlineMin)
        expect(contract.deadline).toBeLessThanOrEqual(expectedDeadlineMax)
      })
    })

    it('should assign unique IDs to generated contracts', () => {
      const contracts = contractSystem.generateNewContracts('safe')
      const ids = contracts.map((c) => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have different safe and hard parameters', () => {
      const safeContracts = contractSystem.generateNewContracts('safe')
      const hardContracts = contractSystem.generateNewContracts('hard')

      const safe = safeContracts[0]
      const hard = hardContracts[0]

      expect(safe.reward).not.toBe(hard.reward)
      expect(safe.penalty).not.toBe(hard.penalty)
      expect(safe.deadline).not.toBe(hard.deadline)
    })
  })

  describe('tick - packet routing', () => {
    it('should route available packets to active contracts', () => {
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 10000,
          currentVolume: 0,
          deadline: Date.now() + 1800000,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(contracts)

      system.tick(1000)

      const state = system.getState()
      expect(state.contracts[0].currentVolume).toBe(1000)
    })

    it('should not route more packets than available', () => {
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 10000,
          currentVolume: 0,
          deadline: Date.now() + 1800000,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(contracts)

      system.tick(500)

      const state = system.getState()
      expect(state.contracts[0].currentVolume).toBe(500)
    })

    it('should not exceed contract targetVolume when routing packets', () => {
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 1000,
          currentVolume: 500,
          deadline: Date.now() + 1800000,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(contracts)

      system.tick(1000)

      const state = system.getState()
      expect(state.contracts[0].currentVolume).toBe(1000)
    })

    it('should distribute packets across multiple active contracts', () => {
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 10000,
          currentVolume: 0,
          deadline: Date.now() + 1800000,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
        {
          id: 'contract-2',
          targetVolume: 10000,
          currentVolume: 0,
          deadline: Date.now() + 1800000,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(contracts)

      system.tick(2000)

      const state = system.getState()
      const totalRouted = state.contracts.reduce((sum, c) => sum + c.currentVolume, 0)
      expect(totalRouted).toBe(2000)
    })

    it('should not route packets to non-active contracts', () => {
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 10000,
          currentVolume: 0,
          deadline: Date.now() + 1800000,
          reward: 50,
          penalty: 10,
          status: 'completed',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(contracts)

      system.tick(1000)

      const state = system.getState()
      expect(state.contracts[0].currentVolume).toBe(0)
    })
  })

  describe('tick - deadline enforcement', () => {
    it('should mark contract as completed when currentVolume >= targetVolume at deadline', () => {
      const pastTime = Date.now() - 1000
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 1000,
          currentVolume: 1000,
          deadline: pastTime,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(contracts)

      system.tick(0)

      const state = system.getState()
      expect(state.contracts[0].status).toBe('completed')
    })

    it('should mark contract as failed when currentVolume < targetVolume at deadline', () => {
      const pastTime = Date.now() - 1000
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 10000,
          currentVolume: 5000,
          deadline: pastTime,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(contracts)

      system.tick(0)

      const state = system.getState()
      expect(state.contracts[0].status).toBe('failed')
    })

    it('should not re-route packets to completed contracts on subsequent ticks', () => {
      const pastTime = Date.now() - 1000
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 1000,
          currentVolume: 1000,
          deadline: pastTime,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(contracts)

      system.tick(0)
      const stateAfterFirst = system.getState()
      const volumeAfterFirst = stateAfterFirst.contracts[0].currentVolume

      system.tick(1000)
      const stateAfterSecond = system.getState()

      expect(stateAfterSecond.contracts[0].currentVolume).toBe(volumeAfterFirst)
    })

    it('should not re-route packets to failed contracts on subsequent ticks', () => {
      const pastTime = Date.now() - 1000
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 10000,
          currentVolume: 5000,
          deadline: pastTime,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(contracts)

      system.tick(0)
      const stateAfterFirst = system.getState()
      const volumeAfterFirst = stateAfterFirst.contracts[0].currentVolume

      system.tick(1000)
      const stateAfterSecond = system.getState()

      expect(stateAfterSecond.contracts[0].currentVolume).toBe(volumeAfterFirst)
    })

    it('should handle deadline exactly at now without error', () => {
      const now = Date.now()
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 1000,
          currentVolume: 1000,
          deadline: now,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(contracts)

      expect(() => system.tick(0)).not.toThrow()
      const state = system.getState()
      expect(state.contracts[0].status).toBe('completed')
    })
  })

  describe('tick - multiple contracts integration', () => {
    it('should handle mixed active, completed, and failed contracts', () => {
      const now = Date.now()
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 1000,
          currentVolume: 1000,
          deadline: now - 1000,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
        {
          id: 'contract-2',
          targetVolume: 10000,
          currentVolume: 0,
          deadline: now + 1800000,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
        {
          id: 'contract-3',
          targetVolume: 10000,
          currentVolume: 5000,
          deadline: now - 1000,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(contracts)

      // With the corrected routing order (route first, then check deadlines), all 3 contracts
      // are active at routing time. Sorted by urgency (most urgent first): contract-1 (past
      // deadline, already full), contract-3 (past deadline, needs 5000), contract-2 (far future).
      // Contract-3 absorbs packets before contract-2. Deadline enforcement then marks contract-1
      // as completed and contract-3 as failed; contract-2 stays active.
      system.tick(2000)

      const state = system.getState()
      expect(state.contracts[0].status).toBe('completed')
      expect(state.contracts[1].status).toBe('active')
      expect(state.contracts[2].status).toBe('failed')
    })

    it('should route packets to active contracts while respecting deadline constraints', () => {
      const now = Date.now()
      const contracts: Contract[] = [
        {
          id: 'contract-1',
          targetVolume: 5000,
          currentVolume: 0,
          deadline: now + 1800000,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
        {
          id: 'contract-2',
          targetVolume: 5000,
          currentVolume: 0,
          deadline: now + 1800000,
          reward: 50,
          penalty: 10,
          status: 'active',
          difficulty: 'safe',
        },
      ]
      const system = new ContractSystem(contracts)

      system.tick(8000)

      const state = system.getState()
      const totalVolume = state.contracts.reduce((sum, c) => sum + c.currentVolume, 0)
      expect(totalVolume).toBe(8000)
      expect(state.contracts.every((c) => c.currentVolume <= c.targetVolume)).toBe(true)
    })
  })
})

import { Economy } from '../src/lib/engine/economy'

describe('Economy', () => {
  let economy: Economy

  beforeEach(() => {
    // Test with initial credits of 100
    economy = new Economy(100)
  })

  describe('initialization', () => {
    it('should initialize with provided credits', () => {
      const state = economy.getState()
      expect(state.credits).toBe(100)
    })

    it('should initialize with default credits of 0 if not provided', () => {
      const defaultEconomy = new Economy()
      const state = defaultEconomy.getState()
      expect(state.credits).toBe(0)
    })
  })

  describe('settleRevenue', () => {
    it('should add credits based on revenue with 0.001 scale factor', () => {
      economy.settleRevenue(200)
      const state = economy.getState()
      // 200 * 0.001 = 0.2, so 100 + 0.2 = 100.2
      expect(state.credits).toBe(100.2)
    })

    it('should accumulate multiple revenue settlements', () => {
      economy.settleRevenue(200)
      economy.settleRevenue(300)
      const state = economy.getState()
      // 200 * 0.001 = 0.2, 300 * 0.001 = 0.3, so 100 + 0.2 + 0.3 = 100.5
      expect(state.credits).toBe(100.5)
    })

    it('should handle large packet volumes', () => {
      economy.settleRevenue(1000000)
      const state = economy.getState()
      // 1000000 * 0.001 = 1000, so 100 + 1000 = 1100
      expect(state.credits).toBe(1100)
    })
  })

  describe('applyPenalty', () => {
    it('should subtract penalty credits from the balance', () => {
      economy.applyPenalty(25)
      const state = economy.getState()
      expect(state.credits).toBe(75)
    })

    it('should clamp balance to 0 when penalty exceeds available credits', () => {
      economy.applyPenalty(150)
      const state = economy.getState()
      expect(state.credits).toBe(0)
    })

    it('should handle large penalties', () => {
      economy.applyPenalty(1000000)
      const state = economy.getState()
      expect(state.credits).toBe(0)
    })
  })

  describe('state getter', () => {
    it('should return correct state format with credits property', () => {
      const state = economy.getState()
      expect(state).toHaveProperty('credits')
      expect(typeof state.credits).toBe('number')
    })

    it('should return a consistent state across multiple calls', () => {
      const state1 = economy.getState()
      const state2 = economy.getState()
      expect(state1.credits).toBe(state2.credits)
    })
  })
})

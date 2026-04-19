import { Economy } from '../src/lib/engine/economy'
import { PlayerState } from '../src/lib/engine/types'

describe('Economy', () => {
  let economy: Economy

  beforeEach(() => {
    // Test with initial credits of 100
    const initialPlayer: PlayerState = {
      credits: 100,
      totalPacketsProcessed: 0,
      sentiment: 50,
      consecutiveSuccesses: 0,
    }
    economy = new Economy(initialPlayer)
  })

  describe('initialization', () => {
    it('should initialize with provided credits', () => {
      const state = economy.getState()
      expect(state.player.credits).toBe(100)
    })

    it('should initialize with default credits of 0 if not provided', () => {
      const defaultEconomy = new Economy()
      const state = defaultEconomy.getState()
      expect(state.player.credits).toBe(0)
    })
  })

  describe('addCredits', () => {
    it('should add credits to the player balance', () => {
      economy.addCredits(50)
      const state = economy.getState()
      expect(state.player.credits).toBe(150)
    })

    it('should accumulate multiple credit additions', () => {
      economy.addCredits(25)
      economy.addCredits(25)
      const state = economy.getState()
      expect(state.player.credits).toBe(150)
    })
  })

  describe('subtractCredits', () => {
    it('should subtract credits from the player balance', () => {
      economy.subtractCredits(30)
      const state = economy.getState()
      expect(state.player.credits).toBe(70)
    })

    it('should clamp balance to 0 when subtraction exceeds available credits', () => {
      economy.subtractCredits(150)
      const state = economy.getState()
      expect(state.player.credits).toBe(0)
    })
  })

  describe('settleRevenue', () => {
    it('should add credits based on revenue with 0.001 scale factor', () => {
      economy.settleRevenue(200)
      const state = economy.getState()
      // 200 * 0.001 = 0.2, so 100 + 0.2 = 100.2
      expect(state.player.credits).toBe(100.2)
    })

    it('should accumulate multiple revenue settlements', () => {
      economy.settleRevenue(200)
      economy.settleRevenue(300)
      const state = economy.getState()
      // 200 * 0.001 = 0.2, 300 * 0.001 = 0.3, so 100 + 0.2 + 0.3 = 100.5
      expect(state.player.credits).toBe(100.5)
    })
  })

  describe('applyPenalty', () => {
    it('should subtract penalty credits from the player balance', () => {
      economy.applyPenalty(25)
      const state = economy.getState()
      expect(state.player.credits).toBe(75)
    })

    it('should clamp balance to 0 when penalty exceeds available credits', () => {
      economy.applyPenalty(150)
      const state = economy.getState()
      expect(state.player.credits).toBe(0)
    })
  })
})

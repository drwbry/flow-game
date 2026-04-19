import { SentimentSystem } from '../src/lib/engine/sentimentSystem'

describe('SentimentSystem', () => {
  let sentimentSystem: SentimentSystem

  beforeEach(() => {
    sentimentSystem = new SentimentSystem()
  })

  describe('initialization', () => {
    it('should initialize with sentiment of 50', () => {
      const state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(50)
    })

    it('should initialize with consecutive successes of 0', () => {
      const state = sentimentSystem.getState()
      expect(state.player.consecutiveSuccesses).toBe(0)
    })

    it('should accept custom initial sentiment', () => {
      const custom = new SentimentSystem(75)
      const state = custom.getState()
      expect(state.player.sentiment).toBe(75)
    })
  })

  describe('state getter', () => {
    it('should return state with player property', () => {
      const state = sentimentSystem.getState()
      expect(state).toHaveProperty('player')
    })

    it('should return player state with sentiment and consecutiveSuccesses', () => {
      const state = sentimentSystem.getState()
      expect(state.player).toHaveProperty('sentiment')
      expect(state.player).toHaveProperty('consecutiveSuccesses')
    })
  })

  describe('recordSuccess', () => {
    it('should increase sentiment by 6 on first success', () => {
      sentimentSystem.recordSuccess()
      const state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(56)
    })

    it('should increment consecutive successes counter', () => {
      sentimentSystem.recordSuccess()
      const state = sentimentSystem.getState()
      expect(state.player.consecutiveSuccesses).toBe(1)
    })

    it('should add streak bonus on second consecutive success', () => {
      sentimentSystem.recordSuccess() // +6, sentiment = 56
      sentimentSystem.recordSuccess() // +5 + 2 bonus = +7, sentiment = 63
      const state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(63)
    })

    it('should add streak bonus on third consecutive success', () => {
      sentimentSystem.recordSuccess() // +6, sentiment = 56
      sentimentSystem.recordSuccess() // +5 + 2 = +7, sentiment = 63
      sentimentSystem.recordSuccess() // +5 + 3 = +8, sentiment = 71
      const state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(71)
    })

    it('should achieve max bonus of +8 on fourth consecutive success', () => {
      sentimentSystem.recordSuccess() // +6, sentiment = 56
      sentimentSystem.recordSuccess() // +7, sentiment = 63
      sentimentSystem.recordSuccess() // +8, sentiment = 71
      sentimentSystem.recordSuccess() // +5 + min(4, 3) = +8 capped, sentiment = 79
      const state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(79)
    })

    it('should cap sentiment at 100', () => {
      const system = new SentimentSystem(97)
      system.recordSuccess() // +6 would go to 103, but capped at 100
      const state = system.getState()
      expect(state.player.sentiment).toBe(100)
    })

    it('should not exceed 100 even with streak bonus', () => {
      const system = new SentimentSystem(94)
      system.recordSuccess()
      system.recordSuccess() // +7 would go to 107, capped at 100
      const state = system.getState()
      expect(state.player.sentiment).toBe(100)
    })
  })

  describe('recordFailure', () => {
    it('should decrease sentiment by 15', () => {
      sentimentSystem.recordFailure()
      const state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(35)
    })

    it('should reset consecutive successes to 0', () => {
      sentimentSystem.recordSuccess()
      sentimentSystem.recordSuccess()
      sentimentSystem.recordFailure()
      const state = sentimentSystem.getState()
      expect(state.player.consecutiveSuccesses).toBe(0)
    })

    it('should clamp sentiment at 0', () => {
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      const state = sentimentSystem.getState()
      expect(state.player.sentiment).toBeGreaterThanOrEqual(0)
    })

    it('should not go below 0 on multiple failures', () => {
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      const state = sentimentSystem.getState()
      expect(state.player.sentiment).toBe(0)
    })
  })

  describe('getContractDifficultyWeights', () => {
    it('should return low sentiment weights (80% safe, 20% hard) for sentiment 0–30', () => {
      const lowSentiment = new SentimentSystem(15)
      const weights = lowSentiment.getContractDifficultyWeights()
      expect(weights.safe).toBeCloseTo(0.8, 2)
      expect(weights.hard).toBeCloseTo(0.2, 2)
    })

    it('should return low sentiment weights at boundary 30', () => {
      const boundary = new SentimentSystem(30)
      const weights = boundary.getContractDifficultyWeights()
      expect(weights.safe).toBeCloseTo(0.8, 2)
      expect(weights.hard).toBeCloseTo(0.2, 2)
    })

    it('should return medium sentiment weights (50% safe, 50% hard) for sentiment 30–70', () => {
      const mediumSentiment = new SentimentSystem(50)
      const weights = mediumSentiment.getContractDifficultyWeights()
      expect(weights.safe).toBeCloseTo(0.5, 2)
      expect(weights.hard).toBeCloseTo(0.5, 2)
    })

    it('should return medium sentiment weights at boundary 30', () => {
      const boundary = new SentimentSystem(31)
      const weights = boundary.getContractDifficultyWeights()
      expect(weights.safe).toBeCloseTo(0.5, 2)
      expect(weights.hard).toBeCloseTo(0.5, 2)
    })

    it('should return high sentiment weights at boundary 70', () => {
      const boundary = new SentimentSystem(70)
      const weights = boundary.getContractDifficultyWeights()
      expect(weights.safe).toBeCloseTo(0.2, 2)
      expect(weights.hard).toBeCloseTo(0.8, 2)
    })

    it('should return high sentiment weights (20% safe, 80% hard) for sentiment 70–100', () => {
      const highSentiment = new SentimentSystem(85)
      const weights = highSentiment.getContractDifficultyWeights()
      expect(weights.safe).toBeCloseTo(0.2, 2)
      expect(weights.hard).toBeCloseTo(0.8, 2)
    })

    it('should return high sentiment weights at boundary 71', () => {
      const boundary = new SentimentSystem(71)
      const weights = boundary.getContractDifficultyWeights()
      expect(weights.safe).toBeCloseTo(0.2, 2)
      expect(weights.hard).toBeCloseTo(0.8, 2)
    })

    it('should return weights that sum to 1.0', () => {
      const weights = sentimentSystem.getContractDifficultyWeights()
      expect(weights.safe + weights.hard).toBeCloseTo(1.0, 2)
    })
  })

  describe('sentiment bounds', () => {
    it('should clamp high sentiment values at 100', () => {
      const system = new SentimentSystem(100)
      system.recordSuccess()
      const state = system.getState()
      expect(state.player.sentiment).toBe(100)
    })

    it('should clamp low sentiment values at 0', () => {
      const system = new SentimentSystem(0)
      system.recordFailure()
      const state = system.getState()
      expect(state.player.sentiment).toBe(0)
    })
  })

  describe('streak mechanics', () => {
    it('should reset streak on failure after success', () => {
      sentimentSystem.recordSuccess()
      sentimentSystem.recordSuccess()
      sentimentSystem.recordFailure()
      sentimentSystem.recordSuccess()
      const state = sentimentSystem.getState()
      expect(state.player.consecutiveSuccesses).toBe(1)
    })

    it('should apply correct bonus pattern: 6, 7, 8, 8', () => {
      const system = new SentimentSystem(0)
      system.recordSuccess() // +6 = 6
      system.recordSuccess() // +7 = 13
      system.recordSuccess() // +8 = 21
      system.recordSuccess() // +8 = 29
      const state = system.getState()
      expect(state.player.sentiment).toBe(29)
    })
  })

  describe('integration scenarios', () => {
    it('should handle mixed successes and failures', () => {
      sentimentSystem.recordSuccess()
      sentimentSystem.recordSuccess()
      sentimentSystem.recordFailure()
      sentimentSystem.recordSuccess()
      const state = sentimentSystem.getState()
      // 50 + 6 + 7 - 15 + 6 = 54
      expect(state.player.sentiment).toBe(54)
      expect(state.player.consecutiveSuccesses).toBe(1)
    })

    it('should maintain correct state across multiple operations', () => {
      sentimentSystem.recordSuccess()
      sentimentSystem.recordSuccess()
      sentimentSystem.recordSuccess()
      const state1 = sentimentSystem.getState()
      const weights1 = sentimentSystem.getContractDifficultyWeights()

      sentimentSystem.recordFailure()
      const state2 = sentimentSystem.getState()

      expect(state1.player.sentiment).toBeGreaterThan(state2.player.sentiment)
      expect(state2.player.consecutiveSuccesses).toBe(0)
    })
  })
})

import { SentimentSystem } from '../src/lib/engine/sentimentSystem'

describe('SentimentSystem', () => {
  let sentimentSystem: SentimentSystem

  beforeEach(() => {
    sentimentSystem = new SentimentSystem()
  })

  describe('initialization', () => {
    it('should initialize with sentiment of 50', () => {
      const state = sentimentSystem.getState()
      expect(state.sentiment).toBe(50)
    })

    it('should initialize with consecutive successes of 0', () => {
      const state = sentimentSystem.getState()
      expect(state.consecutiveSuccesses).toBe(0)
    })

    it('should accept custom initial sentiment', () => {
      const custom = new SentimentSystem(75)
      const state = custom.getState()
      expect(state.sentiment).toBe(75)
    })
  })

  describe('state getter', () => {
    it('should return state with sentiment property', () => {
      const state = sentimentSystem.getState()
      expect(state).toHaveProperty('sentiment')
    })

    it('should return state with sentiment and consecutiveSuccesses', () => {
      const state = sentimentSystem.getState()
      expect(state).toHaveProperty('sentiment')
      expect(state).toHaveProperty('consecutiveSuccesses')
    })
  })

  describe('recordSuccess', () => {
    it('should increase sentiment by 5 on first success', () => {
      sentimentSystem.recordSuccess()
      const state = sentimentSystem.getState()
      expect(state.sentiment).toBe(55)
    })

    it('should increment consecutive successes counter', () => {
      sentimentSystem.recordSuccess()
      const state = sentimentSystem.getState()
      expect(state.consecutiveSuccesses).toBe(1)
    })

    it('should add streak bonus on second consecutive success', () => {
      sentimentSystem.recordSuccess() // streak=0 before → +5, sentiment = 55
      sentimentSystem.recordSuccess() // streak=1 before → +6, sentiment = 61
      const state = sentimentSystem.getState()
      expect(state.sentiment).toBe(61)
    })

    it('should add streak bonus on third consecutive success', () => {
      sentimentSystem.recordSuccess() // streak=0 before → +5, sentiment = 55
      sentimentSystem.recordSuccess() // streak=1 before → +6, sentiment = 61
      sentimentSystem.recordSuccess() // streak=2 before → +7, sentiment = 68
      const state = sentimentSystem.getState()
      expect(state.sentiment).toBe(68)
    })

    it('should achieve max bonus of +8 on fourth consecutive success', () => {
      sentimentSystem.recordSuccess() // streak=0 before → +5, sentiment = 55
      sentimentSystem.recordSuccess() // streak=1 before → +6, sentiment = 61
      sentimentSystem.recordSuccess() // streak=2 before → +7, sentiment = 68
      sentimentSystem.recordSuccess() // streak=3 before → +8 (min(3,3)), sentiment = 76
      const state = sentimentSystem.getState()
      expect(state.sentiment).toBe(76)
    })

    it('should cap sentiment at 100', () => {
      const system = new SentimentSystem(97)
      system.recordSuccess() // +5 would go to 102, but capped at 100
      const state = system.getState()
      expect(state.sentiment).toBe(100)
    })

    it('should not exceed 100 even with streak bonus', () => {
      const system = new SentimentSystem(94)
      system.recordSuccess() // +5 = 99
      system.recordSuccess() // +6 would go to 105, capped at 100
      const state = system.getState()
      expect(state.sentiment).toBe(100)
    })
  })

  describe('recordFailure', () => {
    it('should decrease sentiment by 15', () => {
      sentimentSystem.recordFailure()
      const state = sentimentSystem.getState()
      expect(state.sentiment).toBe(35)
    })

    it('should reset consecutive successes to 0', () => {
      sentimentSystem.recordSuccess()
      sentimentSystem.recordSuccess()
      sentimentSystem.recordFailure()
      const state = sentimentSystem.getState()
      expect(state.consecutiveSuccesses).toBe(0)
    })

    it('should clamp sentiment at 0', () => {
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      const state = sentimentSystem.getState()
      expect(state.sentiment).toBeGreaterThanOrEqual(0)
    })

    it('should not go below 0 on multiple failures', () => {
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      sentimentSystem.recordFailure()
      const state = sentimentSystem.getState()
      expect(state.sentiment).toBe(0)
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
      expect(state.sentiment).toBe(100)
    })

    it('should clamp low sentiment values at 0', () => {
      const system = new SentimentSystem(0)
      system.recordFailure()
      const state = system.getState()
      expect(state.sentiment).toBe(0)
    })
  })

  describe('streak mechanics', () => {
    it('should reset streak on failure after success', () => {
      sentimentSystem.recordSuccess()
      sentimentSystem.recordSuccess()
      sentimentSystem.recordFailure()
      sentimentSystem.recordSuccess()
      const state = sentimentSystem.getState()
      expect(state.consecutiveSuccesses).toBe(1)
    })

    it('should apply correct bonus pattern: 5, 6, 7, 8', () => {
      const system = new SentimentSystem(0)
      system.recordSuccess() // streak=0 before → +5 = 5
      system.recordSuccess() // streak=1 before → +6 = 11
      system.recordSuccess() // streak=2 before → +7 = 18
      system.recordSuccess() // streak=3 before → +8 = 26
      const state = system.getState()
      expect(state.sentiment).toBe(26)
    })
  })

  describe('integration scenarios', () => {
    it('should handle mixed successes and failures', () => {
      sentimentSystem.recordSuccess()
      sentimentSystem.recordSuccess()
      sentimentSystem.recordFailure()
      sentimentSystem.recordSuccess()
      const state = sentimentSystem.getState()
      // 50 + 5 + 6 - 15 + 5 = 51
      expect(state.sentiment).toBe(51)
      expect(state.consecutiveSuccesses).toBe(1)
    })

    it('should maintain correct state across multiple operations', () => {
      sentimentSystem.recordSuccess()
      sentimentSystem.recordSuccess()
      sentimentSystem.recordSuccess()
      const state1 = sentimentSystem.getState()
      const weights1 = sentimentSystem.getContractDifficultyWeights()

      sentimentSystem.recordFailure()
      const state2 = sentimentSystem.getState()

      expect(state1.sentiment).toBeGreaterThan(state2.sentiment)
      expect(state2.consecutiveSuccesses).toBe(0)
    })
  })
})

import { ISentimentSystem } from './types'

export class SentimentSystem implements ISentimentSystem {
  private sentiment: number
  private consecutiveSuccesses: number

  constructor(initialSentiment: number = 50) {
    this.sentiment = initialSentiment
    this.consecutiveSuccesses = 0
  }

  getState() {
    return {
      sentiment: this.sentiment,
      consecutiveSuccesses: this.consecutiveSuccesses,
    }
  }

  recordSuccess(amount: number = 5): void {
    const streakBonus = Math.min(this.consecutiveSuccesses, 3) // 0 on first call
    const sentimentGain = amount + streakBonus
    this.sentiment = Math.min(100, this.sentiment + sentimentGain)
    this.consecutiveSuccesses += 1           // increment after
  }

  recordFailure(amount: number = 15): void {
    this.sentiment = Math.max(0, this.sentiment - amount)
    this.consecutiveSuccesses = 0
  }

  getContractDifficultyWeights(): { safe: number; hard: number } {
    if (this.sentiment <= 30) {
      return { safe: 0.8, hard: 0.2 }
    } else if (this.sentiment < 70) {
      return { safe: 0.5, hard: 0.5 }
    } else {
      return { safe: 0.2, hard: 0.8 }
    }
  }
}

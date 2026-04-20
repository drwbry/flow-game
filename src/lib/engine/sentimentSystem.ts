import { ISentimentSystem, PlayerState } from './types'

export class SentimentSystem implements ISentimentSystem {
  private sentiment: number
  private consecutiveSuccesses: number

  constructor(initialSentiment: number = 50) {
    this.sentiment = initialSentiment
    this.consecutiveSuccesses = 0
  }

  getState() {
    return {
      player: {
        credits: 0,
        totalPacketsProcessed: 0,
        sentiment: this.sentiment,
        consecutiveSuccesses: this.consecutiveSuccesses,
      } as PlayerState,
    }
  }

  recordSuccess(): void {
    const streakBonus = Math.min(this.consecutiveSuccesses, 3) // 0 on first call
    const sentimentGain = 5 + streakBonus   // first call: 5+0=5
    this.sentiment = Math.min(100, this.sentiment + sentimentGain)
    this.consecutiveSuccesses += 1           // increment after
  }

  recordFailure(): void {
    this.sentiment -= 15
    if (this.sentiment < 0) {
      this.sentiment = 0
    }
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

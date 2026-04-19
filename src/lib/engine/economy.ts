import { PlayerState, IEconomy } from './types'

export class Economy implements IEconomy {
  private player: PlayerState

  constructor(initialPlayer?: PlayerState) {
    if (initialPlayer) {
      this.player = { ...initialPlayer }
    } else {
      this.player = {
        credits: 0,
        totalPacketsProcessed: 0,
        sentiment: 0,
        consecutiveSuccesses: 0,
      }
    }
  }

  getState() {
    return {
      player: { ...this.player },
    }
  }

  addCredits(amount: number): void {
    this.player.credits += amount
  }

  subtractCredits(amount: number): void {
    this.player.credits -= amount
    if (this.player.credits < 0) {
      this.player.credits = 0
    }
  }

  settleRevenue(packets: number): void {
    const creditEarned = packets * 0.001
    this.addCredits(creditEarned)
  }

  applyPenalty(amount: number): void {
    this.subtractCredits(amount)
  }
}

import { IEconomy } from './types'

export class Economy implements IEconomy {
  private credits: number

  constructor(initialCredits: number = 0) {
    this.credits = initialCredits
  }

  getState() {
    return {
      credits: this.credits,
    }
  }

  settleRevenue(packets: number): void {
    const creditEarned = packets * 0.001
    this.credits += creditEarned
  }

  applyPenalty(amount: number): void {
    this.credits -= amount
    if (this.credits < 0) {
      this.credits = 0
    }
  }
}

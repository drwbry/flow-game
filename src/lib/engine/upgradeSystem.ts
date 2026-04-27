import { IUpgradeSystem, Node, Upgrade } from './types'

export class UpgradeSystem implements IUpgradeSystem {
  private upgrades: Upgrade[]

  constructor(upgrades: Upgrade[]) {
    this.upgrades = upgrades
  }

  getState() {
    return {
      upgrades: this.upgrades,
    }
  }

  applyUpgradesToNode(node: Node, upgradeIds: string[]): void {
    let totalThroughputModifier = 0
    let totalEfficiencyModifier = 0
    let totalHeatRateModifier = 0

    for (const upgradeId of upgradeIds) {
      const upgrade = this.upgrades.find(u => u.id === upgradeId)
      if (!upgrade) {
        continue
      }

      if (upgrade.effects.throughput) {
        totalThroughputModifier += upgrade.effects.throughput
      }
      if (upgrade.effects.efficiency) {
        totalEfficiencyModifier += upgrade.effects.efficiency
      }
      if (upgrade.effects.heatRateModifier) {
        totalHeatRateModifier += upgrade.effects.heatRateModifier
      }
    }

    node.throughput += totalThroughputModifier
    node.efficiency += totalEfficiencyModifier
    node.heatRateModifier += totalHeatRateModifier

    if (node.efficiency > 1.0) {
      node.efficiency = 1.0
    }
  }
}

import { Node, INodeManager } from './types'

const HEAT_RATE_K = 0.05 // packets * K = heat per tick
const HEAT_CAP = 100
const HEAT_CRITICAL_THRESHOLD = 80
const MINIMUM_THROUGHPUT_FLOOR = 25
const MAX_COOLING_FRACTION = 0.8 // cooling can cancel at most 80% of heat generated per tick
const MAX_COOLING_CAPACITY = 50 // max cooling units per tick at efficiency 1.0

export function effectiveThroughput(node: { throughput: number; heat: number }): number {
  return Math.max(MINIMUM_THROUGHPUT_FLOOR, node.throughput * (1 - node.heat / 100))
}

export class NodeManager implements INodeManager {
  private nodes: Node[]

  constructor(initialNodes: Node[]) {
    this.nodes = JSON.parse(JSON.stringify(initialNodes))
  }

  getState(): { nodes: Node[] } {
    return { nodes: this.nodes }
  }

  tick(nodes: Node[]): void {
    this.nodes = nodes.map(node => {
      const maxHeatGeneration = node.throughput * HEAT_RATE_K * (node.heatRateModifier ?? 1.0)
      const rawCoolingCapacity = node.efficiency * MAX_COOLING_CAPACITY // efficiency: 0.0–1.0
      // Cap cooling at 80% so heat always increases slightly even at max efficiency
      const coolingCapacity = Math.min(rawCoolingCapacity, maxHeatGeneration * MAX_COOLING_FRACTION)
      const heatDelta = maxHeatGeneration - coolingCapacity
      const newHeat = Math.max(0, Math.min(HEAT_CAP, node.heat + heatDelta))

      const status: 'online' | 'critical' = newHeat >= HEAT_CRITICAL_THRESHOLD ? 'critical' : 'online'

      return {
        ...node,
        heat: newHeat,
        status,
      }
    })
  }

  getEffectiveThroughput(node: Node): number {
    return effectiveThroughput(node)
  }

  generatePackets(node: Node): number {
    return this.getEffectiveThroughput(node)
  }
}

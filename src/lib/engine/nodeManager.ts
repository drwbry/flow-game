import { Node, INodeManager } from './types'

const HEAT_RATE_K = 0.1 // packets * K = heat per tick
const HEAT_CAP = 100
const HEAT_CRITICAL_THRESHOLD = 80
const MINIMUM_THROUGHPUT_FLOOR = 100

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
      // Calculate heat delta
      // Cooling capacity is directly related to efficiency
      // High efficiency (1.0) = max cooling capacity (50)
      // Low efficiency (0.0) = no cooling capacity (0)
      const coolingCapacity = node.efficiency * 50
      const heatDelta = node.throughput * HEAT_RATE_K - coolingCapacity
      const newHeat = Math.max(0, Math.min(HEAT_CAP, node.heat + heatDelta))

      // Determine status from NEW heat (after update)
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

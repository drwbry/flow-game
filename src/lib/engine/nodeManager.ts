import { Node, INodeManager } from './types'

const HEAT_RATE_K = 0.1 // packets * K = heat per tick
const HEAT_CAP = 100
const HEAT_CRITICAL_THRESHOLD = 80
const MINIMUM_THROUGHPUT_FLOOR = 100

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
      // Determine status from CURRENT heat (before update)
      const status = node.heat >= HEAT_CRITICAL_THRESHOLD ? 'critical' : 'online'

      // Calculate heat delta
      // Cooling capacity is inversely related to efficiency
      // High efficiency (1.0) = low cooling capacity (0)
      // Low efficiency (0) = high cooling capacity (50)
      const coolingCapacity = (1 - node.efficiency) * 50
      const heatDelta = node.throughput * HEAT_RATE_K - coolingCapacity
      const newHeat = Math.max(0, Math.min(HEAT_CAP, node.heat + heatDelta))

      return {
        ...node,
        heat: newHeat,
        status,
      }
    })
  }

  getEffectiveThroughput(node: Node): number {
    const scaledDown = node.throughput * (1 - node.heat / 100)
    return Math.max(MINIMUM_THROUGHPUT_FLOOR, scaledDown)
  }

  generatePackets(node: Node): number {
    return this.getEffectiveThroughput(node)
  }
}

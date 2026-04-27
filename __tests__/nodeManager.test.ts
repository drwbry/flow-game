import { NodeManager } from '../src/lib/engine/nodeManager'
import { Node } from '../src/lib/engine/types'

describe('NodeManager', () => {
  let nodeManager: NodeManager

  beforeEach(() => {
    const initialNode: Node = {
      id: 'node-1',
      throughput: 200,
      heat: 0,
      efficiency: 0.0,
      heatRateModifier: 1.0,
      status: 'online',
      upgrades: [],
      lastMeltdownTime: null,
    }
    nodeManager = new NodeManager([initialNode])
  })

  describe('heat calculation', () => {
    it('should increase heat based on throughput and cooling', () => {
      const nodes = nodeManager.getState().nodes
      const initialHeat = nodes[0].heat

      // throughput 200, K=0.05, efficiency 0.0, no cooling → heat_delta = 200 * 0.05 - 0 = 10
      nodeManager.tick(nodes)

      const newHeat = nodeManager.getState().nodes[0].heat
      expect(newHeat).toBe(initialHeat + 10)
    })

    it('should cap heat at 100', () => {
      let nodes = nodeManager.getState().nodes
      nodes[0].heat = 95
      nodeManager.tick(nodes)

      nodes = nodeManager.getState().nodes
      expect(nodes[0].heat).toBeLessThanOrEqual(100)
    })

    it('should not go below 0', () => {
      let nodes = nodeManager.getState().nodes
      nodes[0].heat = 5
      // K=0.05: maxHeatGen = 200*0.05 = 10, coolingCapacity = min(1.0*50, 10*0.8) = 8, heatDelta = 2, newHeat = 7 ≥ 0
      nodes[0].efficiency = 1.0
      nodeManager.tick(nodes)

      nodes = nodeManager.getState().nodes
      expect(nodes[0].heat).toBeGreaterThanOrEqual(0)
    })

    it('should always generate some heat even at max efficiency (80% cap)', () => {
      let nodes = nodeManager.getState().nodes
      nodes[0].heat = 0
      nodes[0].efficiency = 1.0 // max efficiency — without cap this would cancel heat entirely
      nodeManager.tick(nodes)

      nodes = nodeManager.getState().nodes
      // K=0.05: maxHeatGen = 10, without cap cooling = 50 → would go negative
      // With 80% cap: coolingCapacity = min(50, 10*0.8=8) → heatDelta = 2 → heat = 2
      expect(nodes[0].heat).toBeGreaterThan(0)
    })

    it('should mark node critical when heat >= 80', () => {
      let nodes = nodeManager.getState().nodes
      nodes[0].heat = 80
      nodeManager.tick(nodes)

      nodes = nodeManager.getState().nodes
      expect(nodes[0].status).toBe('critical')
    })

    it('should mark node online when heat < 80', () => {
      let nodes = nodeManager.getState().nodes
      // heat=50, efficiency=0.0, K=0.05, heatDelta=10, newHeat=60 → online
      nodes[0].heat = 50
      nodeManager.tick(nodes)

      nodes = nodeManager.getState().nodes
      expect(nodes[0].status).toBe('online')
    })
  })

  describe('effective throughput', () => {
    it('should return full throughput at heat 0', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].heat = 0
      const effective = nodeManager.getEffectiveThroughput(nodes[0])
      expect(effective).toBe(200)
    })

    it('should return 50% throughput at heat 50', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].heat = 50
      const effective = nodeManager.getEffectiveThroughput(nodes[0])
      expect(effective).toBe(100)
    })

    it('should enforce minimum floor of 25 at heat 100', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].heat = 100
      const effective = nodeManager.getEffectiveThroughput(nodes[0])
      expect(effective).toBe(25) // floor
    })

    it('should handle nodes with higher base throughput', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].throughput = 400
      nodes[0].heat = 50
      const effective = nodeManager.getEffectiveThroughput(nodes[0])
      expect(effective).toBe(200) // 400 * 0.5 = 200
    })
  })

  describe('generatePackets', () => {
    it('should generate packets based on effective throughput', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].heat = 0
      const packets = nodeManager.generatePackets(nodes[0])
      expect(packets).toBe(200) // full throughput
    })

    it('should generate minimum packets at high heat', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].heat = 100
      const packets = nodeManager.generatePackets(nodes[0])
      expect(packets).toBe(25) // floor
    })
  })
})

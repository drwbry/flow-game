import { NodeManager } from '../src/lib/engine/nodeManager'
import { Node } from '../src/lib/engine/types'

describe('NodeManager', () => {
  let nodeManager: NodeManager

  beforeEach(() => {
    const initialNode: Node = {
      id: 'node-1',
      throughput: 200,
      heat: 0,
      efficiency: 1.0,
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

      // Mock: K = 0.1, no cooling initially
      nodeManager.tick(nodes)

      const newHeat = nodeManager.getState().nodes[0].heat
      // throughput 200, K=0.1, efficiency 1.0, no cooling
      // heat_delta = 200 * 0.1 - 0 = 20
      expect(newHeat).toBe(initialHeat + 20)
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
      // Simulate cooling that exceeds heat
      nodes[0].efficiency = 1.0 // max cooling
      nodeManager.tick(nodes)

      nodes = nodeManager.getState().nodes
      expect(nodes[0].heat).toBeGreaterThanOrEqual(0)
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
      nodes[0].heat = 79
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

    it('should enforce minimum floor of 100 at heat 100', () => {
      const nodes = nodeManager.getState().nodes
      nodes[0].heat = 100
      const effective = nodeManager.getEffectiveThroughput(nodes[0])
      expect(effective).toBe(100) // floor
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
      expect(packets).toBe(100) // floor
    })
  })
})

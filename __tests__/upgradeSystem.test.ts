import { UpgradeSystem } from '../src/lib/engine/upgradeSystem'
import { Node, Upgrade } from '../src/lib/engine/types'

describe('UpgradeSystem', () => {
  let upgradeSystem: UpgradeSystem
  let testNode: Node

  beforeEach(() => {
    // Set up test upgrades
    const upgrades: Upgrade[] = [
      {
        id: 'upgrade1',
        name: 'Boost Throughput',
        cost: 50,
        effects: {
          throughput: 50,
        },
      },
      {
        id: 'upgrade2',
        name: 'Improve Efficiency',
        cost: 75,
        effects: {
          efficiency: 0.1,
        },
      },
      {
        id: 'upgrade3',
        name: 'Cooling Module',
        cost: 100,
        effects: {
          cooling: 10,
        },
      },
      {
        id: 'upgrade4',
        name: 'Multi-effect Upgrade',
        cost: 150,
        effects: {
          throughput: 30,
          efficiency: 0.05,
          cooling: 5,
        },
      },
    ]
    upgradeSystem = new UpgradeSystem(upgrades)

    // Set up test node
    testNode = {
      id: 'test-node',
      throughput: 200,
      heat: 50,
      efficiency: 0.5,
      status: 'online',
      upgrades: [],
      lastMeltdownTime: null,
    }
  })

  describe('initialization', () => {
    it('should initialize with a list of available upgrades', () => {
      expect(upgradeSystem).toBeDefined()
      const state = upgradeSystem.getState()
      expect(state.upgrades.length).toBe(4)
    })
  })

  describe('state getter', () => {
    it('should return { upgrades: Upgrade[] }', () => {
      const state = upgradeSystem.getState()
      expect(state).toHaveProperty('upgrades')
      expect(Array.isArray(state.upgrades)).toBe(true)
    })

    it('should return all available upgrades', () => {
      const state = upgradeSystem.getState()
      expect(state.upgrades.length).toBe(4)
      expect(state.upgrades[0].id).toBe('upgrade1')
      expect(state.upgrades[1].id).toBe('upgrade2')
      expect(state.upgrades[2].id).toBe('upgrade3')
      expect(state.upgrades[3].id).toBe('upgrade4')
    })
  })

  describe('applyUpgradesToNode', () => {
    it('should apply throughput modifier correctly', () => {
      const originalThroughput = testNode.throughput
      upgradeSystem.applyUpgradesToNode(testNode, ['upgrade1'])
      expect(testNode.throughput).toBe(originalThroughput + 50)
    })

    it('should apply efficiency modifier correctly', () => {
      const originalEfficiency = testNode.efficiency
      upgradeSystem.applyUpgradesToNode(testNode, ['upgrade2'])
      expect(testNode.efficiency).toBe(originalEfficiency + 0.1)
    })

    it('should apply cooling modifier correctly', () => {
      upgradeSystem.applyUpgradesToNode(testNode, ['upgrade3'])
      // Note: cooling modifier is applied but node doesn't have a cooling property
      // The method should handle this internally
      expect(testNode.throughput).toBe(200) // unchanged
      expect(testNode.efficiency).toBe(0.5) // unchanged
    })

    it('should skip non-existent upgrade IDs without error', () => {
      const originalThroughput = testNode.throughput
      upgradeSystem.applyUpgradesToNode(testNode, ['nonexistent'])
      expect(testNode.throughput).toBe(originalThroughput)
    })

    it('should leave node unchanged when applying empty upgrades list', () => {
      const originalNode = { ...testNode }
      upgradeSystem.applyUpgradesToNode(testNode, [])
      expect(testNode.throughput).toBe(originalNode.throughput)
      expect(testNode.efficiency).toBe(originalNode.efficiency)
    })

    it('should cap efficiency at 1.0', () => {
      testNode.efficiency = 0.95
      upgradeSystem.applyUpgradesToNode(testNode, ['upgrade2', 'upgrade2'])
      expect(testNode.efficiency).toBeLessThanOrEqual(1.0)
      expect(testNode.efficiency).toBe(1.0)
    })

    it('should apply multiple upgrades with stacking effects', () => {
      const originalThroughput = testNode.throughput
      const originalEfficiency = testNode.efficiency
      upgradeSystem.applyUpgradesToNode(testNode, ['upgrade1', 'upgrade2'])
      expect(testNode.throughput).toBe(originalThroughput + 50)
      expect(testNode.efficiency).toBe(originalEfficiency + 0.1)
    })

    it('should apply all effects from a single upgrade with multiple modifiers', () => {
      const originalThroughput = testNode.throughput
      const originalEfficiency = testNode.efficiency
      upgradeSystem.applyUpgradesToNode(testNode, ['upgrade4'])
      expect(testNode.throughput).toBe(originalThroughput + 30)
      expect(testNode.efficiency).toBe(originalEfficiency + 0.05)
    })

    it('should handle multiple upgrades with stacking cooling effects', () => {
      upgradeSystem.applyUpgradesToNode(testNode, ['upgrade3', 'upgrade4'])
      // Both upgrades have cooling effects, they should be accounted for
      // upgrade3 has no throughput/efficiency, upgrade4 adds 30 throughput and 0.05 efficiency
      expect(testNode.throughput).toBe(230)
      expect(testNode.efficiency).toBe(0.55)
    })
  })

  describe('edge cases', () => {
    it('should handle efficiency exceeding 1.0 and cap it', () => {
      testNode.efficiency = 0.92
      upgradeSystem.applyUpgradesToNode(testNode, [
        'upgrade2',
        'upgrade4',
      ])
      // upgrade2: +0.1, upgrade4: +0.05
      // 0.92 + 0.1 + 0.05 = 1.07, should be capped to 1.0
      expect(testNode.efficiency).toBe(1.0)
    })

    it('should handle applying the same upgrade multiple times', () => {
      const originalThroughput = testNode.throughput
      upgradeSystem.applyUpgradesToNode(testNode, [
        'upgrade1',
        'upgrade1',
      ])
      expect(testNode.throughput).toBe(originalThroughput + 100)
    })

    it('should handle mixed valid and invalid upgrade IDs', () => {
      const originalThroughput = testNode.throughput
      upgradeSystem.applyUpgradesToNode(testNode, [
        'upgrade1',
        'nonexistent',
        'upgrade2',
      ])
      expect(testNode.throughput).toBe(originalThroughput + 50)
      expect(testNode.efficiency).toBe(0.6)
    })
  })
})

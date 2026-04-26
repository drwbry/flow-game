import { GameEngine } from '../src/lib/engine/gameEngine'
import { createInitialGameState } from '../src/lib/engine/gameState'
import { Contract } from '../src/lib/engine/types'

describe('GameEngine Integration Tests', () => {
  let engine: GameEngine

  beforeEach(() => {
    const initialState = createInitialGameState()
    engine = new GameEngine(initialState)
  })

  test('should run 1000 ticks without crash', () => {
    expect(() => {
      for (let i = 0; i < 1000; i++) {
        engine.tick()
      }
    }).not.toThrow()
  })

  test('should process packets and update player state', () => {
    const stateBefore = engine.getState()
    const initialPackets = stateBefore.player.totalPacketsProcessed

    // Run a few ticks to generate packets
    for (let i = 0; i < 5; i++) {
      engine.tick()
    }

    const stateAfter = engine.getState()
    expect(stateAfter.player.totalPacketsProcessed).toBeGreaterThan(initialPackets)
  })

  test('should handle contract success and failure', () => {
    let successCount = 0
    let failureCount = 0

    // Create state with expired contract deadline and a target unreachable in one tick.
    // Node throughput is 200 pps (100x scale). Contract needs 50000 more packets but
    // deadline is already past — packets routed this tick cannot save it.
    const now = Date.now()
    const boostedState = createInitialGameState({
      nodes: [{
        id: 'node-1',
        throughput: 200,
        heat: 0,
        efficiency: 0.0,
        status: 'online',
        upgrades: [],
        lastMeltdownTime: null,
      }],
      contracts: [{
        id: 'contract-test-1',
        targetVolume: 100000,  // Far beyond what one tick can deliver
        currentVolume: 50000,  // Still needs 50000 more packets
        deadline: now - 1000,  // Deadline already passed
        reward: 50,
        penalty: 10,
        status: 'active',
        difficulty: 'safe',
      }]
    })

    const boostedEngine = new GameEngine(boostedState)
    boostedEngine.setEventCallbacks(
      () => successCount++,
      () => failureCount++
    )

    // Run one tick - deadline is past and packets generated (~200) can't bridge the 50000 gap
    boostedEngine.tick()

    expect(failureCount).toBe(1)
    expect(successCount).toBe(0)
  })

  test('should maintain sentiment between 0 and 100', () => {
    for (let i = 0; i < 500; i++) {
      engine.tick()
      const state = engine.getState()
      expect(state.player.sentiment).toBeGreaterThanOrEqual(0)
      expect(state.player.sentiment).toBeLessThanOrEqual(100)
    }
  })

  test('should throttle throughput based on heat', () => {
    let state = engine.getState()
    const baseNode = state.nodes[0]

    // Heat the node to critical levels
    const nodes = state.nodes.map(node => ({
      ...node,
      heat: 90, // Set heat to 90
    }))

    // We need to manually update the engine state for this test
    // Create a new engine with high-heat node
    const highHeatState = createInitialGameState()
    highHeatState.nodes[0].heat = 90
    const heatedEngine = new GameEngine(highHeatState)

    // Get base throughput at low heat
    const coolState = createInitialGameState()
    const coolEngine = new GameEngine(coolState)
    const coolNode = coolEngine.getState().nodes[0]

    const heatedNode = heatedEngine.getState().nodes[0]

    // Heat throttling: effective_throughput = max(base_throughput * (1 - heat/100), 100)
    // coolEngine: heat=0, throughput = 200 * (1 - 0/100) = 200 packets
    // heatedEngine: heat=90, throughput = max(200 * (1 - 90/100), 100) = max(20, 100) = 100 packets
    // Verify cooler engine processes more packets than heated engine

    // Run a tick to see effect
    coolEngine.tick()
    heatedEngine.tick()

    const coolState2 = coolEngine.getState()
    const heatedState2 = heatedEngine.getState()

    // The cool engine should have processed more total packets than the heated one
    const coolPackets = coolState2.player.totalPacketsProcessed
    const heatedPackets = heatedState2.player.totalPacketsProcessed
    expect(coolPackets).toBeGreaterThan(heatedPackets)
  })

  describe('coolNode', () => {
    test('should reduce node heat by 10', () => {
      const state = createInitialGameState()
      state.nodes[0].heat = 60
      const engine = new GameEngine(state)

      engine.coolNode('node-1')

      expect(engine.getState().nodes[0].heat).toBe(50)
    })

    test('should floor heat at 0 when heat is less than 10', () => {
      const state = createInitialGameState()
      state.nodes[0].heat = 5
      const engine = new GameEngine(state)

      engine.coolNode('node-1')

      expect(engine.getState().nodes[0].heat).toBe(0)
    })
  })

  describe('purchaseUpgrade', () => {
    test('should deduct credits and apply upgrade stats to node', () => {
      const state = createInitialGameState({
        player: { credits: 500, totalPacketsProcessed: 0, sentiment: 50, consecutiveSuccesses: 0 },
      })
      const engine = new GameEngine(state)

      const result = engine.purchaseUpgrade('throughput-1', 'node-1')

      expect(result).toBe(true)
      const newState = engine.getState()
      expect(newState.player.credits).toBe(450) // 500 − 50
      expect(newState.nodes[0].upgrades).toContain('throughput-1')
      expect(newState.nodes[0].throughput).toBe(250) // 200 base + 50 from upgrade
    })

    test('should return false and not deduct credits when insufficient', () => {
      const state = createInitialGameState({
        player: { credits: 25, totalPacketsProcessed: 0, sentiment: 50, consecutiveSuccesses: 0 },
      })
      // throughput-1 costs 50, player only has 25
      const engine = new GameEngine(state)

      const result = engine.purchaseUpgrade('throughput-1', 'node-1')

      expect(result).toBe(false)
      expect(engine.getState().player.credits).toBe(25) // unchanged
      expect(engine.getState().nodes[0].upgrades).not.toContain('throughput-1')
    })

    test('should return false and not double-apply when already owned', () => {
      const state = createInitialGameState({
        player: { credits: 500, totalPacketsProcessed: 0, sentiment: 50, consecutiveSuccesses: 0 },
      })
      const engine = new GameEngine(state)

      engine.purchaseUpgrade('throughput-1', 'node-1') // first purchase: 450¢, throughput 250
      const result = engine.purchaseUpgrade('throughput-1', 'node-1') // second attempt

      expect(result).toBe(false)
      expect(engine.getState().player.credits).toBe(450) // only deducted once
      expect(engine.getState().nodes[0].throughput).toBe(250) // not double-stacked
    })

    test('should return false when upgrade prerequisites are not met', () => {
      const state = createInitialGameState({
        player: { credits: 500, totalPacketsProcessed: 0, sentiment: 50, consecutiveSuccesses: 0 },
      })
      const engine = new GameEngine(state)

      // throughput-2 requires throughput-1, which is not purchased
      const result = engine.purchaseUpgrade('throughput-2', 'node-1')

      expect(result).toBe(false)
      expect(engine.getState().player.credits).toBe(500) // unchanged
      expect(engine.getState().nodes[0].upgrades).not.toContain('throughput-2')
    })
  })

  describe('completeContract', () => {
    test('awards reward and sentiment when manually completing a fulfilled contract', () => {
      const now = Date.now()
      const state = createInitialGameState({
        player: { credits: 0, totalPacketsProcessed: 0, sentiment: 50, consecutiveSuccesses: 0 },
        contracts: [
          { id: 'c1', targetVolume: 100, currentVolume: 100, deadline: now + 120000, reward: 50, penalty: 10, repReward: 5, repPenalty: 8, status: 'active', difficulty: 'safe' },
        ],
      })
      const engine = new GameEngine(state)

      const result = engine.completeContract('c1')

      expect(result).toBe(true)
      const newState = engine.getState()
      expect(newState.player.credits).toBe(50)           // reward awarded
      expect(newState.player.sentiment).toBe(55)          // +5 rep (repReward, streak=0)
      expect(newState.contracts.find(c => c.id === 'c1')!.status).toBe('completed')
    })

    test('returns false when contract is not fulfilled', () => {
      const now = Date.now()
      const state = createInitialGameState({
        player: { credits: 0, totalPacketsProcessed: 0, sentiment: 50, consecutiveSuccesses: 0 },
        contracts: [
          { id: 'c1', targetVolume: 10000, currentVolume: 0, deadline: now + 120000, reward: 50, penalty: 10, repReward: 5, repPenalty: 8, status: 'active', difficulty: 'safe' },
        ],
      })
      const engine = new GameEngine(state)

      const result = engine.completeContract('c1')

      expect(result).toBe(false)
      expect(engine.getState().player.credits).toBe(0)
    })
  })

  describe('cancelContract', () => {
    test('applies partial credit penalty and lighter rep penalty on cancel', () => {
      const now = Date.now()
      const state = createInitialGameState({
        player: { credits: 100, totalPacketsProcessed: 0, sentiment: 50, consecutiveSuccesses: 0 },
        contracts: [
          { id: 'c1', targetVolume: 10000, currentVolume: 0, deadline: now + 60000, reward: 50, penalty: 10, repReward: 5, repPenalty: 8, status: 'active', difficulty: 'safe' },
        ],
      })
      const engine = new GameEngine(state)

      const result = engine.cancelContract('c1')

      expect(result).toBe(true)
      const newState = engine.getState()
      expect(newState.player.credits).toBe(97)            // 100 - ceil(10 * 0.25) = 100 - 3 = 97
      expect(newState.player.sentiment).toBe(46)          // 50 - ceil(8 * 0.5) = 50 - 4 = 46
      expect(newState.contracts.find(c => c.id === 'c1')!.status).toBe('failed')
    })

    test('returns false when timeRemaining <= 30s', () => {
      const now = Date.now()
      const state = createInitialGameState({
        player: { credits: 100, totalPacketsProcessed: 0, sentiment: 50, consecutiveSuccesses: 0 },
        contracts: [
          { id: 'c1', targetVolume: 10000, currentVolume: 0, deadline: now + 20000, reward: 50, penalty: 10, repReward: 5, repPenalty: 8, status: 'active', difficulty: 'safe' },
        ],
      })
      const engine = new GameEngine(state)

      expect(engine.cancelContract('c1')).toBe(false)
      expect(engine.getState().player.credits).toBe(100)
    })
  })
})

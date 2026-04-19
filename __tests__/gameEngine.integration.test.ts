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

    // Create state with expired contract deadline and high throughput
    const now = Date.now()
    const boostedState = createInitialGameState({
      nodes: [{
        id: 'node-1',
        throughput: 5000,
        heat: 0,
        efficiency: 1.0,
        cooling: 0,
        status: 'online',
        upgrades: [],
        lastMeltdownTime: null,
      }],
      contracts: [{
        id: 'contract-test-1',
        targetVolume: 100,  // Low target so we can reach it quickly
        currentVolume: 50,  // Already partially complete
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

    // Run just one tick - with deadline in past and currentVolume < targetVolume, should fail
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
})

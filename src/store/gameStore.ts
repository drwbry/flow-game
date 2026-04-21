import { create } from 'zustand'
import { GameEngine } from '@/lib/engine/gameEngine'
import { GameState } from '@/lib/engine/types'
import { createInitialGameState } from '@/lib/engine/gameState'

interface GameStore {
  engine: GameEngine | null
  state: GameState | null
  initializeGame: () => void
  tick: () => void
  coolNode: (nodeId: string) => void
  purchaseUpgrade: (upgradeId: string, nodeId: string) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  engine: null,
  state: null,

  initializeGame: () => {
    const initialState = createInitialGameState()
    const engine = new GameEngine(initialState)
    set({ engine, state: engine.getState() })
  },

  tick: () => {
    const { engine } = get()
    if (!engine) return
    engine.tick()
    set({ state: engine.getState() })
  },

  coolNode: (nodeId: string) => {
    const { engine } = get()
    if (!engine) return
    engine.coolNode(nodeId)
    set({ state: engine.getState() })
  },

  purchaseUpgrade: (upgradeId: string, nodeId: string) => {
    const { engine } = get()
    if (!engine) return
    engine.purchaseUpgrade(upgradeId, nodeId)
    set({ state: engine.getState() })
  },
}))

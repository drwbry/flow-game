import { create } from 'zustand'
import { GameEngine } from '@/lib/engine/gameEngine'
import { GameState } from '@/lib/engine/types'
import { createInitialGameState } from '@/lib/engine/gameState'

interface GameStore {
  engine: GameEngine | null
  state: GameState | null
  initializeGame: () => void
  tick: () => void
  getState: () => GameState | null
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

  getState: () => {
    const { state } = get()
    return state
  },
}))

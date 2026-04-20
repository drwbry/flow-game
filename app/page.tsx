'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'

export default function Dashboard() {
  const { initializeGame, tick, state } = useGameStore()
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    initializeGame()
  }, [initializeGame])

  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      tick()
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, tick])

  if (!state) {
    return (
      <div className="bg-black text-green-400 font-mono min-h-screen p-8">
        <p>Initializing game...</p>
      </div>
    )
  }

  const { player, nodes, contracts } = state
  const activeContracts = contracts.filter(c => c.status === 'active')

  return (
    <div className="bg-black text-green-400 font-mono min-h-screen p-8 space-y-6">
      <h1 className="text-4xl font-bold mb-8">Terminal Flow</h1>

      {/* Player Stats */}
      <div className="border border-green-400 p-4 space-y-2">
        <h2 className="text-xl font-bold">Player Stats</h2>
        <div>Credits: {(player.credits / 100).toFixed(1)}</div>
        <div>Sentiment: {player.sentiment}/100</div>
        <div>Total Packets Processed: {player.totalPacketsProcessed}</div>
        <div>Consecutive Successes: {player.consecutiveSuccesses}</div>
      </div>

      {/* Nodes */}
      <div className="border border-green-400 p-4 space-y-2">
        <h2 className="text-xl font-bold">Nodes</h2>
        <div className="space-y-3 ml-4">
          {nodes.map(node => (
            <div key={node.id} className="border border-green-400 p-3 space-y-1">
              <div className="font-bold">{node.id}</div>
              <div>Throughput: {(node.throughput / 100).toFixed(1)} packets/s</div>
              <div>Heat: {node.heat}/100</div>
              <div>Status: {node.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Contracts */}
      <div className="border border-green-400 p-4 space-y-2">
        <h2 className="text-xl font-bold">Active Contracts ({activeContracts.length})</h2>
        {activeContracts.length === 0 ? (
          <div className="ml-4">No active contracts</div>
        ) : (
          <div className="space-y-3 ml-4">
            {activeContracts.map(contract => (
              <div
                key={contract.id}
                className="border border-green-400 p-3 space-y-1"
              >
                <div className="font-bold">{contract.id}</div>
                <div>
                  Progress: {(contract.currentVolume / 100).toFixed(1)}/
                  {(contract.targetVolume / 100).toFixed(1)}
                </div>
                <div>Difficulty: {contract.difficulty}</div>
                <div>Reward: {(contract.reward / 100).toFixed(1)} credits</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Control Button */}
      <div className="border border-green-400 p-4">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="border border-green-400 px-6 py-3 hover:bg-green-400 hover:text-black transition-colors font-bold"
        >
          {isRunning ? 'PAUSE' : 'START'}
        </button>
      </div>
    </div>
  )
}

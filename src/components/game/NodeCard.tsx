'use client'
import { useState, useEffect, useRef } from 'react'
import { Node } from '@/lib/engine/types'
import { asciiBar } from '@/lib/asciiBar'

interface NodeCardProps {
  node: Node
  onCool: () => void
}

export function NodeCard({ node, onCool }: NodeCardProps) {
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function handleCool() {
    onCool()
    setCooldownRemaining(5000)
    intervalRef.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 100) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          return 0
        }
        return prev - 100
      })
    }, 100)
  }

  const effective = Math.max(100, node.throughput * (1 - node.heat / 100))
  const cardBorder = node.status === 'critical' ? 'border-red-400' : 'border-green-400'
  const isOnCooldown = cooldownRemaining > 0

  return (
    <div className={`border ${cardBorder} p-4 font-mono text-sm`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-green-400">▶ {node.id.toUpperCase()}</span>
        {node.status === 'critical'
          ? <span className="text-red-400">● CRITICAL</span>
          : <span className="text-green-400">● ONLINE</span>
        }
      </div>
      <div className="mb-1 text-green-400">
        THROUGHPUT {asciiBar(effective, node.throughput)} {effective} pps
      </div>
      <div className="mb-3 text-amber-400">
        HEAT {asciiBar(node.heat, 100)} {node.heat}°
      </div>
      {isOnCooldown ? (
        <button
          disabled
          className="border border-gray-600 px-3 py-1 text-gray-600 cursor-not-allowed"
        >
          [ COOL ] {asciiBar(cooldownRemaining, 5000)}
        </button>
      ) : (
        <button
          onClick={handleCool}
          className="border border-green-400 px-3 py-1 text-green-400 hover:bg-green-400 hover:text-black"
        >
          [ COOL ]
        </button>
      )}
    </div>
  )
}

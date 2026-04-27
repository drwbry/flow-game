'use client'
import { Node } from '@/lib/engine/types'
import { asciiBar } from '@/lib/asciiBar'
import { effectiveThroughput } from '@/lib/engine/nodeManager'

interface NodeCardProps {
  node: Node
  onCool: () => void
}

export function NodeCard({ node, onCool }: NodeCardProps) {
  const effective = Math.round(effectiveThroughput(node))
  const cardBorder = node.status === 'critical' ? 'border-red-400' : 'border-green-400'

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
        THROUGHPUT {asciiBar(effective, node.throughput)} {effective} / {node.throughput} pps
      </div>
      <div className="mb-3 text-amber-400">
        HEAT {asciiBar(node.heat, 100)} {node.heat}°
      </div>
      <button
        onClick={onCool}
        className="border border-green-400 px-3 py-1 text-green-400 hover:bg-green-400 hover:text-black"
      >
        [ COOL ]
      </button>
    </div>
  )
}

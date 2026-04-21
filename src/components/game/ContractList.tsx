import { Contract } from '@/lib/engine/types'
import { asciiBar } from '@/lib/asciiBar'

interface ContractListProps {
  contracts: Contract[]
}

export function ContractList({ contracts }: ContractListProps) {
  const active = contracts.filter(c => c.status === 'active')

  if (active.length === 0) {
    return (
      <div className="font-mono text-sm text-gray-500 py-4">
        NO ACTIVE CONTRACTS — waiting for assignments...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {active.map(contract => {
        const timeRemaining = Math.max(0, Math.ceil((contract.deadline - Date.now()) / 1000))
        const urgent = timeRemaining < 15

        return (
          <div
            key={contract.id}
            className={`border p-3 font-mono text-sm ${
              urgent ? 'border-red-400 bg-[#1a0000] text-red-400' : 'border-amber-400 text-amber-400'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span>{contract.id}</span>
              <span>
                {contract.difficulty === 'safe'
                  ? <span className="text-green-400">SAFE</span>
                  : <span className="text-amber-400">HARD</span>
                }
              </span>
            </div>
            <div className="mb-1">
              {urgent ? '⚠ ' : ''}{timeRemaining}s ⏱
            </div>
            <div className="mb-1">
              {asciiBar(contract.currentVolume, contract.targetVolume)} {contract.currentVolume} / {contract.targetVolume}
            </div>
            <div className="text-xs opacity-75">
              reward: {contract.reward}¢&nbsp;&nbsp;penalty: {contract.penalty}¢
            </div>
          </div>
        )
      })}
    </div>
  )
}

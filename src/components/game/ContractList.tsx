import { Contract } from '@/lib/engine/types'
import { asciiBar } from '@/lib/asciiBar'
import { ACTIVE_CONTRACT_CAP } from '@/lib/engine/contractSystem'

interface ContractListProps {
  contracts: Contract[]
  onAccept: (contractId: string) => void
  onComplete: (contractId: string) => void
  onCancel: (contractId: string) => void
}

export function ContractList({ contracts, onAccept, onComplete, onCancel }: ContractListProps) {
  const offered = contracts.filter(c => c.status === 'offered')
  const active = contracts.filter(c => c.status === 'active')
  const atCap = active.length >= ACTIVE_CONTRACT_CAP

  return (
    <div className="flex flex-col gap-4">
      {/* AVAILABLE section */}
      <div>
        <div className="font-mono text-xs text-gray-500 mb-2">
          AVAILABLE CONTRACTS ({offered.length}) — active: {active.length}/{ACTIVE_CONTRACT_CAP}
        </div>
        {offered.length === 0 ? (
          <div className="font-mono text-sm text-gray-500 py-2">
            Waiting for new assignments...
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {offered.map(contract => {
              const expiresIn = contract.offerExpiry
                ? Math.max(0, Math.ceil((contract.offerExpiry - Date.now()) / 1000))
                : 0

              return (
                <div
                  key={contract.id}
                  className="border border-gray-600 p-3 font-mono text-sm text-gray-400"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span>{contract.id.toUpperCase()}</span>
                    <span>
                      {contract.difficulty === 'safe'
                        ? <span className="border border-green-400 text-green-400 px-1">SAFE</span>
                        : <span className="border border-amber-400 text-amber-400 px-1">HARD</span>
                      }
                    </span>
                  </div>
                  <div className="mb-1 text-xs opacity-75">
                    target: {contract.targetVolume} pkts
                  </div>
                  <div className="mb-1 text-xs">
                    <span className="text-green-400">+{contract.reward}¢</span>
                    <span className="text-gray-600"> / </span>
                    <span className="text-red-400">-{contract.penalty}¢</span>
                    <span className="text-gray-600 mx-2">|</span>
                    <span className="text-green-400">+{contract.repReward} rep</span>
                    <span className="text-gray-600"> / </span>
                    <span className="text-red-400">-{contract.repPenalty} rep</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs opacity-60">expires in {expiresIn}s</span>
                    {atCap ? (
                      <button
                        disabled
                        className="border border-gray-700 text-gray-700 px-2 text-xs cursor-not-allowed"
                      >
                        [CAP REACHED]
                      </button>
                    ) : (
                      <button
                        onClick={() => onAccept(contract.id)}
                        className="border border-green-400 text-green-400 px-2 text-xs hover:bg-green-400 hover:text-black"
                      >
                        [ACCEPT]
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ACTIVE section */}
      <div>
        <div className="font-mono text-xs text-gray-500 mb-2">ACTIVE CONTRACTS</div>
        {active.length === 0 ? (
          <div className="font-mono text-sm text-gray-500 py-2">
            No active contracts — accept one above.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {active.map(contract => {
              const timeRemaining = Math.max(0, Math.ceil((contract.deadline - Date.now()) / 1000))
              const urgent = timeRemaining < 15
              const fulfilled = contract.currentVolume >= contract.targetVolume
              const fullRed = urgent && !fulfilled
              const timerRed = urgent && fulfilled
              const canCancel = !fulfilled && timeRemaining > 30

              return (
                <div
                  key={contract.id}
                  className={`border p-3 font-mono text-sm ${
                    fullRed
                      ? 'border-red-400 bg-[#1a0000] text-red-400'
                      : 'border-amber-400 text-amber-400'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span>{contract.id.toUpperCase()}</span>
                    <span>
                      {contract.difficulty === 'safe'
                        ? <span className="border border-green-400 text-green-400 px-1">SAFE</span>
                        : <span className="border border-amber-400 text-amber-400 px-1">HARD</span>
                      }
                    </span>
                  </div>
                  <div className={`mb-1 ${timerRed ? 'text-red-400' : ''}`}>
                    {fullRed ? '⚠ ' : ''}{timeRemaining}s ⏱
                  </div>
                  <div className="mb-1">
                    {asciiBar(contract.currentVolume, contract.targetVolume)} {contract.currentVolume} / {contract.targetVolume}
                  </div>
                  <div className="mb-2 text-xs opacity-75">
                    <span className="text-green-400">+{contract.reward}¢</span>
                    <span className="opacity-50"> / </span>
                    <span className="text-red-400">-{contract.penalty}¢</span>
                    <span className="opacity-50 mx-2">|</span>
                    <span className="text-green-400">+{contract.repReward} rep</span>
                    <span className="opacity-50"> / </span>
                    <span className="text-red-400">-{contract.repPenalty} rep</span>
                  </div>
                  <div className="flex gap-2">
                    {fulfilled && (
                      <button
                        onClick={() => onComplete(contract.id)}
                        className="border border-green-400 text-green-400 px-2 text-xs hover:bg-green-400 hover:text-black"
                      >
                        [COMPLETE]
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => onCancel(contract.id)}
                        className="border border-red-800 text-red-800 px-2 text-xs hover:bg-red-800 hover:text-white"
                      >
                        [CANCEL]
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

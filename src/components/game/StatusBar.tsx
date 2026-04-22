import { asciiBar } from '@/lib/asciiBar'

interface StatusBarProps {
  credits: number
  sentiment: number
}

function formatCredits(credits: number): string {
  return credits.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function reputationTier(sentiment: number): string {
  if (sentiment <= 30) return 'TIER 1: SAFE ONLY'
  if (sentiment < 70) return 'TIER 2: MIXED'
  return 'TIER 3: HARD ACCESS'
}

export function StatusBar({ credits, sentiment }: StatusBarProps) {
  return (
    <div className="flex justify-between items-center border border-green-400 px-4 py-2 font-mono text-green-400 text-sm">
      <span>CREDITS: {formatCredits(credits)}¢</span>
      <span>
        REPUTATION {asciiBar(sentiment, 100)} {sentiment}/100{' '}
        <span className="text-amber-400">[{reputationTier(sentiment)}]</span>
      </span>
    </div>
  )
}

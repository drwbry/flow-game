export function reputationTier(sentiment: number): string {
  if (sentiment <= 30) return 'TIER 1: SAFE ONLY'
  if (sentiment < 70) return 'TIER 2: MIXED'
  return 'TIER 3: HARD ACCESS'
}

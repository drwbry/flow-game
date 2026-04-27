// Tests for reputation tier boundary logic
// Thresholds: 0-30 → TIER 1, 31-69 → TIER 2, 70-100 → TIER 3
import { reputationTier } from '../src/lib/reputationTier'

describe('reputationTier', () => {
  it('returns TIER 1 for sentiment 0', () => {
    expect(reputationTier(0)).toBe('TIER 1: SAFE ONLY')
  })

  it('returns TIER 1 for sentiment 30 (upper boundary)', () => {
    expect(reputationTier(30)).toBe('TIER 1: SAFE ONLY')
  })

  it('returns TIER 2 for sentiment 31 (lower boundary)', () => {
    expect(reputationTier(31)).toBe('TIER 2: MIXED')
  })

  it('returns TIER 2 for sentiment 50 (midpoint)', () => {
    expect(reputationTier(50)).toBe('TIER 2: MIXED')
  })

  it('returns TIER 2 for sentiment 69 (upper boundary)', () => {
    expect(reputationTier(69)).toBe('TIER 2: MIXED')
  })

  it('returns TIER 3 for sentiment 70 (lower boundary)', () => {
    expect(reputationTier(70)).toBe('TIER 3: HARD ACCESS')
  })

  it('returns TIER 3 for sentiment 100', () => {
    expect(reputationTier(100)).toBe('TIER 3: HARD ACCESS')
  })
})

import { asciiBar } from '../src/lib/asciiBar'

describe('asciiBar', () => {
  it('returns full empty bar when max is 0', () => {
    expect(asciiBar(0, 0)).toBe('░░░░░░░░░░')
  })

  it('returns full empty bar when value is 0', () => {
    expect(asciiBar(0, 100)).toBe('░░░░░░░░░░')
  })

  it('returns full filled bar when value equals max', () => {
    expect(asciiBar(100, 100)).toBe('██████████')
  })

  it('clamps values above max to a full bar', () => {
    expect(asciiBar(150, 100)).toBe('██████████')
  })

  it('clamps negative values to an empty bar', () => {
    expect(asciiBar(-10, 100)).toBe('░░░░░░░░░░')
  })

  it('returns correct bar for 50%', () => {
    expect(asciiBar(50, 100)).toBe('█████░░░░░')
  })

  it('respects custom length', () => {
    expect(asciiBar(50, 100, 4)).toBe('██░░')
  })
})

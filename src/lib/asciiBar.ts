export function asciiBar(value: number, max: number, length = 10): string {
  const ratio = Math.min(1, Math.max(0, value / max))
  const filled = Math.round(ratio * length)
  return '█'.repeat(filled) + '░'.repeat(length - filled)
}

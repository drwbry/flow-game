import { Upgrade } from '@/lib/engine/types'

interface UpgradeShopProps {
  upgrades: Upgrade[]
  purchasedUpgradeIds: string[]
  credits: number
  onPurchase: (upgradeId: string) => void
}

function isUnlocked(upgrade: Upgrade, purchasedIds: string[]): boolean {
  return upgrade.requires.every(id => purchasedIds.includes(id))
}

function effectTags(effects: Upgrade['effects']): { label: string; positive: boolean }[] {
  const tags: { label: string; positive: boolean }[] = []
  if (effects.throughput !== undefined)
    tags.push({ label: `+${effects.throughput} pps`, positive: true })
  if (effects.efficiency !== undefined)
    tags.push({ label: `+${Math.round(effects.efficiency * 100)}% cooling`, positive: true })
  if (effects.heatRateModifier !== undefined) {
    const pct = Math.round(Math.abs(effects.heatRateModifier) * 100)
    const sign = effects.heatRateModifier > 0 ? '+' : '−'
    tags.push({ label: `${sign}${pct}% heat gen`, positive: effects.heatRateModifier < 0 })
  }
  return tags
}

export function UpgradeShop({ upgrades, purchasedUpgradeIds, credits, onPurchase }: UpgradeShopProps) {
  const visibleUpgrades = upgrades.filter(u => isUnlocked(u, purchasedUpgradeIds))

  return (
    <div className="font-mono text-sm">
      {visibleUpgrades.map(upgrade => {
        const owned = purchasedUpgradeIds.includes(upgrade.id)
        const canAfford = credits >= upgrade.cost

        return (
          <div key={upgrade.id} className="flex items-center justify-between border-b border-gray-800 py-2">
            <div className="flex-1">
              <span className="text-purple-400">{upgrade.name}</span>
              <span className="ml-2 space-x-2">
                {effectTags(upgrade.effects).map((tag, i) => (
                  <span key={i} className={tag.positive ? 'text-green-400' : 'text-amber-400'}>
                    {tag.label}
                  </span>
                ))}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-amber-400">{upgrade.cost}¢</span>
              {owned ? (
                <span className="text-gray-500">[OWNED]</span>
              ) : canAfford ? (
                <button
                  onClick={() => onPurchase(upgrade.id)}
                  className="border border-purple-400 text-purple-400 px-2 hover:bg-purple-400 hover:text-black"
                >
                  [BUY]
                </button>
              ) : (
                <button
                  disabled
                  className="border border-gray-600 text-gray-600 px-2 cursor-not-allowed"
                >
                  [BUY]
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

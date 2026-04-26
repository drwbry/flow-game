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

function effectDescription(effects: Upgrade['effects']): string {
  const parts: string[] = []
  if (effects.throughput !== undefined) parts.push(`+${effects.throughput} throughput`)
  if (effects.efficiency !== undefined) parts.push(`+${effects.efficiency} efficiency`)
  return parts.join(', ')
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
              <span className="text-gray-400 ml-2">{effectDescription(upgrade.effects)}</span>
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

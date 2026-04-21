'use client'
import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { StatusBar } from '@/components/game/StatusBar'
import { NodeCard } from '@/components/game/NodeCard'
import { ContractList } from '@/components/game/ContractList'
import { UpgradeShop } from '@/components/game/UpgradeShop'

export default function Home() {
  const store = useGameStore()

  useEffect(() => {
    store.initializeGame()
  }, [store.initializeGame])

  useEffect(() => {
    const interval = setInterval(() => {
      store.tick()
    }, 1000)
    return () => clearInterval(interval)
  }, [store.tick])

  if (!store.state) return null

  const { state } = store
  const node = state.nodes[0]
  const purchasedUpgradeIds = state.nodes.flatMap(n => n.upgrades)

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-green-400 p-4 flex flex-col gap-4 max-w-2xl mx-auto">
      <StatusBar credits={state.player.credits} sentiment={state.player.sentiment} />
      <NodeCard node={node} onCool={() => store.coolNode('node-1')} />
      <ContractList contracts={state.contracts} />
      <UpgradeShop
        upgrades={state.upgrades}
        purchasedUpgradeIds={purchasedUpgradeIds}
        credits={state.player.credits}
        onPurchase={(upgradeId) => store.purchaseUpgrade(upgradeId, 'node-1')}
      />
    </main>
  )
}

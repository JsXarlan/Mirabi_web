import { useState } from 'react'

import { useMirabiStore, type ShopItemId } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, SectionTitle } from '../../ui/components'
import { Screen } from '../../ui/Layout'

/**
 * Tienda Sakura del MVP. La regla del producto es explicita: la Sakura compra
 * comodidad y proteccion, nunca aprendizaje ni desbloqueo de contenido.
 *
 * Cada articulo tiene efecto real en el estado; vender un escudo de racha que
 * no protege nada es peor que no venderlo.
 */
interface ShopItem {
  id: ShopItemId
  icon: string
  title: string
  description: string
  cost: number
  /** Cuantos hay guardados, para que la compra se vea. */
  owned: (state: ReturnType<typeof useMirabiStore.getState>) => number
  ownedLabel: (count: number) => string
}

const ITEMS: ShopItem[] = [
  {
    id: 'streak_shield',
    icon: '🛡️',
    title: 'Protector de racha',
    description: 'Guarda tu racha un día que no puedas estudiar. Se gasta solo cuando hace falta.',
    cost: 20,
    owned: (state) => state.streakShields,
    ownedLabel: (count) => `${count} en reserva`,
  },
  {
    id: 'streak_repair',
    icon: '🩹',
    title: 'Recuperación de racha',
    description: 'Recupera la racha perdida y cuenta hoy como día activo.',
    cost: 35,
    owned: () => 0,
    ownedLabel: () => '',
  },
  {
    id: 'xp_boost',
    icon: '⚡',
    title: 'XP Boost',
    description: 'XP x2 durante tu próxima sesión completada.',
    cost: 25,
    owned: (state) => state.xpBoostSessions,
    ownedLabel: (count) => `${count} ${count === 1 ? 'sesión' : 'sesiones'} pendientes`,
  },
  {
    id: 'yuki_gift',
    icon: '🎁',
    title: 'Regalo para Yuki',
    description: 'Un detalle para tu compañera de viaje.',
    cost: 15,
    owned: (state) => state.yukiGifts,
    ownedLabel: (count) => `${count} ${count === 1 ? 'regalo' : 'regalos'}`,
  },
]

export function ShopScreen() {
  const sakura = useMirabiStore((state) => state.sakura)
  const streakShields = useMirabiStore((state) => state.streakShields)
  const xpBoostSessions = useMirabiStore((state) => state.xpBoostSessions)
  const yukiGifts = useMirabiStore((state) => state.yukiGifts)
  const buyShopItem = useMirabiStore((state) => state.buyShopItem)
  const [message, setMessage] = useState<string | null>(null)

  const counts: Record<ShopItemId, number> = {
    streak_shield: streakShields,
    streak_repair: 0,
    xp_boost: xpBoostSessions,
    yuki_gift: yukiGifts,
  }

  const buy = (item: ShopItem) => {
    if (buyShopItem(item.id, item.cost)) setMessage(`Compraste «${item.title}».`)
    else setMessage('No tienes suficiente Sakura todavía.')
  }

  return (
    <Screen title="Tienda Sakura">
      <MirabiCard className="mb-5 flex items-center justify-between p-5">
        <span className="text-sm text-[var(--on-surface-variant)]">Tu saldo</span>
        <span className="text-2xl font-bold">{sakura} 🌸</span>
      </MirabiCard>

      {message && (
        <p
          role="status"
          className="mb-4 rounded-[16px] bg-[var(--primary-container)] px-4 py-3 text-sm text-[var(--on-primary-container)]"
        >
          {message}
        </p>
      )}

      <SectionTitle>Artículos</SectionTitle>
      <ul className="flex flex-col gap-2.5">
        {ITEMS.map((item) => {
          const owned = counts[item.id]
          return (
            <li key={item.id}>
              <MirabiCard className="p-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="text-xl">
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{item.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--on-surface-variant)]">
                      {item.description}
                    </p>
                    {owned > 0 && (
                      <p className="mt-1 inline-block rounded-full bg-[var(--surface-variant)] px-2 py-0.5 text-[11px] font-semibold">
                        {item.ownedLabel(owned)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => buy(item)}
                    disabled={sakura < item.cost}
                    className="shrink-0 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-bold text-[var(--on-primary)] disabled:opacity-45"
                  >
                    {item.cost} 🌸
                  </button>
                </div>
              </MirabiCard>
            </li>
          )
        })}
      </ul>

      <p className="mt-5 text-center text-xs text-[var(--on-surface-variant)]">
        La Sakura nunca compra respuestas, progreso ni desbloqueo de unidades.
      </p>
      <MirabiButton className="mt-4" variant="ghost" onClick={() => window.history.back()}>
        Volver
      </MirabiButton>
    </Screen>
  )
}

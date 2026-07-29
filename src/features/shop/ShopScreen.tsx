import { useState } from 'react'

import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, SectionTitle } from '../../ui/components'
import { Screen } from '../../ui/Layout'

/**
 * Tienda Sakura del MVP. La regla del producto es explicita: la Sakura compra
 * comodidad y proteccion, nunca aprendizaje ni desbloqueo de contenido.
 */
const ITEMS = [
  {
    id: 'streak_shield',
    icon: '🛡️',
    title: 'Protector de racha',
    description: 'Guarda tu racha un día que no puedas estudiar.',
    cost: 20,
  },
  {
    id: 'streak_repair',
    icon: '🩹',
    title: 'Recuperación de racha',
    description: 'Recupera la racha perdida ayer.',
    cost: 35,
  },
  {
    id: 'xp_boost',
    icon: '⚡',
    title: 'XP Boost',
    description: 'XP x2 durante tu próxima sesión.',
    cost: 25,
  },
  {
    id: 'yuki_gift',
    icon: '🎁',
    title: 'Regalo para Yuki',
    description: 'Un detalle para tu compañera de viaje.',
    cost: 15,
  },
]

export function ShopScreen() {
  const sakura = useMirabiStore((state) => state.sakura)
  const spendSakura = useMirabiStore((state) => state.spendSakura)
  const [message, setMessage] = useState<string | null>(null)

  const buy = (item: (typeof ITEMS)[number]) => {
    if (spendSakura(item.cost)) setMessage(`Compraste «${item.title}».`)
    else setMessage('No tienes suficiente Sakura todavía.')
  }

  return (
    <Screen title="Tienda Sakura">
      <MirabiCard className="mb-5 flex items-center justify-between p-5">
        <span className="text-sm text-[var(--on-surface-variant)]">Tu saldo</span>
        <span className="text-2xl font-bold">{sakura} 🌸</span>
      </MirabiCard>

      {message && (
        <p className="mb-4 rounded-[16px] bg-[var(--primary-container)] px-4 py-3 text-sm text-[var(--on-primary-container)]">
          {message}
        </p>
      )}

      <SectionTitle>Artículos</SectionTitle>
      <ul className="flex flex-col gap-2.5">
        {ITEMS.map((item) => (
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
        ))}
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

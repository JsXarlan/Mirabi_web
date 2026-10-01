import { useNavigate } from 'react-router-dom'

import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiButton, MirabiCard, SectionTitle } from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { YukiBubble } from '../../ui/Yuki'
import { AppIcon } from '../../ui/Icons'

const BENEFITS = [
  { icon: '🚫', title: 'Sin anuncios', description: 'Ningún anuncio, en ningún momento.' },
  { icon: '🌸', title: 'Sakura x2', description: 'El doble de Sakura en todo lo que completes.' },
  {
    icon: '📊',
    title: 'Estadísticas avanzadas',
    description: 'Más detalle sobre tu dominio y tus puntos débiles.',
  },
]

export function PremiumScreen() {
  const navigate = useNavigate()
  const subscriptionType = useMirabiStore((state) => state.subscriptionType)
  const setSubscription = useMirabiStore((state) => state.setSubscription)

  return (
    <Screen title="Mirabi Plus">
      <YukiBubble
        state="HAPPY"
        message="El curso, el repaso y las conversaciones son gratis siempre. Plus solo hace el camino más cómodo."
      />

      <SectionTitle>Qué incluye</SectionTitle>
      <ul className="mb-5 flex flex-col gap-2">
        {BENEFITS.map((benefit) => (
          <li key={benefit.title}>
            <MirabiCard className="flex items-start gap-3 p-4">
              <span aria-hidden className="text-xl">
                <AppIcon name={benefit.icon === '🚫' ? 'shield' : benefit.icon} size={25} />
              </span>
              <div>
                <p className="text-sm font-bold">{benefit.title}</p>
                <p className="mt-0.5 text-xs text-[var(--on-surface-variant)]">
                  {benefit.description}
                </p>
              </div>
            </MirabiCard>
          </li>
        ))}
      </ul>

      <SectionTitle>Free vs Plus</SectionTitle>
      <MirabiCard className="mb-5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--surface-variant)] text-xs">
              <th scope="col" className="p-3 text-left font-semibold">Incluye</th>
              <th scope="col" className="p-3 font-semibold">Free</th>
              <th className="p-3 font-semibold">Plus</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Curso completo', '✓', '✓'],
              ['Repaso inteligente', '✓', '✓'],
              ['Conversaciones', '✓', '✓'],
              ['Caracteres', '✓', '✓'],
              ['Sin anuncios', '—', '✓'],
              ['Sakura x2', '—', '✓'],
              ['Estadísticas avanzadas', '—', '✓'],
            ].map(([feature, free, plus]) => (
              <tr key={feature} className="border-t border-[var(--surface-variant)]">
                <th scope="row" className="p-3 text-left font-normal">{feature}</th>
                <td className="p-3 text-center text-[var(--on-surface-variant)]">{free === '✓' ? 'Sí' : 'No'}</td>
                <td className="p-3 text-center font-semibold text-[var(--primary)]">{plus === '✓' ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </MirabiCard>

      {/*
        La facturacion real no forma parte del MVP web: aqui solo se conmuta el
        estado local para poder probar el comportamiento de Plus (Sakura x2).
      */}
      <MirabiCard className="p-5">
        <p className="text-sm font-semibold">
          {subscriptionType === 'PLUS' ? 'Plus activo en este navegador' : 'Plan gratuito'}
        </p>
        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
          El cobro real todavía no está conectado. Este interruptor solo simula el estado para
          probar los beneficios.
        </p>
        <MirabiButton
          className="mt-4"
          variant={subscriptionType === 'PLUS' ? 'secondary' : 'primary'}
          onClick={() => setSubscription(subscriptionType === 'PLUS' ? 'FREE' : 'PLUS')}
        >
          {subscriptionType === 'PLUS' ? 'Desactivar Plus' : 'Activar Mirabi Plus'}
        </MirabiButton>
        <MirabiButton className="mt-2" variant="ghost" onClick={() => navigate(-1)}>
          Continuar gratis
        </MirabiButton>
      </MirabiCard>
    </Screen>
  )
}

import { useEffect, useRef, useState } from 'react'

import type {
  InitialLevel,
  LearningMotivation,
} from '../../core/store/useMirabiStore'
import {
  XP_PER_GOAL_MINUTE,
  useMirabiStore,
} from '../../core/store/useMirabiStore'
import {
  MirabiButton,
  MirabiCard,
  MirabiProgressBar,
} from '../../ui/components'
import { Yuki } from '../../ui/Yuki'
import { MirabiBrand, JourneyScene } from '../../ui/Brand'
import { AppIcon } from '../../ui/Icons'

/**
 * Onboarding del MVP: Bienvenida -> Motivo -> Nivel inicial -> Objetivo diario.
 * La primera mini leccion no se simula aqui: al terminar, Inicio ya apunta a la
 * primera leccion real del Mundo 0, que es exactamente esa victoria rapida.
 */

const MOTIVATIONS: {
  value: LearningMotivation
  label: string
  icon: string
}[] = [
  { value: 'ANIME_CULTURE', label: 'Anime y cultura', icon: '🎌' },
  { value: 'TRAVEL', label: 'Viajes', icon: '✈️' },
  { value: 'STUDIES', label: 'Estudios', icon: '📚' },
  { value: 'WORK', label: 'Trabajo', icon: '💼' },
  { value: 'PERSONAL_CHALLENGE', label: 'Reto personal', icon: '🔥' },
  { value: 'CURIOSITY', label: 'Solo curiosidad', icon: '🌱' },
]

const LEVELS: { value: InitialLevel; label: string }[] = [
  { value: 'FROM_ZERO', label: 'Nada, empiezo desde cero.' },
  { value: 'SOME_HIRAGANA', label: 'Sé algo de Hiragana.' },
  { value: 'HIRAGANA_KATAKANA', label: 'Sé Hiragana y Katakana.' },
  { value: 'BASIC_VOCABULARY', label: 'Ya conozco vocabulario básico.' },
]

const GOALS = [
  { minutes: 5, label: 'Suave' },
  { minutes: 10, label: 'Normal' },
  { minutes: 15, label: 'Constante' },
  { minutes: 20, label: 'Intenso' },
]

type Step = 'welcome' | 'motivation' | 'level' | 'goal'

const STEP_ORDER: Step[] = ['welcome', 'motivation', 'level', 'goal']

export function OnboardingFlow() {
  const completeOnboarding = useMirabiStore((state) => state.completeOnboarding)

  const [step, setStep] = useState<Step>('welcome')
  const [displayName, setDisplayName] = useState('')
  const [motivation, setMotivation] = useState<LearningMotivation | null>(null)
  const [initialLevel, setInitialLevel] = useState<InitialLevel>('FROM_ZERO')
  const [goalMinutes, setGoalMinutes] = useState(10)

  const stepIndex = STEP_ORDER.indexOf(step)
  const panelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    panelRef.current?.querySelector('h1')?.focus()
  }, [step])

  const finish = () => {
    completeOnboarding({
      displayName: displayName.trim() === '' ? null : displayName.trim(),
      motivation: motivation ?? 'CURIOSITY',
      initialLevel,
      dailyGoalMinutes: goalMinutes,
    })
  }

  return (
    <main className="onboarding-shell" data-step={step}>
      <aside className="onboarding-story" aria-label="Bienvenido a Mirabi">
        <MirabiBrand />
        <h2>Tu japonés del mañana empieza hoy.</h2>
        <p>
          Pequeñas lecciones, grandes descubrimientos. Yuki te acompaña en cada
          paso.
        </p>
        <div className="onboarding-art">
          <JourneyScene />
          <Yuki state="HAPPY" size={170} halo={false} />
        </div>
        <span className="onboarding-pill">
          <AppIcon name="leaf" size={17} /> A tu ritmo. Un poquito cada día.
        </span>
      </aside>
      <div ref={panelRef} className="onboarding-panel">
        <div className="onboarding-progress">
          {stepIndex > 0 && (
            <button
              type="button"
              className="icon-button"
              aria-label="Volver al paso anterior"
              onClick={() => setStep(STEP_ORDER[stepIndex - 1])}
            >
              <AppIcon name="back" size={20} />
            </button>
          )}
          <p>
            PASO {stepIndex + 1} DE {STEP_ORDER.length}
          </p>
          <MirabiProgressBar
            progress={(stepIndex + 1) / STEP_ORDER.length}
            label="Configuración inicial"
          />
        </div>

        {step === 'welcome' && (
          <section className="onboarding-welcome flex flex-col animate-pop">
            <span className="eyebrow">HOLA, QUÉ BUENO VERTE</span>
            <div>
              <h1 tabIndex={-1}>
                Vamos a empezar
                <br />
                tu camino.
              </h1>
              <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                Mirai + Manabi · Aprender hoy para el japonés del mañana.
              </p>
            </div>
            <p className="max-w-sm text-[var(--on-surface-variant)]">
              Yuki te acompaña desde el primer carácter hasta tu primera
              conversación.
            </p>
            <label className="w-full text-left">
              <span className="text-sm font-semibold">
                ¿Cómo te llamamos? (opcional)
              </span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Tu nombre"
                maxLength={24}
                className="mt-1 w-full rounded-[16px] border border-[var(--outline)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--primary)]"
              />
            </label>
            <MirabiButton onClick={() => setStep('motivation')}>
              Empezar
            </MirabiButton>
          </section>
        )}

        {step === 'motivation' && (
          <section className="flex flex-1 flex-col gap-4 animate-pop">
            <h1 tabIndex={-1}>¿Por qué quieres aprender japonés?</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">
              Nos ayuda a acompañarte mejor. Puedes cambiarlo después.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {MOTIVATIONS.map((option) => (
                <MirabiCard
                  key={option.value}
                  onClick={() => setMotivation(option.value)}
                  ariaPressed={motivation === option.value}
                  className={[
                    'p-4 text-center',
                    motivation === option.value
                      ? 'ring-2 ring-[var(--primary)]'
                      : '',
                  ].join(' ')}
                >
                  <div className="mx-auto mb-2 w-fit text-[var(--primary)]">
                    <AppIcon name={option.icon} size={28} />
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    {option.label}
                  </div>
                </MirabiCard>
              ))}
            </div>
            <MirabiButton
              className="mt-auto"
              disabled={motivation === null}
              onClick={() => setStep('level')}
            >
              Continuar
            </MirabiButton>
          </section>
        )}

        {step === 'level' && (
          <section className="flex flex-1 flex-col gap-4 animate-pop">
            <h1 tabIndex={-1}>¿Cuánto japonés sabes ya?</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">
              Empezamos desde donde estés. Si ya sabes algo, una práctica breve
              nos ayudará a orientarte.
            </p>
            <div className="flex flex-col gap-3">
              {LEVELS.map((option) => (
                <MirabiCard
                  key={option.value}
                  onClick={() => setInitialLevel(option.value)}
                  ariaPressed={initialLevel === option.value}
                  className={[
                    'p-4',
                    initialLevel === option.value
                      ? 'ring-2 ring-[var(--primary)]'
                      : '',
                  ].join(' ')}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                </MirabiCard>
              ))}
            </div>
            <MirabiButton className="mt-auto" onClick={() => setStep('goal')}>
              Continuar
            </MirabiButton>
          </section>
        )}

        {step === 'goal' && (
          <section className="flex flex-1 flex-col gap-4 animate-pop">
            <h1 tabIndex={-1}>Tu objetivo diario</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">
              Puedes cambiarlo cuando quieras en Ajustes.
            </p>
            <div className="flex flex-col gap-3">
              {GOALS.map((option) => (
                <MirabiCard
                  key={option.minutes}
                  onClick={() => setGoalMinutes(option.minutes)}
                  ariaPressed={goalMinutes === option.minutes}
                  className={[
                    'flex items-center justify-between p-4',
                    goalMinutes === option.minutes
                      ? 'ring-2 ring-[var(--primary)]'
                      : '',
                  ].join(' ')}
                >
                  <span className="text-sm font-semibold">
                    {option.minutes} min · {option.label}
                  </span>
                  <span className="text-xs text-[var(--on-surface-variant)]">
                    {option.minutes * XP_PER_GOAL_MINUTE} XP
                  </span>
                </MirabiCard>
              ))}
            </div>
            <MirabiButton className="mt-auto" onClick={finish}>
              Comenzar mi camino
            </MirabiButton>
          </section>
        )}
        <p className="onboarding-footer">
          No necesitas una cuenta para empezar a aprender.
        </p>
      </div>
    </main>
  )
}

import { useMirabiStore } from '../../core/store/useMirabiStore'
import { MirabiCard, MirabiProgressBar } from '../../ui/components'
import { Screen } from '../../ui/Layout'
import { YukiBubble } from '../../ui/Yuki'

const TARGET_ICON: Record<string, string> = {
  COMPLETE_LESSON: '📘',
  COMPLETE_REVIEW: '🔁',
  COMPLETE_CONVERSATION: '💬',
  EARN_XP: '⭐',
  PRACTICE_CHARACTERS: 'あ',
}

export function MissionsScreen() {
  const missions = useMirabiStore((state) => state.todayMissions)()
  const completed = missions.filter((mission) => mission.progress.completed).length

  return (
    <Screen title="Misiones diarias">
      <YukiBubble
        state={completed === missions.length ? 'PROUD' : 'HAPPY'}
        message={
          completed === missions.length
            ? '¡Todas las misiones de hoy completadas!'
            : 'Las misiones se renuevan cada día. Sin prisa.'
        }
      />

      <p className="mt-5 mb-3 text-sm text-[var(--on-surface-variant)]">
        {completed} de {missions.length} completadas hoy
      </p>

      <ul className="flex flex-col gap-2.5">
        {missions.map(({ definition, progress }) => (
          <li key={definition.id}>
            <MirabiCard
              className={`p-5 ${progress.completed ? 'ring-2 ring-[var(--success)]' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span aria-hidden className="font-jp text-xl">
                  {TARGET_ICON[definition.targetType] ?? '🎯'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{definition.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--on-surface-variant)]">
                    {definition.description}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    progress.completed
                      ? 'bg-[var(--success)] text-white'
                      : 'bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]'
                  }`}
                >
                  {progress.completed ? '✓ Cobrada' : `+${definition.rewardSakura} 🌸`}
                </span>
              </div>

              <MirabiProgressBar
                className="mt-3"
                tone={progress.completed ? 'success' : 'sakura'}
                progress={progress.currentProgress / definition.targetValue}
              />
              <p className="mt-1.5 text-right text-xs text-[var(--on-surface-variant)]">
                {progress.currentProgress}/{definition.targetValue}
              </p>
            </MirabiCard>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-center text-xs text-[var(--on-surface-variant)]">
        La Sakura de una misión se abona automáticamente al completarla.
      </p>
    </Screen>
  )
}

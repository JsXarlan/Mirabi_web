import { AppIcon } from '../../ui/Icons'
import type { ContentExercise } from '../../core/content/types'
import { hasKana, toRomaji } from '../../core/domain/romaji'
import { errorTypeLabel } from '../../core/domain/weakpoints'
import { useMirabiStore } from '../../core/store/useMirabiStore'
import { AudioButton, speakableText } from './ExerciseView'

/**
 * Correccion de un paso. El error se explica, no se castiga: si el contenido
 * declara por que ese distractor es tentador, se muestra tal cual, y encima se
 * nombra la confusion (`errorType`) para que el fallo tenga un porque y no solo
 * un "era la otra".
 */
export function FeedbackBar({
  exercise,
  answer,
  isCorrect,
}: {
  exercise: ContentExercise
  answer: string
  isCorrect: boolean | null
}) {
  const catalog = useMirabiStore((state) => state.catalog)
  if (isCorrect === null) return null

  const audioText = speakableText(exercise)

  if (isCorrect) {
    return (
      <div
        role="status"
        className="mt-4 flex items-center justify-between gap-3 rounded-[16px] bg-[color-mix(in_srgb,var(--success)_20%,transparent)] p-4 animate-pop"
      >
        <p className="text-sm font-bold text-[var(--on-surface)]">
          <span className="flex items-center gap-2">
            <AppIcon name="complete" size={22} />
            ¡Correcto!
          </span>
        </p>
        {audioText && <AudioButton compact text={audioText} />}
      </div>
    )
  }

  const distractorReason =
    exercise.options.find((option) => option.text === answer)
      ?.distractorReason ?? null
  const explanation =
    exercise.errorType && exercise.errorType !== 'NONE'
      ? errorTypeLabel(exercise.errorType)
      : null
  const correct = exercise.correctAnswer
  const reading =
    correct && hasKana(correct) ? toRomaji(correct, catalog) : null

  return (
    <div
      role="status"
      className="mt-4 rounded-[16px] bg-[var(--secondary-container)] p-4 animate-pop"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-[var(--on-secondary-container)]">
          La respuesta era{' '}
          <span
            className="font-jp"
            lang={correct && hasKana(correct) ? 'ja' : undefined}
          >
            {correct}
          </span>
          {reading && (
            <span className="ml-1.5 font-normal opacity-80">({reading})</span>
          )}
        </p>
        {audioText && <AudioButton compact text={audioText} />}
      </div>

      {distractorReason && (
        <p className="mt-1 text-xs text-[var(--on-secondary-container)]">
          {distractorReason.replaceAll('_', ' ')}
        </p>
      )}

      {explanation && (
        <p className="mt-2 border-t border-[color-mix(in_srgb,var(--on-secondary-container)_20%,transparent)] pt-2 text-xs text-[var(--on-secondary-container)]">
          <span className="font-semibold">{explanation.title}.</span>{' '}
          {explanation.advice}
        </p>
      )}

      <p className="mt-1.5 text-xs text-[var(--on-secondary-container)] opacity-80">
        Lo guardamos en tu repaso para volver a verlo.
      </p>
    </div>
  )
}

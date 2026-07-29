/**
 * Correccion de un paso. El error se explica, no se castiga: si el contenido
 * declara por que ese distractor es tentador, se muestra tal cual.
 */
export function FeedbackBar({
  isCorrect,
  correctAnswer,
  distractorReason,
}: {
  isCorrect: boolean | null
  correctAnswer: string | null
  distractorReason: string | null
}) {
  if (isCorrect === null) return null

  if (isCorrect) {
    return (
      <div className="mt-4 rounded-[16px] bg-[color-mix(in_srgb,var(--success)_20%,transparent)] p-4 animate-pop">
        <p className="text-sm font-bold text-[var(--on-surface)]">¡Correcto! 🌸</p>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-[16px] bg-[var(--secondary-container)] p-4 animate-pop">
      <p className="text-sm font-bold text-[var(--on-secondary-container)]">
        La respuesta era{' '}
        <span className="font-jp">{correctAnswer}</span>
      </p>
      {distractorReason && (
        <p className="mt-1 text-xs text-[var(--on-secondary-container)]">
          {distractorReason.replaceAll('_', ' ')}
        </p>
      )}
      <p className="mt-1.5 text-xs text-[var(--on-secondary-container)]">
        Lo guardamos en tu repaso para volver a verlo.
      </p>
    </div>
  )
}

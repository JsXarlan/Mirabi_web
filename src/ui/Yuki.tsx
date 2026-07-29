import type { YukiState } from '../core/domain/models'
import { YUKI_FACE } from '../core/domain/yuki'

/**
 * Placeholder de Yuki, equivalente a MirabiYukiPlaceholder.
 * El arte definitivo (docs/ui/images/yuki_character_sheet.png) sustituye este
 * bloque sin tocar las pantallas que lo usan.
 */
export function Yuki({
  state = 'HAPPY',
  size = 64,
}: {
  state?: YukiState
  size?: number
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--secondary-container)]"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      role="img"
      aria-label={`Yuki ${state.toLowerCase()}`}
    >
      <span aria-hidden>{YUKI_FACE[state]}</span>
    </div>
  )
}

export function YukiBubble({
  message,
  state = 'HAPPY',
}: {
  message: string
  state?: YukiState
}) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] bg-[var(--secondary-container)] p-4">
      <Yuki state={state} size={52} />
      <p className="text-sm leading-snug text-[var(--on-secondary-container)]">{message}</p>
    </div>
  )
}

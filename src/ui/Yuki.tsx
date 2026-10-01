import type { YukiState } from '../core/domain/models'
import { artSource, type YukiPose } from './Artwork'
const POSES: Record<YukiState, YukiPose> = {
  HAPPY: 'happy', PROUD: 'proud', THINKING: 'thinking', SAD: 'sad', SLEEPING: 'sleeping',
}
const LABELS: Record<YukiPose, string> = {
  happy: 'saludando', proud: 'celebrando', thinking: 'pensando', sad: 'acompañándote',
  sleeping: 'descansando', reading: 'leyendo',
}
export function Yuki({ state = 'HAPPY', size = 100, halo = true, pose }: {
  state?: YukiState; size?: number; halo?: boolean; pose?: YukiPose
}) {
  const name = pose ?? POSES[state]
  const portrait = size <= 84 && name !== 'sleeping'
  return (
    <span className={`yuki-root illustrated-yuki${halo ? ' has-halo' : ''}${portrait ? ' yuki-portrait' : ''}`}
      style={{ width: size, height: size }}
      role="img" aria-label={`Yuki, tu compañera, ${LABELS[name]}`}>
      <img src={artSource(name, 320)}
        srcSet={[160, 320, 640].map(width => `${artSource(name, width)} ${width}w`).join(', ')}
        sizes={`${portrait ? size * 1.6 : size}px`}
        width={640} height={640} alt="" aria-hidden="true" draggable={false} decoding="async" />
    </span>
  )
}
/** The domain chooses the message and emotional state. */
export function YukiBubble({ message, state = 'HAPPY' }: { message: string; state?: YukiState }) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] bg-[var(--secondary-container)] p-4">
      <Yuki state={state} size={56} halo={false} />
      <p className="text-sm leading-snug text-[var(--on-secondary-container)]">{message}</p>
    </div>
  )
}


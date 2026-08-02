import type { YukiState } from '../core/domain/models'

/**
 * Yuki, la kitsune que acompana al usuario.
 *
 * Dibujada como SVG y no como imagen por tres razones: escala a cualquier tamano
 * sin assets, hereda los tokens del tema (funciona en claro y oscuro sin dos
 * versiones) y los cinco estados emocionales del MVP son el mismo cuerpo con
 * distintos ojos, boca y adornos, asi que compartirlos evita cinco ficheros que
 * se desincronizan.
 *
 * Yuki acompana: nunca ensena ni corrige. Por eso no lleva gafas, puntero ni
 * pizarra, y su gesto siempre es de compania, incluso cuando el usuario falla.
 */

interface Features {
  /** Ojos. Cada estado dibuja su propio par. */
  eyes: React.ReactNode
  mouth: React.ReactNode
  /** Adornos flotantes: destellos, lagrima, zzz. */
  extras?: React.ReactNode
  /** Inclinacion de la cabeza, en grados. Da vida sin animar nada. */
  tilt: number
}

const EYE_LEFT = 37
const EYE_RIGHT = 63
const EYE_Y = 53

function openEye(cx: number) {
  return (
    <g key={cx}>
      <ellipse cx={cx} cy={EYE_Y} rx={4.6} ry={5.4} fill="var(--yuki-ink)" />
      {/* El brillo es lo que separa "vivo" de "muneco". */}
      <circle cx={cx + 1.6} cy={EYE_Y - 2} r={1.6} fill="#fff" opacity={0.9} />
    </g>
  )
}

/** Ojo feliz: arco hacia arriba, el gesto de sonreir con los ojos. */
function archEye(cx: number, flip = false) {
  const direction = flip ? -1 : 1
  return (
    <path
      key={`arch-${cx}`}
      d={`M ${cx - 5} ${EYE_Y + 1} q ${5 * direction} -6 10 0`}
      stroke="var(--yuki-ink)"
      strokeWidth={2.6}
      strokeLinecap="round"
      fill="none"
    />
  )
}

function closedEye(cx: number) {
  return (
    <path
      key={`closed-${cx}`}
      d={`M ${cx - 4.5} ${EYE_Y} q 4.5 3.4 9 0`}
      stroke="var(--yuki-ink)"
      strokeWidth={2.4}
      strokeLinecap="round"
      fill="none"
    />
  )
}

function smile(width = 7, depth = 4) {
  return (
    <path
      d={`M ${50 - width} 68 q ${width} ${depth} ${width * 2} 0`}
      stroke="var(--yuki-ink)"
      strokeWidth={2.2}
      strokeLinecap="round"
      fill="none"
    />
  )
}

function sparkle(x: number, y: number, size: number, delay: number) {
  return (
    <path
      key={`${x}-${y}`}
      d={`M ${x} ${y - size} L ${x + size * 0.32} ${y - size * 0.32} L ${x + size} ${y} L ${x + size * 0.32} ${y + size * 0.32} L ${x} ${y + size} L ${x - size * 0.32} ${y + size * 0.32} L ${x - size} ${y} L ${x - size * 0.32} ${y - size * 0.32} Z`}
      fill="var(--yuki-sparkle)"
      className="yuki-sparkle"
      style={{ animationDelay: `${delay}ms` }}
    />
  )
}

function featuresFor(state: YukiState): Features {
  switch (state) {
    case 'HAPPY':
      return {
        eyes: [openEye(EYE_LEFT), openEye(EYE_RIGHT)],
        mouth: smile(),
        tilt: -3,
      }
    case 'PROUD':
      return {
        // Ojos cerrados hacia arriba: orgullo tranquilo, no euforia.
        eyes: [archEye(EYE_LEFT), archEye(EYE_RIGHT)],
        mouth: smile(8, 5),
        extras: (
          <>
            {sparkle(18, 30, 5, 0)}
            {sparkle(82, 26, 6, 260)}
            {sparkle(88, 52, 4, 520)}
          </>
        ),
        tilt: 0,
      }
    case 'THINKING':
      return {
        // Un ojo entornado: esta pensando con el usuario, no juzgandolo.
        eyes: [openEye(EYE_LEFT), closedEye(EYE_RIGHT)],
        mouth: (
          <path
            d="M 45 68 q 5 -2.5 10 0"
            stroke="var(--yuki-ink)"
            strokeWidth={2.2}
            strokeLinecap="round"
            fill="none"
          />
        ),
        extras: (
          <g className="yuki-float">
            <circle cx={84} cy={34} r={2.4} fill="var(--yuki-sparkle)" opacity={0.55} />
            <circle cx={90} cy={26} r={3.4} fill="var(--yuki-sparkle)" opacity={0.75} />
          </g>
        ),
        tilt: 6,
      }
    case 'SAD':
      return {
        eyes: [archEye(EYE_LEFT, true), archEye(EYE_RIGHT, true)],
        mouth: (
          <path
            d="M 43 70 q 7 -4 14 0"
            stroke="var(--yuki-ink)"
            strokeWidth={2.2}
            strokeLinecap="round"
            fill="none"
          />
        ),
        extras: (
          <path
            d="M 70 58 q 2.6 4.4 0 6.4 q -2.6 -2 0 -6.4 Z"
            fill="var(--yuki-tear)"
            className="yuki-tear"
          />
        ),
        tilt: -8,
      }
    case 'SLEEPING':
      return {
        eyes: [closedEye(EYE_LEFT), closedEye(EYE_RIGHT)],
        mouth: (
          <ellipse cx={50} cy={69} rx={2.6} ry={3.2} fill="var(--yuki-ink)" opacity={0.75} />
        ),
        extras: (
          <g className="yuki-float" fill="var(--yuki-sparkle)" fontWeight={700}>
            <text x={80} y={34} fontSize={11}>
              z
            </text>
            <text x={88} y={24} fontSize={8}>
              z
            </text>
          </g>
        ),
        tilt: 8,
      }
  }
}

export function Yuki({
  state = 'HAPPY',
  size = 64,
  /** Halo circular de fondo. Se apaga cuando Yuki va sobre una ilustracion. */
  halo = true,
}: {
  state?: YukiState
  size?: number
  halo?: boolean
}) {
  const features = featuresFor(state)
  const sleeping = state === 'SLEEPING'

  return (
    <div
      className="yuki-root relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Yuki, tu companera, en estado ${state.toLowerCase()}`}
    >
      {halo && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-[var(--secondary-container)]"
        />
      )}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`relative ${sleeping ? 'yuki-breathe-slow' : 'yuki-breathe'}`}
        aria-hidden
      >
        <g transform={`rotate(${features.tilt} 50 60)`}>
          {/* Colas detras del cuerpo: dos, marca de kitsune. */}
          <g className={sleeping ? '' : 'yuki-tail'} style={{ transformOrigin: '50px 78px' }}>
            <path
              d="M 30 80 q -18 -6 -20 -22 q 10 8 14 4 q -6 -12 4 -18 q 0 16 10 22 Z"
              fill="var(--yuki-fur-shade)"
            />
            <path
              d="M 70 80 q 18 -6 20 -22 q -10 8 -14 4 q 6 -12 -4 -18 q 0 16 -10 22 Z"
              fill="var(--yuki-fur-shade)"
            />
            <path d="M 12 60 q 6 5 10 3 q -5 5 -10 -3 Z" fill="var(--yuki-tail-tip)" />
            <path d="M 88 60 q -6 5 -10 3 q 5 5 10 -3 Z" fill="var(--yuki-tail-tip)" />
          </g>

          {/* Orejas */}
          <path d="M 26 40 L 24 12 L 44 28 Z" fill="var(--yuki-fur)" />
          <path d="M 74 40 L 76 12 L 56 28 Z" fill="var(--yuki-fur)" />
          <path d="M 30 36 L 29 20 L 40 29 Z" fill="var(--yuki-inner-ear)" />
          <path d="M 70 36 L 71 20 L 60 29 Z" fill="var(--yuki-inner-ear)" />

          {/* Cabeza, con mechones laterales para que no sea un ovalo pelado. */}
          <path
            d="M 50 24
               C 70 24 81 38 81 54
               C 81 66 74 76 65 81
               L 70 86 L 60 83
               C 57 84 53 85 50 85
               C 47 85 43 84 40 83
               L 30 86 L 35 81
               C 26 76 19 66 19 54
               C 19 38 30 24 50 24 Z"
            fill="var(--yuki-fur)"
          />

          {/* Hocico */}
          <ellipse cx={50} cy={66} rx={13} ry={10} fill="var(--yuki-muzzle)" />
          <ellipse cx={50} cy={61} rx={3.4} ry={2.6} fill="var(--yuki-ink)" />

          {/* Rubor: la calidez que pide la guia visual. */}
          <ellipse cx={27} cy={62} rx={5.6} ry={3.4} fill="var(--yuki-blush)" opacity={0.75} />
          <ellipse cx={73} cy={62} rx={5.6} ry={3.4} fill="var(--yuki-blush)" opacity={0.75} />

          {features.eyes}
          {features.mouth}
          {features.extras}
        </g>
      </svg>
    </div>
  )
}

/** Yuki con su mensaje. El texto siempre lo decide el dominio, nunca la vista. */
export function YukiBubble({
  message,
  state = 'HAPPY',
}: {
  message: string
  state?: YukiState
}) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] bg-[var(--secondary-container)] p-4">
      <Yuki state={state} size={56} halo={false} />
      <p className="text-sm leading-snug text-[var(--on-secondary-container)]">{message}</p>
    </div>
  )
}

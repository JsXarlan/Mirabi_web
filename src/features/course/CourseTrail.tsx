import type { CourseNode, CourseNodeState } from '../../core/domain/course'

/**
 * El curso como camino, no como lista.
 *
 * La guia visual es explicita: "el camino debe sentirse como viaje" y "no debe
 * parecer una lista plana". Los nodos serpentean y una senda los une, asi que el
 * avance se percibe como desplazamiento y no como scroll.
 *
 * Los nodos siguen siendo <button> reales con texto real: la senda es un SVG
 * decorativo detras. Apagando el SVG la unidad se recorre igual con teclado y
 * con lector de pantalla.
 */

const ROW_HEIGHT = 92
const TOP_PADDING = 24
/** Cuanto se aparta el camino del centro, en % del ancho. */
const AMPLITUDE = 22

/** Serpenteo: una sinusoide da una curva natural sin tabla de posiciones. */
function xAt(index: number): number {
  return 50 + AMPLITUDE * Math.sin(index * 0.85)
}

function yAt(index: number): number {
  return TOP_PADDING + index * ROW_HEIGHT
}

const NODE_STYLE: Record<
  CourseNodeState,
  { circle: string; icon: string; label: string; hint: string }
> = {
  COMPLETED: {
    circle: 'bg-[var(--success)] text-white shadow-[0_4px_12px_rgb(111_191_142/0.45)]',
    icon: '✓',
    label: 'font-semibold',
    hint: 'Completada',
  },
  CURRENT: {
    circle:
      'bg-[var(--primary)] text-[var(--on-primary)] ring-4 ring-[var(--primary-container)] shadow-[0_6px_18px_rgb(123_95_208/0.5)] scale-110',
    icon: '▶',
    label: 'font-bold',
    hint: 'Estás aquí',
  },
  AVAILABLE: {
    circle:
      'bg-[var(--surface)] text-[var(--primary)] border-3 border-[var(--primary)] border-dashed',
    icon: '●',
    label: 'font-semibold',
    hint: 'Disponible',
  },
  LOCKED: {
    circle: 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)]',
    icon: '🔒',
    label: 'font-medium opacity-70',
    hint: 'Completa la anterior',
  },
}

export function CourseTrail({
  nodes,
  onSelect,
}: {
  nodes: CourseNode[]
  onSelect: (node: CourseNode) => void
}) {
  if (nodes.length === 0) return null

  const height = TOP_PADDING * 2 + (nodes.length - 1) * ROW_HEIGHT

  // Senda continua entre nodos consecutivos, con curvas suaves en las vueltas.
  const trail = nodes
    .map((_, index) => {
      const x = xAt(index)
      const y = yAt(index)
      if (index === 0) return `M ${x} ${y}`
      const previousX = xAt(index - 1)
      const previousY = yAt(index - 1)
      const midpoint = (previousY + y) / 2
      return `C ${previousX} ${midpoint}, ${x} ${midpoint}, ${x} ${y}`
    })
    .join(' ')

  // Hasta donde llega el progreso: la senda se colorea igual que el avance real.
  const lastDone = nodes.reduce(
    (last, node, index) => (node.state === 'COMPLETED' ? index : last),
    -1,
  )

  return (
    <div className="relative" style={{ height }}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={trail}
          fill="none"
          stroke="var(--surface-variant)"
          strokeWidth={10}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {lastDone >= 0 && (
          <path
            d={nodes
              .slice(0, lastDone + 1)
              .map((_, index) => {
                const x = xAt(index)
                const y = yAt(index)
                if (index === 0) return `M ${x} ${y}`
                const previousX = xAt(index - 1)
                const previousY = yAt(index - 1)
                const midpoint = (previousY + y) / 2
                return `C ${previousX} ${midpoint}, ${x} ${midpoint}, ${x} ${y}`
              })
              .join(' ')}
            fill="none"
            stroke="var(--success)"
            strokeWidth={10}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            opacity={0.55}
          />
        )}
      </svg>

      {nodes.map((node, index) => {
        const style = NODE_STYLE[node.state]
        const locked = node.state === 'LOCKED'
        const x = xAt(index)
        // El cartel va al lado opuesto de la curva, para que nunca tape la senda.
        const labelOnRight = x <= 50

        return (
          <div
            key={node.id}
            className="absolute flex items-center gap-3"
            style={{
              top: yAt(index),
              left: `${x}%`,
              transform: `translate(${labelOnRight ? '-28px' : 'calc(-100% + 28px)'}, -50%)`,
              flexDirection: labelOnRight ? 'row' : 'row-reverse',
            }}
          >
            <button
              type="button"
              disabled={locked}
              onClick={() => onSelect(node)}
              aria-label={`${node.title}. ${style.hint}`}
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg transition active:scale-95 disabled:cursor-not-allowed ${style.circle}`}
            >
              <span aria-hidden>{style.icon}</span>
            </button>

            <button
              type="button"
              disabled={locked}
              onClick={() => onSelect(node)}
              tabIndex={-1}
              className={`max-w-[9.5rem] text-left disabled:cursor-not-allowed ${
                labelOnRight ? '' : 'text-right'
              }`}
            >
              <span className={`block truncate font-jp text-sm ${style.label}`}>{node.title}</span>
              <span className="block text-[11px] text-[var(--on-surface-variant)]">
                {style.hint}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

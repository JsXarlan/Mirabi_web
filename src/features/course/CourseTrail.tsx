import type { CourseNode, CourseNodeState } from '../../core/domain/course'
import { AppIcon } from '../../ui/Icons'

const NODE_STYLE: Record<CourseNodeState, { icon: string; hint: string }> = {
  COMPLETED: { icon: 'check', hint: 'Completada · puedes repetirla' },
  CURRENT: { icon: 'play', hint: 'Tu siguiente lección' },
  AVAILABLE: { icon: 'characters', hint: 'Disponible' },
  LOCKED: { icon: 'lock', hint: 'Completa la lección anterior' },
}

export function CourseTrail({
  nodes,
  onSelect,
}: {
  nodes: CourseNode[]
  onSelect: (node: CourseNode) => void
}) {
  if (!nodes.length) return null
  return (
    <ol className="journey-list" aria-label="Lecciones de la unidad">
      {nodes.map((node) => {
        const style = NODE_STYLE[node.state]
        return (
          <li key={node.id}>
            <button
              type="button"
              className="journey-step"
              disabled={node.state === 'LOCKED'}
              onClick={() => onSelect(node)}
              aria-current={node.state === 'CURRENT' ? 'step' : undefined}
            >
              <span className={'journey-node ' + node.state.toLowerCase()}>
                <AppIcon
                  name={style.icon}
                  size={24}
                  weight={node.state === 'CURRENT' ? 'fill' : 'regular'}
                />
              </span>
              <span className="journey-label">
                <strong>{node.title}</strong>
                <small>{style.hint}</small>
              </span>
              {node.state === 'CURRENT' && <AppIcon name="next" size={18} />}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

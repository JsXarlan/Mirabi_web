import { Artwork } from './Artwork'

/** Painted scenes share the brand; progress and learning information remain HTML. */
/** Paletas por mundo. El color es la senal de "he cambiado de sitio". */
const WORLD_SKIES: Record<string, [string, string]> = {
  world_m0_sounds: ['#6b5bbd', '#a88ade'], // atardecer: antes de leer
  world_m1_hiragana: ['#4f7fd4', '#87b6ef'], // dia claro: primer alfabeto
  world_m2_first_japanese: ['#2f8f8a', '#7fcfc0'], // verde agua: primer japones real
  world_m3_katakana: ['#c56a8f', '#f0a9c2'], // rosa: katakana
  world_m4_people: ['#c98b3f', '#f0c98a'], // dorado: personas
  world_m5_food: ['#b8543f', '#efa07e'], // atardecer calido: comida
}

const DEFAULT_SKY: [string, string] = ['#6b5bbd', '#a88ade']

export function skyFor(worldId: string): [string, string] {
  return WORLD_SKIES[worldId] ?? DEFAULT_SKY
}

/**
 * Cabecera de mundo: cielo, Fuji, torii y sakura.
 * Alterna el jardín y el viaje al pueblo según el contexto del mundo.
 */
export function WorldBackdrop({ worldId, className = '' }: { worldId: string; className?: string }) {
  const village = ['world_m2_first_japanese', 'world_m4_people', 'world_m5_food'].includes(worldId)
  return <Artwork name={village ? 'journey' : 'garden'} className={className + ' world-landscape'} eager />
}

/** Un petalo de sakura: cinco lobulos con la muesca caracteristica. */
export function SakuraPetal({ className = '', size = 14 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className={className} aria-hidden>
      <path
        d="M 10 2 C 12.4 2 14.2 4 14 6.4 C 16.4 5.8 18.4 7.4 18 9.8 C 17.6 12 15.4 13 13.4 12.4 C 14.4 14.6 13 17 10.6 17 C 8.6 17 7.2 15.4 7 13.4 C 5 14.6 2.4 13.4 2 11 C 1.6 8.8 3.4 7 5.6 7 C 4.6 5 6 2.4 8.4 2.2 Z"
        fill="currentColor"
      />
      <circle cx="10" cy="10" r="2" fill="#fff" opacity={0.45} />
    </svg>
  )
}

/**
 * Lluvia de petalos de fondo. Puramente decorativa y con `pointer-events: none`,
 * asi que nunca puede robar un toque a un boton.
 * Se apaga sola con prefers-reduced-motion.
 */
export function SakuraFall({ count = 9 }: { count?: number }) {
  // Posiciones deterministas: si fueran aleatorias, cada render las movería.
  const petals = Array.from({ length: count }, (_, index) => ({
    left: (index * 97) % 100,
    delay: (index * 1.7) % 12,
    duration: 11 + ((index * 3) % 7),
    size: 9 + ((index * 5) % 8),
    drift: index % 2 === 0 ? 1 : -1,
  }))

  return (
    <div className="sakura-fall pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {petals.map((petal, index) => (
        <span
          key={index}
          className="sakura-petal absolute -top-6 text-[var(--secondary)]"
          style={{
            left: `${petal.left}%`,
            animationDelay: `${petal.delay}s`,
            animationDuration: `${petal.duration}s`,
            ['--drift' as string]: `${petal.drift * 40}px`,
          }}
        >
          <SakuraPetal size={petal.size} />
        </span>
      ))}
    </div>
  )
}

/**
 * Estallido de petalos al completar algo. Se monta una vez y se descarta:
 * la celebracion tiene que sentirse puntual, no ambiental.
 */
export function SakuraBurst({ count = 18 }: { count?: number }) {
  const petals = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2
    const distance = 90 + ((index * 17) % 70)
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 30,
      delay: (index % 5) * 45,
      size: 10 + ((index * 3) % 9),
    }
  })

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      aria-hidden
    >
      {petals.map((petal, index) => (
        <span
          key={index}
          className="sakura-burst absolute text-[var(--secondary)]"
          style={{
            ['--burst-x' as string]: `${petal.x}px`,
            ['--burst-y' as string]: `${petal.y}px`,
            animationDelay: `${petal.delay}ms`,
          }}
        >
          <SakuraPetal size={petal.size} />
        </span>
      ))}
    </div>
  )
}

/** Escena para los estados vacios: farol y camino. "Yuki descansa", sin drama. */
export function RestingScene({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 110" className={className} aria-hidden>
      <path
        d="M 0 110 q 50 -18 100 -18 q 50 0 100 18 Z"
        fill="var(--surface-variant)"
      />
      {/* Camino que se aleja */}
      <path d="M 82 110 L 96 66 L 108 66 L 122 110 Z" fill="var(--outline)" opacity={0.35} />
      {/* Farol */}
      <g>
        <rect x="34" y="52" width="3" height="42" fill="var(--outline)" />
        <ellipse cx="35.5" cy="46" rx="11" ry="9" fill="var(--tertiary)" opacity={0.85} />
        <rect x="24" y="36" width="23" height="3" rx="1.5" fill="var(--outline)" />
      </g>
      {/* Rama de sakura */}
      <path
        d="M 200 22 q -32 6 -48 26"
        stroke="var(--outline)"
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
      />
      <g className="text-[var(--secondary)]" fill="currentColor" opacity={0.8}>
        <circle cx="168" cy="34" r="4.5" />
        <circle cx="180" cy="27" r="3.5" />
        <circle cx="156" cy="43" r="3" />
      </g>
    </svg>
  )
}

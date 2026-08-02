/**
 * Ilustraciones de Mirabi.
 *
 * La guia visual pide "ilustraciones japonesas suaves: sakura, torii, Monte Fuji,
 * nubes, caminos". Son SVG inline y no imagenes para que hereden el tema y no
 * pesen en la descarga: la app tiene que arrancar entera offline.
 *
 * Regla: decoran, nunca informan. Todo lo que un usuario necesita saber esta en
 * texto; si aqui se apagara todo, la app seguiria siendo usable.
 */

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
 * Cada mundo cambia de color, asi que avanzar por el curso se ve, no solo se lee.
 */
export function WorldBackdrop({
  worldId,
  className = '',
}: {
  worldId: string
  className?: string
}) {
  const [from, to] = skyFor(worldId)
  const gradientId = `sky-${worldId}`

  return (
    <svg
      viewBox="0 0 400 150"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>

      <rect width="400" height="150" fill={`url(#${gradientId})`} />

      {/* Sol / luna */}
      <circle cx="320" cy="42" r="20" fill="#fff8e7" opacity={0.85} />

      {/* Nubes */}
      <g fill="#ffffff" opacity={0.35}>
        <ellipse cx="70" cy="38" rx="34" ry="11" />
        <ellipse cx="96" cy="32" rx="22" ry="9" />
        <ellipse cx="250" cy="62" rx="28" ry="9" />
      </g>

      {/* Monte Fuji */}
      <path d="M 120 150 L 205 58 L 290 150 Z" fill="#ffffff" opacity={0.22} />
      <path d="M 176 90 L 205 58 L 234 90 q -15 8 -29 0 q -14 8 -29 0 Z" fill="#ffffff" opacity={0.6} />

      {/* Colinas */}
      <path d="M 0 150 q 70 -34 140 -6 q 70 28 140 -10 q 60 -30 120 4 L 400 150 Z" fill="#ffffff" opacity={0.16} />

      {/* Torii */}
      <g fill="#e8503f" opacity={0.9}>
        <rect x="44" y="96" width="7" height="54" />
        <rect x="93" y="96" width="7" height="54" />
        <rect x="32" y="88" width="80" height="7" rx="3" />
        <rect x="40" y="104" width="64" height="5" />
      </g>

      {/* Petalos */}
      <g fill="#fbdce9" opacity={0.85}>
        <ellipse cx="150" cy="30" rx="4" ry="2.6" transform="rotate(-25 150 30)" />
        <ellipse cx="188" cy="52" rx="3.4" ry="2.2" transform="rotate(18 188 52)" />
        <ellipse cx="342" cy="88" rx="4.4" ry="2.8" transform="rotate(-40 342 88)" />
        <ellipse cx="272" cy="26" rx="3" ry="2" transform="rotate(35 272 26)" />
      </g>
    </svg>
  )
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

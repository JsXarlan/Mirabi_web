import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import type { WritingCard } from '../../core/domain/writingExercises'
import type { WritingFontStyle } from '../../core/store/useMirabiStore'

const SIZE = 260
const PAIR_SIZE = 76

/**
 * Mismos trazos (el `d` de KanjiVG) en los dos estilos: lo unico que cambia es
 * como se dibujan. "Digital" es el trazo geometrico uniforme de siempre;
 * "tradicional" engorda el trazo y endurece las puntas para que se sienta mas
 * a pincel, sin inventar geometria nueva.
 */
const STROKE_RENDER: Record<WritingFontStyle, { width: number; linecap: 'round' | 'butt'; linejoin: 'round' | 'miter' }> = {
  digital: { width: 3, linecap: 'round', linejoin: 'round' },
  traditional: { width: 5.5, linecap: 'butt', linejoin: 'miter' },
}

/** Un trazo se anima con un pequeño delay respecto al anterior, para leerse como secuencia. */
function StrokePath({
  d,
  delayMs,
  fontStyle,
}: {
  d: string
  delayMs: number
  fontStyle: WritingFontStyle
}) {
  const ref = useRef<SVGPathElement>(null)
  const render = STROKE_RENDER[fontStyle]

  useEffect(() => {
    const path = ref.current
    if (!path) return
    const length = path.getTotalLength()
    path.style.transition = 'none'
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    // Fuerza el reflow antes de animar, o el navegador funde el estado inicial con el final.
    path.getBoundingClientRect()
    const timer = window.setTimeout(() => {
      path.style.transition = 'stroke-dashoffset 0.6s ease'
      path.style.strokeDashoffset = '0'
    }, delayMs)
    return () => window.clearTimeout(timer)
  }, [d, delayMs])

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke="var(--primary)"
      strokeWidth={render.width}
      strokeLinecap={render.linecap}
      strokeLinejoin={render.linejoin}
    />
  )
}

/**
 * Trazo libre sobre canvas, con guía opcional del orden real de trazos.
 *
 * Sin reconocimiento: sin datos de trazo mano a mano ni una libreria de
 * comparacion, no hay forma honesta de puntuar el dibujo. La persona traza,
 * pide ver la animacion si quiere confirmar, y se autoevalua.
 */
export function WritingCanvas({
  card,
  fontStyle = 'digital',
}: {
  card: WritingCard
  fontStyle?: WritingFontStyle
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [showStrokes, setShowStrokes] = useState(false)

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  useEffect(() => {
    clear()
    setShowStrokes(false)
    // Solo al cambiar de caracter: no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  const pointFrom = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pointFrom(event)
    ctx.strokeStyle = getComputedStyle(event.currentTarget).color
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pointFrom(event)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    drawingRef.current = false
  }

  const fontClass = fontStyle === 'traditional' ? 'font-jp-traditional' : 'font-jp'

  return (
    <div>
      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        <span
          aria-hidden
          className={`${fontClass} pointer-events-none absolute inset-0 flex select-none items-center justify-center text-[170px] leading-none opacity-10`}
        >
          {card.symbol}
        </span>
        {showStrokes && (
          <svg viewBox={card.viewBox} className="pointer-events-none absolute inset-0 h-full w-full">
            {card.strokePaths.map((d, index) => (
              <StrokePath key={`${card.id}-${index}`} d={d} delayMs={index * 500} fontStyle={fontStyle} />
            ))}
          </svg>
        )}
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          aria-label={`Área de dibujo para el kana ${card.symbol}`}
          className="text-[var(--on-surface)] absolute inset-0 touch-none rounded-[16px] border-2 border-[var(--outline)]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
        />
        {card.pair && (
          <div
            role="img"
            className="absolute -right-3 -bottom-3 flex items-center justify-center rounded-[12px] border-2 border-[var(--outline)] bg-[var(--surface)]"
            style={{ width: PAIR_SIZE, height: PAIR_SIZE }}
            aria-label={`Tambien se traza el kana chico ${card.pair.symbol}`}
          >
            <span
              aria-hidden
              className={`${fontClass} pointer-events-none absolute inset-0 flex select-none items-center justify-center text-[46px] leading-none opacity-10`}
            >
              {card.pair.symbol}
            </span>
            {showStrokes && (
              <svg viewBox={card.pair.viewBox} className="pointer-events-none absolute inset-0 h-full w-full">
                {card.pair.strokePaths.map((d, index) => (
                  <StrokePath key={`${card.id}-pair-${index}`} d={d} delayMs={index * 500} fontStyle={fontStyle} />
                ))}
              </svg>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          onClick={clear}
          className="rounded-full bg-[var(--surface-variant)] px-4 py-2 text-xs font-semibold"
        >
          Borrar
        </button>
        <button
          type="button"
          onClick={() => setShowStrokes((value) => !value)}
          className="rounded-full bg-[var(--surface-variant)] px-4 py-2 text-xs font-semibold"
        >
          {showStrokes ? 'Ocultar trazos' : 'Ver trazos'}
        </button>
      </div>
    </div>
  )
}

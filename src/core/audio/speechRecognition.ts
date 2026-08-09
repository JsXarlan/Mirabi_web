/**
 * Reconocimiento de voz en el navegador, via Web Speech API.
 *
 * Igual que speech.ts con el TTS: nada de servidor propio, todo corre en el
 * dispositivo (o en el servicio del fabricante segun su implementacion del
 * estandar). Solo Chrome/Edge y Safari (con prefijo) lo traen, asi que
 * PronunciationButton no se muestra si `isSpeechRecognitionAvailable()` es
 * falso, mismo criterio que AudioButton con la voz japonesa.
 */

interface SpeechRecognitionAlternative {
  transcript: string
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternative
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionErrorEventLike {
  error: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  start: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionAvailable(): boolean {
  return recognitionCtor() !== null
}

export type RecognitionOutcome =
  | { status: 'result'; transcript: string }
  | { status: 'no-match' }
  | { status: 'error'; error: string }

/**
 * Escucha una sola frase y avisa el resultado. Devuelve una funcion para
 * cancelar (p.ej. si el componente se desmonta a mitad de la escucha), o
 * null si este navegador no lo soporta.
 */
export function listenJapanese(onOutcome: (outcome: RecognitionOutcome) => void): (() => void) | null {
  const Ctor = recognitionCtor()
  if (!Ctor) return null

  const recognition = new Ctor()
  recognition.lang = 'ja-JP'
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.continuous = false

  let settled = false
  const finish = (outcome: RecognitionOutcome) => {
    if (settled) return
    settled = true
    onOutcome(outcome)
  }

  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim() ?? ''
    finish(transcript ? { status: 'result', transcript } : { status: 'no-match' })
  }
  // 'no-speech' y 'aborted' no son fallos que valga la pena mostrar como error.
  recognition.onerror = (event) => {
    if (event.error === 'no-speech') {
      finish({ status: 'no-match' })
      return
    }
    if (event.error === 'aborted') return
    finish({ status: 'error', error: event.error })
  }
  recognition.onend = () => finish({ status: 'no-match' })

  try {
    recognition.start()
  } catch {
    finish({ status: 'error', error: 'start-failed' })
    return null
  }

  return () => recognition.abort()
}

/** Compara lo escuchado con el texto esperado, sin puntuacion ni espacios. */
export function matchesSpokenText(heard: string, expected: string): boolean {
  const normalize = (text: string) => text.replace(/[\s。、！？!?.,ー]/g, '')
  const a = normalize(heard)
  const b = normalize(expected)
  return a.length > 0 && (a === b || a.includes(b) || b.includes(a))
}

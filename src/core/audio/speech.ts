/**
 * Audio del MVP: sintesis en el dispositivo, igual que el TTS del proyecto Android.
 * No hay ficheros de audio grabados, asi que la disponibilidad depende de que el
 * navegador tenga una voz ja-JP instalada; si no la hay, el boton no se muestra.
 */

let cachedVoice: SpeechSynthesisVoice | null = null

function japaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  if (cachedVoice) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  cachedVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('ja')) ?? null
  return cachedVoice
}

export function isSpeechAvailable(): boolean {
  return japaneseVoice() !== null
}

/** Las voces llegan de forma asincrona en algunos navegadores. */
export function onVoicesReady(callback: () => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => {}
  const handler = () => {
    cachedVoice = null
    callback()
  }
  window.speechSynthesis.addEventListener('voiceschanged', handler)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler)
}

export function speakJapanese(text: string, slow = false): void {
  const voice = japaneseVoice()
  if (!voice || !text.trim()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.voice = voice
  utterance.lang = voice.lang
  utterance.rate = slow ? 0.6 : 0.9
  window.speechSynthesis.speak(utterance)
}

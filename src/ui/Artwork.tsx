/** Decorative illustrations. Learning content and labels remain HTML. */
export type ArtworkName = 'garden' | 'journey' | 'scroll' | 'katakana' | 'brush' | 'cards' | 'tea' | 'medal' | 'gift' | 'shield' | 'repair'
export type YukiPose = 'reading' | 'happy' | 'proud' | 'thinking' | 'sad' | 'sleeping'
type AssetName = ArtworkName | YukiPose
const files = import.meta.glob<string>('../assets/art/*.webp', { eager: true, query: '?url', import: 'default' })
export function artSource(name: AssetName, width: number) {
  return files[`../assets/art/${name}-${width}.webp`]
}
export function Artwork({ name, className = '', size = 96, eager = false }: {
  name: ArtworkName; className?: string; size?: number; eager?: boolean
}) {
  const scene = name === 'garden' || name === 'journey'
  const widths = scene ? [768, 1280] : [256, 512]
  return (
    <img src={artSource(name, widths[0])}
      srcSet={widths.map(width => `${artSource(name, width)} ${width}w`).join(', ')}
      sizes={scene ? '(max-width: 600px) 100vw, 700px' : `${size}px`}
      width={scene ? 1280 : 512} height={scene ? 853 : 512}
      alt="" aria-hidden="true" draggable={false}
      loading={eager ? 'eager' : 'lazy'} decoding="async"
      className={`mirabi-art ${scene ? 'scene-art' : 'spot-art'} ${className}`}
      style={scene ? undefined : { width: size, height: size }} />
  )
}
export function artworkForRoute(pathname: string): ArtworkName {
  if (pathname.startsWith('/curso')) return 'journey'
  if (pathname.includes('kanji')) return 'brush'
  if (pathname.startsWith('/caracteres/katakana')) return 'katakana'
  if (pathname.startsWith('/caracteres')) return 'scroll'
  if (pathname.startsWith('/conversaciones')) return 'tea'
  if (pathname.startsWith('/misiones') || pathname.startsWith('/perfil')) return 'medal'
  if (pathname.startsWith('/tienda') || pathname.startsWith('/premium')) return 'gift'
  if (pathname.startsWith('/repaso') || pathname.startsWith('/palabras') || pathname.startsWith('/analisis')) return 'cards'
  return 'garden'
}
export function ScriptArtwork({ sample, kanji = false }: { sample: string; kanji?: boolean }) {
  return (
    <span className={'script-artwork' + (kanji ? ' is-kanji' : sample === 'ア' ? ' is-katakana' : '')} aria-hidden="true">
      <Artwork name={kanji ? 'brush' : sample === 'ア' ? 'katakana' : 'scroll'} size={142} />
      <span className="script-artwork-glyph font-jp" lang="ja">{sample}</span>
    </span>
  )
}

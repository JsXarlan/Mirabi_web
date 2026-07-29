# Mirabi Web

Versión web de [Mirabi](https://github.com/JsXarlan/Mirabi), la app para aprender japonés desde cero
con curso guiado, caracteres, repaso inteligente, conversaciones y gamificación.

Es un port de la app Android (Kotlin + Compose), no una app distinta: comparte el **mismo contenido
educativo**, las **mismas reglas de dominio** y la **misma identidad visual**.

## Estado

Paridad funcional con el MVP de la app Android:

| Pantalla | Estado |
| --- | --- |
| Onboarding (bienvenida, motivo, nivel, objetivo diario) | ✅ |
| Inicio | ✅ |
| Curso (6 mundos, 30 unidades, 78 lecciones) | ✅ |
| Detalle de unidad | ✅ |
| Lección (intro, ejercicios, resultado) | ✅ |
| Centro de caracteres + detalle + práctica | ✅ |
| Repaso inteligente + sesión + resultado | ✅ |
| Conversaciones guiadas | ✅ |
| Misiones diarias | ✅ |
| Perfil (nivel, XP, racha, dominio, logros, calendario) | ✅ |
| Ajustes | ✅ |
| Premium | ✅ (sin cobro real) |
| Tienda Sakura | ✅ (compra simulada) |
| Kanji, escritura, IA conversacional | Fuera del MVP |

## Stack

- React 19 + TypeScript + Vite 7
- Tailwind CSS 4 (tokens de `MirabiTheme.kt`, modo claro y oscuro)
- Zustand con persistencia en `localStorage`
- `HashRouter`, para poder servirlo como estático (GitHub Pages)
- Web Speech API para la pronunciación (sin ficheros de audio)

Sin backend: **todo funciona offline** y el progreso vive en el navegador.

## Desarrollo

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

## Contenido educativo

El curso **no se escribe aquí**. La fuente de verdad sigue siendo el DSL de Kotlin del repo Android
(`data/content/course/world/*.kt`). Un test exportador serializa el `ContentPack` real a JSON:

```bash
gradlew :app:testDebugUnitTest --tests "*ContentJsonExportTest*"
```

Escribe en `Mirabi_web/public/content/`:

- `course.json` — 6 mundos, 30 unidades, 78 lecciones, 389 ejercicios (v2.0.0)
- `characters.json` — 142 kana (hiragana y katakana) con ejemplos

Ejecútalo cada vez que cambie el contenido en el repo Android. Los dos repos deben estar en el mismo
directorio padre, o pásale la ruta: `-Dmirabi.web.content.dir=RUTA`.

## Arquitectura

Espeja la del proyecto Android para que un cambio de reglas se pueda aplicar en ambos lados:

```
src/
  core/
    content/    tipos y carga del pack versionado
    domain/     reglas puras portadas de Kotlin (curso, repaso, recompensas,
                misiones, Yuki, perfil, validación de respuestas)
    store/      estado y persistencia (equivalente a Room + los ViewModels)
    audio/      síntesis de voz japonesa
  ui/           design system (MirabiCard, MirabiButton, …) y layout
  features/     una carpeta por pantalla, igual que feature/ en Android
```

Las reglas de negocio están en `core/domain` y son puras: no dependen de React. Cada archivo indica
de qué clase Kotlin es equivalente.

## Diferencias con la app Android

- **Conversaciones guiadas**: en Android llegan de una API remota. Aquí se construyen con los pasos
  `CONVERSATION_RESPONSE` que ya viven dentro de las lecciones, para que la pantalla funcione sin
  backend y offline.
- **Audio**: no hay ficheros grabados. Se usa la síntesis del navegador; si no hay voz `ja-JP`
  instalada, los botones de audio no se muestran.
- **Cuenta y sincronización**: no implementadas. El progreso es local a este navegador.
- **Premium y tienda**: la compra está simulada; no hay pasarela de pago.
- **Anuncios recompensados**: no implementados en web.

## Documentación

La documentación de producto vive en el repo Android, en `docs/`. Antes de tocar contenido o
pantallas, leer `docs/Mirabi_MVP_Specification.md` y `docs/ui/Mirabi_UI_Screen_Specs.md`.

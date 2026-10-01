# Mirabi — illustrated experience

## Art direction

Approved October 1, 2026: a balance between the user's detailed Japanese landscape concept and its minimalist alternative. Purple remains the main color. Use softly painted 2D artwork, lavender shadows, restrained pink sakura and warm lantern/gold accents. Yuki is the original cream fox with violet eyes, lavender forehead diamond, purple scarf, gold star and fluffy tail.

The approved vector logo remains the brand mark. The illustrations are separate decorative assets; page layouts, controls, learning material and progress remain real HTML.

## Asset inventory

- Yuki: reading, waving, proud, thinking, reassuring and sleeping.
- Landscapes: quiet Fuji/garden and a village journey with bridge.
- Collections: blank hiragana scroll, blank katakana sign, calligraphy kit and flashcards.
- Conversation: tea set.
- Rewards/shop: sakura medal, travel gift, protective shield and repair pouch.

The 17 original illustrations were generated with the built-in ImageGen tool from the approved reference. Prompts and original PNG filenames are recorded in `art-manifest.json`. Production assets live in `src/assets/art`; transparent assets retain their alpha channel.

## Coverage audit and implementation

| Screens / states | Placement |
| --- | --- |
| Home | Quiet garden heading, reading Yuki and garden in next-lesson card, illustrated practice links, companion and mission |
| Course, unit details | Journey heading; painted world summaries replace the old geometric scene |
| Hiragana / katakana / kanji library | Matching heading, distinct illustrated collection cards with real Japanese glyph overlays |
| Radical browser | Calligraphy heading; actual radicals remain text |
| Vocabulary | Flashcard heading; cards in word detail sheet |
| Review / weak points | Flashcard heading; sleeping Yuki for empty states |
| Conversations | Tea-set heading; Yuki in recommendation and results |
| Missions | Medal heading and Yuki messages |
| Profile | Medal heading, Yuki identity, illustrated earned/locked badges |
| Settings | Quiet garden heading; forms and preferences remain clear |
| Premium | Travel-gift heading and Yuki |
| Shop | Travel-gift heading and relevant illustrations for protection, repair, XP and gifts |
| Lesson introduction | Soft garden behind reading/proud Yuki |
| Lesson session / feedback | Discreet context illustration outside the question; proud/reassuring Yuki in feedback |
| Kana / kanji practice, confusables, contextual reading, jukugo | Shared session shell with context artwork; generated Yuki in results |
| Writing practice | Context illustration outside the canvas; Yuki in loading, errors and results |
| Word flashcards / quiz | Flashcard session accent and Yuki in results |
| Review session | Flashcard session accent and Yuki in empty/result states |
| Conversation sessions | Tea-set session accent and Yuki in results |
| Placement / world exams | Quiet shared session accent, Yuki in results |
| Onboarding (all steps) | Painted journey and waving Yuki in the shared story panel |
| Character / kanji / word detail windows | Small scroll, brush or flashcard strip in the shared dialog |
| Loading, content errors, app errors, empty searches | Thinking, reassuring and resting Yuki |
| Achievement notification | Sakura medal |

## Integration rules

- Overview artwork is selected centrally in `Artwork.tsx`. Related nested routes reuse the same visual language.
- Do not put landscapes behind questions, answers, Japanese text or the writing canvas.
- Generated images contain no instructional lettering. Kana overlays are HTML with `lang="ja"`.
- Decoration has empty alternative text, is hidden from assistive technology and cannot intercept clicks. Yuki has a Spanish accessible description.
- Images have intrinsic dimensions, responsive WebP sources and asynchronous decoding. Secondary illustrations load lazily.
- Light/dark themes use the existing theme tokens and masks. Mobile rearranges the hero to separate copy, button and Yuki.
- Locked achievements are muted with an explicit lock and text; artwork does not determine achievement state.
- The existing service worker caches Vite's hashed assets when fetched. Unvisited illustrations are available offline after they have loaded once.

## Reproducing optimization

Normal builds consume the checked-in WebP assets and require no image-generation credentials or image processing dependency.

To re-export from the original PNG directory, use `scripts/optimize-art.mjs` with Sharp available. An external installed Sharp module can be supplied through `MIRABI_SHARP_PATH`:

```powershell
$env:MIRABI_SHARP_PATH = 'path/to/node_modules/sharp'
node scripts/optimize-art.mjs 'path/to/original-png-directory'
```

This performs proportional resizing and WebP conversion only. Source artwork is preserved.

## Review

Production compilation succeeds. Overview routes were inspected at desktop and 375 px widths; a mobile course overflow caused by unanchored screen-reader labels was corrected by positioning the world tabs. Character detail was also inspected on mobile. The kana, kanji, confusables, reading, jukugo, writing, flashcard and quiz session layouts were inspected; their shared shell keeps artwork outside the question. Onboarding was inspected in the production preview. Result poses are integrated through the existing Yuki component. No local test suite was added or manually run.

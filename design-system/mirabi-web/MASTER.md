# Mirabi Web — sistema de diseño

## Dirección

Aprender japonés debe sentirse como un camino claro y acompañado. Identidad
principal morada, acento sakura, fondos lavanda cálidos, tinta violeta y superficies
limpias. Yuki conserva su identidad como compañera. Una acción principal por pantalla.

## Investigación con UI/UX Pro Max

Consultas: `language learning warm japanese` y `adult language learning calm`
con `--design-system`. Ambas identifican Language Learning App y recomiendan
progreso visible, superficies suaves y motivación. Las propuestas de tipografía
Kids/Education y landing con testimonios no corresponden al producto; no se usan.
La búsqueda explícita `Nunito Sans --domain typography` identifica Nunito + DM Sans,
adecuada para una marca con mascota. Se usa con pesos moderados y tamaños legibles.
La búsqueda `memo --stack react` confirma memoización selectiva. Las búsquedas de
foco al cambiar ruta no devuelven una coincidencia específica: se aplica la guía
general de accesibilidad de la skill y se comprueba en navegador.

## Tokens

- Morado principal: `--primary`, contrastado con `--on-primary`.
- Lavanda: `--primary-container`, `--surface-variant`.
- Sakura: `--secondary` y `--secondary-container`.
- Éxito: verde con icono y texto; corrección: sakura con explicación.
- Dos temas definidos por roles semánticos en `src/index.css`.
- Espaciado: 4, 8, 12, 16, 24, 32, 48 y 64 px.
- Radios: 12 px controles, 20 px tarjetas, 28 px bloques destacados.
- Tipografía local: DM Sans para interfaz, Nunito para títulos; fuentes japonesas existentes.
- Iconos Phosphor, decorativos cuando acompañan texto y con nombre en controles.
- Motion: 160–220 ms; feedback inmediato; respetar `prefers-reduced-motion`.

## Información y navegación

Cinco destinos principales: Inicio, Curso, Caracteres, Repaso y Perfil.
Palabras y Conversaciones siguen accesibles desde la biblioteca y el inicio.
Escritorio: sidebar persistente y cabecera contextual. Móvil: cinco destinos
inferiores y accesos de práctica dentro de las pantallas. Las sesiones tienen
layout de concentración con progreso y salida explícita.

## Pantallas

- Inicio: saludo, siguiente lección dominante, objetivo diario y práctica recomendada.
- Curso: selector de mundos, progreso, recorrido y estados con texto.
- Caracteres: recomendación de práctica, colecciones de escritura y acceso a vocabulario.
- Repaso: estado real de la cola, siguiente fecha, precisión y acción recomendada.
- Perfil: progreso, calendario con etiquetas por día, logros y estadísticas.
- Onboarding: bienvenida y tres decisiones breves con avance, retroceso y selección clara.
- Sesiones: pregunta, respuesta, explicación y siguiente paso con jerarquía consistente.
- Pantallas secundarias: mismos componentes, roles de color y medidas de interacción.

## Revisión de la implementación

Compilación de producción con `npm run build`. Inspección visual en navegador a
1440 y 375 px, con temas claro y oscuro. Foco al cambiar de pantalla, etiquetas
visibles en formularios, selección mediante botones y controles táctiles de 44 px.
Las animaciones conservan el soporte existente de `prefers-reduced-motion`.
Las suites automatizadas existentes no se ejecutaron en este rediseño.

Fuentes autohospedadas para offline. Yuji Syuku se reserva para la práctica de
escritura tradicional; las colecciones usan fuentes japonesas del sistema.
Contenido educativo y cálculos de progreso proceden de los motores existentes.

La vista local usa `.env.local` (ignorado por Git) con un destino de Supabase local
sin servicio. No se conecta a un backend de producción. Para autenticación y
sincronización deben configurarse `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
con los valores del proyecto. El rediseño no modifica el cliente de Supabase.

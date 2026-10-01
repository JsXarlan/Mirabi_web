# Logo de Mirabi

El usuario aprobó el símbolo de Yuki con un libro abierto y el nombre `mirabi.`.
Las siluetas del símbolo y las letras se vectorizaron a partir de esa referencia;
no dependen de una fuente ni incluyen el fondo oscuro de la imagen de presentación.

## Variantes y aplicación

| Ubicación | Variante |
| --- | --- |
| Barra lateral de escritorio | Logo horizontal completo, 180 px |
| Bienvenida y sesiones | Logo horizontal completo, 184 px |
| Cabecera móvil y tablet | Símbolo, 44 × 44 px, enlace al inicio |
| Pestaña y notificaciones | `public/icon.svg` |
| iOS | `public/apple-touch-icon.png`, 180 × 180 px |
| App instalada | PNG de 192/512 px y variante maskable de 512 px |

Los SVG de interfaz están en `src/assets/brand/`; Vite publica sus nombres con hash.
La variante clara usa letras moradas (`#5932a8`) y punto sakura (`#ba3c7b`);
la oscura usa letras lavanda (`#d8c6ff`) y punto rosa (`#eea6cc`). El símbolo conserva
su morado (`#6336cc`), blanco, lavanda y tinta violeta en ambos temas.

`MirabiBrand` selecciona la variante mediante la misma clase `.dark` que el resto
de la interfaz. Tiene un único nombre accesible y reserva las dimensiones del logo.
No estirar, añadir sombras ni colocar sobre fotografías. Mantener espacio libre
alrededor. La variante maskable deja la ilustración dentro del círculo seguro
central; el fondo morado se extiende hasta todos los bordes.

El service worker cambia de versión para renovar los iconos que antes se guardaban
en caché. El cambio de logo no modifica los datos de aprendizaje de localStorage.

## Revisión

Compilación de producción con TypeScript y Vite. Inspección visual del logo completo
en escritorio y del símbolo a 375 px, en ambos temas. No se ejecutaron suites de
tests localmente; el PR utiliza la validación existente de GitHub Actions.

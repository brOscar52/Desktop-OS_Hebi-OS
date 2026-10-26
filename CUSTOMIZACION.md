# Guía de Personalización — hebi OS

Esta guía explica paso a paso cómo personalizar **hebi OS**, modificar aplicaciones existentes sin tocar código TypeScript, alterar la identidad del sistema operativo, cambiar recursos visuales y auditivos, o agregar nuevas aplicaciones y widgets mediante el sistema de auto-descubrimiento dinámico (`import.meta.glob`).

---

## Índice

1. [Personalización de Aplicaciones Existentes](#1-personalización-de-aplicaciones-existentes)
   - [Estructura de la carpeta `meta/`](#estructura-de-la-carpeta-meta)
   - [Modificar `manifest.json`](#modificar-manifestjson)
   - [Reemplazar ícono (`icon.svg`) y portada (`cover.png`)](#reemplazar-ícono-iconsvg-y-portada-coverpng)
   - [Personalizar estilos con `theme.css`](#personalizar-estilos-con-themecss)
   - [Actualizar el manual de ayuda (`help.md`)](#actualizar-el-manual-de-ayuda-helpmd)
2. [Personalización del Sistema Operativo](#2-personalización-del-sistema-operativo)
   - [Nombre y configuración base (`os.config.json`)](#nombre-y-configuración-base-osconfigjson)
   - [Logo de arranque (`boot/logo.svg`)](#logo-de-arranque-bootlogosvg)
   - [Botón de Inicio (`icons/start.svg`)](#botón-de-inicio-iconsstartsvg)
   - [Fondos de pantalla (`wallpapers/`)](#fondos-de-pantalla-wallpapers)
   - [Sonidos del sistema (`sounds/`)](#sonidos-del-sistema-sounds)
   - [Íconos del sistema (`icons/`)](#íconos-del-sistema-icons)
   - [Tokens de diseño y paleta (`theme/tokens.css`)](#tokens-de-diseño-y-paleta-themetokenscss)
3. [Creación de Nuevas Aplicaciones y Widgets](#3-creación-de-nuevas-aplicaciones-y-widgets)
   - [Agregar una nueva aplicación](#agregar-una-nueva-aplicación)
   - [Agregar un nuevo widget](#agregar-un-nuevo-widget)
4. [Formatos y Tamaños Recomendados](#4-formatos-y-tamaños-recomendados)
5. [Ciclo de Aplicación de Cambios: En Caliente vs Recompilación](#5-ciclo-de-aplicación-de-cambios-en-caliente-vs-recompilación)

---

## 1. Personalización de Aplicaciones Existentes

Cada aplicación en hebi OS está desacoplada de la interfaz del sistema. Todos sus metadatos, recursos gráficos, estilos y manuales de ayuda residen en su subcarpeta `meta/`.

Ruta: `src/renderer/src/apps/<id>/meta/`

### Estructura de la carpeta `meta/`

```text
src/renderer/src/apps/<id>/
├── meta/
│   ├── manifest.json   # Configuración, nombre, permisos, ventanas
│   ├── icon.svg        # Ícono vectorial de la aplicación
│   ├── cover.png       # Imagen de portada o previsualización
│   ├── theme.css       # Estilos CSS propios o sobreescritura de temas
│   └── help.md         # Documentación de ayuda en formato Markdown
└── src/
    └── index.tsx       # Código de la aplicación (¡no necesitas tocarlo!)
```

### Modificar `manifest.json`

El archivo `manifest.json` define la identidad de la aplicación en el menú Inicio, la barra de tareas, el Administrador de tareas, la app de Ayuda y los diálogos de propiedades.

Ejemplo:
```json
{
  "id": "calculator",
  "name": "Calculadora Hebi",
  "version": "1.2.0",
  "author": "Tu Nombre o Empresa",
  "description": "Calculadora científica moderna y conversor de unidades.",
  "category": "utilities",
  "keywords": ["calculadora", "math", "operaciones", "cuenta"],
  "singleInstance": false,
  "window": {
    "title": "Calculadora",
    "width": 360,
    "height": 520,
    "minWidth": 320,
    "minHeight": 440,
    "resizable": true,
    "maximizable": false
  },
  "fileAssociations": []
}
```

- **`name`**: Nombre visible en todo el sistema.
- **`description`**: Breve resumen mostrado en el menú Inicio y la app de Ayuda.
- **`version`** y **`author`**: Metadatos mostrados en el cuadro "Acerca de".
- **`category`**: Categoría en el menú Inicio (`accessories`, `productivity`, `multimedia`, `utilities`, `system`).
- **`window`**: Dimensiones iniciales y mínimas recomendadas.

### Reemplazar ícono (`icon.svg`) y portada (`cover.png`)

- **`icon.svg`**: Gráfico vectorial estándar en SVG con `viewBox="0 0 24 24"` o `viewBox="0 0 32 32"`. Al cambiar este archivo, se actualiza automáticamente el menú Inicio, la barra de tareas, los accesos directos del escritorio y la app de Ayuda.
- **`cover.png`**: Imagen representativa (proporción 16:9, ej. 800×450 px). Se visualiza en la galería de la app de Ayuda y en vistas destacadas.

### Personalizar estilos con `theme.css`

Si deseas personalizar el aspecto de una app (tipografías locales, bordes o distribución interna), edita `src/renderer/src/apps/<id>/meta/theme.css`.

> **Importante:** Respeta los tokens de diseño del sistema. No uses colores fijos en hexadecimal ni degradados llamativos. Utiliza variables CSS como `var(--accent)`, `var(--bg-card)`, `var(--text-primary)`, `var(--border)` y `var(--radius-md)`.

### Actualizar el manual de ayuda (`help.md`)

Cada aplicación cuenta con su archivo `help.md` escrito en Markdown. El contenido se renderiza dinámicamente en la app **Ayuda** (`apps/help`) usando el parser seguro del sistema:
- Títulos `#`, `##`, `###`
- Listas con viñetas (`-`, `*`) y numeradas (`1.`)
- Negritas (`**texto**`) y cursivas (`*texto*`)
- Código en línea (`` `atajo` ``)
- Párrafos explicativos y atajos de teclado

---

## 2. Personalización del Sistema Operativo

Todos los recursos globales del sistema se encuentran organizados en:
`src/renderer/src/system/`

### Nombre y configuración base (`os.config.json`)

Ruta: `src/renderer/src/system/os.config.json`

```json
{
  "name": "hebi OS",
  "version": "1.0",
  "bootDurationMs": 2500,
  "startFullscreen": false,
  "simulatedMemoryMB": 16384,
  "defaults": {
    "theme": "light",
    "accent": "#0D9488",
    "wallpaper": "aurora",
    "timezone": "America/Caracas",
    "hour24": false,
    "taskbarAlignment": "center"
  },
  "networks": [
    { "ssid": "Casa_5G", "secured": true, "password": "...", "signal": 4 }
  ]
}
```

- **`name`**: Nombre global del sistema operativo (mostrado en pantalla de bloqueo, menú Inicio, app de Ayuda y ventana Acerca de).
- **`version`**: Versión principal del sistema.
- **`bootDurationMs`**: Duración de la pantalla de inicio / arranque en milisegundos.
- **`defaults`**: Tema predeterminado (`light` o `dark`), fondo inicial, color de acento y alineación de barra de tareas (`center` o `left`).

### Logo de arranque (`boot/logo.svg`)

Ruta: `src/renderer/src/system/boot/logo.svg`

Es el logotipo vectorial animado que aparece durante la secuencia de arranque (BootScreen).
- Formato: SVG vectorial con colores que armonicen con el acento turquesa `#0D9488`.

### Botón de Inicio (`icons/start.svg`)

Ruta: `src/renderer/src/system/icons/start.svg`

Ícono que se muestra en el extremo izquierdo o central de la barra de tareas para abrir el menú Inicio.
- Formato: SVG con dimensiones proporcionales (24×24 o 32×32).

### Fondos de pantalla (`wallpapers/`)

Ruta: `src/renderer/src/system/wallpapers/`

Los fondos de pantalla son descubiertos automáticamente por el kernel. Puedes añadir o reemplazar archivos `.svg`, `.png` o `.jpg`.
- Fondos incluidos: `aurora.svg`, `dusk.svg`, `emerald.svg`, `lagoon.svg`.
- Para agregar uno nuevo, simplemente guarda tu archivo en la carpeta (ej. `mi-fondo.png`). Estará disponible inmediatamente en la configuración del sistema (**Configuración › Personalización › Fondo de pantalla**).

### Sonidos del sistema (`sounds/`)

Ruta: `src/renderer/src/system/sounds/`

El kernel dispone de un sintetizador armónico Web Audio API por defecto, pero si colocas archivos de audio en esta carpeta, el sistema los reproducirá automáticamente para los eventos correspondientes:
- `startup.mp3` o `.wav`: Sonido al iniciar sesión.
- `notification.mp3` o `.wav`: Notificación entrante del centro de acciones.
- `trash.mp3` o `.wav`: Vaciar la papelera de reciclaje o eliminar archivo.
- `error.mp3` o `.wav`: Diálogos de advertencia o error.
- `shutter.mp3` o `.wav`: Captura de fotografía en Cámara.

### Íconos del sistema (`icons/`)

Ruta: `src/renderer/src/system/icons/`

Contiene los íconos de tipos de archivo y elementos del sistema:
- `folder.svg` y `folder-system.svg`: Carpetas de usuario y carpetas de sistema.
- `recycle-bin-empty.svg` y `recycle-bin-full.svg`: Estados de la Papelera de reciclaje.
- `file-text.svg`, `file-image.svg`, `file-audio.svg`, `file-video.svg`, `file-generic.svg`: Tipos MIME de archivo.
- `drive.svg`: Unidades de almacenamiento virtuales (`C:`).
- `avatar-default.svg`: Avatar de usuario por defecto.

### Tokens de diseño y paleta (`theme/tokens.css`)

Ruta: `src/renderer/src/system/theme/tokens.css`

Define las variables globales de diseño, modo claro, modo oscuro y niveles de elevación:

```css
:root {
  /* Color principal de identidad (Turquesa #0D9488) */
  --accent: #0D9488;
  --accent-hover: #0F766E;
  --accent-active: #115E59;
  --accent-subtle: rgba(13, 148, 136, 0.12);

  /* Colores secundarios (Azul y Verde) */
  --secondary-blue: #0284C7;
  --secondary-green: #16A34A;

  /* Tipografía */
  --font-sans: 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif;
  --font-mono: 'Cascadia Code', 'Consolas', monospace;

  /* Radios de borde Fluent */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

> **Reglas de Oro del Diseño en hebi OS:**
> 1. **Cero degradados en bloques grandes:** Se prohíben fondos con gradientes fuertes en ventanas, barras o escritorios. La estética es limpia, profesional y moderna con superficies sólidas o acrílicas sutiles.
> 2. **Paleta armónica:** El color primario es Turquesa (`#0D9488`), complementado con azul suave y verde para estados informativos.

---

## 3. Creación de Nuevas Aplicaciones y Widgets

hebi OS utiliza el mecanismo de Vite `import.meta.glob` para descubrir aplicaciones y widgets dinámicamente al momento de construir o recargar el proyecto. ¡No es necesario registrar manualmente rutas en un arreglo!

### Agregar una nueva aplicación

1. Crea una nueva carpeta en `src/renderer/src/apps/<id_de_tu_app>/`.
2. Estructura recomendada:
   ```text
   src/renderer/src/apps/mi-app/
   ├── meta/
   │   ├── manifest.json
   │   ├── icon.svg
   │   ├── cover.png
   │   ├── theme.css
   │   └── help.md
   └── src/
       └── index.tsx
   ```
3. En `meta/manifest.json`, asigna un `id` único y define sus propiedades de ventana.
4. En `src/index.tsx`, exporta tu componente React por defecto:

```tsx
import React from 'react'
import { Button, Card } from '@os/ui'
import { useKernel } from '@os/sdk'

export default function MiApp() {
  const kernel = useKernel()

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Card>
        <h2>¡Bienvenido a Mi Nueva Aplicación!</h2>
        <p>Esta aplicación fue descubierta automáticamente por hebi OS.</p>
        <Button variant="accent" onClick={() => kernel.notifications.show({ title: 'Hola', body: 'Mensaje desde Mi App' })}>
          Probar Notificación
        </Button>
      </Card>
    </div>
  )
}
```

5. ¡Listo! La aplicación aparecerá inmediatamente en el menú Inicio, la barra de búsqueda y la app de Ayuda.

### Agregar un nuevo widget

1. Crea una carpeta en `src/renderer/src/widgets/<id_del_widget>/`.
2. Crea su `meta/manifest.json`:
   ```json
   {
     "id": "contador",
     "name": "Contador Rápido",
     "description": "Widget de conteo interactivo para el escritorio",
     "author": "hebi OS Team",
     "version": "1.0",
     "sizes": ["small", "medium"],
     "defaultSize": "small"
   }
   ```
3. Crea su componente en `src/index.tsx` recibiendo `{ size }` como prop:
   ```tsx
   import React, { useState } from 'react'
   import { Button } from '@os/ui'

   export default function ContadorWidget({ size }: { size: 'small' | 'medium' | 'large' }) {
     const [count, setCount] = useState(0)

     return (
       <div style={{ padding: '12px', textAlign: 'center' }}>
         <h4>Contador ({size})</h4>
         <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '8px 0' }}>{count}</div>
         <Button variant="accent" onClick={() => setCount(c => c + 1)}>+1</Button>
       </div>
     )
   }
   ```
4. Agrega el widget a través del menú contextual del escritorio (**Clic derecho en escritorio › Agregar widget**) o desde la configuración.

---

## 4. Formatos y Tamaños Recomendados

| Recurso | Formato | Dimensiones Recomendadas | Peso Máximo Sugerido | Ubicación |
| :--- | :--- | :--- | :--- | :--- |
| **Ícono de App** | `.svg` (vectorial) | `24×24` a `48×48` px | < 10 KB | `apps/<id>/meta/icon.svg` |
| **Portada de App** | `.png` o `.webp` | `800×450` px (16:9) | < 250 KB | `apps/<id>/meta/cover.png` |
| **Fondo de Pantalla** | `.svg`, `.png`, `.jpg` | `1920×1080` o `3840×2160` px | < 1.5 MB | `system/wallpapers/` |
| **Logo de Arranque** | `.svg` (vectorial) | `120×120` px | < 15 KB | `system/boot/logo.svg` |
| **Ícono de Inicio** | `.svg` (vectorial) | `24×24` px | < 5 KB | `system/icons/start.svg` |
| **Efectos de Sonido** | `.mp3` o `.wav` | Audio mono/estéreo a 44.1 kHz | < 200 KB | `system/sounds/` |

---

## 5. Ciclo de Aplicación de Cambios: En Caliente vs Recompilación

| Tipo de Cambio | ¿Requiere Recompilar? | Cómo Probar |
| :--- | :--- | :--- |
| **Editar `help.md`** | No (En caliente / HMR) | Guardar el archivo y abrir la app **Ayuda**. |
| **Editar `theme.css` de una app** | No (En caliente / HMR) | La ventana abierta se actualiza al guardar. |
| **Cambiar `icon.svg` o `cover.png`** | No (Recarga de pestaña / HMR) | Se refresca en Vite al guardar el archivo. |
| **Modificar `manifest.json`** | No (Recarga suave de Vite) | Recargar o abrir de nuevo la aplicación. |
| **Modificar `tokens.css`** | No (En caliente) | La interfaz del sistema adopta los nuevos estilos al instante. |
| **Cambiar `os.config.json`** | No (Reinicio del entorno de ejecución) | Recargar la ventana del navegador o reiniciar `npm run dev`. |
| **Añadir nueva app o widget** | No (Vite HMR detecta el nuevo archivo) | Aparece al crear el archivo `src/index.tsx`. |
| **Generar instalador / ejecutable final** | **Sí** | Ejecutar `npm run build` para generar el paquete de distribución. |

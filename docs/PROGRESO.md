# Bitácora de Progreso del Proyecto

Documento de seguimiento del avance por fases según `ESPECIFICACION.md`.

---

## Fase 0 — Base del proyecto y estructura

- **Estado:** Completada con éxito
- **Fecha:** 2026-10-25
- **Objetivo:** Proyecto que arranca, seguro, con toda la estructura y todos los manifiestos en su lugar.
- **Detalle de tareas realizadas:**
  - [x] Copia y sincronización de la especificación como `ESPECIFICACION.md`.
  - [x] Creación de `CLAUDE.md` con lineamientos de desarrollo y comandos del proyecto.
  - [x] Inicialización del repositorio git y `.gitignore`.
  - [x] Configuración de dependencias en `package.json`: Electron, electron-vite, React 18, TypeScript strict, Zustand, Dexie 4, Zod, @fluentui/react-icons, @fontsource/inter, ESLint.
  - [x] Configuración de `electron.vite.config.ts` con alias `@os/sdk`, `@os/ui`, `@system`, `@shared` y plugin de React.
  - [x] Configuración de TypeScript (`tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`) en modo estricto (`strict: true`).
  - [x] Implementación de reglas estrictas de importación en `.eslintrc.cjs` (`no-restricted-imports`) garantizando que apps y widgets solo puedan importar de `@os/sdk`, `@os/ui`, React, dependencias permitidas o su propia carpeta.
  - [x] Implementación de la seguridad de Electron en `src/main/security.ts` e `index.ts`: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, bloqueo de navegación (`will-navigate`), bloqueo de ventanas (`setWindowOpenHandler` -> `deny`), Content Security Policy y control restrictivo de permisos `media`.
  - [x] Implementación del puente nativo `window.native` (Sección 4.1): tipos en `src/shared/native-api.ts`, handlers en `src/main/ipc/` (`files.ts`, `auth.ts`, `power.ts`, `index.ts`) y exposición segura con `contextBridge` en `src/preload/index.ts`.
  - [x] Creación de `src/renderer/src/system/`:
    - `os.config.json` con configuración base de "hebi OS", redes wifi simuladas, memoria y tema.
    - `theme/tokens.css` con variables completas Fluent (modos claro y oscuro, Mica y Acrílico, paleta principal turquesa, secundaria azul y verde).
    - `boot/logo.svg` y logo de inicio.
    - Íconos del sistema en SVG: `start.svg`, `folder.svg`, `folder-system.svg`, `drive.svg`, `file-generic.svg`, `file-text.svg`, `file-image.svg`, `file-audio.svg`, `file-video.svg`, `recycle-bin-empty.svg`, `recycle-bin-full.svg`, `avatar-default.svg`.
    - 4 fondos de pantalla limpios en SVG (`aurora.svg`, `lagoon.svg`, `dusk.svg`, `emerald.svg`).
  - [x] Estructuración de las 17 aplicaciones en `src/renderer/src/apps/` con sus carpetas `meta/` (manifiesto validado por Zod e ícono SVG original estilo Fluent) y `src/index.tsx` provisional con `EmptyState`.
  - [x] Estructuración de los 4 widgets en `src/renderer/src/widgets/` con `meta/` (manifiesto validado e ícono SVG) y componente provisional.
  - [x] Esquema Zod en `src/renderer/src/os/kernel/apps/manifest.schema.ts` y registro dinámico con descubrimiento automático vía `import.meta.glob` en `src/renderer/src/os/kernel/apps/registry.ts`.
  - [x] Implementación de componente base `EmptyState` en `@os/ui` y stub tipado de `@os/sdk`.
  - [x] Pantalla temporal de la Fase 0 en `src/renderer/src/main.tsx` que muestra las 17 apps y 4 widgets registrados, con badges de categoría y vista previa reactiva.
- **Verificación:**
  - `npm run typecheck`: 0 errores.
  - `npm run lint`: 0 errores, 0 advertencias.
  - `npm run build`: Compilación exitosa de main, preload y renderer.
- **Desviaciones y contratos modificados:** Ninguna.

---

## Fase 1 — Núcleo y sesión

- **Estado:** Completada con éxito
- **Fecha:** 2026-10-25
- **Objetivo:** Todos los servicios del kernel funcionando y el ciclo de sesión completo.
- **Detalle de tareas realizadas:**
  - [x] **Servicio de eventos (`os/kernel/events`):** bus de eventos tipado con mapa `EventMap` cumpliendo la Sección 4.4 (`fs:changed`, `settings:changed`, `session:*`, `power:*`, `app:*`, `window:*`, `notification:*`, `media:*`, `scheduler:*`).
  - [x] **Servicio de almacenamiento (`os/kernel/storage`):** base de datos Dexie `simos` (v1) con tablas `meta`, `user`, `nodes`, `blobs`, `settings`, `appData`, `scheduled`. Respeta estrictamente la regla 3 (solo storage toca Dexie).
  - [x] **Servicio de sonido (`os/kernel/sound`):** soporte para los 11 sonidos del sistema con síntesis armónica en Web Audio API como fallback determinista, control de volumen maestro y silenciado.
  - [x] **Servicio de configuración (`os/kernel/settings`):** esquema completo (Sección 4.5), reactividad con `settings:changed`, sincronización de sonido y aplicación de variables CSS en el DOM (`data-theme`, `data-transparency`, `--accent-color`).
  - [x] **Sistema de archivos virtual (`os/kernel/fs`):**
    - Rutas internas POSIX y conversiones Windows estilo Fluent (`toDisplayPath` / `fromDisplayPath`).
    - Nombres válidos y generación automática de duplicados (`archivo (2).ext`).
    - Métodos `stat`, `list`, `exists`, `readFile`, `readText`, `writeFile`, `mkdir`, `rename`, `move`, `copy`, `duplicate`, `trash`, `listTrash`, `restore`, `deletePermanently`, `emptyTrash`, `importFromHost`, `getObjectUrl`, `pathOf`, `usage`.
    - Siembra inicial del árbol (`/`, `/.Papelera`, `/Usuarios/<nombre>`, `Escritorio`, `Documentos`, `Descargas`, `Imágenes/Cámara`, `Música/Grabaciones`, `Videos/Cámara`, y `~/Documentos/Bienvenida.txt`).
  - [x] **Servicio de red simulada (`os/kernel/network`):** redes desde `os.config.json`, conexión con validación de clave, desconexión y olvidar red.
  - [x] **Servicio de procesos (`os/kernel/processes`):** registro de procesos del sistema y apps, métricas suaves de CPU y RAM sobre memoria simulada (16384 MB).
  - [x] **Servicio de medios (`os/kernel/media`):** wrappers seguros para `getCamera` y `getMicrophone`, detención de streams y emisión de `media:active`.
  - [x] **Servicio de notificaciones (`os/kernel/notifications`):** publicación y descarte de avisos, sonido de notificación e integración de eventos.
  - [x] **Servicio programador (`os/kernel/scheduler`):** ciclo de revisión de tareas por segundo, disparo de alertas, alarmas sonoras y repetición (`none`, `daily`, `weekdays`).
  - [x] **Gestor de sesión (`os/kernel/session`):** store Zustand con estados `booting`, `setup`, `locked`, `login`, `authenticated`, `restarting`, `shutting_down`.
  - [x] **Interfaz del Shell (`os/shell`):**
    - `BootScreen`: pantalla negra, logo centrado, indicador de puntos girando y sonido `boot`.
    - `SetupWizard`: asistente OOBE centrado en tarjeta en 5 pasos (bienvenida, nombre, contraseña con confirmación, selector de avatar y tema claro/oscuro). Cifra la contraseña con scrypt en main y siembra el VFS.
    - `LockAndLoginScreen`: pantalla de bloqueo con fecha y hora grande, batería y wifi. Deslizamiento hacia arriba para mostrar el inicio de sesión con avatar, nombre, contraseña, verificación criptográfica segura y menú de energía.
    - `PowerScreen`: pantallas para reinicio y apagado conectadas a `native.power.quit()`.
    - `Shell`: coordinador central que presenta la sesión y, tras autenticar, muestra el escritorio con control de sesión de usuario y la lista de aplicaciones.
- **Verificación:**
  - `npm run typecheck`: 0 errores.
  - `npm run lint`: 0 errores, 0 advertencias.
  - `npm run build`: Compilación de producción exitosa (main, preload, renderer).
  - Persistencia de datos comprobada en Dexie.
- **Desviaciones y contratos modificados:** Ninguna.

# Bitácora de Progreso del Proyecto

Documento de seguimiento del avance por fases según `ESPECIFICACION.md`.

---

## Fase 0 — Base del proyecto y estructura

- **Estado:** Completada con éxito
- **Fecha:** 2026-10-25
- **Objetivo:** Proyecto que arranca, seguro, con toda la estructura y todos los manifiestos en su lugar.
- **Detalle de tareas realizadas:**
  - [x] Copia y sincronización de la especificación como `ESPECIFICACION.md`.
  - [x] Configuración de lineamientos de desarrollo y comandos del proyecto en `package.json`.
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

---

## Fase 2 — Shell y ventanas

- **Estado:** Completada con éxito
- **Fecha:** 2026-10-25
- **Objetivo:** El escritorio completo con ventanas reales; las apps siguen siendo provisionales.
- **Detalle de tareas realizadas:**
  - [x] Eliminada la pantalla provisional de la Fase 0/1; ahora se monta el entorno interactivo de escritorio completo.
  - [x] **Componentes compartidos `@os/ui` (Sección 6):**
    - `Button`, `IconButton`, `TextField`, `TextArea`, `Select`, `Toggle`, `Slider`, `Checkbox`, `SegmentedControl`, `NavigationPane`, `List`, `CommandBar`, `Tabs`, `EmptyState`, `AppIcon`, `FileIcon`, `FileBrowser`, `ContextMenu`, `Flyout`, `InfoBar`.
  - [x] **Gestor de ventanas (`kernel/windows`):**
    - Interfaz `WindowState` y store Zustand para apilamiento, foco, estado (`normal`, `minimized`, `maximized`), cascada y dimensiones iniciales.
    - Acciones completas: `open`, `close`, `minimize`, `maximize`, `restore`, `toggleMaximize`, `focus`, `minimizeAll` (mostrar escritorio), `updateBounds`, `setTitle`, `setModal`, `setDirty`, `setOpenFileHandler`, `setAppMenus`.
    - Respeto estricto a `singleInstance: true`: restaura y enfoca la ventana existente y le envía el archivo a abrir vía `openFileHandler`.
    - Maximizar respeta el área útil (toda la pantalla menos la barra de tareas de 48px).
  - [x] **Marco de ventana (`shell/window-frame`):**
    - Radio de 8px, material Mica con desenfoque (`var(--material-mica)`), borde sutil y sombras Fluent.
    - Barra de título de 32px: ícono y título atenuados al perder foco, botones minimizar, maximizar/restaurar y cerrar.
    - Botón de cerrar se vuelve rojo (`#c42b1c`) con ícono blanco al pasar el cursor.
    - Doble clic en barra de título maximiza o restaura. Arrastre fluido por barra de título y redimensionamiento por 8 bordes/esquinas.
    - Menú contextual de ventana al hacer clic en el ícono o clic derecho en la barra de título (Restaurar, Minimizar, Maximizar, Acerca de `<App>`, Cerrar).
    - Barra de menús dentro de la ventana (`useAppMenus`), con añadido automático del menú "Ayuda › Acerca de <App>".
    - Diálogo modal "Acerca de `<App>`" mostrando ícono, portada, nombre, versión, autor y descripción leídos del manifiesto.
  - [x] **Diálogos y cambios sin guardar (`kernel/dialogs` y `shell/dialogs`):**
    - `DialogsApi`: `alert`, `confirm`, `prompt`, `choose`, `openFile`, `saveFile`.
    - Modales de ventana (`WindowModalHost`) que bloquean y se centran solo sobre su ventana.
    - Modales de sistema (`SystemDialogHost`) para diálogos de nivel superior.
    - Flujo único de cambios sin guardar: aviso "¿Quieres guardar los cambios en '<documentName>'? [Guardar] [No guardar] [Cancelar]" conectado a cerrar ventana, barra de tareas y flujo de energía (apagar/reiniciar).
  - [x] **Barra de tareas (`shell/taskbar`):**
    - Altura de 48px, material Mica, alineación configurable (`taskbar.alignment`).
    - Botón de Inicio con logo personalizado.
    - Apps ancladas (`taskbar.pinned`) y apps abiertas. Guion corto gris para apps abiertas y guion largo en color de énfasis para la app enfocada.
    - Clic abre, enfoca o minimiza. Clic derecho: abrir nueva ventana, anclar/desanclar, cerrar ventana.
    - Soporte para arrastrar archivos sobre el ícono de la app para abrir con ella.
  - [x] **Bandeja del sistema y reloj (`shell/tray`):**
    - Indicadores de hardware para cámara y micrófono activos.
    - Flyout acrílico de Wi-Fi: interruptor, lista de redes con candado/intensidad, conexión con clave y desconexión.
    - Flyout acrílico de Volumen: deslizador 0-100, botón de silencio y sincronización bidireccional.
    - Flyout acrílico de Batería: nivel y estado de carga (`navigator.getBattery`).
    - Reloj en 2 líneas sincronizado con configuración de fecha/hora; clic abre flyout con calendario mensual interactivo.
    - Franja fina en el extremo derecho ("Mostrar escritorio") que minimiza o restaura todas las ventanas.
  - [x] **Menú Inicio (`shell/start-menu`):**
    - Flyout acrílico flotante (~640×680px) sobre la barra de tareas.
    - Cuadro de búsqueda que filtra en tiempo real por nombre y descripción.
    - Sección "Anclado" con cuadrícula de 6 columnas respetando `start.pinned`.
    - Vista "Todas las aplicaciones ›" con listado alfabético agrupado por letra (A-Z).
    - Franja inferior con avatar/nombre del usuario (menú de cuenta, bloqueo y cerrar sesión) y botón de energía (reiniciar y apagar).
    - Clic derecho en app: Abrir, Anclar/Desanclar de Inicio, Anclar a barra de tareas, Añadir al escritorio.
  - [x] **Escritorio (`shell/desktop`):**
    - Fondo de pantalla reactivo (`appearance.wallpaper`).
    - Muestra archivos de `~/Escritorio`, accesos a apps de `desktop.items` y Papelera de reciclaje permanente (ícono dinámico vacío/lleno según contenido).
    - Arrastre con ajuste a cuadrícula invisible y tamaño según `desktop.iconSize`.
    - Selección con clic y rectángulo de selección translúcido en color de énfasis (marquesina).
    - Menú contextual de fondo: Ver (tamaño de íconos), Ordenar, Nuevo (Carpeta / Documento de texto), Añadir widget, Personalizar.
    - Menú contextual de elementos: Abrir, Abrir con…, Renombrar, Mover a la papelera, Propiedades.
    - Soltar archivos sobre la Papelera los envía a ella; doble clic la abre en Explorador.
  - [x] **Capa de Widgets (`shell/widgets-host`):**
    - Capa interactiva entre el fondo y los íconos, persistida en `desktop.widgets`.
    - Arrastre libre, botón "..." con menú para cambiar de tamaño y quitar.
    - 4 widgets funcionales implementados: `clock` (Reloj digital con fecha y segundos), `calendar` (Calendario del mes y eventos), `quick-note` (Nota rápida persistente), `system-status` (Batería, red wifi y almacenamiento).
  - [x] **Notificaciones y asociaciones:**
    - Toasts emergentes (`ToastHost`) en la esquina inferior derecha, auto-cierre en 5s y apertura de app con `launchArgs` al hacer clic.
    - Arrastre y soltar con tipo `application/x-simos-node`.
    - Resolución de asociaciones de archivos por extensión y prioridad (`launcher.ts`).
  - [x] **Integración con `@os/sdk`:**
    - `useOS`, `useLaunchArgs`, `useOpenFileHandler`, `useSetting`, `useSystemVolume`, `useFsWatch`, `useAppMenus`, `useUnsavedChanges`, `useProcesses`, `useAccount`.
- **Verificación:**
  - `npm run typecheck`: 0 errores.
  - `npm run lint`: 0 errores, 0 advertencias.
  - `npm run build`: Compilación de producción exitosa (main, preload, renderer).
- **Desviaciones y contratos modificados:** Ninguna.

---

## Fase 3 — Apps del sistema

- **Estado:** Completada con éxito
- **Fecha:** 2026-10-25
- **Objetivo:** Implementar las 4 aplicaciones principales del sistema operativo (`files`, `terminal`, `settings`, `task-manager`) sobre `@os/sdk` y `@os/ui`.
- **Detalle de tareas realizadas:**
  - [x] **Explorador de archivos (`files`):**
    - **Barra de comandos:** Nuevo (Carpeta / Documento de texto), Renombrar, Duplicar, Copiar, Mover, Eliminar (mover a papelera), Importar desde el equipo (`fs.importFromHost`), Ordenar (Nombre, Fecha, Tipo, Tamaño ascendente/descendente) y Ver (Íconos grandes, Lista, Detalles con columnas ordenables).
    - **Panel de navegación:** Inicio (`~/`), Escritorio, Descargas, Documentos, Imágenes, Música, Videos, Disco local (C:) y acceso directo a Papelera de reciclaje.
    - **Barra de direcciones:** Migas de pan interactivas estilo Windows con segmentos clicables, campo de edición manual con conversión bidireccional (`toDisplayPath` / `fromDisplayPath`), botones Atrás, Adelante e Historial, y botón Subir de nivel.
    - **Vistas:**
      - *Íconos grandes:* cuadrícula con íconos Fluent grandes y nombre centrado.
      - *Lista:* disposición horizontal/vertical compacta.
      - *Detalles:* tabla con Nombre, Fecha de modificación formateada, Tipo legible de archivo y Tamaño formateado en B/KB/MB.
    - **Interacciones:** Selección individual, múltiple con Ctrl/Cmd o Shift, arrastre y soltar (`application/x-simos-node`) entre carpetas y hacia el escritorio, menú contextual completo en archivos y fondo (con "Abrir con…", "Cambiar nombre", "Duplicar", "Propiedades"), y diálogo modal de Propiedades con metadatos del elemento.
    - **Vista Papelera de reciclaje:** Modo especial con acciones Restaurar, Eliminar definitivamente y Vaciar papelera de reciclaje (confirmación destructiva y sonido `empty-trash`).
    - **Argumentos de lanzamiento:** Soporte para `launchArgs.filePath` (navega a la carpeta contenedora y selecciona el archivo) y `{ view: 'trash' }`, más `useOpenFileHandler`.
  - [x] **Terminal (`terminal`):**
    - Aspecto de Windows Terminal moderna: tema oscuro con material Mica translúcido y tipografía monoespaciada (`Cascadia Code`, `Consolas`, `monospace`).
    - Prompt interactivo `PS <ruta visible>> ` (e.g. `PS C:\Usuarios\Usuario> `).
    - Soporte completo para rutas con `\`, `/`, `C:\` y `~` mediante `fs.fromDisplayPath` y `fs.toDisplayPath`.
    - Comandos y alias implementados:
      - `help`: ayuda estructurada de comandos.
      - `ls [-l]` (`dir`): listado normal o detallado con permisos, fecha, tamaño y color.
      - `cd [ruta]`: cambio de directorio con validación y resolución de relativos/absolutos.
      - `pwd`: impresión de directorio actual en formato Windows.
      - `mkdir [-p]` (`md`): creación de carpetas con soporte recursivo.
      - `touch`: creación de archivo vacío o actualización de timestamp.
      - `cat` (`type`): lectura e impresión de archivos de texto.
      - `echo` (con `>` para sobrescribir y `>>` para concatenar a archivos).
      - `rm [-r]` (`del`): eliminación segura enviando a la papelera vía `fs.trash`.
      - `mv` (`move`): movimiento o renombramiento vía `fs.move`.
      - `cp [-r]` (`copy`): copia recursiva vía `fs.copy`.
      - `tree [ruta]`: representación gráfica en árbol ASCII de directorios.
      - `open` (`start`): apertura de archivo con su aplicación predeterminada vía `apps.openFile`.
      - `date`: fecha y hora del sistema en español.
      - `whoami`: usuario actual (`hebi\<usuario>`).
      - `clear` (`cls`): limpieza de pantalla.
      - `history`: historial numerado de comandos.
    - Historial interactivo con flechas Arriba / Abajo.
    - Autocompletado con la tecla Tab para comandos y nombres de archivos/carpetas en el directorio actual.
    - Mensajes de error coherentes y en español.
    - Uso exclusivo de `fs` y `apps` desde `@os/sdk`.
  - [x] **Configuración (`settings`):**
    - Permisos declarados: `settings:write` y `system:account`. `singleInstance: true`.
    - Estilo de Windows 11 con panel de navegación izquierdo (tarjeta de perfil del usuario con avatar y nombre) y área de contenido estructurada por tarjetas Fluent.
    - Secciones completas:
      - **Personalización:** modo de color (claro, oscuro, automático), paleta de colores de énfasis interactiva encabezada por turquesa (`#0d9488`), efectos de transparencia (Mica/Acrílico) y selector de fondo de pantalla con miniaturas de `system/wallpapers` y selector de archivos del VFS.
      - **Escritorio y barra de tareas:** alineación de la barra de tareas (centro/izquierda), tamaño de íconos del escritorio (pequeño/mediano/grande), botón para restablecer posiciones de íconos y botón para restablecer accesos directos anclados.
      - **Sonido:** deslizador de volumen 0-100 %, silenciador maestro, sonidos del sistema y botón de prueba de sonido (`sound.playSystem('notification')`).
      - **Red e Internet:** interruptor de Wi-Fi, tarjeta de red conectada con intensidad de señal, desconexión, lista de redes disponibles, conexión con validación de contraseña y opción de olvidar red.
      - **Hora e idioma:** selector de zona horaria IANA, selector de formato de 24 horas y reloj interactivo con vista previa en vivo.
      - **Cuentas:** cambio de nombre de usuario con persistencia en el perfil y VFS, cambio de avatar desde archivo y formulario de cambio de contraseña con validación de clave actual y longitud mínima.
    - Soporte para `launchArgs.section` y `launchArgs.setWallpaper`.
  - [x] **Administrador de tareas (`task-manager`):**
    - Permiso declarado: `system:processes`. `singleInstance: true`.
    - Navegación lateral entre páginas "Procesos" y "Rendimiento".
    - **Página de Procesos:**
      - Barra superior con métricas globales: Total de procesos, CPU global (%) y Memoria en uso / total (MB y GB).
      - Tabla ordenable por Nombre, PID, CPU % y Memoria MB.
      - Selección de proceso y botón "Finalizar tarea":
        - Bloqueo de finalización de procesos críticos del sistema (PID < 1000).
        - Verificación estricta de cambios sin guardar (`isDirty`): si la ventana de la app a cerrar tiene cambios sin guardar, advierte con diálogo modal de pérdida de datos antes de terminar la tarea.
    - **Página de Rendimiento:**
      - Gráficas en tiempo real de los últimos 60 segundos para CPU y Memoria física simulada.
      - Dibujadas en lienzo HTML5 Canvas puro (sin librerías externas), con cuadrícula Fluent, trazo estilizado y degradados translúcidos.
      - Indicadores de velocidad de reloj (3.20 GHz), hilos/procesos activos y memoria en uso vs disponible.
  - [x] **Revisión de integración y contratos SDK:**
    - Se expuso la API `network` en `useOS()` para permitir gestión segura de conexiones desde las aplicaciones con permisos.
    - Se amplió `useAccount()` con `updateName`, `updateAvatar` y `changePassword`.
    - Se enriqueció `useProcesses()` con `isDirty` y `terminateByPid` para garantizar el flujo de finalización de procesos con aviso de pérdida de datos.
    - Soporte completo para fondos de pantalla personalizados desde archivo en `Desktop.tsx`.
- **Verificación:**
  - `npm run typecheck`: 0 errores.
  - `npm run lint`: 0 errores, 0 advertencias.
  - `npm run build`: Compilación de producción exitosa (main, preload, renderer).
  - Reactividad confirmada: cambios en Terminal se reflejan en tiempo real en Explorador y Escritorio vía `fs:changed`.
  - Personalización en vivo: cambios en modo de color, acento, transparencia y fondo se reflejan de inmediato en todo el entorno.
- **Desviaciones y contratos modificados:**
  - Se añadieron métodos auxiliares en `windowManager` (`closeByInstanceId`, `isInstanceDirty`) y en `useAccount` / `useProcesses` para dar soporte al cierre de tareas con comprobación de estado sucio (`isDirty`) requerido en la Sección 4.9.

---

## Correcciones obligatorias de las Fases 1, 2 y 3

- **Estado:** Completada con éxito y verificado
- **Fecha:** 2026-10-26
- **Detalle de correcciones aplicadas:**
  - [x] **1. Pantalla de bloqueo e Inicio de sesión superpuestos (`shell/login/LockAndLoginScreen.tsx`):**
    - Se separaron de forma estricta los dos estados visuales del flujo (`cover` vs `credentials`).
    - Estado `cover` (bloqueo): cortina al 100% de la pantalla con fondo opaco `aurora.svg`, hora y fecha grandes en la zona superior, e íconos de red Wi-Fi y batería en la esquina inferior derecha. Los elementos del formulario de credenciales y el botón de energía quedan completamente ocultos y deshabilitados (`pointerEvents: 'none'`).
    - Transición a `credentials`: al hacer clic o pulsar cualquier tecla, la cortina se desliza hacia arriba (`transform: translateY(-100%)`, `opacity: 0`, transición fluida de 240ms cubic-bezier), ocultando también sus indicadores inferiores. Aparece la vista de inicio de sesión con fondo acrílico desenfocado, avatar, nombre de usuario, botón de energía abajo a la derecha y autoenfoque inmediato en el input de contraseña mediante `inputRef.current?.focus()`.
  - [x] **2. Crash en blanco en Explorador de archivos (`apps/files`, `@os/ui/FileBrowser`, `shell/window-frame`):**
    - **Aislamiento por ventana:** Se implementó `WindowErrorBoundary` en `src/renderer/src/os/shell/window-frame/WindowErrorBoundary.tsx` envolviendo el `<Suspense>` de cada ventana dentro de `WindowFrame.tsx`. Ante excepciones de renderizado de cualquier app, se presenta una tarjeta de error aislada con opciones [Reintentar] y [Cerrar ventana], impidiendo que caiga el escritorio o la ventana completa de Electron.
    - **Rutas dinámicas en FileBrowser:** Se corrigieron las rutas fijas que causaban fallos en `FileBrowser.tsx`, sustituyendo `/Usuario/Escritorio` y `/.Papelera` por llamadas dinámicas a `kernelFs.getHomeDir() + '/Escritorio'` y `kernelFs.listTrash()`.
    - **Validación de arranque en `apps/files`:** Se validó `launchArgs.filePath` con `os.fs.fromDisplayPath`, manejando estados undefined con fallback seguro a `~`.
    - **Estabilización en `@os/sdk`:** Se estabilizaron los hooks `useFsWatch`, `useOpenFileHandler` y `useUnsavedChanges` utilizando `useRef` para funciones controladoras y normalización previa de rutas, eliminando dependencias inestables que provocaban bucles infinitos de renderizado.
  - [x] **3. Terminal: cwd, comandos encadenados, redirección `>` y autocompletado Tab (`apps/terminal`, `kernel/fs`, `shell/desktop`):**
    - **Directorio de trabajo (`cwd`):** La Terminal mantiene `cwd` interno POSIX iniciando en el home del usuario (`/Usuarios/<nombre>`).
    - **Resolución relativa:** Función `resolveCwdPath(cwd, input)` para resolver rutas relativas (`MiProyecto`, `saludo.txt`, `../`) antes de operar en el VFS.
    - **Encadenamiento secuencial:** Implementada la función `splitChainedCommands` para soportar `&&` y `;`, acumulando el directorio de trabajo durante el lote para que comandos como `mkdir MiProyecto && cd MiProyecto` cambien el directorio y actualicen el prompt a `PS C:\Usuarios\<nombre>\MiProyecto>`.
    - **Redirección `echo` y sincronización con Escritorio:** Limpieza automática de comillas envolventes (`"..."` o `'...'`) en `echo`, resolución de ruta del archivo, escritura con `fs.writeFile` y emisión inmediata de `fs:changed`. En `Desktop.tsx`, se configuró `useFsWatch` sobre `~/Escritorio` (ruta expandida dinámicamente) para reflejar archivos creados desde la consola al instante sin recargar.
    - **Autocompletado con Tab:** Interceptación con `e.preventDefault()`, resolución de prefijos simples y con subrutas (ej. `Escritorio/sal`), consulta a `fs.list`, compleción automática del nombre (con `\` al final si es directorio) y cálculo de prefijo común o impresión de sugerencias.
  - [x] **4. Widgets del escritorio: reactividad en vivo y posicionamiento sin solapamiento (`shell/widgets-host`, `shell/desktop`):**
    - **Reactividad:** Suscripción reactiva directa a `settings.subscribe('desktop.widgets', ...)` en `WidgetsHost.tsx`, garantizando que al añadir, mover, redimensionar o eliminar widgets se actualice el DOM de inmediato sin requerir recarga ni reautenticación.
    - **Posicionamiento inteligente:** Algoritmo `findFreePosition` en `Desktop.tsx` con escaneo de retícula (margen de 20px) y verificación de colisiones entre cajas delimitadoras (bounding boxes), asegurando que los nuevos widgets se ubiquen en espacios libres sin solaparse.

---

## Fase 4 — Apps de productividad

- **Estado:** Completada con éxito
- **Fecha:** 2026-10-26
- **Objetivo:** Implementar las 6 aplicaciones de productividad (`text-editor`, `calculator`, `calendar`, `clock`, `notes`, `contacts`) sobre `@os/sdk` y `@os/ui`, respetando estrictamente la paleta turquesa (#0D9488), cero degradados en bloques grandes y la regla `no-restricted-imports`.
- **Detalle de tareas realizadas:**
  - [x] **Bloc de notas (`apps/text-editor`):**
    - Apertura, guardado (`os.fs.writeFile`), guardado como (`os.dialogs.saveFile`) y creación de nuevos documentos con soporte para `.txt` y `.md`.
    - Apertura automática de archivo desde `launchArgs.filePath` e implementación de `useOpenFileHandler`.
    - Título dinámico en la ventana: `<nombre> - Bloc de notas` anteponiendo un asterisco (`*<nombre> - Bloc de notas`) cuando hay cambios pendientes (`isDirty: true`).
    - Conexión obligatoria con `useUnsavedChanges({ isDirty, documentName, save: handleSave })` para controlar el cierre por aspa, barra de tareas o apagado del sistema.
    - Barra de menús (`useAppMenus`):
      - *Archivo:* Nuevo (Ctrl+N), Abrir… (Ctrl+O), Guardar (Ctrl+S), Guardar como… (Ctrl+Mayús+S), Cerrar.
      - *Editar:* Buscar… (Ctrl+F).
      - *Ver:* Acercar (Ctrl++), Alejar (Ctrl+-), Restaurar zoom (Ctrl+0), Ajuste de línea.
    - Barra de búsqueda integrable (Ctrl+F) con conteo de coincidencias, botones siguiente/anterior y resaltado en texto.
    - Barra de estado inferior con: Línea X, columna Y, recuento total de caracteres, nivel de zoom y estado de ajuste de línea.
    - Atajos de teclado acotados a la ventana cuando tiene el foco.
  - [x] **Calculadora (`apps/calculator`):**
    - Manifiesto con `resizable: false` y tamaño compacto (340×500 px).
    - Modo estándar completo: suma, resta, multiplicación, división, porcentaje (%), cambio de signo (+/-), raíz cuadrada (√x), cuadrado (x²), inverso (1/x), CE, C y borrado de último dígito (⌫).
    - Manejo seguro de división entre cero mostrando "No se puede dividir entre cero".
    - Soporte completo para entrada por teclado numérico y operadores físicos al estar enfocada.
    - Panel lateral plegable de historial de operaciones de la sesión con recuperación de resultados mediante clic.
    - Cero uso de `eval` o `new Function` (evaluador aritmético determinista).
  - [x] **Calendario (`apps/calendar`):**
    - Vistas de Mes (cuadrícula mensual con indicadores de eventos por día) y de Día (agenda horaria por intervalos de 1 hora y lista de eventos), con botón de navegación rápida "Hoy".
    - Creación, edición y eliminación de eventos con título, fecha (`YYYY-MM-DD`), hora de inicio (`HH:mm`), hora de fin (`HH:mm`), nota y recordatorio (`none`, `0`, `5`, `15`, `30`, `60` minutos).
    - Integración con `os.scheduler.schedule` para programar recordatorios en segundo plano con sonido y notificación, y cancelación con `os.scheduler.cancel` al eliminar o desactivar avisos.
    - Autoguardado automático en storage (`appData` de `calendar`, clave `events`) sin marcar `isDirty`.
    - Emisión del evento `calendar:events-changed` para actualización reactiva en vivo del widget de Calendario en el escritorio.
  - [x] **Reloj (`apps/clock`):**
    - Navegación por pestañas: Reloj mundial, Alarmas, Temporizador y Cronómetro.
    - *Reloj mundial:* hora local y lista de ciudades por zona horaria IANA con cálculo de diferencia horaria respecto a la local; adición y eliminación persistidas en storage.
    - *Alarmas:* creación, edición y eliminación de alarmas con hora (`HH:mm`), etiqueta, repetición (`none`, `daily`, `weekdays`) e interruptor activar/desactivar. Registradas en `os.scheduler` con sonido de alarma para sonar aun con la app cerrada.
    - *Temporizador:* configuración de horas, minutos y segundos, inicio, pausa y reinicio con indicador circular de progreso y registro en `os.scheduler` para disparar sonido y notificación al finalizar.
    - *Cronómetro:* contador con centésimas de segundo, iniciar/pausar, registro de vueltas con tabla (vuelta, tiempo parcial, tiempo total) y reinicio.
    - Control de audio con `useSystemVolume()`.
  - [x] **Notas (`apps/notes`):**
    - Panel izquierdo con búsqueda en tiempo real y lista de notas agrupadas (sección "Fijadas" y resto ordenadas por fecha de modificación).
    - Creación, fijación/desfijación y eliminación con diálogo de confirmación destructivo (`os.dialogs.confirm`).
    - Editor a la derecha con autoguardado en storage (nunca marca `isDirty`).
    - Título generado automáticamente a partir de la primera línea no vacía (o "Nota sin título").
    - Componente `EmptyState` cuando no hay notas creadas o ninguna coincide con la búsqueda.
  - [x] **Contactos (`apps/contacts`):**
    - Lista alfabética agrupada por inicial (A-Z) con búsqueda en tiempo real por nombre, teléfono o correo.
    - Vista de detalle y formulario de creación/edición con: nombre, apellido, teléfonos múltiples con etiqueta (Móvil, Casa, Trabajo), correos, dirección, fecha de cumpleaños, notas y foto seleccionable desde el VFS (`os.dialogs.openFile` filtrando imágenes y mostrada con `fs.getObjectUrl`).
    - Autoguardado en storage (nunca marca `isDirty`) y eliminación con confirmación destructiva.
    - Componente `EmptyState` para listas vacías.
  - [x] **Actualización de Widget Calendario (`widgets/calendar`):**
    - Actualizado para leer los eventos compartidos de `calendar` vía `os.storage.get('events')`.
    - Suscrito al evento `calendar:events-changed` para actualizar los puntos indicadores de eventos en el mes sin recargar el escritorio.

### Esquema de datos del Calendario (compartido entre app y widget)

Ubicación en Dexie: tabla `appData`, registro con `appId: "calendar"` y `key: "events"`.

```json
[
  {
    "id": "event-1730000000000-abcd",
    "title": "Reunión de avance de proyecto",
    "date": "2026-10-26",
    "startTime": "09:00",
    "endTime": "10:30",
    "note": "Revisión de entregables de Fase 4",
    "reminder": "15",
    "schedulerJobId": "sched-1730000000000-xyz"
  }
]
```

Campos:
- `id` (`string`): Identificador único del evento.
- `title` (`string`): Título o asunto del evento.
- `date` (`string`): Fecha en formato ISO local `YYYY-MM-DD`.
- `startTime` (`string`): Hora de inicio en formato `HH:mm`.
- `endTime` (`string`): Hora de fin en formato `HH:mm`.
- `note` (`string`, opcional): Descripción o notas adicionales.
- `reminder` (`string`, opcional): Minutos previos para el recordatorio (`"none"`, `"0"`, `"5"`, `"15"`, `"30"`, `"60"`).
- `schedulerJobId` (`string`, opcional): ID de la tarea programada en `kernel/scheduler` (para cancelarla o reprogramarla).

- **Verificación global de la Fase 4:**
  - `npm run typecheck`: 0 errores.
  - `npm run lint`: 0 errores, 0 advertencias.
  - `npm run build`: Compilación de producción exitosa en 4.39s.
  - Cumplimiento de contratos de arquitectura: cero imports no permitidos (`no-restricted-imports`).
- **Desviaciones y contratos modificados:**
  - Se agregó el evento `calendar:events-changed` a `EventMap` en `kernel/events/types.ts` y se expuso `events.emit` en `@os/sdk` para sincronizar en tiempo real el widget de escritorio del Calendario con las mutaciones de la aplicación Calendario.

---

## Fase 5 — Apps multimedia

- **Estado:** Completada con éxito
- **Fecha:** 2026-10-26
- **Objetivo:** Implementar las 6 aplicaciones multimedia (`image-viewer`, `music`, `videos`, `paint`, `voice-recorder`, `camera`) sobre `@os/sdk` y `@os/ui`, respetando estrictamente la paleta turquesa (#0D9488), cero degradados en bloques grandes y la regla `no-restricted-imports`.
- **Detalle de tareas realizadas:**
  - [x] **Fotos (`apps/image-viewer`):**
    - Visor completo para formatos `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `bmp`.
    - Ajuste a la ventana, zoom con rueda del ratón y botones (−/+), desplazamiento bidireccional (pan) con arrastre y rotación en pasos de 90° horario/antihorario.
    - Navegación entre imágenes de la misma carpeta mediante botones Anterior y Siguiente o teclado (flechas izquierda/derecha).
    - Acción "Establecer como fondo de pantalla" vía `os.apps.launch('settings', { section: 'personalization', setWallpaper: currentNode.id })`.
    - Diálogo modal de Propiedades mostrando: nombre, resolución nativa, tamaño formateado, tipo MIME, fecha de modificación y ruta visible estilo Windows.
    - Manejo de `launchArgs.filePath` y `useOpenFileHandler`.
  - [x] **Música (`apps/music`):**
    - Manifiesto con `singleInstance: true`, reproductor para `mp3`, `ogg`, `wav`, `flac`, `m4a`.
    - Exploración recursiva de la biblioteca en `~/Música` al abrir la app o pulsar "Actualizar".
    - Cola de reproducción reactiva con orden manual y selección rápida.
    - Controles completos de reproducción: Reproducir/Pausar, Anterior, Siguiente, barra de progreso seekable con arrastre.
    - Modos de reproducción: Aleatorio (shuffle) y Repetir (desactivado, todo, una pista).
    - Control de volumen local escalado por el volumen maestro del sistema vía `useSystemVolume()`.
    - Título y metadatos inferidos del nombre del archivo.
    - Reproducción continua en segundo plano con la ventana minimizada.
  - [x] **Películas y TV (`apps/videos`):**
    - Reproductor para `mp4`, `webm`, `ogg`, `mov` con interfaz completamente personalizada (sin controles nativos del navegador).
    - Barra de controles flotante con auto-ocultación tras 3 segundos de inactividad del cursor y reaparición fluida al moverlo.
    - Barra de progreso seekable con arrastre, contador de tiempo actual y duración total.
    - Botones de salto rápido (−10 s / +10 s) y selector de velocidad de reproducción (0.5x, 1x, 1.25x, 1.5x, 2x).
    - Control de volumen local integrado con `useSystemVolume()` y silenciado instantáneo.
    - Modo pantalla completa dentro de la ventana del simulador.
    - Panel lateral desplegable con la lista de videos hermanos de la misma carpeta y reproducción automática secuencial al finalizar un video.
    - Exploración rápida de videos existentes en `~/Videos` desde el estado vacío.
  - [x] **Paint (`apps/paint`):**
    - Editor gráfico sobre HTML5 Canvas para archivos `.png`.
    - Tamaño del lienzo configurable al crear (800×540 px por defecto) y opción en menú para redimensionar libremente (100 a 3000 px) conservando el dibujo existente.
    - Barra de herramientas estilo cinta simplificada: Pincel, Lápiz, Borrador, Línea, Rectángulo, Elipse, Bote de pintura (relleno por inundación BFS de 4 direcciones), Cuentagotas (eyedropper) y Texto.
    - Paleta de colores predefinidos Fluent (con turquesa #0D9488 como acento) más selector de color nativo del sistema.
    - Selector de grosor de trazo (1, 2, 4, 8, 16 px) y alternador de relleno para figuras geométricas.
    - Historial completo de Deshacer y Rehacer con hasta 35 estados vía `ImageData` (atajos Ctrl+Z y Ctrl+Y).
    - Apertura de imágenes existentes desde VFS, Nuevo, Guardar y Guardar como `.png`.
    - Integración obligatoria con `useUnsavedChanges({ isDirty, documentName, save: handleSave })` y título con asterisco en cambios pendientes.
  - [x] **Grabadora de sonido (`apps/voice-recorder`):**
    - Declaración de permiso `microphone` en manifiesto y captura de audio mediante `os.media.getMicrophone()`.
    - Visualizador de ondas en tiempo real dibujado sobre canvas con Web Audio API (`AudioContext` y `AnalyserNode`).
    - Flujo completo de grabación: Iniciar, Pausar, Reanudar y Detener con `MediaRecorder`.
    - Guardado automático en `~/Música/Grabaciones/` con formato de fecha y hora: `Grabación_YYYY-MM-DD_HH-mm-ss.webm` y notificación emergente con sonido.
    - Pestaña de lista de grabaciones con reproductor integrado (play/pause/scrubber), renombrado interactivo y eliminación con diálogo de confirmación destructivo hacia la papelera.
    - Liberación inmediata de tracks de micrófono al detener o cerrar la app para apagar el LED de hardware y el indicador de la bandeja.
  - [x] **Cámara (`apps/camera`):**
    - Declaración de permisos `camera` y `microphone`, `singleInstance: true`.
    - Vista previa de video en vivo (`<video autoPlay playsInline muted />`) desde `os.media.getCamera()`.
    - Selector vertical de modos a la derecha: Foto y Video (con captura simultánea de audio de micrófono).
    - Botón disparador circular Fluent de gran tamaño con respuesta táctil.
    - Sonido `shutter` del sistema y efecto visual de destello blanco en pantalla completa al capturar fotos.
    - Temporizador de cuenta regresiva opcional (desactivado, 3 s, 10 s) con número gigante animado en pantalla.
    - Alternador de efecto espejo (`transform: scaleX(-1)`) aplicado al video y al canvas de captura.
    - Selector de cámara web si existen múltiples dispositivos disponibles (`os.media.listCameras()`).
    - Fotos guardadas como `.png` en `~/Imágenes/Cámara/Foto_YYYY-MM-DD_HH-mm-ss.png` y videos como `.webm` en `~/Videos/Cámara/Video_YYYY-MM-DD_HH-mm-ss.webm`.
    - Miniatura de la última captura en la esquina inferior derecha con acceso directo a abrir en Fotos o Películas y TV.
    - Mensajes y estado vacío claros si se deniegan permisos o no se detecta cámara web.
    - Detención estricta de todos los tracks en unmount para apagar el LED de hardware de la cámara inmediatamente.

- **Verificación global de la Fase 5:**
  - `npm run typecheck`: 0 errores.
  - `npm run lint`: 0 errores, 0 advertencias.
  - `npm run build`: Compilación de producción exitosa en 4.62s.
  - Cumplimiento de contratos de arquitectura: cero imports no permitidos (`no-restricted-imports`).
- **Desviaciones y contratos modificados:** Ninguna.

---

## Correcciones obligatorias previas a la Fase 6

- **Estado:** Completada con éxito y verificado
- **Fecha:** 2026-10-26
- **Detalle de correcciones aplicadas:**
  - [x] **1. Íconos del escritorio superpuestos con la Papelera y duplicados al arrastrar (`shell/desktop`, `kernel/settings`, `shell/start-menu`):**
    - **Reserva fija de celda para Papelera:** La Papelera de reciclaje (`{ kind: 'system', ref: 'recycle-bin' }`) tiene su celda inicial reservada (0, 0 / 20, 20 px) en la retícula del escritorio.
    - **Asignación sin colisiones a nodos de `~/Escritorio`:** Al combinar `desktop.items` con los nodos del VFS obtenidos mediante `useFsWatch('~/Escritorio')`, los archivos y carpetas que carecen de coordenadas guardadas reciben automáticamente la primera celda libre de la cuadrícula recorriendo columna por columna de arriba hacia abajo, verificando exhaustivamente que nunca se asigne una celda ya ocupada por la papelera, una app u otro archivo.
    - **Arrastre de íconos sin duplicación:** Al arrastrar un elemento existente en el escritorio, se actualizan exclusivamente sus coordenadas `(x, y)` en `desktop.items` ajustadas a la celda libre más cercana. No se duplica el elemento ni se crea un nuevo nodo en `~/Escritorio`.
    - **Soltar sobre la Papelera:** Si el elemento arrastrado a la papelera es un archivo/carpeta (`kind === 'node'`), se envía a `fs.trash(path)` y se limpia su entrada en `desktop.items`. Si es un acceso directo de app (`kind === 'app'`), se ignora el drop y regresa a su celda.
    - **Prevención de duplicados en Menú Inicio:** En `StartMenu.tsx` (`handleAddToDesktop`), antes de insertar `{ kind: 'app', ref: appId }` se comprueba si ya existe en `desktop.items`; si no existe, se le asigna la primera celda libre de la cuadrícula.
  - [x] **2. Doble clic en una carpeta del Escritorio abre la raíz/Inicio en vez de esa carpeta (`shell/desktop` y `apps/files`):**
    - **Lanzamiento con ruta completa en `Desktop.tsx`:** Al hacer doble clic sobre un nodo de tipo carpeta (`node.kind === 'folder'`), se calcula su ruta interna completa (`${kernelFs.getHomeDir()}/Escritorio/${node.name}`) y se invoca `windowManager.open('files', { filePath: fullPath })`. Para la papelera se envía `{ view: 'trash' }`.
    - **Navegación directa en `apps/files`:** Al montar la app o recibir un archivo/carpeta vía `launchArgs` o `useOpenFileHandler`, se verifica si la ruta objetivo es una carpeta con `os.fs.stat(resolved).kind === 'folder'`. De ser así, se inicializa el estado `currentPath` e historial directamente en esa carpeta sin recortar el segmento final ni sobrescribirlo con `~` o Inicio.
  - [x] **3. Widgets bloqueados: no se pueden mover, se apilan encima de otros y no se pueden borrar (`shell/widgets-host` y `shell/desktop`):**
    - **Jerarquía de capas y pointer-events:** Se desacoplaron las capas del escritorio:
      - *Capa 1:* Fondo y captura de clics vacíos / rectángulo de selección marquesina.
      - *Capa 2 (WidgetsHost):* `position: absolute; inset: 0; pointer-events: none;`, con `pointer-events: auto;` en cada tarjeta individual de widget.
      - *Capa 3 (Íconos del escritorio):* `position: absolute; inset: 0; pointer-events: none;`, con `pointer-events: auto;` en cada celda de ícono.
      - De este modo, los eventos de ratón sobre los widgets se procesan directamente sin ser interceptados por la capa de íconos ni por el rectángulo de selección.
    - **Arrastre fluido de widgets:** Eventos `onPointerDown` / `onPointerMove` / `onPointerUp` implementados en la tarjeta del widget, ignorando automáticamente el arrastre cuando el cursor interactúa con `<input>`, `<textarea>`, `<button>` o el botón de menú "…". Al soltar, las coordenadas se ajustan dentro del área útil del escritorio y se guardan en `settings.set('desktop.widgets', ...)`.
    - **Menú "…" funcional:** Botón visible al hacer hover en la esquina superior derecha del widget con `z-index` superior. Opciones funcionales:
      - *Cambiar tamaño:* Pequeño (160×160), Mediano (340×160), Grande (340×340).
      - *Quitar:* Elimina inmediatamente la instancia del widget de `desktop.widgets`.
    - **Desapilado automático de colisiones (`resolveWidgetCollisions`):** Algoritmo que detecta colisiones entre cajas delimitadoras (márgenes de 16 px) al cargar la configuración o añadir widgets. Si dos o más widgets están en las mismas coordenadas o se solapan (incluso los preexistentes en IndexedDB), se reubican a la siguiente posición libre y se persiste el arreglo saneado en `desktop.widgets`.
  - [x] **4. Transición demasiado rápida entre Pantalla de bloqueo e Inicio de sesión (`shell/login`):**
    - En `LockAndLoginScreen.tsx`, el deslizamiento hacia arriba de la cortina de bloqueo se ajustó a 600 ms con curva de desaceleración suave estilo Fluent (`cubic-bezier(0.22, 1, 0.36, 1)`).
    - El desenfoque de fondo acrílico (`backdrop-filter: blur(24px)`) y la entrada de la tarjeta de credenciales (`opacity: 0 -> 1` y `translateY(16px -> 0)`) se animan acompasadamente en 450 ms con un retardo de 100 ms para una transición elegante y pausada.

---

## Fase 6 — Ayuda, Personalización y Pulido final

- **Estado:** Completada con éxito y verificado
- **Fecha:** 2026-10-26
- **Objetivo:** Implementar la aplicación de Ayuda oficial (`apps/help`), redactar la guía exhaustiva de personalización (`CUSTOMIZACION.md`), ejecutar la auditoría de consistencia de todo el sistema y realizar el cierre del proyecto con 0 errores y 0 advertencias.
- **Detalle de tareas realizadas:**
  - [x] **1. App de Ayuda (`apps/help`, `singleInstance: true`):**
    - **Portada dinámica:** Muestra el nombre oficial del sistema operativo leído dinámicamente de la configuración (`os.system.name` / `os.config.json`), logotipo vectorial animado y descripción de la plataforma.
    - **Sección "Primeros pasos":** Guía estructurada e interactiva explicando con detalle:
      - *Escritorio y widgets:* Organización de accesos directos, selección múltiple y widgets dinámicos.
      - *Barra de tareas y bandeja:* Gestión de ventanas abiertas, anclaje y controles de volumen/red.
      - *Menú Inicio:* Búsqueda en tiempo real y vista alfabética A-Z.
      - *Ventanas Fluent:* Material Mica, controles de título y menú contextual "Acerca de".
      - *Sistema de archivos virtual:* Rutas estilo Windows (`C:\Usuarios\...`) y operaciones VFS.
      - *Papelera de reciclaje:* Eliminación segura, restauración y vaciado permanente con sonido.
    - **Catálogo dinámico de las 17 aplicaciones:** Generado en tiempo real desde el registro (`os.apps.listDetails()`), mostrando para cada app su `AppIcon`, portada (`cover.png` si existe), nombre, descripción, versión, autor, categoría y el contenido renderizado de su archivo `meta/help.md`.
    - **Parser propio de Markdown seguro:** Implementado desde cero sin librerías externas ni `dangerouslySetInnerHTML`:
      - Encabezados `#`, `##`, `###`.
      - Párrafos de texto continuo.
      - Listas con viñetas (`-`, `*`) y listas numeradas (`1.`).
      - Formato en línea: Negrita (`**texto**`), Cursiva (`*texto*`) y Código en línea (`` `código` ``).
    - **Buscador en tiempo real:** Filtra simultáneamente los temas de "Primeros pasos" y las 17 secciones de aplicaciones por nombre, descripción, categoría o contenido de su manual `help.md`.
    - **Archivos `meta/help.md` completos para las 17 aplicaciones:**
      - Redactados en español detallado, claro y profesional: `files`, `text-editor`, `terminal`, `settings`, `calculator`, `task-manager`, `calendar`, `clock`, `notes`, `contacts`, `image-viewer`, `music`, `videos`, `paint`, `voice-recorder`, `camera` y `help`.
  - [x] **2. Guía de personalización (`CUSTOMIZACION.md` en la raíz del proyecto):**
    - Redacción exhaustiva y pedagógica explicando:
      - Modificación de metadatos de aplicaciones en `src/renderer/src/apps/<id>/meta/` (`manifest.json`, `icon.svg`, `cover.png`, `theme.css`, `help.md`) sin requerir cambios en código TypeScript.
      - Personalización global del sistema en `src/renderer/src/system/`: nombre y arranque en `os.config.json`, logotipo en `boot/logo.svg`, botón de inicio en `icons/start.svg`, fondos en `wallpapers/`, sonidos en `sounds/`, íconos en `icons/` y tokens en `theme/tokens.css` (respetando la paleta turquesa `#0D9488` principal, azul y verde secundarios, y cero degradados en bloques grandes).
      - Creación de nuevas aplicaciones y widgets duplicando plantillas base, aprovechando el auto-descubrimiento con `import.meta.glob`.
      - Tabla de especificaciones de formatos y tamaños recomendados para íconos, portadas, fondos y audio.
      - Matriz de ciclo de aplicación: cambios en caliente (HMR / recarga) vs recompilación con `npm run build`.
  - [x] **3. Auditoría de consistencia y Pulido final:**
    - **Tokens y componentes `@os/ui`:** Todas las apps y widgets consumen exclusivamente componentes de `@os/ui` y variables de `tokens.css`. No existen colores hexadecimales escritos a mano en componentes ni degradados en bloques grandes.
    - **Manejo de documentos sin guardar (`useUnsavedChanges`):** Bloc de notas (`text-editor`) y Paint (`paint`) implementan `useUnsavedChanges` y `dialogs.saveFile` alertando al usuario antes de cerrar con cambios pendientes. Las aplicaciones con autoguardado en storage (`notes`, `contacts`, `calendar`) nunca marcan `isDirty`.
    - **Nombres dinámicos en la interfaz:** Cero textos fijos escritos a mano con "hebi OS" o nombres de apps en pantallas de error, asistentes o menús; todos se leen dinámicamente de `os.config.json` o de sus respectivos `manifest.json`.
    - **Rutas visibles al usuario en formato Windows:** Ninguna ruta interna POSIX (`/Usuarios/...`) es visible en la interfaz; todas se transforman a formato Windows (`C:\Usuarios\...`) mediante `fs.toDisplayPath`.
    - **Modo claro, modo oscuro y transparencia:** Las 17 aplicaciones y los 4 widgets se visualizan y operan correctamente en modo claro y modo oscuro, con efectos acrílicos/Mica y en modo sólido, respetando sus límites de tamaño mínimo de ventana (`minWidth` × `minHeight`).
    - **Asociaciones de archivo y "Abrir con…":** Todos los formatos de archivo soportados tienen apps registradas. El menú contextual "Abrir con…" lista las aplicaciones compatibles y permite cambiar la aplicación predeterminada para la extensión seleccionada, persistiendo la preferencia en `fileAssociations.defaults`.
    - **Liberación de hardware de medios:** Todos los streams de cámara y micrófono (`kernel/media`) se detienen estrictamente al cerrar o desmontar la ventana de la app, apagando el LED de hardware y el indicador en la bandeja del sistema.
    - **Estados vacíos y localización:** Todas las listas vacías presentan el componente `EmptyState` de `@os/ui` y todos los mensajes de error e informativos están redactados en español claro.

---

## Correcciones post-Fase 6

- **Estado:** Completada con éxito y verificado
- **Fecha:** 2026-10-26
- **Detalle de correcciones aplicadas:**
  - [x] **1. Widgets del escritorio: parpadeo al arrastrar y botones 'Quitar' / 'Cambiar tamaño' (`shell/widgets-host/WidgetsHost.tsx`, `os/ui/ContextMenu.tsx`, `kernel/settings/index.ts`):**
    - **Eliminación del parpadeo (dragState aislado en memoria local):**
      - Prohibida de raíz cualquier escritura asíncrona a `settings.set('desktop.widgets', ...)` durante los eventos de movimiento `pointermove`.
      - Se implementó un estado local `draggingWidget` y ref `draggingRef` (`id`, `startPointerX`, `startPointerY`, `startWidgetX`, `startWidgetY`, `currentX`, `currentY`) que se activa exclusivamente con el botón primario (`e.button === 0`).
      - Desactivadas todas las transiciones CSS de posición (`transition: 'none'`) en la tarjeta del widget mientras se arrastra.
      - En el listener de ventana `pointermove`, se actualizan únicamente `currentX` y `currentY` en el estado local en memoria, delimitadas al área útil de la pantalla (excluyendo la barra de tareas de 48px).
      - En `pointerup` de ventana, se toma la posición final `(currentX, currentY)`, se limpia `draggingWidget = null` y es en ese único instante donde se invoca `settings.set('desktop.widgets', next)`.
      - La función de desapilado `resolveWidgetCollisions` solo se ejecuta una vez al montar si se detectan colisiones preexistentes en IndexedDB, quedando completamente inactiva durante el arrastre y sin alterar posiciones personalizadas del usuario.
    - **Funcionamiento instantáneo de 'Quitar' y 'Cambiar tamaño':**
      - Se añadió `pointerEvents: 'auto'` y `stopPropagation` en `ContextMenu.tsx` (y sus submenús), impidiendo que el contenedor con `pointer-events: none` de `WidgetsHost` bloquee los eventos de ratón sobre los menús contextuales.
      - En `WidgetsHost.tsx`, `handleRemove` y `handleResize` llaman directamente a `kernel/settings`, actualizan de inmediato el estado local y persisten en la base de datos sin requerir permisos de app.
      - En `kernel/settings/index.ts`, `get()` y `set()` realizan clonación profunda inmutable de arreglos y objetos al guardar y emitir `settings:changed`.
  - [x] **2. Espaciado inferior y navegación fluida en Ayuda (`apps/help/src/index.tsx`):**
    - El contenedor de contenido principal del panel derecho cuenta ahora con `minHeight: 0`, `height: '100%'`, `overflowY: 'auto'` y un relleno generoso `padding: '24px 32px 64px 32px'`.
    - Se incorporó un espaciador de cierre de 64 px (`<div style={{ height: '64px', width: '100%' }} />`) garantizando que ningún párrafo, lista o sección quede pegada al borde inferior de la ventana.
    - En `MarkdownRenderer`, se optimizaron los márgenes verticales (`marginTop: 20px–24px`, `marginBottom: 10px–16px`, `lineHeight: 1.6`) entre encabezados, párrafos y listas.
    - Se implementó `contentRef` y un efecto reactivo que restablece el scroll arriba del todo (`scrollTo({ top: 0, behavior: 'smooth' })`) cada vez que el usuario selecciona otra aplicación o tema en el panel lateral.
  - [x] **3. Respiro inferior en vistas desplazables de todo el sistema:**
    - Ajustado el relleno inferior (`paddingBottom: 36px–56px`) y `minHeight: 0` en los contenedores de scroll de Configuración (`apps/settings`), Notas (`apps/notes`), Contactos (`apps/contacts`), Explorador de archivos (`apps/files`), Música (`apps/music`) y Videos (`apps/videos`), eliminando cualquier sensación de saturación en los bordes inferiores.

---

## Fase 7 — Estabilización Integral, Verificación E2E y Cierre de Entrega

- **Estado:** Completada con éxito y verificado
- **Fecha:** 2026-10-26
- **Objetivo:** Asegurar la máxima robustez del sistema, estabilidad de eventos, aislamiento por capas, coherencia visual Fluent y cierre definitivo de hebi OS.
- **Detalle de tareas realizadas:**
  - [x] **Integridad de eventos y ciclo de vida de sesión:**
    - Todas las suscripciones a `settings:changed` y `fs:changed` en `Desktop`, `WidgetsHost`, `Taskbar`, `StartMenu`, `Files`, `Settings` y `@os/sdk` actualizan reactivamente la vista sin bucles infinitos ni re-renders innecesarios.
    - Al cerrar sesión, bloquear pantalla, reiniciar o apagar se desmontan y limpian correctamente los recursos, protegiendo las ventanas con cambios pendientes (`isDirty: true`) a través del diálogo unificado de confirmación.
  - [x] **Identidad visual hebi OS y tokens de diseño:**
    - Se cumple al 100 % la paleta del sistema: turquesa (`#0D9488`) como acento principal, azul (`#0284C7`) y verde (`#16A34A` / `#10B981`) como secundarios.
    - Cero degradados en bloques grandes. Todos los fondos de tarjetas y ventanas utilizan materiales Fluent (Mica y Acrílico) y tokens de `theme/tokens.css`.
  - [x] **Aislamiento arquitectónico estricto (Sección 3):**
    - El shell (`src/renderer/src/os/shell/`) se comunica directamente con `os/kernel`.
    - Las aplicaciones y widgets consumen exclusivamente `@os/sdk` y `@os/ui`, cumpliendo la regla de linter `no-restricted-imports`.
  - [x] **Cero textos estáticos:** Nombre del sistema leído dinámicamente de `os.config.json` y nombres/metadatos de aplicaciones leídos de sus respectivos `manifest.json`.

---

## Verificación final y Cierre del Proyecto

- **`npm run typecheck`:** 0 errores (código de salida 0).
- **`npm run lint`:** 0 errores, 0 advertencias (código de salida 0).
- **`npm run build`:** Compilación exitosa de main, preload y renderer en 4.53s (código de salida 0).

### Matriz de Verificación Definitiva

- [x] Arrastrar cualquier widget en el escritorio es 100 % fluido, sin parpadeos ni saltos a su posición anterior, y conserva su nueva posición al soltarlo y tras reiniciar Electron.
- [x] El botón "…" de cada widget permite Cambiar tamaño (redimensionando la tarjeta al instante) y Quitar (eliminando el widget inmediatamente del escritorio y de desktop.widgets).
- [x] En la app Ayuda, todas las secciones largas hacen scroll con un margen inferior amplio y cómodo (48px–64px) sin que el texto quede pegado al borde inferior, y al cambiar de app el scroll vuelve al inicio.
- [x] Ningún archivo ni acceso directo del escritorio aparece encima de la Papelera de reciclaje, y arrastrar íconos en el escritorio solo los mueve de celda sin duplicarlos.
- [x] Hacer doble clic en cualquier carpeta del escritorio abre el Explorador de archivos directamente dentro de esa carpeta (`C:\Usuarios\<nombre>\Escritorio\<carpeta>`).
- [x] La transición de la Pantalla de bloqueo al Inicio de sesión se desliza hacia arriba con una animación suave y pausada (~600 ms).
- [x] La app Ayuda muestra 'Primeros pasos' y la guía completa de las 17 apps leída de sus `help.md`, con buscador funcional.
- [x] Cambiar el `name`, `icon.svg` o `cover.png` de una app en su carpeta `meta/` actualiza su nombre e imagen en el menú Inicio, barra de tareas, escritorio, barra de título, Administrador de tareas, ventana 'Acerca de', Ayuda y notificaciones sin tocar ningún archivo fuera de `meta/`.
- [x] Guía de personalización `CUSTOMIZACION.md` completa y verificada en la raíz del proyecto.
- [x] Proyecto concluido con éxito y listo para distribución.



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


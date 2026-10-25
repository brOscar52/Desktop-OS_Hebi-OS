# Especificación: simulador de sistema operativo de escritorio (Electron + React)

> **Este documento es la única fuente de verdad del proyecto.** Léelo completo antes de empezar cualquier fase. Las secciones 1 a 6 definen reglas y contratos que todas las fases deben respetar; la sección 7 define las fases.
>
> Si una fase necesita cambiar un contrato:
> 1. Actualiza primero la sección correspondiente de este documento.
> 2. Ajusta **todos** los módulos que usan ese contrato en el mismo paso.
> 3. Registra el cambio en `docs/PROGRESO.md`.

---

## 1. Visión general

Un simulador de sistema operativo de escritorio que corre como aplicación Electron. No es un SO real: no hay kernel, hilos ni planificación de procesos reales. Es un entorno que **se comporta y se ve** como un SO moderno, con sesión de usuario, escritorio, ventanas, sistema de archivos persistente y un conjunto de aplicaciones.

- **Estilo visual:** inspirado en Windows 11, con lenguaje de diseño tipo Fluent e identidad cromática propia en **turquesa (principal), azul y verde (secundarios)**. Incluye:
  - barra de tareas inferior con botón de Inicio y bandeja del sistema;
  - menú Inicio flotante;
  - ventanas con los botones minimizar, maximizar y cerrar a la derecha;
  - esquinas redondeadas;
  - materiales translúcidos tipo Mica/Acrílico (desenfoque y tinte uniforme con `backdrop-filter`);
  - superficies limpias sin degradados en bloques grandes (evitando la estética artificial típica de IA; los degradados solo se aceptan en elementos pequeños como íconos o detalles diminutos);
  - iconografía de línea;
  - animaciones cortas y suaves.
- **Prohibido usar recursos propietarios de Microsoft:** el logotipo de Windows, las fuentes Segoe UI y Segoe Fluent Icons, los fondos de pantalla oficiales y los sonidos de Windows. El botón de Inicio usa un logo propio. Sí se permiten los íconos Fluent UI System Icons, que tienen licencia MIT (ver sección 2).
- **Idioma de la interfaz:** español. Identificadores de código, nombres de archivo y commits en inglés.
- **Nombre del SO:** configurable en `os.config.json` (valor inicial: `"hebi OS"`). Ningún texto de la interfaz debe tener el nombre escrito a mano; siempre se lee de la configuración.
- **Usuario único:** el sistema tiene una sola cuenta de usuario, creada en el primer arranque.

### Alcance aprobado (no agregar funciones fuera de esta lista)

| Área | Incluido |
|---|---|
| Sesión | Pantalla de arranque, asistente de primer arranque, pantalla de bloqueo e inicio de sesión con contraseña, bloquear, cerrar sesión, reiniciar, apagar |
| Shell | Barra de tareas, menú Inicio con todas las apps instaladas, bandeja del sistema, escritorio personalizable (fondo, íconos movibles, widgets), Papelera de reciclaje en el escritorio, menús contextuales, notificaciones emergentes |
| Ventanas | Abrir, cerrar, minimizar, maximizar, arrastrar, redimensionar, foco y apilamiento, diálogos modales |
| Archivos | Árbol virtual, crear, renombrar, duplicar, copiar a, mover a, borrar; papelera con restauración; metadatos; arrastrar y soltar; "Abrir con…"; importar desde el equipo real; persistencia |
| Apps | Explorador de archivos, Bloc de notas (editor de texto), Terminal, Configuración, Calculadora, Administrador de tareas, Calendario, Reloj, Notas, Contactos, Fotos (visor de imágenes), Música, Películas y TV (videos), Paint, Grabadora de sonido, Cámara, Ayuda |
| Configuración | Personalización (modo de color, color de énfasis, fondo), Escritorio y barra de tareas, Sonido, Red e Internet (wifi simulado), Hora y fecha, Cuenta |
| Servicios | Notificaciones, gestor de apps, sonidos del sistema, programador de avisos (alarmas y recordatorios) |
| Seguridad | Contraseña con hash, aislamiento de Electron |

Los nombres de las apps de esta tabla son los valores iniciales de sus manifiestos; se pueden cambiar en cualquier momento (sección 5).

### Fuera de alcance (no implementar)

- Multiusuario, cuenta invitado, suspender o hibernar.
- Centro de notificaciones con historial, ajustes rápidos, búsqueda global, panel de widgets separado.
- Escritorios virtuales, atajos de teclado globales del sistema, snap layouts, Alt+Tab, vista de tareas.
- **Portapapeles propio del sistema.**
- Accesos directos o alias de archivos, permisos de archivos por usuario, unidades externas, cuota de disco.
- Navegador web, editor de código, visor de PDF, correo, captura de pantalla, tienda de apps.
- Internacionalización, accesibilidad avanzada, empaquetado con instaladores, pruebas automatizadas.

**Sobre el portapapeles:** no se implementa un portapapeles del sistema. El copiar y pegar de texto nativo de Chromium dentro de campos de texto debe seguir funcionando y no se bloquea. En el Explorador no existen "Cortar", "Copiar" ni "Pegar"; en su lugar se usan **Duplicar**, **Copiar a…**, **Mover a…** y arrastrar y soltar.

---

## 2. Stack técnico

- **Electron** (versión estable actual) con **electron-vite** (plantilla `react-ts`) como herramienta de compilación.
- **React 18+** y **TypeScript** en modo `strict`.
- **Zustand** para el estado global del renderer.
- **Dexie 4** (sobre IndexedDB) para toda la persistencia.
- **Zod** para validar manifiestos y datos persistidos.
- **@fluentui/react-icons** (Fluent UI System Icons, licencia MIT) para glifos de interfaz: wifi, volumen, flechas, carpetas en barras de comandos, etc. Los íconos de las apps son SVG originales propios.
- **@fontsource/inter** como tipografía, empaquetada localmente. No se cargan fuentes remotas y no se usa Segoe.
- **ESLint** con reglas de importación (ver sección 3.3).
- Scripts obligatorios en `package.json`: `dev`, `build`, `typecheck`, `lint`.

No agregar dependencias fuera de esta lista sin justificarlo en `docs/PROGRESO.md`.

---

## 3. Arquitectura

### 3.1 Estructura de carpetas

```
/
├─ ESPECIFICACION.md              ← este documento
├─ CLAUDE.md                      ← reglas de trabajo (se crea en la Fase 0)
├─ CUSTOMIZACION.md               ← guía de personalización (se crea en la Fase 6)
├─ docs/PROGRESO.md               ← bitácora de fases
├─ electron.vite.config.ts
└─ src/
   ├─ main/                       ← proceso principal de Electron
   │  ├─ index.ts                 ← crea la ventana, aplica seguridad
   │  ├─ security.ts              ← CSP, permisos de cámara/micrófono, bloqueo de navegación
   │  └─ ipc/                     ← un archivo por dominio: files.ts, auth.ts, power.ts
   ├─ preload/
   │  └─ index.ts                 ← expone window.native con contextBridge
   ├─ shared/
   │  └─ native-api.ts            ← tipos del puente, compartidos por main, preload y renderer
   └─ renderer/
      ├─ index.html
      └─ src/
         ├─ main.tsx
         ├─ os/
         │  ├─ kernel/            ← servicios del sistema (sin interfaz)
         │  │  ├─ events/
         │  │  ├─ storage/
         │  │  ├─ fs/
         │  │  ├─ settings/
         │  │  ├─ session/
         │  │  ├─ apps/          ← registro de apps y widgets, lanzador, asociaciones de archivo
         │  │  ├─ windows/
         │  │  ├─ processes/
         │  │  ├─ dialogs/
         │  │  ├─ notifications/
         │  │  ├─ sound/
         │  │  ├─ scheduler/
         │  │  ├─ network/
         │  │  └─ media/
         │  ├─ shell/             ← interfaz del sistema
         │  │  ├─ boot/  setup/  login/  power/
         │  │  ├─ desktop/  taskbar/  start-menu/  tray/
         │  │  ├─ window-frame/  dialogs/  toasts/  context-menu/
         │  │  └─ widgets-host/
         │  ├─ sdk/               ← API pública para apps y widgets (alias @os/sdk)
         │  └─ ui/                ← componentes compartidos (alias @os/ui)
         ├─ apps/
         │  └─ <app-id>/
         │     ├─ meta/           ← TODO lo personalizable de la app
         │     │  ├─ manifest.json
         │     │  ├─ icon.svg
         │     │  ├─ cover.png    ← opcional, imagen de portada
         │     │  ├─ theme.css    ← opcional, variables de estilo propias
         │     │  └─ help.md      ← opcional, texto para la app Ayuda
         │     └─ src/
         │        ├─ index.tsx    ← exporta por defecto el componente raíz
         │        └─ ...
         ├─ widgets/
         │  └─ <widget-id>/
         │     ├─ meta/  (manifest.json, icon.svg, theme.css opcional)
         │     └─ src/index.tsx
         └─ system/               ← personalización global del SO (alias @system)
            ├─ os.config.json
            ├─ theme/tokens.css
            ├─ wallpapers/        ← cada imagen aquí aparece como fondo disponible
            ├─ sounds/            ← sonidos del sistema por nombre fijo
            ├─ icons/             ← íconos del sistema por nombre fijo
            └─ boot/logo.svg      ← logo de arranque y del botón Inicio
```

### 3.2 Capas y dirección de dependencias

```
apps/*, widgets/*  →  @os/sdk, @os/ui  →  os/kernel  →  window.native (preload)  →  main
os/shell           →  os/kernel, @os/ui
```

Reglas estrictas:

1. **Una app nunca importa otra app**, ni widgets, ni `os/kernel`, ni `os/shell`. Solo importa `@os/sdk`, `@os/ui`, React, dependencias permitidas y sus propios archivos.
2. **Un widget** sigue la misma regla que una app.
3. **Solo `os/kernel/storage`** toca Dexie/IndexedDB. Los demás servicios usan `storage`.
4. **Solo `os/kernel`** usa `window.native`. Ni las apps ni el shell llaman al puente directamente.
5. Los servicios del kernel se comunican entre sí por llamadas directas tipadas o por el bus de eventos; nunca a través de la interfaz.
6. El shell no contiene lógica de negocio: lee estado del kernel y llama a sus funciones.

### 3.3 Cumplimiento automático

Configura `no-restricted-imports` en ESLint para que `src/renderer/src/apps/**` y `src/renderer/src/widgets/**` fallen al importar cualquier ruta fuera de:

- `@os/sdk` y `@os/ui`;
- `react` y las dependencias permitidas;
- su propia carpeta.

`npm run lint` debe fallar si se rompe la sección 3.2.

### 3.4 Seguridad de Electron

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Content Security Policy:
  `default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob: mediastream:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'`
  En desarrollo, añadir solo lo que exija el servidor de Vite.
- Bloquear toda navegación (`will-navigate`) y apertura de ventanas (`setWindowOpenHandler` → `deny`).
- Permisos: `setPermissionRequestHandler` y `setPermissionCheckHandler` conceden **solo** `media` (cámara y micrófono) y **solo** al origen propio de la app. Todo lo demás se deniega. En macOS, pedir acceso con `systemPreferences.askForMediaAccess`.
- Ventana de Electron:
  - marco nativo;
  - tamaño inicial 1440×900 y mínimo 1024×700;
  - barra de menú nativa oculta;
  - pantalla completa al iniciar según `os.config.json`.

---

## 4. Contratos

Todo lo de esta sección es obligatorio y compartido. Los nombres de funciones, campos y eventos deben coincidir exactamente.

### 4.1 Puente nativo (`window.native`)

Definido en `src/shared/native-api.ts`, implementado en `preload` y `main/ipc`.

```ts
interface NativeApi {
  files: {
    /** Abre el diálogo nativo del equipo real y devuelve los archivos elegidos. */
    importFromHost(options?: { multiple?: boolean; filters?: { name: string; extensions: string[] }[] })
      : Promise<{ name: string; mime: string; data: ArrayBuffer; lastModified: number }[]>;
  };
  auth: {
    hashPassword(password: string): Promise<{ hash: string; salt: string }>;   // crypto.scrypt en main
    verifyPassword(password: string, hash: string, salt: string): Promise<boolean>;
  };
  power: {
    quit(): void;              // cierra Electron (usado por "Apagar")
    toggleFullscreen(): void;
  };
  platform: { os: 'linux' | 'darwin' | 'win32' };
}
```

No se expone ninguna otra función del sistema real.

### 4.2 Base de datos (Dexie)

Nombre de la base: `simos`. Tablas:

| Tabla | Clave | Campos |
|---|---|---|
| `meta` | `key` | `value` (versión de esquema, `setupCompleted`) |
| `user` | `id` | `name`, `avatar` (`{ type: 'builtin', id }` o `{ type: 'file', nodeId }`), `passwordHash`, `salt`, `createdAt` |
| `nodes` | `id` | `parentId`, `name`, `kind` (`'file'` o `'folder'`), `mime`, `size`, `createdAt`, `modifiedAt`, `blobId`, `system` (bool, carpetas protegidas), `trash` (`{ originalParentId, trashedAt }` o `null`). Índice único compuesto `[parentId+name]` |
| `blobs` | `id` | `data` (`Blob`) |
| `settings` | `key` | `value` |
| `appData` | `[appId+key]` | `appId`, `key`, `value` |
| `scheduled` | `id` | `appId`, `fireAt`, `title`, `body`, `sound`, `repeat` (`'none'`, `'daily'` o `'weekdays'`), `payload` |

Cualquier cambio de esquema incrementa la versión de Dexie con su migración.

### 4.3 Sistema de archivos virtual (`kernel/fs`)

**Árbol inicial** (creado por el asistente de primer arranque):

```
/
├─ .Papelera/                      (oculta, sistema)
└─ Usuarios/<nombre>/              (= "~", carpeta de inicio)
   ├─ Escritorio/  Documentos/  Descargas/
   ├─ Imágenes/   (con subcarpeta Cámara/)
   ├─ Música/     (con subcarpeta Grabaciones/)
   └─ Videos/     (con subcarpeta Cámara/)
```

- Las carpetas del árbol inicial tienen `system: true`: no se pueden renombrar, mover ni borrar.
- Se siembra un archivo `~/Documentos/Bienvenida.txt`.

**Reglas de nombres y rutas internas:**

- Las rutas internas son absolutas, estilo POSIX, separadas por `/`.
- `~` se expande a la carpeta de inicio.
- Los nombres distinguen mayúsculas y minúsculas.
- Prohibidos: `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`, el nombre vacío, `.` y `..`. Son los caracteres que Windows tampoco permite.
- Si un nombre ya existe en el destino al duplicar, copiar o mover, se agrega un sufijo (`informe (2).txt`). Al crear o renombrar a mano, se muestra un error.

**Representación visible (estilo Windows):** toda la interfaz muestra las rutas como Windows. `/Usuarios/Eduardo/Documentos` se ve como `C:\Usuarios\Eduardo\Documentos`; la raíz se llama "Disco local (C:)" y `/.Papelera` se llama "Papelera de reciclaje". Solo dos funciones conocen ese formato:

- `toDisplayPath(path)` convierte una ruta interna a la forma visible;
- `fromDisplayPath(text)` acepta `C:\…`, `\`, `/` y `~` y devuelve la ruta interna.

Ningún otro módulo convierte rutas por su cuenta.

**API:**

```ts
interface FsApi {
  stat(path: string): Promise<FsNode>;
  list(path: string): Promise<FsNode[]>;            // excluye nodos en papelera y ocultos (nombre con '.')
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<Blob>;
  readText(path: string): Promise<string>;
  writeFile(path: string, data: Blob | string, opts?: { overwrite?: boolean; mime?: string }): Promise<FsNode>;
  mkdir(path: string, opts?: { recursive?: boolean }): Promise<FsNode>;
  rename(path: string, newName: string): Promise<FsNode>;
  move(path: string, destDir: string): Promise<FsNode>;
  copy(path: string, destDir: string): Promise<FsNode>;   // recursivo para carpetas
  duplicate(path: string): Promise<FsNode>;
  trash(path: string): Promise<void>;
  listTrash(): Promise<FsNode[]>;
  restore(nodeId: string): Promise<FsNode>;          // si el padre original ya no existe, restaura en "~"
  deletePermanently(nodeId: string): Promise<void>;
  emptyTrash(): Promise<void>;
  importFromHost(destDir: string, opts?: { multiple?: boolean }): Promise<FsNode[]>;
  getObjectUrl(path: string): Promise<{ url: string; revoke(): void }>;
  pathOf(nodeId: string): Promise<string>;
  usage(): Promise<{ bytes: number; files: number }>;
  toDisplayPath(path: string): string;
  fromDisplayPath(text: string): string;
}
```

- El tipo MIME se deduce por extensión con una tabla única en `kernel/fs/mime.ts`.
- Cada operación que modifica algo emite `fs:changed`.

### 4.4 Bus de eventos (`kernel/events`)

Mapa tipado en `kernel/events/types.ts`. Eventos iniciales:

| Evento | Datos |
|---|---|
| `fs:changed` | `{ kind: 'create' \| 'update' \| 'delete' \| 'move' \| 'trash' \| 'restore', nodeId, parentId, oldParentId? }` |
| `settings:changed` | `{ key, value }` |
| `session:locked`, `session:unlocked`, `session:logout` | `{}` |
| `power:restart`, `power:shutdown` | `{}` |
| `app:launched`, `app:terminated` | `{ appId, instanceId }` |
| `window:opened`, `window:closed`, `window:focused` | `{ windowId, appId }` |
| `notification:posted` | `{ id, appId }` |
| `media:active` | `{ camera: boolean, microphone: boolean }` |
| `scheduler:fired` | `{ jobId, appId }` |

Los eventos nuevos se agregan solo en ese archivo y en esta tabla.

### 4.5 Configuración (`kernel/settings`)

Claves válidas, tipadas y con valor por defecto, en un único archivo `kernel/settings/schema.ts`:

```
appearance.theme          'light' | 'dark' | 'auto'
appearance.accent         string (hex)
appearance.transparency   boolean   (activa o desactiva Mica/Acrílico)
appearance.wallpaper      { type: 'builtin', id } | { type: 'file', nodeId }
desktop.items             { id, kind: 'app' | 'node' | 'system', ref, x, y }[]
desktop.iconSize          'small' | 'medium' | 'large'
desktop.widgets           { id, widgetId, size, x, y }[]
taskbar.pinned            string[]   (appIds en orden)
taskbar.alignment         'center' | 'left'
start.pinned              string[]   (appIds en orden)
sound.volume              number 0–100
sound.muted               boolean
sound.systemSounds        boolean
network.wifiEnabled       boolean
network.connectedSsid     string | null
network.knownNetworks     { ssid, password }[]
datetime.timezone         string (IANA)
datetime.hour24           boolean
fileAssociations.defaults Record<extension, appId>
```

- La API es `get`, `set` y `subscribe`. Cada `set` emite `settings:changed`.
- Los valores por defecto iniciales (tema, acento, fondo) se leen de `os.config.json`.
- `desktop.items` siempre contiene el elemento fijo `{ kind: 'system', ref: 'recycle-bin' }`: se puede mover, pero no quitar.

### 4.6 Manifiesto de app (`apps/<id>/meta/manifest.json`)

```json
{
  "id": "text-editor",
  "name": "Bloc de notas",
  "description": "Crea y edita documentos de texto plano y Markdown.",
  "version": "1.0.0",
  "author": "",
  "icon": "icon.svg",
  "cover": "cover.png",
  "category": "productividad",
  "startMenu": { "visible": true, "pinnedByDefault": true, "order": 20 },
  "taskbar": { "pinnedByDefault": true },
  "window": {
    "width": 760, "height": 520,
    "minWidth": 380, "minHeight": 260,
    "resizable": true,
    "singleInstance": false
  },
  "fileAssociations": [
    { "extensions": ["txt", "md"], "role": "editor", "priority": 10 }
  ],
  "permissions": []
}
```

Campos:

- `id`: igual al nombre de la carpeta, en kebab-case. Es la identidad permanente; `name` se puede cambiar libremente.
- `icon`, `cover`: nombres de archivo dentro de `meta/`. `cover` es opcional.
- `category`: `sistema`, `productividad`, `multimedia` o `utilidades`.
- `startMenu.order`: orden dentro de "Anclado" en el menú Inicio. La lista "Todas las aplicaciones" siempre es alfabética.
- `fileAssociations[].role`: `editor` o `viewer`. Gana la `priority` más alta como app predeterminada si el usuario no eligió otra.
- `permissions`: subconjunto de `camera`, `microphone`, `settings:write`, `system:processes` y `system:account`.

**Validación.** El esquema Zod vive en `kernel/apps/manifest.schema.ts`. Un manifiesto inválido hace que la app se omita, con un error en consola que indique qué campo falla.

**Descubrimiento automático.** El registro usa `import.meta.glob` sobre:

- `apps/*/meta/manifest.json`;
- `apps/*/meta/*.{svg,png,jpg,webp}`, cargados como URL;
- `apps/*/meta/theme.css`;
- `apps/*/meta/help.md`, cargado como texto;
- `apps/*/src/index.tsx`, con carga diferida mediante `React.lazy`.

**Agregar una carpeta de app es suficiente para que exista en el sistema.** No hay listas de apps escritas a mano en ningún otro lugar.

**Estilos por app.** `theme.css` solo puede definir variables CSS bajo el selector `[data-app-id="<id>"]`. El marco de ventana pone ese atributo en el contenedor de la app.

### 4.7 Manifiesto de widget (`widgets/<id>/meta/manifest.json`)

```json
{
  "id": "clock",
  "name": "Reloj",
  "description": "Hora y fecha actuales.",
  "icon": "icon.svg",
  "sizes": ["small", "medium"],
  "defaultSize": "small",
  "ownerApp": null
}
```

- `ownerApp`: si tiene un appId, el widget lee y escribe en el `appData` de esa app. Así el widget de calendario ve los eventos de la app Calendario.
- Tamaños: `small` 160×160, `medium` 340×160, `large` 340×340.

### 4.8 SDK para apps (`@os/sdk`)

```ts
function useOS(): {
  app: { id: string; manifest: AppManifest; instanceId: string };
  fs: FsApi;
  window: {
    setTitle(title: string): void;
    close(): Promise<void>;          // respeta cambios sin guardar
    focus(): void;
  };
  dialogs: DialogsApi;               // ver 4.9
  notify(n: { title: string; body?: string; sound?: boolean; launchArgs?: LaunchArgs }): void;
  storage: {                         // appData con espacio de nombres de esta app
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    list<T>(prefix?: string): Promise<{ key: string; value: T }[]>;
  };
  settings: {                        // lectura para todas; escritura solo con 'settings:write'
    get<K extends SettingKey>(key: K): SettingValue<K>;
    set<K extends SettingKey>(key: K, value: SettingValue<K>): Promise<void>;
  };
  sound: { playSystem(name: SystemSound): void };
  apps: {
    launch(appId: string, args?: LaunchArgs): void;
    openFile(path: string, appId?: string): void;     // sin appId usa la predeterminada
    getAppsForFile(path: string): AppManifest[];
    list(): AppManifest[];
  };
  scheduler: {
    schedule(job: Omit<ScheduledJob, 'id' | 'appId'>): Promise<string>;
    cancel(id: string): Promise<void>;
    list(): Promise<ScheduledJob[]>;
  };
  media: {                           // exige 'camera' o 'microphone' en el manifiesto
    getCamera(constraints?: MediaTrackConstraints): Promise<MediaStream>;
    getMicrophone(): Promise<MediaStream>;
    listCameras(): Promise<MediaDeviceInfo[]>;
  };
  events: { on<E extends EventName>(e: E, h: (d: EventData<E>) => void): () => void };
};

type LaunchArgs = { filePath?: string; [key: string]: unknown };

// Hooks
function useLaunchArgs(): LaunchArgs;
function useOpenFileHandler(handler: (path: string) => void): void;   // apps singleInstance reciben archivos nuevos aquí
function useSetting<K extends SettingKey>(key: K): SettingValue<K>;
function useSystemVolume(): number;                                    // 0–1, ya considera "silenciado"
function useFsWatch(path: string): FsNode[];                           // lista reactiva de una carpeta
function useAppMenus(menus: AppMenu[]): void;                          // barra de menús dentro de la ventana
function useUnsavedChanges(opts: {
  isDirty: boolean;
  documentName: string;
  save: () => Promise<boolean>;      // true si guardó; false si el usuario canceló (p. ej. en "Guardar como")
}): void;

// Servicios restringidos, solo con permiso en el manifiesto
function useProcesses(): ProcessesApi;   // 'system:processes'
function useAccount(): AccountApi;       // 'system:account'
```

Llamar a una función restringida sin el permiso lanza un error explícito con el nombre del permiso faltante.

**Menús de app.** Como en Windows, los menús viven dentro de la ventana:

- `useAppMenus` dibuja una barra de menús (Archivo, Editar, Ver…) justo debajo de la barra de título. El sistema añade siempre el menú **Ayuda › Acerca de &lt;App&gt;** al final.
- Una app que no llama a `useAppMenus` no tiene barra de menús.
- En todas las apps, el clic en el ícono de la barra de título o el clic derecho sobre ella abre el **menú de ventana**: Restaurar, Minimizar, Maximizar, Acerca de &lt;App&gt; y Cerrar.

### 4.9 Diálogos y cambios sin guardar

```ts
interface DialogsApi {
  alert(o: { title: string; message?: string }): Promise<void>;
  confirm(o: { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean }): Promise<boolean>;
  prompt(o: { title: string; message?: string; defaultValue?: string; validate?: (v: string) => string | null }): Promise<string | null>;
  choose<T extends string>(o: { title: string; message?: string; options: { value: T; label: string; destructive?: boolean }[] }): Promise<T | null>;
  openFile(o?: { startPath?: string; extensions?: string[]; multiple?: boolean; folders?: boolean }): Promise<string[] | null>;
  saveFile(o?: { startPath?: string; defaultName?: string; extensions?: string[] }): Promise<string | null>;
}
```

**Tipos de diálogo:**

- Llamados desde una app, son **modales de ventana**: se centran sobre su ventana, oscurecen solo el contenido de esa ventana y la bloquean. Las demás ventanas siguen usables.
- Llamados desde el shell, son **modales de sistema**: se centran en pantalla, oscurecen todo y bloquean todo.
- Estilo de diálogo de contenido Fluent: título en negrita, texto, botones alineados a la derecha en una franja inferior de tono distinto; el botón principal va primero y con el color de énfasis.
- `openFile` y `saveFile` usan el componente `FileBrowser` de `@os/ui`, el mismo que usa el Explorador de archivos.

**Flujo único de cambios sin guardar.** Cuando una ventana con `isDirty: true` va a cerrarse por cualquier motivo, el sistema (no la app) muestra:

> **¿Quieres guardar los cambios en "&lt;documentName&gt;"?**
> [Guardar] [No guardar] [Cancelar]

- *Guardar* → llama a `save()`; si devuelve `false`, se cancela el cierre.
- *Cancelar* → se aborta la operación completa.

Esto aplica, sin excepción, a:

- cerrar la ventana;
- "Cerrar ventana" desde la barra de tareas;
- "Finalizar tarea" en el Administrador de tareas, que además muestra un aviso de pérdida de datos;
- cerrar sesión, reiniciar y apagar: se recorren las ventanas con cambios una por una, y cancelar en cualquiera aborta la acción de energía;
- abrir otro archivo en la misma ventana de una app con cambios sin guardar.

Las apps con autoguardado (Notas, Contactos, Calendario) nunca marcan `isDirty`.

### 4.10 Ventanas (`kernel/windows`)

```ts
interface WindowState {
  id: string; appId: string; instanceId: string;
  title: string;
  x: number; y: number; width: number; height: number;
  state: 'normal' | 'minimized' | 'maximized';
  zIndex: number; focused: boolean;
  hasModal: boolean;      // diálogo modal de ventana abierto
}
```

- Cada lanzamiento de app crea una instancia (`instanceId`) registrada en `kernel/processes` y una ventana.
- Con `singleInstance: true`, si la app ya está abierta, se enfoca y recibe el archivo por `useOpenFileHandler`.
- El **área útil** es toda la pantalla menos la barra de tareas. Las ventanas nuevas se colocan en cascada dentro de ella, y maximizar ocupa exactamente esa área.
- No se restauran ventanas entre sesiones.

### 4.11 Procesos (`kernel/processes`)

- Registro de las instancias de app en ejecución, más procesos ficticios del sistema para dar realismo (`Explorador del sistema`, `Barra de tareas`, `Servicios del host`, etc.).
- Cada proceso tiene `pid` numérico, nombre, appId opcional, hora de inicio y métricas simuladas de CPU (%) y memoria (MB) que varían de forma suave y determinista.
- La memoria total simulada se lee de `os.config.json`.

### 4.12 Programador (`kernel/scheduler`)

- Revisa la tabla `scheduled` cada segundo mientras la sesión está iniciada.
- Al llegar `fireAt`:
  1. publica la notificación;
  2. reproduce el sonido `alarm` si `sound: true`;
  3. emite `scheduler:fired`;
  4. reprograma el trabajo según `repeat`, o lo elimina.
- Los avisos que vencieron con la sesión cerrada se disparan una sola vez al iniciar sesión.
- Funciona aunque la app dueña esté cerrada.

### 4.13 Sonido (`kernel/sound`)

Nombres fijos de sonidos del sistema: `boot`, `login`, `logout`, `shutdown`, `notification`, `error`, `trash`, `empty-trash`, `alarm`, `shutter`, `lock`.

- Se busca `system/sounds/<nombre>.{mp3,ogg,wav}`. **Si el archivo no existe, se genera un tono equivalente con Web Audio**, para que el sistema funcione sin archivos de audio y Eduardo pueda reemplazarlos después.
- El volumen del sistema (`sound.volume`, `sound.muted`) afecta a los sonidos del sistema y, mediante `useSystemVolume()`, a Música, Películas y TV, Grabadora de sonido y Reloj.
- Si `sound.systemSounds` es `false`, solo suenan `alarm` y `shutter`.

### 4.14 Red simulada (`kernel/network`)

- Lista fija de 5 o 6 redes ficticias con intensidad de señal, algunas abiertas y otras con contraseña, definidas en `os.config.json`.
- Acciones: conectar, desconectar y olvidar red.
- No afecta la conectividad real.

### 4.15 Medios (`kernel/media`)

- Envuelve `getUserMedia` y verifica el permiso del manifiesto.
- Lleva la cuenta de streams activos por tipo y emite `media:active`.
- Detiene todos los streams de una instancia cuando esta termina.
- La bandeja del sistema muestra un ícono de cámara o de micrófono mientras haya streams activos de ese tipo.

---

## 5. Personalización (sistema y apps)

El objetivo es que todo lo visual y descriptivo se pueda cambiar después del desarrollo **sin tocar código**, solo editando archivos en `meta/` o en `system/`.

### 5.1 Por app (`apps/<id>/meta/`)

| Archivo | Qué controla |
|---|---|
| `manifest.json` | Nombre, descripción, versión, autor, categoría, presencia y orden en el menú Inicio, anclaje inicial en la barra de tareas, tamaño de ventana, asociaciones de archivo |
| `icon.svg` (o `.png`) | Ícono en barra de tareas, menú Inicio, escritorio, barra de título, Administrador de tareas, Ayuda, notificaciones, "Abrir con…" y "Acerca de" |
| `cover.png` | Imagen de portada en la ventana "Acerca de &lt;App&gt;" y en la Ayuda |
| `theme.css` | Variables de estilo propias de la app |
| `help.md` | Contenido de la sección de esa app en la Ayuda |

La ventana **"Acerca de &lt;App&gt;"** (sección 4.8) muestra ícono, portada, nombre, descripción, versión y autor leídos del manifiesto. Esto hace visible cualquier cambio de metadatos.

### 5.2 Del sistema (`system/`)

`os.config.json`:

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
    { "ssid": "Casa_5G", "secured": true, "password": "12345678", "signal": 4 }
  ]
}
```

- `theme/tokens.css`: todas las variables de color (con paleta base en **turquesa** como color primario/énfasis por defecto y tonos **azul** y **verde** como colores secundarios y de apoyo), materiales (Mica y Acrílico), radios, sombras, tipografía y duraciones de animación, para modo claro y oscuro. **Ningún componente usa colores escritos a mano**; todo sale de estas variables.
- `wallpapers/`: cualquier imagen colocada aquí aparece en Configuración. El `id` es el nombre del archivo sin extensión.
- `sounds/`: ver 4.13.
- `icons/`: íconos del sistema con nombres fijos: `start.svg`, `folder.svg`, `folder-system.svg`, `drive.svg`, `file-generic.svg`, `file-text.svg`, `file-image.svg`, `file-audio.svg`, `file-video.svg`, `recycle-bin-empty.svg`, `recycle-bin-full.svg`, `avatar-default.svg`.
- `boot/logo.svg`: logo de la pantalla de arranque. Si `icons/start.svg` no existe, el botón Inicio también usa este logo.

---

## 6. Diseño visual (estilo Windows 11 / Fluent)

**General**
- Tipografía Inter, tamaño base 14 px. Títulos de página en apps de 20 a 28 px, seminegrita.
- Radios: 8 px en ventanas, menús, flyouts y diálogos; 4 px en controles (botones, campos de texto, casillas).
- **Paleta cromática (turquesa, azul y verde):**
  - **Color principal:** **turquesa** (color de énfasis predeterminado en `os.config.json`, usado en acciones primarias, estados activos y foco).
  - **Colores secundarios:** **azul** y **verde**, integrados armónicamente como tonos de soporte para acciones secundarias, indicadores del sistema, etiquetas, estados informativos/éxito y variaciones de la paleta en Configuración.
- **Uso de degradados (restricción anti-estética IA):**
  - **Prohibido usar degradados de color en bloques grandes** (fondos de ventanas, paneles laterales, barras, tarjetas, modales o cabeceras amplias) que den aspecto genérico o generado por IA. Las superficies grandes deben mantenerse limpias mediante colores planos o materiales translúcidos uniformes.
  - **Se aceptan degradados únicamente en elementos pequeños** y puntuales: íconos SVG, badges, indicadores diminutos o microdetalles de interfaz.
- Materiales:
  - **Mica** en el fondo de ventanas y barra de tareas: tinte semitransparente uniforme sobre desenfoque fuerte.
  - **Acrílico** en menú Inicio, flyouts, menús contextuales y notificaciones: más translúcido y de tono uniforme.
  - Si `appearance.transparency` es `false`, ambos se vuelven colores sólidos.
- Color de énfasis (`appearance.accent`) en: botón principal, elemento seleccionado, indicador de la app activa en la barra de tareas, interruptores activos, barra de progreso y borde de foco del teclado.
- Animaciones de 150 a 250 ms con curva de desaceleración:
  - abrir y cerrar ventana (escala 0,95 → 1 con opacidad);
  - minimizar hacia su ícono de la barra de tareas;
  - menú Inicio y flyouts (deslizamiento corto hacia arriba con opacidad);
  - diálogos (escala con opacidad).
- Modo claro, oscuro y automático (sigue al sistema real con `prefers-color-scheme`).

**Barra de tareas**
- Inferior, 48 px de alto, material Mica, ancho completo.
- Íconos alineados según `taskbar.alignment` (centro por defecto). Orden: botón Inicio, apps ancladas (`taskbar.pinned`) y apps abiertas no ancladas.
- Indicadores bajo cada ícono: guion corto gris si la app está abierta; guion largo del color de énfasis si tiene la ventana con foco.
- A la derecha:
  - **bandeja del sistema**: indicadores de cámara y micrófono, wifi, volumen y batería;
  - **reloj** con hora y fecha en dos líneas;
  - una franja fina en el extremo que minimiza todas las ventanas (**Mostrar escritorio**).

**Ventanas**
- Esquinas de 8 px, sombra suave y borde sutil.
- Barra de título de 32 px: ícono y título a la izquierda; minimizar, maximizar/restaurar y cerrar a la derecha. El botón de cerrar se vuelve rojo al pasar el cursor.
- Ventana sin foco: barra de título y texto atenuados.
- Doble clic en la barra de título maximiza o restaura.

**Íconos y fondos**
- Íconos de apps originales en SVG, en estilo Fluent: formas simples con degradados suaves (permitidos por ser piezas pequeñas), perspectiva ligeramente frontal, colores armónicos dentro de la gama turquesa, azul y verde con brillo sutil, misma retícula para todos.
- Generar entre 4 y 6 fondos de pantalla propios (SVG o PNG generados: composiciones geométricas u orgánicas limpias en la paleta turquesa, azul y verde, en versiones clara y oscura, evitando plastas de degradados estridentes con aspecto de IA). Uno se llama `aurora`.

**Componentes compartidos**
- `@os/ui` contiene los componentes mínimos que reutilizan todas las apps: `Button`, `IconButton`, `TextField`, `TextArea`, `Select`, `Toggle`, `Slider`, `Checkbox`, `SegmentedControl`, `NavigationPane`, `List`, `CommandBar`, `Tabs`, `EmptyState`, `AppIcon`, `FileIcon`, `FileBrowser`, `ContextMenu`, `Flyout`, `InfoBar`.
- Ninguna app reimplementa uno de estos.

---

## 7. Fases

Reglas para todas las fases:

1. Trabaja **solo** en la fase indicada. No adelantes funciones de fases posteriores.
2. Respeta los contratos de la sección 4 tal como están escritos.
3. Al terminar, todo esto debe pasar sin errores ni advertencias: `npm run typecheck`, `npm run lint`, `npm run build`.
4. Recorre la lista de verificación de la fase y confirma cada punto.
5. Actualiza `docs/PROGRESO.md` con lo que se hizo, las desviaciones respecto a esta especificación (y por qué) y cualquier contrato modificado.
6. No dejes `TODO`, código comentado ni funciones a medio hacer en lo entregado en la fase.
7. Detente y resume. No inicies la fase siguiente.

### Fase 0 — Base del proyecto y estructura

**Objetivo:** proyecto que arranca, seguro, con toda la estructura y todos los manifiestos en su lugar.

- Crear el proyecto con electron-vite (React + TypeScript), alias `@os/sdk`, `@os/ui` y `@system`, y ESLint con la regla de la sección 3.3.
- Implementar la sección 3.4 completa: seguridad, CSP, permisos y ventana.
- Implementar el puente de la sección 4.1: tipos, preload y handlers en main.
- Crear `system/` con `os.config.json`, `tokens.css` (claro y oscuro, con Mica y Acrílico), logo, íconos del sistema y fondos de pantalla.
- Crear la carpeta de **las 17 apps** con su `meta/` completo (manifiesto válido e ícono SVG original) y un `src/index.tsx` provisional con `EmptyState` "Disponible pronto". IDs y nombres iniciales:

  | ID | Nombre inicial |
  |---|---|
  | `files` | Explorador de archivos |
  | `text-editor` | Bloc de notas |
  | `terminal` | Terminal |
  | `settings` | Configuración |
  | `calculator` | Calculadora |
  | `task-manager` | Administrador de tareas |
  | `calendar` | Calendario |
  | `clock` | Reloj |
  | `notes` | Notas |
  | `contacts` | Contactos |
  | `image-viewer` | Fotos |
  | `music` | Música |
  | `videos` | Películas y TV |
  | `paint` | Paint |
  | `voice-recorder` | Grabadora de sonido |
  | `camera` | Cámara |
  | `help` | Ayuda |

- Crear las carpetas de los 4 widgets con `meta/` completo y componente provisional: `clock`, `calendar` (con `ownerApp: "calendar"`), `quick-note` y `system-status`.
- Esquema Zod de manifiestos y registro con descubrimiento automático (sección 4.6).
- Pantalla temporal que lista las apps registradas con ícono, nombre y descripción. Se elimina en la Fase 2.
- Crear `CLAUDE.md` con el texto "La especificación es `ESPECIFICACION.md`; léela antes de cada fase y sigue las reglas de la sección 7", más los comandos del proyecto.
- Crear `docs/PROGRESO.md`.

**Verificación:**
- La app abre y la pantalla temporal muestra 17 apps con su ícono.
- Cambiar el `name` en un manifiesto se refleja en la pantalla.
- Un manifiesto inválido se omite con un error claro.
- `lint` falla si una app importa algo de `os/kernel`.
- La consola de DevTools no muestra advertencias de seguridad de Electron.

### Fase 1 — Núcleo y sesión

**Objetivo:** todos los servicios del kernel funcionando y el ciclo de sesión completo.

- Servicios:
  - `events`;
  - `storage` (esquema 4.2);
  - `fs` (4.3, incluidas papelera, importación y rutas visibles estilo Windows);
  - `settings` (4.5);
  - `sound` (4.13);
  - `notifications` (solo el servicio; la interfaz va en la Fase 2);
  - `scheduler` (4.12);
  - `processes` (4.11);
  - `network` (4.14);
  - `media` (4.15);
  - `session`.
- **Pantalla de arranque:** fondo negro, logo centrado y debajo un indicador de carga de puntos girando, durante `bootDurationMs`. Sonido `boot`.
- **Asistente de primer arranque** estilo configuración inicial de Windows: pantalla completa, tarjeta centrada, título grande y botón "Siguiente" abajo a la derecha. Pasos:
  1. bienvenida;
  2. nombre;
  3. contraseña y confirmación (mínimo 4 caracteres);
  4. avatar (íconos incluidos);
  5. modo claro u oscuro.

  Al terminar crea el usuario, el árbol de carpetas y los valores por defecto.
- **Pantalla de bloqueo:** fondo de pantalla, hora y fecha grandes centradas en la parte superior, e íconos de red y batería abajo a la derecha.
- **Inicio de sesión:** al hacer clic o pulsar una tecla, la pantalla de bloqueo se desliza hacia arriba y aparece el fondo desenfocado con avatar, nombre, campo de contraseña con botón de flecha, y el botón de energía abajo a la derecha (Reiniciar, Apagar).
  - Contraseña incorrecta: mensaje "La contraseña no es correcta. Inténtalo de nuevo." con botón Aceptar, y sonido `error`.
- **Flujo de energía** (`shell/power`):
  - bloquear;
  - cerrar sesión;
  - reiniciar: pantalla "Reiniciando" con indicador de puntos y vuelta a la pantalla de arranque;
  - apagar: pantalla "Apagando" con indicador de puntos y luego `native.power.quit()`.

  En esta fase todavía no hay ventanas, así que el flujo de cambios sin guardar queda preparado como un paso que recorre las ventanas abiertas.
- Tras iniciar sesión, mostrar la pantalla temporal de la Fase 0.

**Verificación:**
- El primer arranque crea el usuario y el árbol de carpetas.
- Al reiniciar Electron se pide la contraseña, no el asistente.
- La contraseña se guarda con hash y sal, nunca en texto plano.
- Bloquear y desbloquear funciona.
- Los sonidos suenan aunque no existan archivos en `system/sounds/`.
- Los datos persisten al cerrar y abrir Electron.

### Fase 2 — Shell y ventanas

**Objetivo:** el escritorio completo con ventanas reales; las apps siguen siendo provisionales.

- Eliminar la pantalla temporal.

**Ventanas**
- Gestor de ventanas (4.10) y marco de ventana (sección 6):
  - arrastrar por la barra de título;
  - redimensionar por bordes y esquinas;
  - minimizar con animación hacia la barra de tareas;
  - maximizar al área útil, y restaurar con el botón o con doble clic;
  - foco y apilamiento.
- Menú de ventana y barra de menús dentro de la ventana (4.8), incluido "Acerca de &lt;App&gt;".
- Diálogos (4.9):
  - modales de ventana y de sistema;
  - `FileBrowser` en `@os/ui`;
  - `openFile` y `saveFile` funcionales sobre el sistema de archivos;
  - el flujo único de cambios sin guardar conectado al cierre de ventanas y a las acciones de energía.

**Barra de tareas** (sección 6)
- Botón Inicio.
- Apps ancladas desde `taskbar.pinned` (inicialmente las de `taskbar.pinnedByDefault`) y apps abiertas.
- Clic en un ícono: abre la app; si ya está abierta, la enfoca; si ya tiene el foco, la minimiza.
- Clic derecho: nombre de la app (abre una ventana nueva), Anclar a la barra de tareas / Desanclar de la barra de tareas, y Cerrar ventana.
- Soltar un archivo sobre el ícono de una app lo abre con ella si esa app lo admite.
- Mostrar escritorio en el extremo derecho.

**Bandeja del sistema y reloj**
- Cada ícono abre su flyout acrílico:
  - **wifi**: activar o desactivar, lista de redes, conectar con contraseña;
  - **volumen**: deslizador y silencio;
  - **batería**: valor real con `navigator.getBattery` si existe; si no, 100 % conectado.
- El reloj sigue la configuración `datetime`; su flyout muestra un calendario del mes.
- Indicadores de cámara y micrófono (4.15).

**Menú Inicio**
- Flyout acrílico sobre la barra de tareas, alineado según `taskbar.alignment`, de unos 640×700 px.
- Contenido de arriba abajo:
  1. cuadro de búsqueda que filtra las apps por nombre y descripción (solo dentro del menú Inicio);
  2. sección **Anclado**: cuadrícula de 6 columnas con las apps de `start.pinned` (inicialmente las de `startMenu.pinnedByDefault`, ordenadas por `order`);
  3. botón **Todas las aplicaciones ›**, que cambia a una lista alfabética de todas las apps con `startMenu.visible`, agrupadas por letra inicial;
  4. franja inferior con avatar y nombre del usuario (menú: Cambiar configuración de la cuenta, Bloquear, Cerrar sesión) y botón de energía a la derecha (Reiniciar, Apagar).
- Clic derecho en una app: Abrir, Anclar a Inicio / Desanclar de Inicio, Anclar a la barra de tareas, Añadir al escritorio.
- Se cierra con `Esc`, al hacer clic fuera o al abrir una app.

**Escritorio**
- Fondo según `appearance.wallpaper`.
- Muestra:
  - los archivos de `~/Escritorio`;
  - los accesos a apps de `desktop.items`;
  - la **Papelera de reciclaje**, siempre presente, con ícono lleno o vacío según su contenido.
- Íconos:
  - arrastrables, con posición guardada y ajuste a una retícula invisible;
  - tamaño según `desktop.iconSize`;
  - selección con clic y con rectángulo de selección translúcido en color de énfasis;
  - doble clic abre.
- Menú contextual del fondo:
  - Ver › Íconos pequeños / medianos / grandes;
  - Ordenar íconos;
  - Nuevo › Carpeta / Documento de texto;
  - Añadir widget › (lista de widgets);
  - Personalizar (abre Configuración en Personalización).
- Menú contextual de un elemento:
  - archivos: Abrir, Abrir con…, Renombrar, Mover a la papelera, Propiedades;
  - apps: Abrir, Quitar del escritorio;
  - Papelera de reciclaje: Abrir, Vaciar papelera de reciclaje.
- Soltar archivos sobre la Papelera de reciclaje los envía a ella. Doble clic sobre ella abre el Explorador en la Papelera.

**Widgets**
- Viven en una capa entre el fondo y los íconos.
- Se arrastran para moverlos. Al pasar el cursor muestran un botón "…" con Cambiar tamaño (entre los permitidos) y Quitar. El estado se guarda en `desktop.widgets`.
- Fondo acrílico y esquinas de 8 px.
- Implementar los 4 widgets:
  - **Reloj**;
  - **Calendario**: mes actual y próximos eventos desde el `appData` de Calendario; queda vacío mientras esa app no exista;
  - **Nota rápida**: texto con autoguardado;
  - **Estado del sistema**: batería, red y espacio usado.

**Notificaciones, arrastre y asociaciones**
- Notificaciones emergentes abajo a la derecha, encima de la barra de tareas, con ícono y nombre de la app. Desaparecen a los 5 s; al hacer clic lanzan la app con sus `launchArgs`.
- Arrastrar y soltar entre escritorio, ventanas, barra de tareas y Papelera de reciclaje, con el tipo de dato propio `application/x-simos-node`.
- Asociaciones de archivo:
  - resolver la app predeterminada con `fileAssociations.defaults` o, si no hay, con la `priority` más alta;
  - submenú "Abrir con…" con la opción "Elegir otra aplicación", que permite marcar "Usar siempre esta aplicación".

**Verificación:**
- Abrir varias apps provisionales y manipular sus ventanas.
- Agregar en una app provisional un botón de prueba que marque `isDirty`; debe disparar el diálogo al cerrar la ventana y al apagar. Quitar el botón al terminar la fase.
- Widgets, íconos, apps ancladas y alineación de la barra de tareas conservan su estado tras cerrar sesión y tras reiniciar Electron.
- Los diálogos de ventana bloquean solo su ventana.
- Maximizar nunca tapa la barra de tareas.

### Fase 3 — Apps del sistema

**Explorador de archivos** (`files`)
- Barra de comandos superior: Nuevo (carpeta o documento de texto), Renombrar, Duplicar, Copiar a…, Mover a…, Eliminar, Importar desde el equipo…, Ordenar y Ver.
- Panel de navegación: Inicio, Escritorio, Descargas, Documentos, Imágenes, Música y Videos; luego "Este equipo › Disco local (C:)"; al final "Papelera de reciclaje".
- Barra de direcciones con ruta estilo Windows (`fs.toDisplayPath`), editable y con migas de pan, más botones atrás, adelante y arriba.
- Vistas: íconos grandes, lista y detalles (columnas Nombre, Fecha de modificación, Tipo y Tamaño, ordenables).
- Selección múltiple; Propiedades muestra los metadatos.
- Arrastrar y soltar entre carpetas y hacia el escritorio, la barra de tareas o la Papelera de reciclaje.
- **Importar desde el equipo…** importa a la carpeta actual.
- Vista Papelera de reciclaje: Restaurar, Eliminar definitivamente y Vaciar papelera de reciclaje (confirmación destructiva y sonido `empty-trash`).
- Acepta `launchArgs.filePath` o `{ view: 'trash' }`.

**Terminal** (`terminal`)
- Aspecto tipo terminal moderna de Windows: fondo oscuro con material Mica y fuente monoespaciada libre (por ejemplo Cascadia Code, que tiene licencia OFL; si se usa, empaquetarla localmente).
- Prompt `PS <ruta visible>>`, por ejemplo `PS C:\Usuarios\Eduardo>`. Acepta rutas con `\`, `/`, `C:\` y `~` mediante `fs.fromDisplayPath`.
- Comandos y alias:

  | Comando | Alias |
  |---|---|
  | `help` | |
  | `ls [-l]` | `dir` |
  | `cd` | |
  | `pwd` | |
  | `mkdir [-p]` | `md` |
  | `touch` | |
  | `cat` | `type` |
  | `echo` (con `>` y `>>`) | |
  | `rm [-r]` (envía a la papelera) | `del` |
  | `mv` | `move` |
  | `cp [-r]` | `copy` |
  | `tree` | |
  | `open <archivo>` | `start` |
  | `date` | |
  | `whoami` | |
  | `clear` | `cls` |
  | `history` | |

- Flechas arriba y abajo para el historial; Tab para autocompletar rutas.
- Mensajes de error en español con un formato coherente.
- Usa exclusivamente `fs` y `apps` del SDK.

**Configuración** (`settings`, permisos `settings:write` y `system:account`)
- Estilo de Configuración de Windows 11: panel izquierdo con tarjeta del usuario arriba y secciones con ícono, y título grande de la sección a la derecha.
- Secciones:
  - **Personalización**: modo de color (claro, oscuro, automático), color de énfasis (paleta predefinida encabezada por turquesa como principal y variantes en azul y verde), efectos de transparencia, y fondo con miniaturas de `system/wallpapers` y de cualquier imagen del sistema de archivos.
  - **Escritorio y barra de tareas**: alineación de la barra de tareas, tamaño de los íconos del escritorio, restablecer la posición de los íconos, restablecer las apps ancladas a Inicio y a la barra de tareas.
  - **Sonido**: volumen, silencio y sonidos del sistema con botón de prueba.
  - **Red e Internet**: wifi, lista de redes, conectar con contraseña y olvidar.
  - **Hora y fecha**: zona horaria y formato de 24 horas.
  - **Cuenta**: nombre, avatar (desde los íconos incluidos o una imagen del sistema de archivos) y cambiar contraseña pidiendo la actual.
- Acepta `launchArgs.section`.

**Administrador de tareas** (`task-manager`, permiso `system:processes`, `singleInstance`)
- Panel de navegación izquierdo con dos páginas:
  - **Procesos**: tabla con nombre, ícono, PID, CPU y memoria, ordenable, con "Finalizar tarea" según 4.9;
  - **Rendimiento**: gráficas de CPU y memoria de los últimos 60 s, dibujadas en canvas o SVG sin librerías externas.

**Verificación:**
- Todo lo que hace la Terminal se refleja al instante en el Explorador y en el escritorio, y viceversa (vía `fs:changed`).
- Cambiar modo de color, color de énfasis, transparencia o fondo se aplica en vivo en todo el sistema.
- Un archivo importado del equipo real se abre en su app asociada.
- Todas las rutas visibles se muestran estilo Windows.

### Fase 4 — Apps de productividad

**Bloc de notas** (`text-editor`)
- Abrir, guardar, guardar como (`saveFile`) y nuevo; archivos `.txt` y `.md`.
- Título "nombre - Bloc de notas", con un asterisco delante cuando hay cambios sin guardar.
- Usa `useUnsavedChanges`.
- Barra de menús con Archivo, Editar y Ver (`useAppMenus`).
- Buscar (Ctrl+F); barra de estado con línea, columna y número de caracteres; tamaño de letra; ajuste de línea.
- Atajos Ctrl+S, Ctrl+Mayús+S, Ctrl+N y Ctrl+O cuando su ventana tiene el foco.

**Calculadora** (`calculator`, ventana pequeña no redimensionable)
- Modo estándar: operaciones básicas, porcentaje, cambio de signo, raíz cuadrada, cuadrado, 1/x, C y CE.
- Soporte de teclado e historial lateral plegable.
- Sin `eval`.

**Calendario** (`calendar`)
- Vistas de mes y de día.
- Crear, editar y borrar eventos con título, fecha, hora de inicio y fin, nota y recordatorio (ninguno, al inicio, o 5, 15, 30 o 60 minutos antes). El recordatorio se programa con `scheduler`.
- Los datos se guardan en `storage` con el formato que consume el widget de Calendario; documentar ese formato en `docs/PROGRESO.md`.

**Reloj** (`clock`)
- Pestañas:
  - **Reloj mundial**: añadir y quitar ciudades por zona IANA;
  - **Alarmas**: hora, repetición, etiqueta, activar o desactivar, vía `scheduler`;
  - **Temporizador**: también vía `scheduler`, para que suene aunque se cierre la app;
  - **Cronómetro**: con vueltas.

**Notas** (`notes`)
- Lista con búsqueda; crear, borrar (con confirmación) y fijar.
- Autoguardado. El título se toma de la primera línea.

**Contactos** (`contacts`)
- Lista alfabética con búsqueda.
- Ficha con nombre, apellido, teléfonos, correos, dirección, cumpleaños, notas y foto (imagen del sistema de archivos).
- Crear, editar y borrar con confirmación. Autoguardado.

**Verificación:**
- Una alarma o un recordatorio suena y notifica con la app cerrada.
- Los eventos aparecen en el widget de Calendario.
- Cerrar el Bloc de notas con cambios muestra el diálogo único.
- Notas, Contactos y Calendario nunca muestran ese diálogo.

### Fase 5 — Apps multimedia

**Fotos** (`image-viewer`, `viewer` de png, jpg, jpeg, gif, webp, svg y bmp)
- Ajustar a la ventana, zoom con rueda y botones, desplazamiento y rotación de la vista.
- Anterior y siguiente dentro de la misma carpeta.
- "Establecer como fondo de pantalla": como esta app no tiene `settings:write`, lo hace con `apps.launch('settings', { section: 'personalization', setWallpaper: <nodeId> })`, y Configuración pide confirmación y aplica el cambio.
- Propiedades.

**Música** (`music`, `singleInstance`, `viewer` de mp3, ogg, wav, flac y m4a)
- Biblioteca que recorre `~/Música` de forma recursiva; cola de reproducción.
- Reproducir, pausar, anterior y siguiente; barra de progreso; aleatorio y repetir.
- Volumen propio multiplicado por `useSystemVolume()`.
- Título tomado del nombre del archivo.
- Sigue sonando con la ventana minimizada.

**Películas y TV** (`videos`, `viewer` de mp4, webm, ogg y mov)
- Controles propios, no los nativos del navegador.
- Barra de progreso, volumen con `useSystemVolume()` y pantalla completa dentro de la ventana.
- Lista de los videos de la misma carpeta.

**Paint** (`paint`, `editor` de png)
- Lienzo con tamaño configurable al crear.
- Barra de herramientas estilo cinta simplificada: pincel, lápiz, borrador, línea, rectángulo, elipse, relleno por inundación, cuentagotas y texto.
- Paleta y selector de color; grosor.
- Deshacer y rehacer (mínimo 30 pasos).
- Abrir una imagen existente, guardar y guardar como `.png`.
- Usa `useUnsavedChanges`.

**Grabadora de sonido** (`voice-recorder`, permiso `microphone`)
- Grabar, pausar y detener con `MediaRecorder`.
- Visualización de la onda en tiempo real.
- Guarda en `~/Música/Grabaciones/` como `.webm`, con nombre por fecha y hora.
- Lista de grabaciones con reproducir, renombrar y borrar.

**Cámara** (`camera`, permisos `camera` y `microphone`, `singleInstance`)
- Vista previa en vivo.
- Modos Foto y Video (con audio), con selector vertical a la derecha y botón disparador grande.
- Sonido `shutter` y destello al tomar una foto.
- Temporizador opcional de 3 y 10 s; espejo activable.
- Selector de cámara si hay varias (`listCameras`).
- Fotos `.png` en `~/Imágenes/Cámara/` y videos `.webm` en `~/Videos/Cámara/`.
- Miniatura de la última captura, que la abre en Fotos o en Películas y TV.
- Mensajes claros si no hay cámara o si se deniega el permiso.
- Al cerrar la ventana se apaga la cámara y desaparece su indicador de la bandeja.

**Verificación:**
- Una foto tomada aparece al instante en el Explorador y se puede poner como fondo.
- El volumen del sistema afecta a Música y a Películas y TV.
- La luz de la cámara del equipo se apaga al cerrar la app.
- Abrir un `.png` desde el Explorador usa Fotos por defecto, y "Abrir con… › Paint" lo edita.

### Fase 6 — Ayuda, personalización y pulido

**Ayuda** (`help`, `singleInstance`)
- Portada con el nombre del SO.
- Sección "Primeros pasos": escritorio, barra de tareas, menú Inicio, ventanas, archivos y Papelera de reciclaje.
- Una sección por app, generada desde el registro, con ícono, portada, nombre, descripción y el contenido de su `help.md`. Renderizar un subconjunto simple de Markdown con un parser propio: títulos, párrafos, listas, negritas, cursivas y código en línea.
- Buscador.
- Escribir `help.md` para las 17 apps.

**`CUSTOMIZACION.md`**
- Cómo cambiar nombre, descripción, ícono, portada, estilos y ayuda de cada app.
- Cómo cambiar nombre del SO, logo, botón Inicio, fondos, sonidos, íconos del sistema y tokens de tema.
- Cómo agregar una app o un widget nuevo copiando una carpeta existente.
- Formatos y tamaños recomendados de imagen.
- Qué hace falta recompilar.

**Auditoría de consistencia**, documentada en `docs/PROGRESO.md`. Confirmar que:
- todas las apps usan componentes de `@os/ui` y tokens de tema, sin colores escritos a mano;
- todas las apps con documentos usan `useUnsavedChanges` y `dialogs.saveFile`;
- ningún texto visible tiene escrito a mano el nombre del SO ni el de una app (se leen de configuración o manifiestos);
- ninguna ruta visible está en formato POSIX;
- cada app funciona en modo claro y oscuro, con y sin transparencia, y con su ventana en tamaño mínimo;
- todas las asociaciones de archivo tienen al menos una app, y "Abrir con…" lista las correctas;
- todos los streams de medios se liberan al cerrar;
- no queda ningún resto de la estética anterior: Dock, Launchpad, barra de menú superior ni botones de ventana a la izquierda.

**Pulido**
- Estados vacíos con `EmptyState` en todas las listas.
- Animaciones de la sección 6.
- Mensajes de error en español claro.
- Rendimiento aceptable con 10 ventanas abiertas.

**Verificación:**
- Cambiar el ícono, el nombre y la portada de una app en su `meta/` se refleja en la barra de tareas, el menú Inicio, el escritorio, la barra de título, el Administrador de tareas, "Acerca de", la Ayuda y las notificaciones, sin tocar ningún archivo de `src/` fuera de `meta/`.

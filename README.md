# hebi OS 🖥️

Simulador de sistema operativo de escritorio moderno construido con **Electron**, **React** y **TypeScript**. Incorpora una experiencia fluida inspirada en el lenguaje de diseño Fluent, con soporte completo para gestión de ventanas, sistema de archivos virtual persistente, widgets de escritorio interactivos y 17 aplicaciones nativas.

---

## 🌟 Características Principales

### 🪟 Shell y Gestión de Ventanas
- **Barra de Tareas:** Posicionamiento configurable (centrado o a la izquierda), bandeja del sistema con indicadores de estado (red wifi simulada, audio, batería, estado de dispositivos de captura) y reloj desplegable.
- **Menú Inicio:** Menú flotante con motor de búsqueda en tiempo real, aplicaciones ancladas, listado alfabético y controles de energía.
- **Ventanas Multitarea:** Soporte para arrastre suave, redimensionamiento interactivo en los 8 bordes, minimizar, maximizar, restaurar, foco dinámico e indicador de cambios no guardados.
- **Escritorio Personalizable:** Cuadrícula de iconos interactiva, soporte de arrastrar y soltar (Drag & Drop), menús contextuales y papelera de reciclaje integrada.
- **Widgets de Escritorio:** Widgets posicionables y redimensionables en tiempo real (Reloj, Calendario de eventos, Nota rápida y Monitor de estado del sistema).

### ⚙️ Núcleo y Servicios del Sistema
- **Sistema de Archivos Virtual (VFS):** Estructura jerárquica persistida localmente con IndexedDB (Dexie). Permite crear, mover, copiar, renombrar, enviar a la papelera y restaurar archivos y directorios, así como importar archivos reales desde el host mediante el puente nativo IPC.
- **Sesión y Seguridad:** Flujo de primer arranque con asistente de bienvenida, pantalla de bloqueo con clave de usuario y cierre de sesión. Proceso Electron protegido con aislamiento de contexto (`contextIsolation`), sandbox activado y Content Security Policy (CSP).
- **Audio y Notificaciones:** Motor de síntesis de sonido procedural vía Web Audio API y reproductor de efectos del sistema, además de un centro de notificaciones emergentes (toasts).
- **Personalización Completa:** Soporte para temas Claro / Oscuro / Automático, materiales translúcidos tipo Mica y Acrílico (`backdrop-filter`), múltiples fondos de pantalla SVG y colores de énfasis dinámicos (turquesa por defecto).

---

## 📱 Aplicaciones Incluidas

El sistema incluye 17 aplicaciones nativas totalmente funcionales y desacopladas:

| Categoría | Aplicaciones |
| :--- | :--- |
| **Sistema** | **Explorador de Archivos**, **Terminal** (con soporte para comandos encadenados `&&`), **Configuración**, **Administrador de Tareas** |
| **Productividad** | **Bloc de Notas** (editor de texto con soporte Markdown), **Calculadora** (estándar y científica), **Calendario**, **Reloj** (alarmas, temporizador y cronómetro), **Notas**, **Contactos** |
| **Multimedia** | **Fotos** (visor de imágenes con zoom y rotación), **Música** (reproductor de audio con lista de reproducción), **Películas y TV** (reproductor de video), **Paint** (lienzo de dibujo con herramientas), **Grabadora de Sonido**, **Cámara** |
| **Ayuda** | **Ayuda** (manual interactivo de uso y documentación de cada app) |

---

## 🛠️ Tecnologías Utilizadas

- **Entorno:** [Electron 33](https://www.electronjs.org/) con [electron-vite](https://electron-vite.org/)
- **Frontend:** [React 18](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)
- **Gestión de Estado:** [Zustand](https://github.com/pmndrs/zustand)
- **Persistencia Local:** [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Validación de Esquemas:** [Zod](https://zod.dev/)
- **Iconografía:** Fluent UI System Icons (Licencia MIT)
- **Tipografía:** Inter Font Family (`@fontsource/inter`)

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
- `npm` o gestor de paquetes equivalente

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/brOscar52/Desktop-OS_Hebi-OS.git
   cd Desktop-OS_Hebi-OS
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar en modo desarrollo:**
   ```bash
   npm run dev
   ```

4. **Verificación de tipos y linting:**
   ```bash
   npm run typecheck
   npm run lint
   ```

5. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## 📂 Estructura del Proyecto

```text
├── docs/                   # Documentación técnica y bitácora del proyecto
├── scripts/                # Scripts de soporte y generación de plantillas
├── src/
│   ├── main/               # Proceso principal de Electron (seguridad, IPC, ciclo de vida)
│   ├── preload/            # Puente seguro entre Electron y Renderer (window.native)
│   ├── shared/             # Contratos de tipos compartidos entre procesos
│   └── renderer/           # Interfaz de usuario (React)
│       └── src/
│           ├── apps/       # 17 aplicaciones desacopladas con sus metadatos
│           ├── widgets/    # 4 widgets de escritorio
│           ├── os/
│           │   ├── kernel/ # Servicios centrales (VFS, procesos, audio, settings, etc.)
│           │   ├── shell/  # Capa visual (barra de tareas, ventanas, escritorio, menú)
│           │   └── ui/     # Componentes compartidos de diseño Fluent
│           └── system/     # Configuración base (os.config.json), tokens y recursos
├── electron.vite.config.ts # Configuración de empaquetado y alias
└── package.json
```

---

## 📄 Licencia

Este proyecto está desarrollado para fines académicos y educativos. Los íconos utilizados pertenecen a la librería Fluent UI System Icons bajo licencia MIT.

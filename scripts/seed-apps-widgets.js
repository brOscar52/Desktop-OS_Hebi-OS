const fs = require('fs');
const path = require('path');

const apps = [
  {
    id: 'files',
    name: 'Explorador de archivos',
    description: 'Explora carpetas, administra archivos y unidades.',
    category: 'sistema',
    order: 1,
    pinnedTaskbar: true,
    pinnedStart: true,
    window: { width: 900, height: 600, minWidth: 500, minHeight: 350, resizable: true, singleInstance: false },
    fileAssociations: [],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <defs>
    <linearGradient id="f1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0284C7"/><stop offset="100%" stop-color="#0369A1"/></linearGradient>
    <linearGradient id="f2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38BDF8"/><stop offset="100%" stop-color="#0284C7"/></linearGradient>
  </defs>
  <path d="M6 12C6 9.8 7.8 8 10 8H20L24 12H38C40.2 12 42 13.8 42 16V36C42 38.2 40.2 40 38 40H10C7.8 40 6 38.2 6 36V12Z" fill="url(#f1)"/>
  <rect x="6" y="16" width="36" height="24" rx="4" fill="url(#f2)"/>
</svg>`
  },
  {
    id: 'text-editor',
    name: 'Bloc de notas',
    description: 'Crea y edita documentos de texto plano y Markdown.',
    category: 'productividad',
    order: 2,
    pinnedTaskbar: true,
    pinnedStart: true,
    window: { width: 760, height: 520, minWidth: 380, minHeight: 260, resizable: true, singleInstance: false },
    fileAssociations: [{ extensions: ['txt', 'md'], role: 'editor', priority: 10 }],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <defs>
    <linearGradient id="te1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0D9488"/><stop offset="100%" stop-color="#115E59"/></linearGradient>
  </defs>
  <rect x="8" y="6" width="32" height="36" rx="4" fill="#F8FAFC" stroke="url(#te1)" stroke-width="2"/>
  <path d="M14 16H34M14 22H34M14 28H26" stroke="#0D9488" stroke-width="2.5" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Línea de comandos de hebi OS.',
    category: 'utilidades',
    order: 3,
    pinnedTaskbar: true,
    pinnedStart: true,
    window: { width: 800, height: 500, minWidth: 450, minHeight: 300, resizable: true, singleInstance: false },
    fileAssociations: [],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect x="6" y="8" width="36" height="32" rx="4" fill="#0F172A" stroke="#334155" stroke-width="2"/>
  <path d="M14 18L22 24L14 30" stroke="#2DD4BF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="24" y1="30" x2="32" y2="30" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'settings',
    name: 'Configuración',
    description: 'Personaliza y configura las opciones de tu sistema.',
    category: 'sistema',
    order: 4,
    pinnedTaskbar: true,
    pinnedStart: true,
    window: { width: 960, height: 650, minWidth: 600, minHeight: 450, resizable: true, singleInstance: true },
    fileAssociations: [],
    permissions: ['settings:write', 'system:account'],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <defs>
    <linearGradient id="setG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0D9488"/><stop offset="100%" stop-color="#0284C7"/></linearGradient>
  </defs>
  <circle cx="24" cy="24" r="8" fill="url(#setG)"/>
  <path d="M24 6V10M24 38V42M6 24H10M38 24H42M11.3 11.3L14.1 14.1M33.9 33.9L36.7 36.7M11.3 36.7L14.1 33.9M33.9 14.1L36.7 11.3" stroke="url(#setG)" stroke-width="3" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'calculator',
    name: 'Calculadora',
    description: 'Realiza cálculos matemáticos estándar.',
    category: 'utilidades',
    order: 5,
    pinnedTaskbar: false,
    pinnedStart: true,
    window: { width: 340, height: 500, minWidth: 320, minHeight: 480, resizable: false, singleInstance: false },
    fileAssociations: [],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect x="8" y="6" width="32" height="36" rx="4" fill="#0D9488"/>
  <rect x="12" y="10" width="24" height="8" rx="2" fill="#F0FDFA"/>
  <circle cx="16" cy="24" r="2" fill="#FFFFFF"/>
  <circle cx="24" cy="24" r="2" fill="#FFFFFF"/>
  <circle cx="32" cy="24" r="2" fill="#FFFFFF"/>
  <circle cx="16" cy="30" r="2" fill="#FFFFFF"/>
  <circle cx="24" cy="30" r="2" fill="#FFFFFF"/>
  <circle cx="32" cy="30" r="2" fill="#FFFFFF"/>
  <circle cx="16" cy="36" r="2" fill="#FFFFFF"/>
  <circle cx="24" cy="36" r="2" fill="#FFFFFF"/>
  <circle cx="32" cy="36" r="2" fill="#2DD4BF"/>
</svg>`
  },
  {
    id: 'task-manager',
    name: 'Administrador de tareas',
    description: 'Monitorea procesos y rendimiento del sistema.',
    category: 'sistema',
    order: 6,
    pinnedTaskbar: false,
    pinnedStart: false,
    window: { width: 850, height: 560, minWidth: 520, minHeight: 380, resizable: true, singleInstance: true },
    fileAssociations: [],
    permissions: ['system:processes'],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect x="6" y="8" width="36" height="32" rx="4" fill="#1E293B" stroke="#475569" stroke-width="2"/>
  <path d="M10 28L18 20L24 26L30 14L38 24" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
  },
  {
    id: 'calendar',
    name: 'Calendario',
    description: 'Gestiona eventos, fechas y recordatorios.',
    category: 'productividad',
    order: 7,
    pinnedTaskbar: false,
    pinnedStart: true,
    window: { width: 880, height: 600, minWidth: 550, minHeight: 400, resizable: true, singleInstance: false },
    fileAssociations: [],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect x="8" y="10" width="32" height="32" rx="4" fill="#FFFFFF" stroke="#0284C7" stroke-width="2"/>
  <path d="M8 18H40V14C40 11.8 38.2 10 36 10H12C9.8 10 8 11.8 8 14V18Z" fill="#0284C7"/>
  <circle cx="16" cy="26" r="2" fill="#0284C7"/>
  <circle cx="24" cy="26" r="2" fill="#0284C7"/>
  <circle cx="32" cy="26" r="2" fill="#0284C7"/>
  <circle cx="16" cy="34" r="2" fill="#0284C7"/>
  <circle cx="24" cy="34" r="2" fill="#10B981"/>
</svg>`
  },
  {
    id: 'clock',
    name: 'Reloj',
    description: 'Alarmas, temporizadores, cronómetro y reloj mundial.',
    category: 'utilidades',
    order: 8,
    pinnedTaskbar: false,
    pinnedStart: false,
    window: { width: 780, height: 540, minWidth: 480, minHeight: 360, resizable: true, singleInstance: false },
    fileAssociations: [],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="18" fill="#F0FDFA" stroke="#0D9488" stroke-width="2.5"/>
  <path d="M24 14V24L30 28" stroke="#0D9488" stroke-width="2.5" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'notes',
    name: 'Notas',
    description: 'Toma notas rápidas con autoguardado.',
    category: 'productividad',
    order: 9,
    pinnedTaskbar: false,
    pinnedStart: true,
    window: { width: 720, height: 500, minWidth: 400, minHeight: 300, resizable: true, singleInstance: false },
    fileAssociations: [],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect x="10" y="8" width="28" height="32" rx="3" fill="#FEF08A" stroke="#CA8A04" stroke-width="2"/>
  <path d="M14 16H34M14 22H34M14 28H28" stroke="#854D0E" stroke-width="2" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'contacts',
    name: 'Contactos',
    description: 'Libreta de contactos y personas.',
    category: 'productividad',
    order: 10,
    pinnedTaskbar: false,
    pinnedStart: false,
    window: { width: 760, height: 540, minWidth: 460, minHeight: 340, resizable: true, singleInstance: false },
    fileAssociations: [],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect x="8" y="8" width="32" height="32" rx="4" fill="#EFF6FF" stroke="#0284C7" stroke-width="2"/>
  <circle cx="24" cy="20" r="6" fill="#0284C7"/>
  <path d="M14 36C14 30.5 18.5 28 24 28C29.5 28 34 30.5 34 36" fill="#0284C7"/>
</svg>`
  },
  {
    id: 'image-viewer',
    name: 'Fotos',
    description: 'Visualizador de imágenes y fotografías.',
    category: 'multimedia',
    order: 11,
    pinnedTaskbar: false,
    pinnedStart: true,
    window: { width: 840, height: 580, minWidth: 450, minHeight: 320, resizable: true, singleInstance: false },
    fileAssociations: [{ extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'], role: 'viewer', priority: 10 }],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect x="6" y="8" width="36" height="32" rx="4" fill="#F0FDF4" stroke="#10B981" stroke-width="2"/>
  <circle cx="16" cy="18" r="4" fill="#10B981"/>
  <path d="M10 34L20 22L34 36H10Z" fill="#059669"/>
</svg>`
  },
  {
    id: 'music',
    name: 'Música',
    description: 'Reproductor de pistas y colecciones de audio.',
    category: 'multimedia',
    order: 12,
    pinnedTaskbar: false,
    pinnedStart: false,
    window: { width: 800, height: 550, minWidth: 480, minHeight: 340, resizable: true, singleInstance: true },
    fileAssociations: [{ extensions: ['mp3', 'ogg', 'wav', 'flac', 'm4a'], role: 'viewer', priority: 10 }],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="18" fill="#F0FDFB" stroke="#0D9488" stroke-width="2"/>
  <circle cx="18" cy="30" r="4" fill="#0D9488"/>
  <circle cx="28" cy="26" r="4" fill="#0D9488"/>
  <path d="M22 30V16H32V26" stroke="#0D9488" stroke-width="2.5"/>
</svg>`
  },
  {
    id: 'videos',
    name: 'Películas y TV',
    description: 'Reproductor de videos y películas.',
    category: 'multimedia',
    order: 13,
    pinnedTaskbar: false,
    pinnedStart: false,
    window: { width: 860, height: 560, minWidth: 500, minHeight: 350, resizable: true, singleInstance: false },
    fileAssociations: [{ extensions: ['mp4', 'webm', 'ogg', 'mov'], role: 'viewer', priority: 10 }],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect x="6" y="10" width="36" height="28" rx="4" fill="#0284C7"/>
  <path d="M20 18L32 24L20 30V18Z" fill="#FFFFFF"/>
</svg>`
  },
  {
    id: 'paint',
    name: 'Paint',
    description: 'Dibuja, colorea y edita gráficos e imágenes.',
    category: 'multimedia',
    order: 14,
    pinnedTaskbar: false,
    pinnedStart: false,
    window: { width: 920, height: 620, minWidth: 600, minHeight: 400, resizable: true, singleInstance: false },
    fileAssociations: [{ extensions: ['png'], role: 'editor', priority: 5 }],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <path d="M24 6C14 6 6 14 6 24C6 34 12 38 18 38C20 38 20 36 20 34C20 32 22 30 24 30H28C34 30 42 26 42 18C42 10 34 6 24 6Z" fill="#F8FAFC" stroke="#0D9488" stroke-width="2"/>
  <circle cx="14" cy="18" r="3" fill="#EF4444"/>
  <circle cx="22" cy="14" r="3" fill="#F59E0B"/>
  <circle cx="30" cy="16" r="3" fill="#10B981"/>
  <circle cx="34" cy="24" r="3" fill="#3B82F6"/>
</svg>`
  },
  {
    id: 'voice-recorder',
    name: 'Grabadora de sonido',
    description: 'Graba audio y notas de voz con el micrófono.',
    category: 'multimedia',
    order: 15,
    pinnedTaskbar: false,
    pinnedStart: false,
    window: { width: 460, height: 540, minWidth: 380, minHeight: 420, resizable: true, singleInstance: false },
    fileAssociations: [],
    permissions: ['microphone'],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect x="18" y="8" width="12" height="20" rx="6" fill="#0D9488"/>
  <path d="M12 22C12 28.6 17.4 34 24 34C30.6 34 36 28.6 36 22" stroke="#0D9488" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="24" y1="34" x2="24" y2="40" stroke="#0D9488" stroke-width="2.5" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'camera',
    name: 'Cámara',
    description: 'Captura fotos y graba videos con la cámara web.',
    category: 'multimedia',
    order: 16,
    pinnedTaskbar: false,
    pinnedStart: false,
    window: { width: 840, height: 600, minWidth: 520, minHeight: 380, resizable: true, singleInstance: true },
    fileAssociations: [],
    permissions: ['camera', 'microphone'],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <path d="M16 12L19 8H29L32 12H38C40.2 12 42 13.8 42 16V36C42 38.2 40.2 40 38 40H10C7.8 40 6 38.2 6 36V16C6 13.8 7.8 12 10 12H16Z" fill="#0284C7"/>
  <circle cx="24" cy="26" r="8" fill="#FFFFFF"/>
  <circle cx="24" cy="26" r="5" fill="#0284C7"/>
</svg>`
  },
  {
    id: 'help',
    name: 'Ayuda',
    description: 'Guía del usuario, novedades y primeros pasos.',
    category: 'sistema',
    order: 17,
    pinnedTaskbar: false,
    pinnedStart: false,
    window: { width: 900, height: 620, minWidth: 580, minHeight: 400, resizable: true, singleInstance: true },
    fileAssociations: [],
    permissions: [],
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="18" fill="#F0FDFA" stroke="#0D9488" stroke-width="2"/>
  <path d="M20 18C20 15.8 21.8 14 24 14C26.2 14 28 15.8 28 18C28 20.5 24 21.5 24 25" stroke="#0D9488" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="24" cy="31" r="1.5" fill="#0D9488"/>
</svg>`
  }
];

const widgets = [
  {
    id: 'clock',
    name: 'Reloj',
    description: 'Hora y fecha actuales.',
    sizes: ['small', 'medium'],
    defaultSize: 'small',
    ownerApp: null,
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="18" fill="#F0FDFA" stroke="#0D9488" stroke-width="2"/>
  <path d="M24 14V24L28 28" stroke="#0D9488" stroke-width="2" stroke-linecap="round"/>
</svg>`
  },
  {
    id: 'calendar',
    name: 'Calendario',
    description: 'Eventos y vista rápida del mes.',
    sizes: ['small', 'medium', 'large'],
    defaultSize: 'medium',
    ownerApp: 'calendar',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect x="8" y="10" width="32" height="32" rx="4" fill="#FFFFFF" stroke="#0284C7" stroke-width="2"/>
  <path d="M8 18H40V14C40 11.8 38.2 10 36 10H12C9.8 10 8 11.8 8 14V18Z" fill="#0284C7"/>
</svg>`
  },
  {
    id: 'quick-note',
    name: 'Nota rápida',
    description: 'Anota ideas al instante en el escritorio.',
    sizes: ['small', 'medium'],
    defaultSize: 'small',
    ownerApp: 'notes',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <rect x="10" y="8" width="28" height="32" rx="3" fill="#FEF08A" stroke="#CA8A04" stroke-width="2"/>
</svg>`
  },
  {
    id: 'system-status',
    name: 'Estado del sistema',
    description: 'Batería, red y espacio usado.',
    sizes: ['small', 'medium'],
    defaultSize: 'medium',
    ownerApp: null,
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="18" fill="#1E293B" stroke="#10B981" stroke-width="2"/>
  <path d="M16 24L22 30L32 18" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
  }
];

const basePath = path.resolve(__dirname, '..', 'src', 'renderer', 'src');

// Generate Apps
apps.forEach((app) => {
  const appDir = path.join(basePath, 'apps', app.id);
  const metaDir = path.join(appDir, 'meta');
  const srcDir = path.join(appDir, 'src');

  fs.mkdirSync(metaDir, { recursive: true });
  fs.mkdirSync(srcDir, { recursive: true });

  const manifest = {
    id: app.id,
    name: app.name,
    description: app.description,
    version: '1.0.0',
    author: 'hebi OS',
    icon: 'icon.svg',
    category: app.category,
    startMenu: {
      visible: true,
      pinnedByDefault: app.pinnedStart,
      order: app.order
    },
    taskbar: {
      pinnedByDefault: app.pinnedTaskbar
    },
    window: app.window,
    fileAssociations: app.fileAssociations,
    permissions: app.permissions
  };

  fs.writeFileSync(path.join(metaDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(path.join(metaDir, 'icon.svg'), app.iconSvg.trim(), 'utf8');

  const indexTsx = `import { EmptyState } from '@os/ui'

export default function ${app.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, (c) => c.toUpperCase())}App(): JSX.Element {
  return (
    <EmptyState
      title="${app.name}"
      description="No hay elementos disponibles."
    />
  )
}
`;
  fs.writeFileSync(path.join(srcDir, 'index.tsx'), indexTsx, 'utf8');
});

// Generate Widgets
widgets.forEach((widget) => {
  const widgetDir = path.join(basePath, 'widgets', widget.id);
  const metaDir = path.join(widgetDir, 'meta');
  const srcDir = path.join(widgetDir, 'src');

  fs.mkdirSync(metaDir, { recursive: true });
  fs.mkdirSync(srcDir, { recursive: true });

  const manifest = {
    id: widget.id,
    name: widget.name,
    description: widget.description,
    icon: 'icon.svg',
    sizes: widget.sizes,
    defaultSize: widget.defaultSize,
    ownerApp: widget.ownerApp
  };

  fs.writeFileSync(path.join(metaDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(path.join(metaDir, 'icon.svg'), widget.iconSvg.trim(), 'utf8');

  const indexTsx = `import { EmptyState } from '@os/ui'

export default function ${widget.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, (c) => c.toUpperCase())}Widget(): JSX.Element {
  return (
    <EmptyState
      title="${widget.name}"
      description="Widget provisional"
    />
  )
}
`;
  fs.writeFileSync(path.join(srcDir, 'index.tsx'), indexTsx, 'utf8');
});

console.log('Seeded 17 apps and 4 widgets successfully!');

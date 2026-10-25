import React from 'react'
import {
  AppManifestSchema,
  AppManifest,
  WidgetManifestSchema,
  WidgetManifest
} from './manifest.schema'

export interface RegisteredApp {
  id: string
  manifest: AppManifest
  iconUrl: string
  coverUrl?: string
  helpText?: string
  component: React.LazyExoticComponent<React.ComponentType<unknown>>
}

export interface RegisteredWidget {
  id: string
  manifest: WidgetManifest
  iconUrl: string
  component: React.LazyExoticComponent<React.ComponentType<unknown>>
}

// 1. Apps discovery via import.meta.glob
const appManifests = import.meta.glob<{ default: unknown }>(
  '../../../apps/*/meta/manifest.json',
  { eager: true }
)

const appAssets = import.meta.glob<string>(
  '../../../apps/*/meta/*.{svg,png,jpg,webp}',
  { eager: true, import: 'default' }
)

const appHelps = import.meta.glob<string>(
  '../../../apps/*/meta/help.md',
  { eager: true, query: '?raw', import: 'default' }
)

const appComponents = import.meta.glob<{ default: React.ComponentType<unknown> }>(
  '../../../apps/*/src/index.tsx'
)

// 2. Widgets discovery via import.meta.glob
const widgetManifests = import.meta.glob<{ default: unknown }>(
  '../../../widgets/*/meta/manifest.json',
  { eager: true }
)

const widgetAssets = import.meta.glob<string>(
  '../../../widgets/*/meta/*.{svg,png,jpg,webp}',
  { eager: true, import: 'default' }
)

const widgetComponents = import.meta.glob<{ default: React.ComponentType<unknown> }>(
  '../../../widgets/*/src/index.tsx'
)

// Helper to extract folder name/id from path
function extractAppId(path: string): string {
  const match = path.match(/apps\/([^/]+)\//)
  return match ? match[1] : ''
}

function extractWidgetId(path: string): string {
  const match = path.match(/widgets\/([^/]+)\//)
  return match ? match[1] : ''
}

// Build Apps Registry
const appsMap = new Map<string, RegisteredApp>()

for (const [path, module] of Object.entries(appManifests)) {
  const folderId = extractAppId(path)
  const rawManifest = (module as { default: unknown }).default

  const result = AppManifestSchema.safeParse(rawManifest)
  if (!result.success) {
    console.error(
      `[Apps Registry] Error al validar el manifiesto de la aplicación "${folderId}":`,
      result.error.format()
    )
    continue
  }

  const manifest = result.data
  if (manifest.id !== folderId) {
    console.error(
      `[Apps Registry] El ID del manifiesto ("${manifest.id}") no coincide con el nombre de carpeta ("${folderId}"). Se omitirá la aplicación.`
    )
    continue
  }

  // Find icon
  const iconKey = Object.keys(appAssets).find(
    (k) => k.includes(`/apps/${folderId}/meta/`) && k.endsWith(manifest.icon)
  )
  const iconUrl = iconKey ? appAssets[iconKey] : ''

  // Find cover if present
  let coverUrl: string | undefined
  if (manifest.cover) {
    const coverKey = Object.keys(appAssets).find(
      (k) => k.includes(`/apps/${folderId}/meta/`) && k.endsWith(manifest.cover!)
    )
    if (coverKey) {
      coverUrl = appAssets[coverKey]
    }
  }

  // Find help.md if present
  const helpKey = Object.keys(appHelps).find((k) =>
    k.includes(`/apps/${folderId}/meta/help.md`)
  )
  const helpText = helpKey ? appHelps[helpKey] : undefined

  // Find component
  const compKey = Object.keys(appComponents).find((k) =>
    k.includes(`/apps/${folderId}/src/index.tsx`)
  )
  if (!compKey) {
    console.error(
      `[Apps Registry] No se encontró el componente raíz para la aplicación "${folderId}".`
    )
    continue
  }

  const component = React.lazy(
    appComponents[compKey] as () => Promise<{ default: React.ComponentType<unknown> }>
  )

  appsMap.set(folderId, {
    id: folderId,
    manifest,
    iconUrl,
    coverUrl,
    helpText,
    component
  })
}

// Build Widgets Registry
const widgetsMap = new Map<string, RegisteredWidget>()

for (const [path, module] of Object.entries(widgetManifests)) {
  const folderId = extractWidgetId(path)
  const rawManifest = (module as { default: unknown }).default

  const result = WidgetManifestSchema.safeParse(rawManifest)
  if (!result.success) {
    console.error(
      `[Widgets Registry] Error al validar el manifiesto del widget "${folderId}":`,
      result.error.format()
    )
    continue
  }

  const manifest = result.data
  if (manifest.id !== folderId) {
    console.error(
      `[Widgets Registry] El ID del widget ("${manifest.id}") no coincide con la carpeta ("${folderId}").`
    )
    continue
  }

  const iconKey = Object.keys(widgetAssets).find(
    (k) => k.includes(`/widgets/${folderId}/meta/`) && k.endsWith(manifest.icon)
  )
  const iconUrl = iconKey ? widgetAssets[iconKey] : ''

  const compKey = Object.keys(widgetComponents).find((k) =>
    k.includes(`/widgets/${folderId}/src/index.tsx`)
  )
  if (!compKey) {
    console.error(
      `[Widgets Registry] No se encontró el componente raíz para el widget "${folderId}".`
    )
    continue
  }

  const component = React.lazy(
    widgetComponents[compKey] as () => Promise<{ default: React.ComponentType<unknown> }>
  )

  widgetsMap.set(folderId, {
    id: folderId,
    manifest,
    iconUrl,
    component
  })
}

export function getAllApps(): RegisteredApp[] {
  return Array.from(appsMap.values())
}

export function getApp(id: string): RegisteredApp | undefined {
  return appsMap.get(id)
}

export function getAllWidgets(): RegisteredWidget[] {
  return Array.from(widgetsMap.values())
}

export function getWidget(id: string): RegisteredWidget | undefined {
  return widgetsMap.get(id)
}

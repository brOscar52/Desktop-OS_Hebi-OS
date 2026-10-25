import { z } from 'zod'

export const AppPermissionSchema = z.enum([
  'camera',
  'microphone',
  'settings:write',
  'system:processes',
  'system:account'
])
export type AppPermission = z.infer<typeof AppPermissionSchema>

export const AppCategorySchema = z.enum(['sistema', 'productividad', 'multimedia', 'utilidades'])
export type AppCategory = z.infer<typeof AppCategorySchema>

export const FileAssociationSchema = z.object({
  extensions: z.array(z.string()),
  role: z.enum(['editor', 'viewer']),
  priority: z.number().default(1)
})
export type FileAssociation = z.infer<typeof FileAssociationSchema>

export const AppManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().default(''),
  version: z.string().default('1.0.0'),
  author: z.string().default(''),
  icon: z.string().default('icon.svg'),
  cover: z.string().optional(),
  category: AppCategorySchema,
  startMenu: z
    .object({
      visible: z.boolean().default(true),
      pinnedByDefault: z.boolean().default(false),
      order: z.number().default(100)
    })
    .default({ visible: true, pinnedByDefault: false, order: 100 }),
  taskbar: z
    .object({
      pinnedByDefault: z.boolean().default(false)
    })
    .default({ pinnedByDefault: false }),
  window: z
    .object({
      width: z.number().default(800),
      height: z.number().default(600),
      minWidth: z.number().default(400),
      minHeight: z.number().default(300),
      resizable: z.boolean().default(true),
      singleInstance: z.boolean().default(false)
    })
    .default({
      width: 800,
      height: 600,
      minWidth: 400,
      minHeight: 300,
      resizable: true,
      singleInstance: false
    }),
  fileAssociations: z.array(FileAssociationSchema).default([]),
  permissions: z.array(AppPermissionSchema).default([])
})

export type AppManifest = z.infer<typeof AppManifestSchema>

export const WidgetSizeSchema = z.enum(['small', 'medium', 'large'])
export type WidgetSize = z.infer<typeof WidgetSizeSchema>

export const WidgetManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  description: z.string().default(''),
  icon: z.string().default('icon.svg'),
  sizes: z.array(WidgetSizeSchema).min(1),
  defaultSize: WidgetSizeSchema.default('small'),
  ownerApp: z.string().nullable().default(null)
})

export type WidgetManifest = z.infer<typeof WidgetManifestSchema>

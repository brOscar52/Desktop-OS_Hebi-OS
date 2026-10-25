export type DialogType =
  | 'alert'
  | 'confirm'
  | 'prompt'
  | 'choose'
  | 'openFile'
  | 'saveFile'
  | 'unsavedChanges'

export interface AlertOptions {
  title: string
  message?: string
}

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export interface PromptOptions {
  title: string
  message?: string
  defaultValue?: string
  validate?: (v: string) => string | null
}

export interface ChooseOption<T extends string = string> {
  value: T
  label: string
  destructive?: boolean
}

export interface ChooseOptions<T extends string = string> {
  title: string
  message?: string
  options: ChooseOption<T>[]
}

export interface OpenFileOptions {
  startPath?: string
  extensions?: string[]
  multiple?: boolean
  folders?: boolean
}

export interface SaveFileOptions {
  startPath?: string
  defaultName?: string
  extensions?: string[]
}

export interface UnsavedChangesOptions {
  documentName: string
}

export type UnsavedChangesResult = 'save' | 'dont-save' | 'cancel'

export interface ActiveDialog {
  id: string
  targetWindowId: string | null
  type: DialogType
  options:
    | AlertOptions
    | ConfirmOptions
    | PromptOptions
    | ChooseOptions
    | OpenFileOptions
    | SaveFileOptions
    | UnsavedChangesOptions
  resolve: (value: unknown) => void
}

export interface DialogsApi {
  alert(o: AlertOptions): Promise<void>
  confirm(o: ConfirmOptions): Promise<boolean>
  prompt(o: PromptOptions): Promise<string | null>
  choose<T extends string>(o: ChooseOptions<T>): Promise<T | null>
  openFile(o?: OpenFileOptions): Promise<string[] | null>
  saveFile(o?: SaveFileOptions): Promise<string | null>
}

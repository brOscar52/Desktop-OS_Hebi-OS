import { create } from 'zustand'
import {
  ActiveDialog,
  AlertOptions,
  ConfirmOptions,
  PromptOptions,
  ChooseOptions,
  OpenFileOptions,
  SaveFileOptions,
  UnsavedChangesOptions,
  UnsavedChangesResult,
  DialogsApi
} from './types'

interface DialogsStore {
  dialogs: ActiveDialog[]
  addDialog: (dialog: ActiveDialog) => void
  removeDialog: (id: string) => void
}

export const useDialogsStore = create<DialogsStore>((set) => ({
  dialogs: [],
  addDialog: (dialog) => set((state) => ({ dialogs: [...state.dialogs, dialog] })),
  removeDialog: (id) =>
    set((state) => ({ dialogs: state.dialogs.filter((d) => d.id !== id) }))
}))

class DialogsService {
  private show<T>(
    type: ActiveDialog['type'],
    options: ActiveDialog['options'],
    targetWindowId: string | null = null
  ): Promise<T> {
    return new Promise<T>((resolve) => {
      const id = 'dlg-' + Math.random().toString(36).substring(2, 9)
      const dialog: ActiveDialog = {
        id,
        targetWindowId,
        type,
        options,
        resolve: (val: unknown) => {
          useDialogsStore.getState().removeDialog(id)
          resolve(val as T)
        }
      }
      useDialogsStore.getState().addDialog(dialog)
    })
  }

  // System modals
  alert(o: AlertOptions): Promise<void> {
    return this.show<void>('alert', o, null)
  }

  confirm(o: ConfirmOptions): Promise<boolean> {
    return this.show<boolean>('confirm', o, null)
  }

  prompt(o: PromptOptions): Promise<string | null> {
    return this.show<string | null>('prompt', o, null)
  }

  choose<T extends string>(o: ChooseOptions<T>): Promise<T | null> {
    return this.show<T | null>('choose', o, null)
  }

  openFile(o?: OpenFileOptions): Promise<string[] | null> {
    return this.show<string[] | null>('openFile', o || {}, null)
  }

  saveFile(o?: SaveFileOptions): Promise<string | null> {
    return this.show<string | null>('saveFile', o || {}, null)
  }

  // Special Unsaved Changes flow modal
  askUnsavedChanges(
    documentName: string,
    targetWindowId: string | null = null
  ): Promise<UnsavedChangesResult> {
    const opts: UnsavedChangesOptions = { documentName }
    return this.show<UnsavedChangesResult>('unsavedChanges', opts, targetWindowId)
  }

  // Window modals factory for apps
  createWindowDialogs(targetWindowId: string): DialogsApi {
    return {
      alert: (o: AlertOptions) => this.show<void>('alert', o, targetWindowId),
      confirm: (o: ConfirmOptions) => this.show<boolean>('confirm', o, targetWindowId),
      prompt: (o: PromptOptions) => this.show<string | null>('prompt', o, targetWindowId),
      choose: <T extends string>(o: ChooseOptions<T>) =>
        this.show<T | null>('choose', o, targetWindowId),
      openFile: (o?: OpenFileOptions) =>
        this.show<string[] | null>('openFile', o || {}, targetWindowId),
      saveFile: (o?: SaveFileOptions) =>
        this.show<string | null>('saveFile', o || {}, targetWindowId)
    }
  }
}

export const dialogs = new DialogsService()
export * from './types'

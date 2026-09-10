import { Capacitor, registerPlugin } from '@capacitor/core'

export type EntryDirection = 'income' | 'expense'
export const isQuickEntry = Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('QuickEntry')
export const QuickEntry = registerPlugin<{
  context(): Promise<{ direction: EntryDirection; refreshOnly?: boolean }>
  close(options: { saved?: boolean }): Promise<void>
  openApp(): Promise<void>
}>('QuickEntry')

export function validQuickAmount(value: string) {
  return /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 999999999999
}

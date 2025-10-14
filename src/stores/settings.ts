import type { AppSettings } from '@/schemas/settings'
import { loadJSON, saveJSON } from '@/utils/storage'
import { AppSettingsSchema } from '@schemas/settings'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'app:settings'

const defaults: AppSettings = {
  sidebarPosition: 'left',
  theme: 'light',
}

export const useSettingsStore = defineStore('settings', {
  state: (): AppSettings => ({ ...defaults }),
  actions: {
    setTheme(theme: AppSettings['theme']) {
      this.theme = theme
    },

    // Returns true if valid settings were loaded from storage, false otherwise
    loadFromStorage(): boolean {
      try {
        const raw = loadJSON(STORAGE_KEY)
        if (!raw) {
          return false
        }
        const parsed = AppSettingsSchema.safeParse(raw)
        if (parsed.success) {
          Object.assign(this, parsed.data)
          return true
        }
        else {
          console.error('Invalid settings in storage, ignoring', parsed.error)
          return false
        }
      }
      catch (error) {
        console.error('Failed to load settings from storage:', error)
        return false
      }
    },

    persist() {
      try {
        saveJSON(STORAGE_KEY, this.$state)
      }
      catch (error) {
        console.error('Failed to save settings to storage:', error)
      }
    },

    resetToDefaults() {
      Object.assign(this, defaults)
      this.persist()
    },
  },
})

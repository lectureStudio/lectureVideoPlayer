import { AppSettingsSchema } from '@/schemas/settings'
import { useSettingsStore } from '@/stores/settings'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the storage utilities
vi.mock('@/utils/storage', () => ({
  loadJSON: vi.fn(),
  saveJSON: vi.fn(),
}))

import { loadJSON, saveJSON } from '@/utils/storage'

describe('SettingsStore', () => {
  let store: ReturnType<typeof useSettingsStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useSettingsStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    store.resetToDefaults()
  })

  describe('initial state', () => {
    it('should have correct default values', () => {
      expect(store.sidebarPosition).toBe('left')
      expect(store.theme).toBe('light')
    })
  })

  describe('setTheme', () => {
    it('should set theme to light', () => {
      store.setTheme('light')
      expect(store.theme).toBe('light')
    })

    it('should set theme to dark', () => {
      store.setTheme('dark')
      expect(store.theme).toBe('dark')
    })
  })

  describe('loadFromStorage', () => {
    it('should load valid settings from storage', () => {
      const validSettings = {
        theme: 'dark',
        sidebarPosition: 'right',
      }

      vi.mocked(loadJSON).mockReturnValue(validSettings)

      const result = store.loadFromStorage()

      expect(result).toBe(true)
      expect(store.theme).toBe('dark')
      expect(store.sidebarPosition).toBe('right')
    })

    it('should return false when no data in storage', () => {
      vi.mocked(loadJSON).mockReturnValue(null)

      const result = store.loadFromStorage()

      expect(result).toBe(false)
      expect(store.theme).toBe('light') // Default unchanged
      expect(store.sidebarPosition).toBe('left') // Default unchanged
    })

    it('should return false and log error for invalid settings', () => {
      const invalidSettings = {
        theme: 'invalid-theme',
        sidebarPosition: 'invalid-position',
      }

      vi.mocked(loadJSON).mockReturnValue(invalidSettings)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = store.loadFromStorage()

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid settings in storage, ignoring',
        expect.any(Object),
      )
      expect(store.theme).toBe('light') // Default unchanged
      expect(store.sidebarPosition).toBe('left') // Default unchanged

      consoleSpy.mockRestore()
    })

    it('should handle partial valid settings', () => {
      const partialSettings = {
        theme: 'dark',
        // sidebarPosition missing
      }

      vi.mocked(loadJSON).mockReturnValue(partialSettings)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = store.loadFromStorage()

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
      expect(store.theme).toBe('light') // Default unchanged
    })

    it('should handle corrupted JSON data', () => {
      vi.mocked(loadJSON).mockReturnValue('invalid-json')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = store.loadFromStorage()

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('persist', () => {
    it('should save current state to storage', () => {
      store.theme = 'dark'
      store.sidebarPosition = 'right'

      store.persist()

      expect(saveJSON).toHaveBeenCalledWith('app:settings', {
        theme: 'dark',
        sidebarPosition: 'right',
      })
    })

    it('should save default state', () => {
      store.persist()

      expect(saveJSON).toHaveBeenCalledWith('app:settings', {
        theme: 'light',
        sidebarPosition: 'left',
      })
    })
  })

  describe('resetToDefaults', () => {
    it('should reset to default values and persist', () => {
      // Set non-default values
      store.theme = 'dark'
      store.sidebarPosition = 'right'

      store.resetToDefaults()

      expect(store.theme).toBe('light')
      expect(store.sidebarPosition).toBe('left')
      expect(saveJSON).toHaveBeenCalledWith('app:settings', {
        theme: 'light',
        sidebarPosition: 'left',
      })
    })
  })

  describe('schema validation', () => {
    it('should validate theme enum values', () => {
      const validThemes = ['light', 'dark'] as const

      validThemes.forEach(theme => {
        const result = AppSettingsSchema.safeParse({ theme, sidebarPosition: 'left' })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid theme values', () => {
      const invalidThemes = ['invalid', '', null, undefined, 123] as const

      invalidThemes.forEach(theme => {
        const result = AppSettingsSchema.safeParse({ theme, sidebarPosition: 'left' })
        expect(result.success).toBe(false)
      })
    })

    it('should validate sidebar position enum values', () => {
      const validPositions = ['left', 'right', 'none'] as const

      validPositions.forEach(position => {
        const result = AppSettingsSchema.safeParse({ theme: 'light', sidebarPosition: position })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid sidebar position values', () => {
      const invalidPositions = ['invalid', '', null, undefined, 123] as const

      invalidPositions.forEach(position => {
        const result = AppSettingsSchema.safeParse({ theme: 'light', sidebarPosition: position })
        expect(result.success).toBe(false)
      })
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete settings lifecycle', () => {
      // Load settings
      const savedSettings = {
        theme: 'dark',
        sidebarPosition: 'right',
      }
      vi.mocked(loadJSON).mockReturnValue(savedSettings)

      const loadResult = store.loadFromStorage()
      expect(loadResult).toBe(true)
      expect(store.theme).toBe('dark')
      expect(store.sidebarPosition).toBe('right')

      // Change settings
      store.setTheme('light')
      expect(store.theme).toBe('light')

      // Persist changes
      store.persist()
      expect(saveJSON).toHaveBeenCalledWith('app:settings', {
        theme: 'light',
        sidebarPosition: 'right',
      })

      // Reset to defaults
      store.resetToDefaults()
      expect(store.theme).toBe('light')
      expect(store.sidebarPosition).toBe('left')
    })

    it('should handle storage errors gracefully', () => {
      vi.mocked(loadJSON).mockImplementation(() => {
        throw new Error('Storage error')
      })

      // The function should not throw, but return false
      expect(() => store.loadFromStorage()).not.toThrow()
    })

    it('should handle save errors gracefully', () => {
      vi.mocked(saveJSON).mockImplementation(() => {
        throw new Error('Save error')
      })

      // The persist function should not throw
      expect(() => store.persist()).not.toThrow()
    })
  })
})

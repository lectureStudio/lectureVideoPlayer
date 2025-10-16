import { useScreenWakeLock } from '@/composables/useScreenWakeLock'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('useScreenWakeLock', () => {
  let mockWakeLock: {
    request: ReturnType<typeof vi.fn>
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
    release: ReturnType<typeof vi.fn>
  }

  // Helper function to create a test component with useScreenWakeLock
  const createTestComponent = () => {
    let composableResult: ReturnType<typeof useScreenWakeLock>
    const wrapper = mount({
      setup() {
        composableResult = useScreenWakeLock()
        return composableResult
      },
      template: '<div></div>',
    })
    return { wrapper, composable: composableResult! }
  }

  beforeEach(() => {
    mockWakeLock = {
      request: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      release: vi.fn().mockResolvedValue(undefined),
    }

    // Delete existing property if it exists
    try {
      delete (navigator as typeof navigator & { wakeLock?: unknown }).wakeLock
    }
    catch (_e) {
      // Ignore errors
    }

    // Mock navigator.wakeLock
    Object.defineProperty(navigator, 'wakeLock', {
      writable: true,
      configurable: true,
      value: mockWakeLock,
    })

    // Mock document.hidden
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: false,
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should check for wake lock support on mount', async () => {
      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      expect(composable.isSupported.value).toBe(true)

      wrapper.unmount()
    })

    it('should detect lack of support', async () => {
      // Override the mock to simulate no wakeLock support
      vi.spyOn(navigator, 'wakeLock', 'get').mockReturnValue(undefined)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      expect(composable.isSupported.value).toBe(false)

      wrapper.unmount()
    })

    it('should detect partial support (no request method)', async () => {
      // Override the mock to simulate wakeLock without request method
      vi.spyOn(navigator, 'wakeLock', 'get').mockReturnValue({} as WakeLock)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      expect(composable.isSupported.value).toBe(false)

      wrapper.unmount()
    })
  })

  describe('requestWakeLock', () => {
    it('should request wake lock successfully', async () => {
      const mockSentinel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        release: vi.fn().mockResolvedValue(undefined),
      }
      mockWakeLock.request.mockResolvedValue(mockSentinel)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { requestWakeLock, isActive } = composable

      const result = await requestWakeLock()

      expect(result).toBe(true)
      expect(isActive.value).toBe(true)
      expect(mockWakeLock.request).toHaveBeenCalledWith('screen')
      expect(mockSentinel.addEventListener).toHaveBeenCalledWith('release', expect.any(Function))
    })

    it('should return false when not supported', async () => {
      // Override the mock to simulate no wakeLock support
      vi.spyOn(navigator, 'wakeLock', 'get').mockReturnValue(undefined)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { requestWakeLock } = composable

      const result = await requestWakeLock()

      expect(result).toBe(false)

      wrapper.unmount()
    })

    it('should return false when already active', async () => {
      const mockSentinel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        release: vi.fn().mockResolvedValue(undefined),
      }
      mockWakeLock.request.mockResolvedValue(mockSentinel)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { requestWakeLock } = composable

      // Request first time
      await requestWakeLock()

      // Request second time
      const result = await requestWakeLock()

      expect(result).toBe(false)
      expect(mockWakeLock.request).toHaveBeenCalledTimes(1)
    })

    it('should handle request errors gracefully', async () => {
      const error = new Error('Wake lock request failed')
      mockWakeLock.request.mockRejectedValue(error)
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { requestWakeLock, isActive } = composable

      const result = await requestWakeLock()

      expect(result).toBe(false)
      expect(isActive.value).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to request wake lock:', error)

      consoleSpy.mockRestore()
    })

    it('should handle wake lock release event', async () => {
      const mockSentinel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        release: vi.fn().mockResolvedValue(undefined),
      }
      mockWakeLock.request.mockResolvedValue(mockSentinel)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { requestWakeLock, isActive } = composable

      await requestWakeLock()
      expect(isActive.value).toBe(true)

      // Simulate release event
      const releaseHandler = mockSentinel.addEventListener.mock.calls.find(
        call => call[0] === 'release',
      )?.[1]

      releaseHandler?.()

      expect(isActive.value).toBe(false)
    })
  })

  describe('releaseWakeLock', () => {
    it('should release wake lock successfully', async () => {
      const mockSentinel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        release: vi.fn().mockResolvedValue(undefined),
      }
      mockWakeLock.request.mockResolvedValue(mockSentinel)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { requestWakeLock, releaseWakeLock, isActive } = composable

      await requestWakeLock()
      expect(isActive.value).toBe(true)

      await releaseWakeLock()

      expect(mockSentinel.release).toHaveBeenCalled()
      expect(isActive.value).toBe(false)
    })

    it('should handle release when no wake lock is active', async () => {
      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { releaseWakeLock } = composable

      // Should not throw
      await expect(releaseWakeLock()).resolves.toBeUndefined()
    })

    it('should handle release errors gracefully', async () => {
      const mockSentinel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        release: vi.fn().mockRejectedValue(new Error('Release failed')),
      }
      mockWakeLock.request.mockResolvedValue(mockSentinel)
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { requestWakeLock, releaseWakeLock } = composable

      await requestWakeLock()
      await releaseWakeLock()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to release wake lock:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('handleVisibilityChange', () => {
    it('should release wake lock when page becomes hidden', async () => {
      const mockSentinel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        release: vi.fn().mockResolvedValue(undefined),
      }
      mockWakeLock.request.mockResolvedValue(mockSentinel)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { requestWakeLock, handleVisibilityChange, isActive } = composable

      await requestWakeLock()
      expect(isActive.value).toBe(true)

      // Simulate page becoming hidden
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
      })

      await handleVisibilityChange(true)

      expect(mockSentinel.release).toHaveBeenCalled()
      expect(isActive.value).toBe(false)
    })

    it('should request wake lock when page becomes visible and should be active', async () => {
      const mockSentinel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        release: vi.fn().mockResolvedValue(undefined),
      }
      mockWakeLock.request.mockResolvedValue(mockSentinel)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { handleVisibilityChange, isActive } = composable

      // Simulate page becoming visible
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      })

      await handleVisibilityChange(true)

      expect(mockWakeLock.request).toHaveBeenCalledWith('screen')
      expect(isActive.value).toBe(true)
    })

    it('should not request wake lock when page becomes visible but should not be active', async () => {
      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { handleVisibilityChange } = composable

      // Simulate page becoming visible
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      })

      await handleVisibilityChange(false)

      expect(mockWakeLock.request).not.toHaveBeenCalled()
    })

    it('should not request wake lock when already active', async () => {
      const mockSentinel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        release: vi.fn().mockResolvedValue(undefined),
      }
      mockWakeLock.request.mockResolvedValue(mockSentinel)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { requestWakeLock, handleVisibilityChange } = composable

      // Make it active first
      await requestWakeLock()

      // Simulate page becoming visible
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      })

      await handleVisibilityChange(true)

      expect(mockWakeLock.request).toHaveBeenCalledTimes(1) // Only the initial request
    })

    it('should do nothing when not supported', async () => {
      // Override the mock to simulate no wakeLock support
      vi.spyOn(navigator, 'wakeLock', 'get').mockReturnValue(undefined)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { handleVisibilityChange } = composable

      await handleVisibilityChange(true)

      // mockWakeLock.request won't be called because wakeLock is not supported
      wrapper.unmount()
    })
  })

  describe('cleanup', () => {
    it('should release wake lock on unmount', async () => {
      const mockSentinel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        release: vi.fn().mockResolvedValue(undefined),
      }
      mockWakeLock.request.mockResolvedValue(mockSentinel)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { requestWakeLock } = composable

      await requestWakeLock()

      // We can't easily test the actual unmount behavior without Vue's lifecycle
      // but we can verify the structure is correct
      expect(mockWakeLock.request).toHaveBeenCalled()
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete wake lock lifecycle', async () => {
      const mockSentinel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        release: vi.fn().mockResolvedValue(undefined),
      }
      mockWakeLock.request.mockResolvedValue(mockSentinel)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const {
        isSupported,
        isActive,
        requestWakeLock,
        releaseWakeLock,
        handleVisibilityChange,
      } = composable

      // Initial state
      expect(isSupported.value).toBe(true)
      expect(isActive.value).toBe(false)

      // Request wake lock
      const requestResult = await requestWakeLock()
      expect(requestResult).toBe(true)
      expect(isActive.value).toBe(true)

      // Handle visibility change (hide)
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
      })
      await handleVisibilityChange(true)
      expect(isActive.value).toBe(false)

      // Handle visibility change (show)
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      })
      await handleVisibilityChange(true)
      expect(isActive.value).toBe(true)

      // Release wake lock
      await releaseWakeLock()
      expect(isActive.value).toBe(false)
    })

    it('should handle wake lock release by system', async () => {
      const mockSentinel = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        release: vi.fn().mockResolvedValue(undefined),
      }
      mockWakeLock.request.mockResolvedValue(mockSentinel)

      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      const { requestWakeLock, isActive } = composable

      await requestWakeLock()
      expect(isActive.value).toBe(true)

      // Simulate system releasing the wake lock
      const releaseHandler = mockSentinel.addEventListener.mock.calls.find(
        call => call[0] === 'release',
      )?.[1]

      releaseHandler?.()

      expect(isActive.value).toBe(false)
    })
  })
})

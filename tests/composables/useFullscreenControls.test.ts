import { useFullscreenControls } from '@/composables/useFullscreenControls'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the fullscreen utilities
vi.mock('@/utils/fullscreen', () => ({
  isFullscreenApiSupported: vi.fn(),
  isSimulatedActive: vi.fn(),
}))

import { isFullscreenApiSupported, isSimulatedActive } from '@/utils/fullscreen'

// Helper function to create a test component with useFullscreenControls
const createTestComponent = () => {
  let composableResult: ReturnType<typeof useFullscreenControls>
  const wrapper = mount({
    setup() {
      composableResult = useFullscreenControls()
      return composableResult
    },
    template: '<div></div>',
  })
  return { wrapper, composable: composableResult! }
}

describe('useFullscreenControls', () => {
  let mockRequestFullscreen: ReturnType<typeof vi.fn>
  let mockExitFullscreen: ReturnType<typeof vi.fn>
  let mockAddEventListener: ReturnType<typeof vi.fn>
  let mockRemoveEventListener: ReturnType<typeof vi.fn>
  let mockSetTimeout: ReturnType<typeof vi.fn>
  let mockClearTimeout: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock DOM methods
    mockRequestFullscreen = vi.fn().mockResolvedValue(undefined)
    mockExitFullscreen = vi.fn().mockResolvedValue(undefined)
    mockAddEventListener = vi.fn()
    mockRemoveEventListener = vi.fn()
    mockSetTimeout = vi.fn().mockReturnValue(123)
    mockClearTimeout = vi.fn()

    // Mock document methods
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      value: null,
    })
    Object.defineProperty(document, 'exitFullscreen', {
      writable: true,
      value: mockExitFullscreen,
    })
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      writable: true,
      value: mockRequestFullscreen,
    })
    Object.defineProperty(document, 'addEventListener', {
      writable: true,
      value: mockAddEventListener,
    })
    Object.defineProperty(document, 'removeEventListener', {
      writable: true,
      value: mockRemoveEventListener,
    })

    // Mock window methods
    Object.defineProperty(window, 'setTimeout', {
      writable: true,
      value: mockSetTimeout,
    })
    Object.defineProperty(window, 'clearTimeout', {
      writable: true,
      value: mockClearTimeout,
    })
    Object.defineProperty(window, 'addEventListener', {
      writable: true,
      value: mockAddEventListener,
    })
    Object.defineProperty(window, 'removeEventListener', {
      writable: true,
      value: mockRemoveEventListener,
    })

    // Mock classList
    const mockClassList = {
      add: vi.fn(),
      remove: vi.fn(),
    }
    Object.defineProperty(document.documentElement, 'classList', {
      writable: true,
      value: mockClassList,
    })

    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should register fullscreen change listener on first use', async () => {
      const { wrapper } = createTestComponent()
      await wrapper.vm.$nextTick()

      expect(mockAddEventListener).toHaveBeenCalledWith('fullscreenchange', expect.any(Function))

      wrapper.unmount()
    })

    it('should not register multiple listeners for multiple consumers', async () => {
      const { wrapper: wrapper1 } = createTestComponent()
      const { wrapper: wrapper2 } = createTestComponent()
      const { wrapper: wrapper3 } = createTestComponent()

      await wrapper1.vm.$nextTick()
      await wrapper2.vm.$nextTick()
      await wrapper3.vm.$nextTick()

      expect(mockAddEventListener).toHaveBeenCalledTimes(1)

      wrapper1.unmount()
      wrapper2.unmount()
      wrapper3.unmount()
    })
  })

  describe('toggleFullscreen', () => {
    it('should enter fullscreen when not in fullscreen', async () => {
      vi.mocked(isFullscreenApiSupported).mockReturnValue(true)
      document.fullscreenElement = null

      const { toggleFullscreen } = useFullscreenControls()
      await toggleFullscreen()

      expect(mockRequestFullscreen).toHaveBeenCalled()
    })

    it('should exit fullscreen when in fullscreen', async () => {
      vi.mocked(isFullscreenApiSupported).mockReturnValue(true)
      document.fullscreenElement = document.documentElement

      const { toggleFullscreen } = useFullscreenControls()
      await toggleFullscreen()

      expect(mockExitFullscreen).toHaveBeenCalled()
    })

    it('should use fallback when fullscreen API not supported', async () => {
      vi.mocked(isFullscreenApiSupported).mockReturnValue(false)
      vi.mocked(isSimulatedActive).mockReturnValue(false)

      const { toggleFullscreen } = useFullscreenControls()
      await toggleFullscreen()

      expect(mockRequestFullscreen).not.toHaveBeenCalled()
      expect(mockExitFullscreen).not.toHaveBeenCalled()
    })

    it('should handle fullscreen errors gracefully', async () => {
      vi.mocked(isFullscreenApiSupported).mockReturnValue(true)
      mockRequestFullscreen.mockRejectedValue(new Error('Fullscreen failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { toggleFullscreen } = useFullscreenControls()
      await toggleFullscreen()

      expect(consoleSpy).toHaveBeenCalledWith('Fullscreen toggle failed:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('fullscreen state management', () => {
    it('should update fullscreen state when entering fullscreen', async () => {
      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Simulate fullscreen change event
      document.fullscreenElement = document.documentElement
      const eventListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'fullscreenchange',
      )?.[1]

      eventListener?.(new Event('fullscreenchange'))

      expect(composable.fullscreen.value).toBe(true)

      wrapper.unmount()
    })

    it('should update fullscreen state when exiting fullscreen', async () => {
      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Simulate fullscreen change event
      document.fullscreenElement = null
      const eventListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'fullscreenchange',
      )?.[1]

      eventListener?.(new Event('fullscreenchange'))

      expect(composable.fullscreen.value).toBe(false)

      wrapper.unmount()
    })

    it('should handle manual state changes', async () => {
      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Simulate manual state change
      const eventListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'fullscreenchange',
      )?.[1]

      eventListener?.(true)

      expect(composable.fullscreen.value).toBe(true)

      wrapper.unmount()
    })
  })

  describe('controls visibility', () => {
    it('should show controls when entering fullscreen', async () => {
      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Simulate entering fullscreen
      document.fullscreenElement = document.documentElement
      const eventListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'fullscreenchange',
      )?.[1]

      eventListener?.(new Event('fullscreenchange'))

      expect(composable.controlsVisible.value).toBe(true)

      wrapper.unmount()
    })

    it('should hide controls after timeout in fullscreen', async () => {
      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Enter fullscreen
      document.fullscreenElement = document.documentElement
      const eventListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'fullscreenchange',
      )?.[1]

      eventListener?.(new Event('fullscreenchange'))

      // Simulate timeout
      const timeoutCallback = mockSetTimeout.mock.calls[0]?.[0]
      timeoutCallback?.()

      expect(composable.controlsVisible.value).toBe(false)

      wrapper.unmount()
    })

    it('should show controls on user activity', async () => {
      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Enter fullscreen and hide controls
      document.fullscreenElement = document.documentElement
      const eventListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'fullscreenchange',
      )?.[1]

      eventListener?.(new Event('fullscreenchange'))

      // Hide controls
      const timeoutCallback = mockSetTimeout.mock.calls[0]?.[0]
      timeoutCallback?.()
      expect(composable.controlsVisible.value).toBe(false)

      // Simulate user activity
      composable.onUserActivity()

      expect(composable.controlsVisible.value).toBe(true)

      wrapper.unmount()
    })

    it('should not hide controls when not in fullscreen', async () => {
      const { wrapper, composable } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Simulate timeout when not in fullscreen
      const timeoutCallback = mockSetTimeout.mock.calls[0]?.[0]
      timeoutCallback?.()

      expect(composable.controlsVisible.value).toBe(true) // Should remain visible

      wrapper.unmount()
    })

    it('should clear timeout when exiting fullscreen', async () => {
      const { wrapper } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Enter fullscreen
      document.fullscreenElement = document.documentElement
      const eventListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'fullscreenchange',
      )?.[1]

      eventListener?.(new Event('fullscreenchange'))

      // Exit fullscreen
      document.fullscreenElement = null
      eventListener?.(new Event('fullscreenchange'))

      expect(mockClearTimeout).toHaveBeenCalled()

      wrapper.unmount()
    })
  })

  describe('activity listeners', () => {
    it('should attach activity listeners when entering fullscreen', async () => {
      const { wrapper } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Enter fullscreen
      document.fullscreenElement = document.documentElement
      const eventListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'fullscreenchange',
      )?.[1]

      eventListener?.(new Event('fullscreenchange'))

      // Should have attached activity listeners to window
      expect(mockAddEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function), { passive: true })
      expect(mockAddEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function), { passive: true })
      expect(mockAddEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true })

      wrapper.unmount()
    })

    it('should detach activity listeners when exiting fullscreen', async () => {
      const { wrapper } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Enter fullscreen
      document.fullscreenElement = document.documentElement
      const eventListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'fullscreenchange',
      )?.[1]

      eventListener?.(new Event('fullscreenchange'))

      // Exit fullscreen
      document.fullscreenElement = null
      eventListener?.(new Event('fullscreenchange'))

      // Should have detached activity listeners from window
      expect(mockRemoveEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(mockRemoveEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function))
      expect(mockRemoveEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function))

      wrapper.unmount()
    })

    it('should not attach listeners multiple times', async () => {
      const { wrapper } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Enter fullscreen multiple times
      document.fullscreenElement = document.documentElement
      const eventListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'fullscreenchange',
      )?.[1]

      eventListener?.(new Event('fullscreenchange'))
      eventListener?.(new Event('fullscreenchange'))

      // Should only attach once
      const activityListenerCalls = mockAddEventListener.mock.calls.filter(
        call => call[0] === 'mousemove',
      )
      expect(activityListenerCalls).toHaveLength(1)

      wrapper.unmount()
    })
  })

  describe('cleanup', () => {
    it('should remove listeners when last consumer unmounts', async () => {
      const { wrapper } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Verify the listener was added
      expect(mockAddEventListener).toHaveBeenCalledWith('fullscreenchange', expect.any(Function))

      // Unmount the component
      wrapper.unmount()

      // Verify the listener was removed
      expect(mockRemoveEventListener).toHaveBeenCalledWith('fullscreenchange', expect.any(Function))
    })
  })

  describe('CSS class management', () => {
    it('should add fullscreen class when entering fullscreen', async () => {
      const { wrapper } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Enter fullscreen
      document.fullscreenElement = document.documentElement
      const eventListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'fullscreenchange',
      )?.[1]

      eventListener?.(new Event('fullscreenchange'))

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('app-fullscreen')

      wrapper.unmount()
    })

    it('should remove fullscreen class when exiting fullscreen', async () => {
      const { wrapper } = createTestComponent()
      await wrapper.vm.$nextTick()

      // Enter fullscreen
      document.fullscreenElement = document.documentElement
      const eventListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'fullscreenchange',
      )?.[1]

      eventListener?.(new Event('fullscreenchange'))

      // Exit fullscreen
      document.fullscreenElement = null
      eventListener?.(new Event('fullscreenchange'))

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('app-fullscreen')

      wrapper.unmount()
    })
  })
})

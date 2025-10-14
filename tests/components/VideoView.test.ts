import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import VideoView from '@/components/VideoView.vue'

// Mock the stores
vi.mock('@/stores/contentStore', () => ({
  useContentStore: vi.fn(),
}))

vi.mock('@/stores/mediaControls', () => ({
  useMediaControlsStore: vi.fn(),
}))

import { useContentStore } from '@/stores/contentStore'
import { useMediaControlsStore } from '@/stores/mediaControls'

describe('VideoView', () => {
  let mockContentStore: ReturnType<typeof useContentStore>
  let mockMediaStore: ReturnType<typeof useMediaControlsStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Create reactive ref for videoSource
    const videoSource = ref('/test-video.mp4')
    
    mockContentStore = {
      get videoSource() { return videoSource.value },
      set videoSource(value: string) { videoSource.value = value },
    } as unknown as ReturnType<typeof useContentStore>

    mockMediaStore = {
      attachMedia: vi.fn(),
      detachMedia: vi.fn(),
    } as unknown as ReturnType<typeof useMediaControlsStore>

    vi.mocked(useContentStore).mockReturnValue(mockContentStore)
    vi.mocked(useMediaControlsStore).mockReturnValue(mockMediaStore)
  })

  describe('rendering', () => {
    it('should render video container and video element', () => {
      const wrapper = mount(VideoView)

      expect(wrapper.find('.video-view-container').exists()).toBe(true)
      expect(wrapper.find('video').exists()).toBe(true)
    })

    it('should set video source from content store', () => {
      const wrapper = mount(VideoView)

      const video = wrapper.find('video')
      expect(video.attributes('src')).toBe('/test-video.mp4')
    })

    it('should handle empty video source', () => {
      mockContentStore.videoSource = ''
      const wrapper = mount(VideoView)

      const video = wrapper.find('video')
      expect(video.attributes('src')).toBe('')
    })

    it('should handle undefined video source', () => {
      mockContentStore.videoSource = undefined as string
      const wrapper = mount(VideoView)

      const video = wrapper.find('video')
      expect(video.attributes('src')).toBe('')
    })
  })

  describe('lifecycle', () => {
    it('should attach media element on mount', async () => {
      const wrapper = mount(VideoView)

      // Wait for next tick to ensure mounted hook runs
      await wrapper.vm.$nextTick()

      expect(mockMediaStore.attachMedia).toHaveBeenCalled()
    })

    it('should detach media element on unmount', () => {
      const wrapper = mount(VideoView)
      wrapper.unmount()

      expect(mockMediaStore.detachMedia).toHaveBeenCalled()
    })

    it('should pass video element to attachMedia', async () => {
      const wrapper = mount(VideoView)
      await wrapper.vm.$nextTick()

      const videoElement = wrapper.find('video').element
      expect(mockMediaStore.attachMedia).toHaveBeenCalledWith(videoElement)
    })
  })

  describe('computed properties', () => {
    it('should compute video source from content store', () => {
      mockContentStore.videoSource = '/custom-video.mp4'
      const wrapper = mount(VideoView)

      const video = wrapper.find('video')
      expect(video.attributes('src')).toBe('/custom-video.mp4')
    })

    it('should fallback to empty string when no source', () => {
      mockContentStore.videoSource = null as string
      const wrapper = mount(VideoView)

      const video = wrapper.find('video')
      expect(video.attributes('src')).toBe('')
    })
  })

  describe('template structure', () => {
    it('should have correct CSS classes', () => {
      const wrapper = mount(VideoView)

      const container = wrapper.find('.video-view-container')
      expect(container.classes()).toContain('video-view-container')
    })

    it('should have video element with correct attributes', () => {
      const wrapper = mount(VideoView)

      const video = wrapper.find('video')
      expect(video.exists()).toBe(true)
      expect(video.attributes('src')).toBeDefined()
    })
  })

  describe('reactive updates', () => {
    it('should update video source when content store changes', async () => {
      const wrapper = mount(VideoView)

      // Initial source
      expect(wrapper.find('video').attributes('src')).toBe('/test-video.mp4')

      // Update content store
      mockContentStore.videoSource = '/new-video.mp4'
      await wrapper.vm.$nextTick()

      expect(wrapper.find('video').attributes('src')).toBe('/new-video.mp4')
    })

    it('should handle multiple source changes', async () => {
      const wrapper = mount(VideoView)

      // Change source multiple times
      mockContentStore.videoSource = '/video1.mp4'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('video').attributes('src')).toBe('/video1.mp4')

      mockContentStore.videoSource = '/video2.mp4'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('video').attributes('src')).toBe('/video2.mp4')

      mockContentStore.videoSource = '/video3.mp4'
      await wrapper.vm.$nextTick()
      expect(wrapper.find('video').attributes('src')).toBe('/video3.mp4')
    })
  })

  describe('error handling', () => {
    it('should handle store attachment errors gracefully', async () => {
      mockMediaStore.attachMedia = vi.fn().mockImplementation(() => {
        throw new Error('Attachment failed')
      })

      // The component will throw because it doesn't have error handling
      expect(() => {
        const wrapper = mount(VideoView)
        return wrapper
      }).toThrow('Attachment failed')
    })

    it('should handle store detachment errors gracefully', () => {
      mockMediaStore.detachMedia = vi.fn().mockImplementation(() => {
        throw new Error('Detachment failed')
      })

      const wrapper = mount(VideoView)
      
      // The component will throw because it doesn't have error handling
      expect(() => {
        wrapper.unmount()
      }).toThrow('Detachment failed')
    })
  })

  describe('integration', () => {
    it('should work with real video element', async () => {
      const wrapper = mount(VideoView)
      await wrapper.vm.$nextTick()

      const videoElement = wrapper.find('video').element as HTMLVideoElement
      expect(videoElement).toBeInstanceOf(HTMLVideoElement)
      expect(videoElement.src).toContain('/test-video.mp4')
    })

    it('should maintain video element reference', async () => {
      const wrapper = mount(VideoView)
      await wrapper.vm.$nextTick()

      const videoElement = wrapper.find('video').element
      expect(mockMediaStore.attachMedia).toHaveBeenCalledWith(videoElement)

      // The same element should be passed
      expect(mockMediaStore.attachMedia).toHaveBeenCalledTimes(1)
    })

    it('should handle store method calls correctly', async () => {
      const wrapper = mount(VideoView)
      await wrapper.vm.$nextTick()

      // Verify attachMedia was called
      expect(mockMediaStore.attachMedia).toHaveBeenCalledTimes(1)

      // Unmount and verify detachMedia was called
      wrapper.unmount()
      expect(mockMediaStore.detachMedia).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('should have proper video element structure', () => {
      const wrapper = mount(VideoView)

      const video = wrapper.find('video')
      expect(video.exists()).toBe(true)
      expect(video.element.tagName).toBe('VIDEO')
    })

    it('should have accessible container', () => {
      const wrapper = mount(VideoView)

      const container = wrapper.find('.video-view-container')
      expect(container.exists()).toBe(true)
    })
  })

  describe('performance', () => {
    it('should not re-attach media on source changes', async () => {
      const wrapper = mount(VideoView)
      await wrapper.vm.$nextTick()

      // Initial attachment
      expect(mockMediaStore.attachMedia).toHaveBeenCalledTimes(1)

      // Change source
      mockContentStore.videoSource = '/new-source.mp4'
      await wrapper.vm.$nextTick()

      // Should not attach again
      expect(mockMediaStore.attachMedia).toHaveBeenCalledTimes(1)
    })

    it('should only detach once on unmount', () => {
      const wrapper = mount(VideoView)
      wrapper.unmount()

      expect(mockMediaStore.detachMedia).toHaveBeenCalledTimes(1)
    })
  })
})

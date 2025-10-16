import PlaybackSpeedButton from '@/components/PlaybackSpeedButton.vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

// Mock the media controls store
vi.mock('@/stores/mediaControls', () => ({
  useMediaControlsStore: vi.fn(),
}))

// AppIcon is now registered globally in test setup and icons are mocked

import { useMediaControlsStore } from '@/stores/mediaControls'

describe('PlaybackSpeedButton', () => {
  let mockMediaStore: ReturnType<typeof useMediaControlsStore>

  beforeEach(() => {
    setActivePinia(createPinia())

    // Create reactive ref for playbackSpeed
    const playbackSpeed = ref(1.0)

    mockMediaStore = {
      get playbackSpeed() {
        return playbackSpeed.value
      },
      set playbackSpeed(value: number) {
        playbackSpeed.value = value
      },
      setPlaybackSpeed: vi.fn((speed: number) => {
        playbackSpeed.value = speed
      }),
    } as unknown as ReturnType<typeof useMediaControlsStore>

    vi.mocked(useMediaControlsStore).mockReturnValue(mockMediaStore)
  })

  // Helper function to mount component
  const mountComponent = (props = {}) => {
    return mount(PlaybackSpeedButton, { props })
  }

  describe('rendering', () => {
    it('should render playback speed button with correct structure', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.dropdown').exists()).toBe(true)
      expect(wrapper.find('[role="button"]').exists()).toBe(true)
      expect(wrapper.find('.inline-flex').exists()).toBe(true)
    })

    it('should display current speed in title', () => {
      mockMediaStore.playbackSpeed = 1.5
      const wrapper = mountComponent()

      const button = wrapper.find('[role="button"]')
      expect(button.attributes('title')).toBe('Playback speed: 1.5x')
    })

    it('should show playback speed icon', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.inline-flex').html()).toContain('data-name="playback-speed"')
    })
  })

  describe('speed options', () => {
    it('should render all speed options', () => {
      const wrapper = mountComponent()

      const speedItems = wrapper.findAll('.step')
      expect(speedItems).toHaveLength(8) // 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0
    })

    it('should display correct speed labels', () => {
      const wrapper = mountComponent()

      const speedItems = wrapper.findAll('.step')
      const labels = speedItems.map(item => item.text().trim())

      expect(labels).toEqual(['0.25x', '0.5x', '0.75x', 'normal', '1.25x', '1.5x', '1.75x', '2x'])
    })

    it('should show "normal" for 1.0x speed', () => {
      const wrapper = mountComponent()

      const normalItem = wrapper.findAll('.step').find(item => item.text().includes('normal'))
      expect(normalItem).toBeDefined()
    })
  })

  describe('current speed indication', () => {
    it('should highlight current speed and all lower speeds', () => {
      mockMediaStore.playbackSpeed = 1.5
      const wrapper = mountComponent()

      const speedItems = wrapper.findAll('.step')

      // First 5 items (0.25, 0.5, 0.75, 1.0, 1.25) should be highlighted
      for (let i = 0; i < 5; i++) {
        expect(speedItems[i]?.classes()).toContain('step-primary')
      }

      // Item 5 (1.5) should be highlighted (current speed)
      expect(speedItems[5]?.classes()).toContain('step-primary')

      // Last 2 items (1.75, 2.0) should not be highlighted
      for (let i = 6; i < 8; i++) {
        expect(speedItems[i]?.classes()).not.toContain('step-primary')
      }
    })

    it('should highlight all speeds when at maximum', () => {
      mockMediaStore.playbackSpeed = 2.0
      const wrapper = mountComponent()

      const speedItems = wrapper.findAll('.step')

      // All items should be highlighted
      speedItems.forEach(item => {
        expect(item.classes()).toContain('step-primary')
      })
    })

    it('should highlight only first speed when at minimum', () => {
      mockMediaStore.playbackSpeed = 0.25
      const wrapper = mountComponent()

      const speedItems = wrapper.findAll('.step')

      // Only first item should be highlighted
      expect(speedItems[0]?.classes()).toContain('step-primary')

      // Rest should not be highlighted
      for (let i = 1; i < 8; i++) {
        expect(speedItems[i]?.classes()).not.toContain('step-primary')
      }
    })

    it('should handle intermediate speeds correctly', () => {
      mockMediaStore.playbackSpeed = 0.75
      const wrapper = mountComponent()

      const speedItems = wrapper.findAll('.step')

      // First 3 items (0.25, 0.5, 0.75) should be highlighted
      for (let i = 0; i < 3; i++) {
        expect(speedItems[i]?.classes()).toContain('step-primary')
      }

      // Rest should not be highlighted
      for (let i = 3; i < 8; i++) {
        expect(speedItems[i]?.classes()).not.toContain('step-primary')
      }
    })
  })

  describe('speed selection', () => {
    it('should call setPlaybackSpeed when speed is clicked', async () => {
      const wrapper = mountComponent()

      const speedItems = wrapper.findAll('.step')
      await speedItems[2].trigger('click') // Click 0.75x

      expect(mockMediaStore.setPlaybackSpeed).toHaveBeenCalledWith(0.75)
    })

    it('should call setPlaybackSpeed for different speeds', async () => {
      const wrapper = mountComponent()

      const speedItems = wrapper.findAll('.step')

      // Test clicking different speeds
      await speedItems[0].trigger('click') // 0.25x
      expect(mockMediaStore.setPlaybackSpeed).toHaveBeenCalledWith(0.25)

      await speedItems[3].trigger('click') // 1.0x (normal)
      expect(mockMediaStore.setPlaybackSpeed).toHaveBeenCalledWith(1.0)

      await speedItems[7].trigger('click') // 2.0x
      expect(mockMediaStore.setPlaybackSpeed).toHaveBeenCalledWith(2.0)
    })

    it('should make speed items clickable', () => {
      const wrapper = mountComponent()

      const speedItems = wrapper.findAll('.step')
      speedItems.forEach(item => {
        expect(item.classes()).toContain('cursor-pointer')
      })
    })
  })

  describe('speed calculation', () => {
    it('should calculate current index correctly', () => {
      const testCases = [
        { speed: 0.25, expectedIndex: 0 },
        { speed: 0.5, expectedIndex: 1 },
        { speed: 0.75, expectedIndex: 2 },
        { speed: 1.0, expectedIndex: 3 },
        { speed: 1.25, expectedIndex: 4 },
        { speed: 1.5, expectedIndex: 5 },
        { speed: 1.75, expectedIndex: 6 },
        { speed: 2.0, expectedIndex: 7 },
      ]

      testCases.forEach(({ speed, expectedIndex }) => {
        mockMediaStore.playbackSpeed = speed
        const wrapper = mountComponent()

        // The currentIndex computed property should be used to determine highlighting
        const speedItems = wrapper.findAll('.step')
        for (let i = 0; i <= expectedIndex; i++) {
          expect(speedItems[i]?.classes()).toContain('step-primary')
        }
      })
    })

    it('should clamp speed to valid range', () => {
      // Test speeds outside the valid range
      mockMediaStore.playbackSpeed = 0.1 // Below minimum
      const wrapper1 = mount(PlaybackSpeedButton)
      const speedItems1 = wrapper1.findAll('.step')
      expect(speedItems1[0]?.classes()).toContain('step-primary') // Should clamp to 0.25

      mockMediaStore.playbackSpeed = 3.0 // Above maximum
      const wrapper2 = mount(PlaybackSpeedButton)
      const speedItems2 = wrapper2.findAll('.step')
      expect(speedItems2[7]?.classes()).toContain('step-primary') // Should clamp to 2.0
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('[role="button"]').exists()).toBe(true)
    })

    it('should be keyboard accessible', () => {
      const wrapper = mountComponent()

      const button = wrapper.find('[role="button"]')
      expect(button.attributes('tabindex')).toBe('0')
    })

    it('should have descriptive title', () => {
      mockMediaStore.playbackSpeed = 1.5
      const wrapper = mountComponent()

      const button = wrapper.find('[role="button"]')
      expect(button.attributes('title')).toBe('Playback speed: 1.5x')
    })
  })

  describe('dropdown functionality', () => {
    it('should have dropdown structure', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.dropdown').exists()).toBe(true)
      expect(wrapper.find('.dropdown-content').exists()).toBe(true)
    })

    it('should contain speed options in dropdown', () => {
      const wrapper = mountComponent()

      const dropdown = wrapper.find('.dropdown-content')
      expect(dropdown.find('.steps').exists()).toBe(true)
      expect(dropdown.text()).toContain('Playback Speed')
    })

    it('should have proper dropdown positioning', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.dropdown-top').exists()).toBe(true)
      expect(wrapper.find('.dropdown-end').exists()).toBe(true)
    })
  })

  describe('integration', () => {
    it('should work with store updates', async () => {
      const wrapper = mountComponent()

      // Initial state
      expect(wrapper.find('[role="button"]').attributes('title')).toBe('Playback speed: 1x')

      // Update store
      mockMediaStore.playbackSpeed = 1.5
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[role="button"]').attributes('title')).toBe('Playback speed: 1.5x')
    })

    it('should handle store method calls', async () => {
      const wrapper = mountComponent()

      const speedItems = wrapper.findAll('.step')
      await speedItems[4].trigger('click') // Click 1.25x

      expect(mockMediaStore.setPlaybackSpeed).toHaveBeenCalledWith(1.25)
    })

    it('should update highlighting when speed changes', async () => {
      const wrapper = mountComponent()

      // Initial state - 1.0x should highlight first 4 items
      let speedItems = wrapper.findAll('.step')
      for (let i = 0; i < 4; i++) {
        expect(speedItems[i]?.classes()).toContain('step-primary')
      }

      // Change speed to 1.5x
      mockMediaStore.playbackSpeed = 1.5
      await wrapper.vm.$nextTick()

      // Should now highlight first 6 items
      speedItems = wrapper.findAll('.step')
      for (let i = 0; i < 6; i++) {
        expect(speedItems[i]?.classes()).toContain('step-primary')
      }
    })
  })
})

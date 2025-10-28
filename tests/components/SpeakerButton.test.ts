import SpeakerButton from '@/components/SpeakerButton.vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

// Mock the media controls store
vi.mock('@/stores/mediaControls', () => ({
  useMediaControlsStore: vi.fn(),
}))

// Mock the RangeSlider component
vi.mock('@/components/RangeSlider.vue', () => ({
  default: {
    name: 'RangeSlider',
    template: '<div class="range-slider" @input="$emit(\'update:modelValue\', $event.target.value)"></div>',
    props: ['min', 'max', 'modelValue', 'showTooltipOnClick'],
    emits: ['update:modelValue'],
  },
}))

// Mock the AppTooltip component
vi.mock('@/components/AppTooltip.vue', () => ({
  default: {
    name: 'AppTooltip',
    template: '<div class="app-tooltip"><slot /></div>',
    props: ['content', 'richContent', 'showArrow', 'placement'],
  },
}))

// AppIcon is now registered globally in test setup and icons are mocked

import { useMediaControlsStore } from '@/stores/mediaControls'

describe('SpeakerButton', () => {
  let mockMediaStore: ReturnType<typeof useMediaControlsStore>

  beforeEach(() => {
    setActivePinia(createPinia())

    // Create reactive refs for store properties
    const volume = ref(50)
    const muted = ref(false)

    mockMediaStore = {
      get volume() {
        return volume.value
      },
      set volume(value: number) {
        volume.value = value
      },
      get muted() {
        return muted.value
      },
      set muted(value: boolean) {
        muted.value = value
      },
      get effectiveVolume() {
        return muted.value ? 0 : volume.value
      },
      setVolume: vi.fn((vol: number) => {
        volume.value = vol
        muted.value = false
      }),
      toggleMute: vi.fn(() => {
        muted.value = !muted.value
      }),
    } as unknown as ReturnType<typeof useMediaControlsStore>

    vi.mocked(useMediaControlsStore).mockReturnValue(mockMediaStore)
  })

  // Helper function to mount component
  const mountComponent = (props = {}) => {
    return mount(SpeakerButton, { props })
  }

  describe('rendering', () => {
    it('should render speaker button with correct structure', () => {
      const wrapper = mountComponent()

      // Check if component mounted at all
      expect(wrapper.exists()).toBe(true)

      // Check basic structure
      expect(wrapper.find('.dropdown').exists()).toBe(true)
      expect(wrapper.find('[role="button"]').exists()).toBe(true)

      // Check for AppIcon - it should render as a div with inline-flex class
      const appIconDiv = wrapper.find('.inline-flex')
      expect(appIconDiv.exists()).toBe(true)
    })

    it('should show correct icon for different volume levels', async () => {
      const wrapper = mountComponent()

      // Test mute icon
      mockMediaStore.muted = true
      await wrapper.vm.$nextTick()
      const iconDiv = wrapper.find('.inline-flex')
      expect(iconDiv.html()).toContain('data-name="speaker-mute"')

      // Test low volume icon
      mockMediaStore.muted = false
      mockMediaStore.volume = 20
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.inline-flex').html()).toContain('data-name="speaker-low"')

      // Test medium volume icon
      mockMediaStore.volume = 50
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.inline-flex').html()).toContain('data-name="speaker-medium"')

      // Test high volume icon
      mockMediaStore.volume = 80
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.inline-flex').html()).toContain('data-name="speaker-high"')
    })

    it('should display volume percentage', () => {
      mockMediaStore.volume = 75
      const wrapper = mountComponent()

      expect(wrapper.text()).toContain('75')
    })

    it('should round volume percentage', () => {
      mockMediaStore.volume = 75.7
      const wrapper = mountComponent()

      expect(wrapper.text()).toContain('76')
    })
  })

  describe('volume control', () => {
    it('should update volume when slider changes', async () => {
      const wrapper = mountComponent()
      const rangeSlider = wrapper.findComponent({ name: 'RangeSlider' })

      await rangeSlider.vm.$emit('update:modelValue', 80)

      expect(mockMediaStore.setVolume).toHaveBeenCalledWith(80)
    })

    it('should have correct slider props', () => {
      const wrapper = mountComponent()
      const rangeSlider = wrapper.findComponent({ name: 'RangeSlider' })

      expect(rangeSlider.props('min')).toBe(0)
      expect(rangeSlider.props('max')).toBe(100)
      expect(rangeSlider.props('showTooltipOnClick')).toBe(false)
    })

    it('should bind volume to slider', () => {
      mockMediaStore.volume = 60
      const wrapper = mountComponent()
      const rangeSlider = wrapper.findComponent({ name: 'RangeSlider' })

      expect(rangeSlider.props('modelValue')).toBe(60)
    })
  })

  describe('mute functionality', () => {
    it('should call toggleMute when mute button is clicked', async () => {
      const wrapper = mountComponent()

      // Try different selectors to find the mute button
      const muteButton = wrapper.find('button.btn-ghost.w-8.h-8.p-0')

      if (!muteButton.exists()) {
        // Fallback: find any button in the dropdown content
        const dropdownContent = wrapper.find('.dropdown-content')
        const muteButton2 = dropdownContent.find('button')
        if (muteButton2.exists()) {
          await muteButton2.trigger('click')
          expect(mockMediaStore.toggleMute).toHaveBeenCalled()
          return
        }
      }

      await muteButton.trigger('click')

      expect(mockMediaStore.toggleMute).toHaveBeenCalled()
    })

    it('should show correct icon in dropdown', async () => {
      mockMediaStore.muted = true
      const wrapper = mountComponent()

      const dropdownIcons = wrapper.findAll('.inline-flex')
      expect(dropdownIcons.length).toBeGreaterThan(1)
      expect(dropdownIcons[1]?.html()).toContain('data-name="speaker-mute"')
    })
  })

  describe('icon selection logic', () => {
    it('should select mute icon for zero volume', () => {
      mockMediaStore.muted = true
      const wrapper = mountComponent()

      expect(wrapper.find('.inline-flex').html()).toContain('data-name="speaker-mute"')
    })

    it('should select low icon for volume <= 25', () => {
      mockMediaStore.muted = false
      mockMediaStore.volume = 25
      const wrapper = mountComponent()

      expect(wrapper.find('.inline-flex').html()).toContain('data-name="speaker-low"')
    })

    it('should select medium icon for volume <= 65', () => {
      mockMediaStore.muted = false
      mockMediaStore.volume = 65
      const wrapper = mountComponent()

      expect(wrapper.find('.inline-flex').html()).toContain('data-name="speaker-medium"')
    })

    it('should select high icon for volume > 65', () => {
      mockMediaStore.muted = false
      mockMediaStore.volume = 66
      const wrapper = mountComponent()

      expect(wrapper.find('.inline-flex').html()).toContain('data-name="speaker-high"')
    })

    it('should handle edge cases', () => {
      // Test boundary values
      const testCases = [
        { volume: 0, muted: true, expectedIcon: 'speaker-mute' },
        { volume: 1, muted: false, expectedIcon: 'speaker-low' },
        { volume: 25, muted: false, expectedIcon: 'speaker-low' },
        { volume: 26, muted: false, expectedIcon: 'speaker-medium' },
        { volume: 65, muted: false, expectedIcon: 'speaker-medium' },
        { volume: 66, muted: false, expectedIcon: 'speaker-high' },
        { volume: 100, muted: false, expectedIcon: 'speaker-high' },
      ]

      testCases.forEach(({ volume, muted, expectedIcon }) => {
        mockMediaStore.muted = muted
        mockMediaStore.volume = volume
        const wrapper = mountComponent()
        expect(wrapper.find('.inline-flex').html()).toContain(`data-name="${expectedIcon}"`)
      })
    })

    it('should clamp volume to valid range', () => {
      // Test out of range values - these should be clamped by the component logic
      mockMediaStore.muted = false
      mockMediaStore.volume = -10
      const wrapper1 = mountComponent()
      expect(wrapper1.find('.inline-flex').html()).toContain('data-name="speaker-mute"')

      mockMediaStore.volume = 150
      const wrapper2 = mountComponent()
      expect(wrapper2.find('.inline-flex').html()).toContain('data-name="speaker-high"')
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('[role="button"]').exists()).toBe(true)
      // Check for the mute button in dropdown content
      const dropdownContent = wrapper.find('.dropdown-content')
      expect(dropdownContent.find('button').exists()).toBe(true)
    })

    it('should be keyboard accessible', () => {
      const wrapper = mountComponent()

      const button = wrapper.find('[role="button"]')
      expect(button.attributes('tabindex')).toBe('0')
    })
  })

  describe('responsive design', () => {
    it('should have responsive classes', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.hidden.md\\:inline-block').exists()).toBe(true)
    })
  })

  describe('dropdown functionality', () => {
    it('should have dropdown structure', () => {
      const wrapper = mountComponent()

      expect(wrapper.find('.dropdown').exists()).toBe(true)
      expect(wrapper.find('.dropdown-content').exists()).toBe(true)
    })

    it('should contain volume slider in dropdown', () => {
      const wrapper = mountComponent()

      const dropdown = wrapper.find('.dropdown-content')
      expect(dropdown.findComponent({ name: 'RangeSlider' }).exists()).toBe(true)
    })

    it('should show volume percentage in dropdown', () => {
      mockMediaStore.volume = 42
      const wrapper = mountComponent()

      const volumeText = wrapper.find('.text-xs.tabular-nums')
      expect(volumeText.text()).toBe('42')
    })
  })

  describe('integration', () => {
    it('should work with store updates', async () => {
      const wrapper = mountComponent()

      // Initial state
      expect(wrapper.find('.inline-flex').html()).toContain('data-name="speaker-medium"')

      // Update store
      mockMediaStore.volume = 80
      mockMediaStore.muted = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.inline-flex').html()).toContain('data-name="speaker-high"')
      expect(wrapper.text()).toContain('80')
    })

    it('should handle store method calls', async () => {
      const wrapper = mountComponent()

      // Test volume change
      const rangeSlider = wrapper.findComponent({ name: 'RangeSlider' })
      await rangeSlider.vm.$emit('update:modelValue', 30)
      expect(mockMediaStore.setVolume).toHaveBeenCalledWith(30)

      // Test mute toggle
      const muteButton = wrapper.find('button.btn-ghost.w-8.h-8.p-0')

      if (!muteButton.exists()) {
        // Fallback: find any button in the dropdown content
        const dropdownContent = wrapper.find('.dropdown-content')
        const muteButton2 = dropdownContent.find('button')
        if (muteButton2.exists()) {
          await muteButton2.trigger('click')
          expect(mockMediaStore.toggleMute).toHaveBeenCalled()
          return
        }
      }

      await muteButton.trigger('click')
      expect(mockMediaStore.toggleMute).toHaveBeenCalled()
    })
  })
})

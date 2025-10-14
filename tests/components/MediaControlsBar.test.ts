import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import MediaControlsBar from '@/components/MediaControlsBar.vue'

// Mock the dependencies
vi.mock('@/stores/mediaControls', () => ({
  useMediaControlsStore: vi.fn(),
}))

vi.mock('@/composables/useFullscreenControls', () => ({
  useFullscreenControls: vi.fn(),
}))

vi.mock('@/composables/usePlayerControls', () => ({
  usePlayerControls: vi.fn(),
}))

vi.mock('@/composables/useTimeFormat', () => ({
  useTimeFormat: vi.fn(),
}))

// Mock child components
vi.mock('@/components/AppIcon.vue', () => ({
  default: {
    name: 'AppIcon',
    template: '<div class="app-icon" :data-name="name"></div>',
    props: ['name'],
  },
}))

vi.mock('@/components/RangeSlider.vue', () => ({
  default: {
    name: 'RangeSlider',
    template: '<div class="range-slider" @input="$emit(\'user-interaction\', $event.target.value)"></div>',
    props: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 100 },
      modelValue: { type: Number, default: 0 },
      showTooltipOnClick: { type: Boolean, default: false },
      tooltipFormatter: { type: Function, default: undefined },
    },
    emits: ['user-interaction', 'update:modelValue', 'range-change'],
  },
}))

vi.mock('@/components/SpeakerButton.vue', () => ({
  default: {
    name: 'SpeakerButton',
    template: '<div class="speaker-button"></div>',
  },
}))

vi.mock('@/components/PlaybackSpeedButton.vue', () => ({
  default: {
    name: 'PlaybackSpeedButton',
    template: '<div class="playback-speed-button"></div>',
  },
}))

vi.mock('@/components/SidebarPositionChooser.vue', () => ({
  default: {
    name: 'SidebarPositionChooser',
    template: '<div class="sidebar-position-chooser"></div>',
  },
}))

import { useMediaControlsStore } from '@/stores/mediaControls'
import { useFullscreenControls } from '@/composables/useFullscreenControls'
import { usePlayerControls } from '@/composables/usePlayerControls'
import { useTimeFormat } from '@/composables/useTimeFormat'

describe('MediaControlsBar', () => {
  let mockMediaStore: ReturnType<typeof useMediaControlsStore>
  let mockFullscreenControls: ReturnType<typeof useFullscreenControls>
  let mockPlayerControls: ReturnType<typeof usePlayerControls>
  let mockTimeFormat: ReturnType<typeof useTimeFormat>

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Create reactive refs for store properties
    const currentTime = ref(30000) // 30 seconds
    const totalTime = ref(120000) // 2 minutes
    const playbackState = ref('playing')
    
    mockMediaStore = {
      get currentTime() { return currentTime.value },
      set currentTime(value: number) { currentTime.value = value },
      get totalTime() { return totalTime.value },
      set totalTime(value: number) { totalTime.value = value },
      get playbackState() { return playbackState.value },
      set playbackState(value: string) { playbackState.value = value },
      startSeeking: vi.fn(),
      stopSeeking: vi.fn(),
      seekTo: vi.fn(),
      togglePlayPause: vi.fn(),
    } as unknown as ReturnType<typeof useMediaControlsStore>

    mockFullscreenControls = {
      fullscreen: ref(false),
      controlsVisible: ref(true),
      toggleFullscreen: vi.fn(),
      onUserActivity: vi.fn(),
    } as unknown as ReturnType<typeof useFullscreenControls>

    mockPlayerControls = {
      selectPrevPage: vi.fn(),
      selectNextPage: vi.fn(),
    } as unknown as ReturnType<typeof usePlayerControls>

    mockTimeFormat = {
      formatHHMMSS: vi.fn((ms: number) => {
        const seconds = Math.floor(ms / 1000)
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
      }),
    } as unknown as ReturnType<typeof useTimeFormat>

    vi.mocked(useMediaControlsStore).mockReturnValue(mockMediaStore)
    vi.mocked(useFullscreenControls).mockReturnValue(mockFullscreenControls)
    vi.mocked(usePlayerControls).mockReturnValue(mockPlayerControls)
    vi.mocked(useTimeFormat).mockReturnValue(mockTimeFormat)
  })

  describe('rendering', () => {
    it('should render media controls bar with correct structure', () => {
      const wrapper = mount(MediaControlsBar)

      expect(wrapper.find('nav[role="navigation"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Media controls"]').exists()).toBe(true)
    })

    it('should display current and total time', () => {
      const wrapper = mount(MediaControlsBar)

      expect(wrapper.text()).toContain('0:30') // 30 seconds
      expect(wrapper.text()).toContain('2:00') // 2 minutes
    })

    it('should render all control components', () => {
      const wrapper = mount(MediaControlsBar)

      expect(wrapper.findComponent({ name: 'RangeSlider' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'SpeakerButton' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'PlaybackSpeedButton' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'SidebarPositionChooser' }).exists()).toBe(true)
    })

    it('should render navigation buttons', () => {
      const wrapper = mount(MediaControlsBar)

      const prevButton = wrapper.find('button[aria-label="Previous track"]')
      const nextButton = wrapper.find('button[aria-label="Next track"]')
      const playPauseButton = wrapper.find('button[aria-label="Pause"]')

      expect(prevButton.exists()).toBe(true)
      expect(nextButton.exists()).toBe(true)
      expect(playPauseButton.exists()).toBe(true)
    })
  })

  describe('time display', () => {
    it('should format and display current time', () => {
      mockMediaStore.currentTime = 45000 // 45 seconds
      const wrapper = mount(MediaControlsBar)

      expect(mockTimeFormat.formatHHMMSS).toHaveBeenCalledWith(45000)
      expect(wrapper.text()).toContain('0:45')
    })

    it('should format and display total time', () => {
      mockMediaStore.totalTime = 180000 // 3 minutes
      const wrapper = mount(MediaControlsBar)

      expect(mockTimeFormat.formatHHMMSS).toHaveBeenCalledWith(180000)
      expect(wrapper.text()).toContain('3:00')
    })

    it('should update time display when store changes', async () => {
      const wrapper = mount(MediaControlsBar)

      // Initial time
      expect(wrapper.text()).toContain('0:30')

      // Update store
      mockMediaStore.currentTime = 60000 // 1 minute
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('1:00')
    })
  })

  describe('progress bar', () => {
    it('should calculate progress percentage correctly', () => {
      mockMediaStore.currentTime = 60000 // 1 minute
      mockMediaStore.totalTime = 120000 // 2 minutes
      const wrapper = mount(MediaControlsBar)

      const rangeSlider = wrapper.findComponent({ name: 'RangeSlider' })
      expect(rangeSlider.props('modelValue')).toBe(500) // 50% of 1000
    })

    it('should handle zero total time', () => {
      mockMediaStore.totalTime = 0
      const wrapper = mount(MediaControlsBar)

      const rangeSlider = wrapper.findComponent({ name: 'RangeSlider' })
      expect(rangeSlider.props('modelValue')).toBe(0)
    })

    it('should have correct slider props', () => {
      const wrapper = mount(MediaControlsBar)

      const rangeSlider = wrapper.findComponent({ name: 'RangeSlider' })
      expect(rangeSlider.props('min')).toBe(0)
      expect(rangeSlider.props('max')).toBe(1000)
      expect(rangeSlider.props('showTooltipOnClick')).toBe(true)
    })
  })

  describe('playback controls', () => {
    it('should show play button when paused', () => {
      mockMediaStore.playbackState = 'paused'
      const wrapper = mount(MediaControlsBar)

      const playPauseButton = wrapper.find('button[aria-label="Play"]')
      expect(playPauseButton.exists()).toBe(true)
    })

    it('should show pause button when playing', () => {
      mockMediaStore.playbackState = 'playing'
      const wrapper = mount(MediaControlsBar)

      const playPauseButton = wrapper.find('button[aria-label="Pause"]')
      expect(playPauseButton.exists()).toBe(true)
    })

    it('should call togglePlayPause when play/pause button is clicked', async () => {
      const wrapper = mount(MediaControlsBar)

      const playPauseButton = wrapper.find('button[aria-label="Pause"]')
      await playPauseButton.trigger('click')

      expect(mockMediaStore.togglePlayPause).toHaveBeenCalled()
    })

    it('should call selectPrevPage when previous button is clicked', async () => {
      const wrapper = mount(MediaControlsBar)

      const prevButton = wrapper.find('button[aria-label="Previous track"]')
      await prevButton.trigger('click')

      expect(mockPlayerControls.selectPrevPage).toHaveBeenCalled()
    })

    it('should call selectNextPage when next button is clicked', async () => {
      const wrapper = mount(MediaControlsBar)

      const nextButton = wrapper.find('button[aria-label="Next track"]')
      await nextButton.trigger('click')

      expect(mockPlayerControls.selectNextPage).toHaveBeenCalled()
    })
  })

  describe('seeking functionality', () => {
    it('should handle seek changes', async () => {
      const wrapper = mount(MediaControlsBar)

      const rangeSlider = wrapper.findComponent({ name: 'RangeSlider' })
      await rangeSlider.vm.$emit('user-interaction', 500) // 50% of 1000

      // Should seek to 50% of total time (60000ms)
      expect(mockMediaStore.seekTo).toHaveBeenCalledWith(60000)
    })

    it('should not seek when total time is zero', async () => {
      mockMediaStore.totalTime = 0
      const wrapper = mount(MediaControlsBar)

      const rangeSlider = wrapper.findComponent({ name: 'RangeSlider' })
      await rangeSlider.vm.$emit('user-interaction', 500)

      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })
  })

  describe('fullscreen functionality', () => {
    it('should show fullscreen controls when in fullscreen', () => {
      mockFullscreenControls.fullscreen.value = true
      mockFullscreenControls.controlsVisible.value = true
      const wrapper = mount(MediaControlsBar)

      const nav = wrapper.find('nav')
      expect(nav.classes()).toContain('fixed')
      expect(nav.classes()).toContain('bottom-0')
      expect(nav.classes()).toContain('opacity-100')
    })

    it('should hide fullscreen controls when not visible', () => {
      mockFullscreenControls.fullscreen.value = true
      mockFullscreenControls.controlsVisible.value = false
      const wrapper = mount(MediaControlsBar)

      const nav = wrapper.find('nav')
      expect(nav.classes()).toContain('opacity-0')
      expect(nav.classes()).toContain('translate-y-full')
    })

    it('should call onUserActivity during seeking in fullscreen', async () => {
      mockFullscreenControls.fullscreen.value = true
      const wrapper = mount(MediaControlsBar)

      const rangeSlider = wrapper.findComponent({ name: 'RangeSlider' })
      await rangeSlider.vm.$emit('user-interaction', 500)

      expect(mockFullscreenControls.onUserActivity).toHaveBeenCalled()
    })

    it('should call toggleFullscreen when fullscreen button is clicked', async () => {
      const wrapper = mount(MediaControlsBar)

      const fullscreenButton = wrapper.find('button[aria-label="Enter fullscreen"]')
      await fullscreenButton.trigger('click')

      expect(mockFullscreenControls.toggleFullscreen).toHaveBeenCalled()
    })

    it('should show correct fullscreen button label', () => {
      mockFullscreenControls.fullscreen.value = false
      const wrapper = mount(MediaControlsBar)

      const fullscreenButton = wrapper.find('button[aria-label="Enter fullscreen"]')
      expect(fullscreenButton.exists()).toBe(true)

      mockFullscreenControls.fullscreen.value = true
      const wrapper2 = mount(MediaControlsBar)

      const exitFullscreenButton = wrapper2.find('button[aria-label="Exit fullscreen"]')
      expect(exitFullscreenButton.exists()).toBe(true)
    })
  })

  describe('tooltip functionality', () => {
    it('should provide tooltip formatter for range slider', () => {
      const wrapper = mount(MediaControlsBar)

      const rangeSlider = wrapper.findComponent({ name: 'RangeSlider' })
      const tooltipFormatter = rangeSlider.props('tooltipFormatter')

      expect(typeof tooltipFormatter).toBe('function')
      
      // Test the formatter
      const result = tooltipFormatter(500) // 50% of 1000
      expect(result).toBe('1:00') // 50% of 2 minutes
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      const wrapper = mount(MediaControlsBar)

      expect(wrapper.find('[role="navigation"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Media controls"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Seek position"]').exists()).toBe(true)
    })

    it('should have proper button labels', () => {
      const wrapper = mount(MediaControlsBar)

      expect(wrapper.find('[aria-label="Previous track"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Next track"]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="Pause"]').exists()).toBe(true)
    })
  })

  describe('responsive design', () => {
    it('should hide sidebar chooser on small screens', () => {
      const wrapper = mount(MediaControlsBar)

      const sidebarChooser = wrapper.findComponent({ name: 'SidebarPositionChooser' })
      expect(sidebarChooser.classes()).toContain('hidden')
      expect(sidebarChooser.classes()).toContain('lg:inline-block')
    })
  })

  describe('integration', () => {
    it('should work with all composables and stores', () => {
      const wrapper = mount(MediaControlsBar)

      // Verify all mocks were called
      expect(useMediaControlsStore).toHaveBeenCalled()
      expect(useFullscreenControls).toHaveBeenCalled()
      expect(usePlayerControls).toHaveBeenCalled()
      expect(useTimeFormat).toHaveBeenCalled()

      // Verify component renders
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle store updates reactively', async () => {
      const wrapper = mount(MediaControlsBar)

      // Update store values
      mockMediaStore.currentTime = 90000
      mockMediaStore.playbackState = 'paused'
      await wrapper.vm.$nextTick()

      // Should update display
      expect(wrapper.text()).toContain('1:30')
      expect(wrapper.find('[aria-label="Play"]').exists()).toBe(true)
    })
  })
})

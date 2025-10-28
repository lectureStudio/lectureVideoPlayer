<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import PlaybackSpeedButton from '@/components/PlaybackSpeedButton.vue'
import { useFullscreenControls } from '@/composables/useFullscreenControls'
import { usePlayerControls } from '@/composables/usePlayerControls'
import {
  mediaPlayerTooltips,
  useShortcutTooltip,
} from '@/composables/useShortcutTooltip.ts'
import { useTimeFormat } from '@/composables/useTimeFormat'
import { useMediaControlsStore } from '@/stores/mediaControls'
import { computed, ref } from 'vue'
import RangeSlider from './RangeSlider.vue'
import SidebarPositionChooser from './SidebarPositionChooser.vue'
import SpeakerButton from './SpeakerButton.vue'

const { selectPrevPage, selectNextPage } = usePlayerControls()
const media = useMediaControlsStore()

const { fullscreen, controlsVisible, toggleFullscreen, onUserActivity } =
  useFullscreenControls()

const { formatHHMMSS } = useTimeFormat()

// References to dropdown components
const speakerButtonRef = ref()
const playbackSpeedButtonRef = ref()
const sidebarPositionChooserRef = ref()

// Tooltip composables
const previousPageTooltip = mediaPlayerTooltips.previous()
const playPauseTooltip = computed(() =>
  useShortcutTooltip('play/pause', {
    conditionalText: media.playbackState === 'playing' ? 'Pause' : 'Play',
  })
)
const nextPageTooltip = mediaPlayerTooltips.next()
const fullscreenTooltip = mediaPlayerTooltips.fullscreen()

/** Formatted current playback time. */
const currentTime = computed(() => formatHHMMSS(media.currentTime))
/** Formatted total duration. */
const totalTime = computed(() => formatHHMMSS(media.totalTime))
/** Progress percentage for the seek bar (0-1000 for better precision). */
const progressPercentage = computed(() => {
  if (media.totalTime === 0) {
    return 0
  }
  return (media.currentTime / media.totalTime) * 1000
})

/**
 * Handles the start of a seek operation.
 * Shows fullscreen controls if in fullscreen mode.
 */
function onSeekStart() {
  media.startSeeking()

  if (fullscreen.value) {
    onUserActivity()
  }
}

/**
 * Handles the end of a seek operation.
 * Shows fullscreen controls if in fullscreen mode.
 */
function onSeekEnd() {
  media.stopSeeking()

  if (fullscreen.value) {
    onUserActivity()
  }
}

/**
 * Handles seek changes during user interaction.
 * Converts the slider value (0-1000) to actual time and seeks to it.
 *
 * @param value - The slider value (0-1000).
 */
function onSeekChange(value: number) {
  // This is called when the user is actively dragging the slider
  if (media.totalTime === 0) {
    return
  }
  const newTime = (value / 1000) * media.totalTime
  media.seekTo(newTime)

  if (fullscreen.value) {
    onUserActivity()
  }
}

/**
 * Toggles play/pause of the media element.
 */
const togglePlayPause = () => {
  media.togglePlayPause()
}
</script>

<template>
  <nav
    class="border-t border-base-300 bg-base-100 pt-1"
    :class="fullscreen
    ? 'fixed bottom-0 left-0 right-0 z-40 transform-gpu transition-all duration-400 ease-out bg-slate-100/95 dark:bg-gray-900/95 '
      + (controlsVisible
        ? 'opacity-100 translate-y-0'
        : 'opacity-0 translate-y-full pointer-events-none')
    : ''"
    role="navigation"
    aria-label="Media controls"
  >
    <!-- First row -->
    <div class="flex items-center justify-between sm:px-2 gap-2">
      <div class="flex items-center gap-2"></div>
      <div class="flex items-center gap-2 sm:gap-4 w-full">
        <span class="tabular-nums">{{ currentTime }}</span>
        <RangeSlider
          class="w-full"
          :min="0"
          :max="1000"
          :model-value="progressPercentage"
          @mousedown="onSeekStart"
          @mouseup="onSeekEnd"
          @touchstart="onSeekStart"
          @touchend="onSeekEnd"
          @user-interaction="onSeekChange"
          :tooltip-formatter="(v: number) => formatHHMMSS((v / 1000) * media.totalTime)"
          show-tooltip-on-click
          aria-label="Seek position"
          role="slider"
        />
        <span class="tabular-nums">{{ totalTime }}</span>
      </div>

      <div class="flex items-center gap-2"></div>
    </div>
    <!-- Second row -->
    <div class="flex items-center justify-between gap-2 m-1">
      <div class="flex items-center gap-2">
        <AppTooltip
          content="Volume"
          :show-arrow="false"
          :offset="36"
          :dropdown-open="speakerButtonRef?.isDropdownOpen ?? false"
        >
          <SpeakerButton ref="speakerButtonRef" />
        </AppTooltip>
      </div>
      <div class="flex items-center gap-2">
        <AppTooltip
          :content="previousPageTooltip.tooltipContent.value"
          :rich-content="true"
          :show-arrow="false"
          :offset="36"
        >
          <button
            @click="selectPrevPage"
            class="btn btn-ghost w-10 h-10 p-0"
            aria-label="Previous track"
            type="button"
          >
            <AppIcon name="previous" class="w-6" />
          </button>
        </AppTooltip>
        <AppTooltip
          :content="playPauseTooltip.tooltipContent.value"
          :rich-content="true"
          :show-arrow="false"
          :offset="36"
        >
          <button
            @click="togglePlayPause"
            class="btn btn-ghost w-10 h-10 p-0"
            :aria-label="media.playbackState === 'playing' ? 'Pause' : 'Play'"
            type="button"
          >
            <AppIcon
              :name="media.playbackState === 'playing'
              ? 'pause'
              : 'play'"
              class="w-6"
            />
          </button>
        </AppTooltip>
        <AppTooltip
          :content="nextPageTooltip.tooltipContent.value"
          :rich-content="true"
          :show-arrow="false"
          :offset="36"
        >
          <button
            @click="selectNextPage"
            class="btn btn-ghost w-10 h-10 p-0"
            aria-label="Next track"
            type="button"
          >
            <AppIcon name="next" class="w-6" />
          </button>
        </AppTooltip>
      </div>
      <div class="flex items-center gap-2">
        <AppTooltip
          content="Preview position"
          :show-arrow="false"
          :offset="36"
          :dropdown-open="sidebarPositionChooserRef?.isDropdownOpen ?? false"
        >
          <SidebarPositionChooser
            ref="sidebarPositionChooserRef"
            class="hidden lg:inline-block"
          />
        </AppTooltip>
        <AppTooltip
          content="Playback speed"
          :show-arrow="false"
          :offset="36"
          :dropdown-open="playbackSpeedButtonRef?.isDropdownOpen ?? false"
        >
          <PlaybackSpeedButton ref="playbackSpeedButtonRef" />
        </AppTooltip>
        <AppTooltip
          :content="fullscreenTooltip.tooltipContent.value"
          :rich-content="true"
          :show-arrow="false"
          :offset="36"
        >
          <button
            class="btn btn-ghost w-10 h-10 p-0"
            :aria-label="fullscreen ? 'Exit fullscreen' : 'Fullscreen'"
            type="button"
            @click="toggleFullscreen"
          >
            <AppIcon
              :name="fullscreen
              ? 'fullscreen-minimize'
              : 'fullscreen-maximize'"
              class="w-6"
            />
          </button>
        </AppTooltip>
      </div>
    </div>
  </nav>
</template>

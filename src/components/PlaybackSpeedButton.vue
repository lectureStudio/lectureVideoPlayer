<script setup lang="ts">
import { useMediaControlsStore } from '@/stores/mediaControls'
import { computed } from 'vue'

const media = useMediaControlsStore()

/** Available playback speed options. */
const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0] as const
/** Step size between speed increments. */
const step = 0.25 as const
/** Minimum allowed playback speed. */
const minSpeed = speeds[0]!
/** Maximum allowed playback speed. */
const maxSpeed = speeds[speeds.length - 1]!

/**
 * Two-way binding for the current playback speed.
 */
const currentSpeed = computed<number>({
  get: () => media.playbackSpeed,
  set: (val: number) => media.setPlaybackSpeed(val),
})

/**
 * Computes the current speed index for visual indication in the dropdown.
 * Clamps to the allowed range, then computes the index by step size.
 */
const currentIndex = computed(() => {
  const clamped = Math.min(Math.max(currentSpeed.value, minSpeed), maxSpeed)
  return Math.round((clamped - minSpeed) / step)
})

/**
 * Formatted label for the current playback speed.
 */
const currentLabel = computed(() => {
  return `${currentSpeed.value}x`
})

/**
 * Sets the playback speed to the specified value.
 *
 * @param speed - The desired playback speed multiplier.
 */
function setSpeed(speed: number) {
  media.setPlaybackSpeed(speed)
}
</script>

<template>
  <div class="inline-block dropdown dropdown-top dropdown-end">
    <div
      tabindex="0"
      role="button"
      class="btn btn-ghost m-1 w-10 h-10 p-0"
      :title="`Playback speed: ${currentLabel}`"
    >
      <button class="btn btn-ghost w-10 h-10 p-0">
        <AppIcon name="playback-speed" class="w-6" />
      </button>
    </div>
    <div
      tabindex="0"
      class="dropdown-content bg-slate-50/30 dark:bg-slate-700/30 backdrop-blur-sm dark:backdrop-blur-lg rounded-box z-1 p-2 shadow-sm w-30"
    >
      <span class="text-sm">Playback Speed</span>
      <ul class="steps steps-vertical">
        <li
          v-for="(s, i) in speeds"
          :key="s"
          class="step cursor-pointer"
          :class="{ 'step-primary': i <= currentIndex }"
          @click="setSpeed(s)"
        >
          <span class="text-xs">{{ s === 1 ? 'normal' : `${s}x` }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.steps .step {
  gap: 0;
  grid-template-columns: 30px 1fr;
  min-height: 2.5rem;
}
.steps .step::before {
  width: 0.25rem;
}
.steps .step > .step-icon,
.steps .step:not(:has(.step-icon)):after {
  width: 0.75rem; /* shrink the circle */
  height: 0.75rem;
}
.steps .step:not(:has(.step-icon))::after {
  display: grid;
  place-items: center;
  font-size: 0; /* hide any data-content text */
  background-image: radial-gradient(circle at center, currentColor 2px, transparent 3px);
  background-repeat: no-repeat;
  background-position: center;
}
</style>

<script setup lang="ts">
import { useContentStore } from '@/stores/contentStore'
import { useMediaControlsStore } from '@/stores/mediaControls'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/** Reference to the video container element. */
const containerRef = ref<HTMLElement | null>(null)
/** Reference to the video element for media control attachment. */
const videoRef = ref<HTMLVideoElement | null>(null)

const media = useMediaControlsStore()
const content = useContentStore()

/**
 * Computed video source from the content store.
 * Falls back to empty string if no source is set.
 */
const videoSource = computed(() => content.videoSource || '')

onMounted(() => {
  // Attach the video element to the media controls store when component mounts
  if (videoRef.value) {
    media.attachMedia(videoRef.value)
  }
})

onBeforeUnmount(() => {
  // Detach media element to clean up event listeners
  media.detachMedia()
})
</script>

<template>
  <div ref="containerRef" class="video-view-container">
    <video ref="videoRef" :src="videoSource"></video>
  </div>
</template>

<style scoped>
.video-view-container {
  display: flex;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: auto;
}
</style>

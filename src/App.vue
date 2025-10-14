<script setup lang="ts">
import NavigationBar from '@/components/NavigationBar.vue'
import VideoView from '@/components/VideoView.vue'
import { useContentStore } from '@/stores/contentStore.ts'
import { useMediaControlsStore } from '@/stores/mediaControls'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppLayout from './components/AppLayout.vue'
import KeyboardShortcutsDialog from './components/KeyboardShortcutsDialog.vue'
import MediaControlsBar from './components/MediaControlsBar.vue'
import ThumbnailBar from './components/ThumbnailBar.vue'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { useScreenWakeLock } from './composables/useScreenWakeLock'

const mediaStore = useMediaControlsStore()
const contentStore = useContentStore()

// Reference to the global keyboard shortcuts dialog
const keyboardShortcutsDialog = ref<{ showShortcutsDialog: () => void } | null>(
  null,
)

// Handle show shortcuts event from navigation bar
const handleShowShortcuts = () => {
  keyboardShortcutsDialog.value?.showShortcutsDialog()
}

// Initialize keyboard shortcuts with the show dialog function
useKeyboardShortcuts(() => {
  keyboardShortcutsDialog.value?.showShortcutsDialog()
})

/**
 * Screen wake lock functionality to prevent screen from sleeping during playback.
 */
const {
  isSupported,
  requestWakeLock,
  releaseWakeLock,
  handleVisibilityChange,
} = useScreenWakeLock()

onMounted(async () => {
  // Load content data
  await contentStore.load()

  // Watch playback state and manage wake lock accordingly
  watch(
    () => mediaStore.playbackState,
    async (state) => {
      if (!isSupported.value) {
        return
      }

      if (state === 'playing') {
        await requestWakeLock()
      }
      else {
        await releaseWakeLock()
      }
    },
    { immediate: true },
  )

  // Handle visibility change events to manage wake lock when tab becomes hidden/visible
  const handleVisibilityChangeEvent = () => {
    const shouldBeActive = mediaStore.playbackState === 'playing'
    handleVisibilityChange(shouldBeActive)
  }

  document.addEventListener('visibilitychange', handleVisibilityChangeEvent)

  // Cleanup visibility change listener on unmounting
  onBeforeUnmount(() => {
    document.removeEventListener(
      'visibilitychange',
      handleVisibilityChangeEvent,
    )
  })
})
</script>

<template>
  <AppLayout>
    <template #top>
      <NavigationBar @show-shortcuts="handleShowShortcuts" />
    </template>
    <template #sidebar>
      <ThumbnailBar />
    </template>
    <template #bottom>
      <MediaControlsBar />
    </template>
    <VideoView />
  </AppLayout>

  <!-- Global keyboard shortcuts dialog - always accessible -->
  <KeyboardShortcutsDialog ref="keyboardShortcutsDialog" />
</template>

<script setup lang="ts">
import { useFullscreenControls } from '@/composables/useFullscreenControls'
import { useKeyboard } from '@/composables/useKeyboard'
import { useContentStore } from '@/stores/contentStore.ts'
import { computed, type Ref, ref, watch } from 'vue'

// Platform detection for keyboard shortcut display
function isMac(): boolean {
  return typeof navigator !== 'undefined'
    && /Mac|iPhone|iPad/.test(navigator.platform)
}

const modifierKey = computed(() => isMac() ? '⌘' : 'Ctrl')

const contentStore = useContentStore()
const { pauseTimeout, resumeTimeout } = useFullscreenControls()

/** Reference to the search field root element for keyboard event scoping. */
const searchRootRef: Ref<HTMLElement | null> = ref(null)
/** Reference to the actual input element to focus it from a global shortcut. */
const searchInputRef: Ref<HTMLInputElement | null> = ref(null)

/** Current search text input value. */
const searchText = ref('')

useKeyboard(
  [
    {
      keys: [{ key: 'ArrowUp' }],
      handler: () => void contentStore.findPrev(),
      when: () => !!searchText.value.trim(),
      description: 'Previous page',
    },
    {
      keys: [{ key: 'ArrowDown' }],
      handler: () => void contentStore.findNext(),
      when: () => !!searchText.value.trim(),
      description: 'Next page',
    },
  ],
  {
    ignoreEditable: false,
    onlyWhenTargetInside: searchRootRef,
    capture: true,
  },
)
useKeyboard(
  [
    {
      // Windows/Linux: Ctrl+K, macOS: Meta(Command)+K
      keys: [
        { key: 'k', ctrl: true },
        { key: 'k', meta: true },
      ],
      handler: () => {
        searchInputRef.value?.focus()
        // Select existing text for quick replacement
        searchInputRef.value?.select()
      },
      description: 'Focus search',
    },
  ],
  {
    ignoreEditable: false, // allow triggering even when focus is in an input
    capture: true,
  },
)

watch(
  () => searchText.value,
  (val) => {
    const q = val.trim()
    if (!q && contentStore.lastQuery) {
      contentStore.cancelSearch()
    }
  },
)

/**
 * Triggers a search operation based on the current input.
 * If the field is empty, cancels any active search.
 * If the query is the same as the last one, finds the next match.
 * Otherwise, performs a new search.
 */
function triggerSearch() {
  const q = searchText.value.trim()
  if (!q) {
    // If the user presses Enter on empty field, ensure search is canceled
    if (contentStore.lastQuery) {
      contentStore.cancelSearch()
    }
    return
  }
  // If the same query, jump to the next match; else perform a new search
  if (q === contentStore.lastQuery) {
    contentStore.findNext()
  }
  else {
    contentStore.search(q)
  }
}

function onSearchFocus() {
  pauseTimeout()
}

function onSearchBlur() {
  resumeTimeout()
}
</script>

<template>
  <div ref="searchRootRef" class="w-full xl:ms-4">
    <div class="input input-sm input-ghost rounded-full bg-base-200 hover:bg-base-300 focus-visible:bg-base-300 cursor-pointer transition-colors focus:outline-none items-center w-full gap-2">
      <AppIcon name="search" class="w-3.5 opacity-50" />
      <input
        ref="searchInputRef"
        type="search"
        placeholder="Search"
        v-model="searchText"
        @keydown.enter.prevent="triggerSearch"
        @focus="onSearchFocus"
        @blur="onSearchBlur"
      />
      <span
        v-if="!contentStore.lastQuery"
        class="font-mono opacity-60 space-x-0.5"
      >
        <kbd class="kbd kbd-sm">{{ modifierKey }}</kbd>
        <kbd class="kbd kbd-sm">K</kbd>
      </span>
      <div v-else class="flex items-center gap-1 ms-1">
        <span class="opacity-60 text-xs tabular-nums">
          {{
            contentStore.matchesTotal > 0
            ? `${contentStore.matchesCurrent} / ${contentStore.matchesTotal}`
            : 0
          }}
        </span>
        <div class="flex items-center gap-1 ms-1">
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle"
            :disabled="contentStore.matchesTotal === 0"
            title="Previous match"
            @click="contentStore.findPrev()"
          >
            <AppIcon name="search-prev" class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-circle"
            :disabled="contentStore.matchesTotal === 0"
            title="Next match"
            @click="contentStore.findNext()"
          >
            <AppIcon name="search-next" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

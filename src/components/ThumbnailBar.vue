<script setup lang="ts">
import { usePlayerControls } from '@/composables/usePlayerControls'
import { useContentStore } from '@/stores/contentStore.ts'
import { useMediaControlsStore } from '@/stores/mediaControls.ts'
import type { ComponentPublicInstance } from 'vue'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { RecycleScroller } from 'vue-virtual-scroller'
import { parsePx } from '../composables/dom'
import { useTimeFormat } from '../composables/useTimeFormat'

const media = useMediaControlsStore()
const content = useContentStore()
const { formatHHMMSS } = useTimeFormat()

const { selectPage } = usePlayerControls()

const scroller = ref<typeof RecycleScroller | null>(null)

/**
 * Reactive array that stores the page items for the thumbnail bar.
 * Each item will contain the page number, timestamp, and a key for the RecycleScroller component.
 * This is populated based on the content store's pageModel data.
 */
const pageItems = ref(
  new Array<{ pageNumber: number; timestamp: number; key: string }>(),
)

/**
 * Reactive map that associates PDF page numbers with their corresponding canvas elements.
 * This map is used to track which pages have been rendered and to access their canvases
 * for rendering operations and cleanup.
 */
const canvasMap = ref(new Map<number, HTMLCanvasElement>())

/**
 * Reference to the thumbnail bar DOM element.
 * Used to measure dimensions and observe resize events.
 */
const thumbBarRef = ref<HTMLDivElement | null>(null)

/**
 * The computed usable width of the thumbnail bar (in pixels).
 * Accounts for padding and is used to determine the appropriate thumbnail scaling.
 */
const measuredWidth = ref<number>(0)

/**
 * The computed height of each thumbnail item (in pixels).
 * Used by RecycleScroller to properly size and position thumbnails in the virtual list.
 */
const measuredHeight = ref<number>(0)

/**
 * ResizeObserver instance used to monitor thumbnail bar size changes.
 */
let ro: ResizeObserver | null = null

/**
 * ID reference for the requestAnimationFrame used to debounce resize events.
 * When null, no resize update is scheduled. When set to a number, a frame
 * has been requested to process the resize.
 */
let resizeRafId: number | null = null

/**
 * Updates the computed available width for thumbnails based on the thumbnail bar's dimensions.

 * If the thumbnail bar element is not available, both measuredWidth and
 * measuredHeight are reset to 0.
 *
 * The calculated width is used for properly sizing and scaling PDF thumbnails.
 */
function updateComputedWidth() {
  const el = thumbBarRef.value
  if (!el) {
    measuredWidth.value = 0
    measuredHeight.value = 0
    return
  }
  const cs = getComputedStyle(el)
  const horizontalPadding = parsePx(cs.paddingLeft) + parsePx(cs.paddingRight)
  const innerWidth = Math.max(0, el.clientWidth - horizontalPadding)
  measuredWidth.value = Math.max(1, Math.floor(innerWidth - 20))
}

/**
 * Schedules a width update using requestAnimationFrame for better performance.
 * Implements debouncing to prevent excessive updates during rapid resize events.
 * Only schedules a new frame if there isn't already one pending.
 */
function scheduleUpdateWidth() {
  if (resizeRafId != null) {
    return
  }
  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = null
    updateComputedWidth()
  })
}

/**
 * Sets or removes a canvas reference for a specific PDF page in the canvas map.
 * When a canvas element is provided, it's added to the map, and page rendering is initiated.
 * When null is provided, the canvas is removed from the map, and any ongoing rendering is canceled.
 *
 * @param page - The page number associated with the canvas element.
 * @param el - The canvas element to associate with the page, or null to remove the association.
 */
function setCanvasRef(page: number, el: HTMLCanvasElement | null) {
  const map = canvasMap.value
  if (el) {
    map.set(page, el)
    // Try rendering immediately when the ref appears
    void renderPage(page)
  }
  else {
    map.delete(page)
  }
}

/**
 * Creates a VNode ref handler function for a specific page's canvas element.
 * This factory helps manage canvas references in the PDF thumbnail viewer,
 * allowing proper tracking when canvas elements are mounted or unmounted.
 *
 * @param page - The page number associated with this canvas reference.
 *
 * @returns A ref handler function compatible with Vue's ref system.
 */
function canvasVNodeRefFactory(page: number) {
  return (refEl: Element | ComponentPublicInstance | null) => {
    setCanvasRef(page, refEl as HTMLCanvasElement | null)
  }
}

/**
 * Renders a page image to the canvas for the given page number.
 * Uses the image data from the content store's pageModel.
 *
 * @param pageNum - The page number to render (1-based index)
 */
async function renderPage(pageNum: number) {
  const canvas = canvasMap.value.get(pageNum)
  if (!canvas) {
    return
  }

  const pageData = content.pageModel[pageNum - 1]
  if (!pageData || !pageData.image) {
    return
  }

  try {
    // Create an image element to load the base64 data
    const img = new Image()
    img.onload = () => {
      // Set canvas dimensions to match the image
      canvas.width = img.width
      canvas.height = img.height

      // Draw the image to the canvas
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }
    }
    img.onerror = () => {
      console.warn(`Failed to load image for page ${pageNum}`)
    }
    img.src = pageData.image
  }
  catch (error) {
    console.error(`Error rendering page ${pageNum}:`, error)
  }
}

/**
 * Computes the height of thumbnail items based on the first page image.
 *
 * This async function calculates the proper height for thumbnails by:
 * 1. Getting the first page image from the content store
 * 2. Determining the appropriate scale based on available width
 * 3. Calculating the scaled dimensions
 * 4. Adding padding, margins, and the label height to get the total thumb height
 *
 * The result is stored in the measuredHeight reactive state variable, which is
 * used by the RecycleScroller to properly size and position thumbnails.
 *
 * @returns A Promise that resolves when the computation is complete.
 */
async function computeThumbSize() {
  const thumbBar = thumbBarRef.value
  if (!thumbBar) {
    return
  }

  // Get the first page image to determine dimensions
  const firstPage = content.pageModel[0]
  if (!firstPage || !firstPage.image) {
    // Set a default height if no content is available
    measuredHeight.value = 100
    return
  }

  try {
    // Create an image to get dimensions
    const img = new Image()
    img.onload = () => {
      const availableWidth = Math.max(1, measuredWidth.value || 100)
      const scale = availableWidth / img.width
      const scaledHeight = img.height * scale

      // Add padding and label height
      const label = thumbBar.querySelector('.label') as HTMLElement | null
      const labelHeight = label ? label.offsetHeight : 20 // fallback height
      const padding = 16 // 0.5rem top + 0.5rem bottom

      measuredHeight.value = Math.max(50, scaledHeight + labelHeight + padding)
    }
    img.onerror = () => {
      // Fallback height if image fails to load
      measuredHeight.value = 100
    }
    img.src = firstPage.image
  }
  catch (error) {
    console.error('Error computing thumb size:', error)
    measuredHeight.value = 100
  }
}

/**
 * Initializes the page items array when content is loaded.
 *
 * This function checks if content exists and if the page items array
 * is empty. If both conditions are met, it populates the array with objects
 * representing each page in the content. Each item contains a key, page number, and timestamp.
 *
 * This ensures the thumbnail bar properly displays pages for the current content.
 */
function ensureInitializedFromDoc() {
  if (content.pageModel.length > 0 && pageItems.value.length === 0) {
    pageItems.value = content.pageModel.map((page, index) => ({
      pageNumber: index + 1,
      timestamp: page.timestamp,
      key: `page-${index + 1}`,
    }))

    // Update the media store with the page count
    media.pageCount = content.pageModel.length
  }
}

watch(
  () => content.pageModel,
  async () => {
    // Clear canvases sizing when content changes; pages will re-render when their refs mount
    canvasMap.value.forEach((c) => {
      c.width = 0
      c.height = 0
      c.style.width = ''
      c.style.height = ''
    })

    ensureInitializedFromDoc()
    await computeThumbSize()
  },
  { deep: true },
)

watch(
  () => media.currentPage,
  async (newPage) => {
    scroller.value?.scrollToItem(newPage - 1)
  },
)

/**
 * Efficiently finds the page number that corresponds to a given timestamp using binary search.
 * This is O(log n) instead of O(n) for better performance with large page counts.
 *
 * @param timestamp - The current video time in milliseconds
 * @returns The page number (1-based) that corresponds to the timestamp
 */
function findPageForTimestamp(timestamp: number): number {
  if (content.pageModel.length === 0) {
    return 1
  }

  // Binary search for the rightmost page with timestamp <= currentTime
  let left = 0
  let right = content.pageModel.length - 1
  let result = 0

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const pageData = content.pageModel[mid]

    if (pageData && pageData.timestamp <= timestamp) {
      result = mid
      left = mid + 1
    }
    else {
      right = mid - 1
    }
  }

  return result + 1 // Convert to 1-based page numbering
}

/**
 * Watches for changes to the video's current time and updates the current page accordingly.
 * This ensures the selected thumbnail stays in sync with the video playback position.
 */
watch(
  () => media.currentTime,
  (currentTime) => {
    if (content.pageModel.length === 0) {
      return
    }

    const newPage = findPageForTimestamp(currentTime)

    // Only update if the page has actually changed to avoid unnecessary updates
    if (newPage !== media.currentPage) {
      media.currentPage = newPage
    }
  },
)

/**
 * Watches for changes to the thumbnail bar width and updates all thumbnails.
 * This ensures thumbnails are properly sized and rendered when the sidebar is resized
 * or when the application layout changes.
 */
watch(measuredWidth, async () => {
  await computeThumbSize()

  canvasMap.value.forEach((_c, pageNum) => {
    void renderPage(pageNum)
  })
})

onMounted(() => {
  // Observe size changes to recompute width
  if (thumbBarRef.value) {
    ro = new ResizeObserver(() => scheduleUpdateWidth())
    ro.observe(thumbBarRef.value)
  }

  // If the document was already loaded before this component mounted (e.g., after reattaching),
  // make sure we initialize pageItems and sizing so thumbnails can render.
  ensureInitializedFromDoc()

  updateComputedWidth()
})

onBeforeUnmount(() => {
  if (ro) {
    try {
      ro.disconnect()
    }
    catch {}
    ro = null
  }
  if (resizeRafId != null) {
    cancelAnimationFrame(resizeRafId)
    resizeRafId = null
  }
})
</script>

<template>
  <div
    class="thumb-bar"
    ref="thumbBarRef"
    role="list"
    aria-label="PDF thumbnails"
  >
    <RecycleScroller
      ref="scroller"
      class="scroller"
      :items="pageItems"
      :item-size="measuredHeight || 100"
      key-field="key"
      v-slot="{ item }"
      skipHover
    >
      <div
        :key="item.pageNumber"
        class="thumb-item bg-base-300"
        :class="{ selected: item.pageNumber === media.currentPage }"
        @click="selectPage(item.pageNumber)"
        role="listitem"
        :aria-current="item.pageNumber === media.currentPage ? 'page' : undefined"
        :aria-label="`Page ${item.pageNumber} at ${
          formatHHMMSS(item.timestamp / 1000)
        }`"
        tabindex="0"
      >
        <div class="thumb-item-content">
          <canvas :ref="canvasVNodeRefFactory(item.pageNumber)" />
        </div>
        <div class="label">{{ item.pageNumber }}</div>
      </div>
    </RecycleScroller>
  </div>
</template>

<style scoped>
.scroller {
  width: 100%;
  height: 100%;
}
.thumb-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
  width: 100%;
}
.thumb-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: fit-content;
  cursor: pointer;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  padding: 0.5rem 0.5rem 0;
  margin-bottom: 0.5rem;
  outline: none;
}
.thumb-item:hover {
  background-color: var(--color-base-200);
}
.thumb-item.selected {
  border-color: var(--color-primary);
  border-width: 2px;
}
.thumb-item-content {
  position: relative;
  width: 100%;
}
.thumb-item-content canvas {
  width: 100%;
  height: auto;
  display: block;
}
.label {
  font-size: 12px;
  padding: 4px 0;
}
</style>

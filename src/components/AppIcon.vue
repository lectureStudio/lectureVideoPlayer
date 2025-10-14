<script setup lang="ts">
import { fluentIconMap, type FluentIconName } from '@/utils/icons'
import { computed, type PropType } from 'vue'

/**
 * Props for the AppIcon component
 */
const props = defineProps({
  /** The name of the icon to display from the Fluent icon set */
  name: {
    type: String as PropType<FluentIconName>,
    required: true,
  },
})

/**
 * Computed property that returns the SVG content for the specified icon name.
 *
 * @returns The SVG string content or null if the icon is not found.
 */
const icon = computed(() => {
  if (!props.name) { return null }
  return fluentIconMap[props.name] || null
})
</script>

<template>
  <div
    v-if="icon"
    v-html="icon"
    class="inline-flex items-center justify-center"
  >
  </div>
</template>

<style scoped>
/* Apply current text color to all SVG elements */
:deep(svg *) {
  fill: currentColor;
}

/* Respect explicit none values from the source SVG to maintain icon design */
:deep(svg [fill='none']) {
  fill: none !important;
}
:deep(svg [stroke='none']) {
  stroke: none !important;
}
</style>

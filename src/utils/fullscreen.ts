/**
 * Extended interface for HTML elements with vendor-prefixed fullscreen methods.
 */
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void
  mozRequestFullScreen?: () => Promise<void> | void
  msRequestFullscreen?: () => Promise<void> | void
}

/**
 * Checks if the browser supports the Fullscreen API.
 * Tests for both standard and vendor-prefixed methods.
 *
 * @returns True if fullscreen API is supported, false otherwise.
 */
function isFullscreenApiSupported(): boolean {
  const el = document.documentElement as FullscreenElement
  return !!(
    el.requestFullscreen
    || el.webkitRequestFullscreen
    || el.mozRequestFullScreen
  )
}

/**
 * Checks if the application is in simulated fullscreen mode.
 * This is used as a fallback for browsers that don't support the Fullscreen API.
 *
 * @returns True if the app-fullscreen class is present, false otherwise.
 */
function isSimulatedActive(): boolean {
  return document.documentElement.classList.contains('app-fullscreen')
}

export { isFullscreenApiSupported, isSimulatedActive }

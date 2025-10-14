import { defineStore } from 'pinia'

// Type-safe interface for storing event listeners on media elements
interface MediaElementWithListeners extends HTMLMediaElement {
  __mc_listeners?: {
    onTimeUpdate: () => void
    onDurationChange: () => void
    onPlay: () => void
    onPause: () => void
    onEnded: () => void
    onError: () => void
    onVolumeChange: () => void
    onRateChange: () => void
  }
}

export const useMediaControlsStore = defineStore('mediaControls', {
  state: () => ({
    volume: 100 as number, // 0..100
    playbackSpeed: 1.0 as number,
    muted: false as boolean,
    prevVolume: 100 as number, // To restore volume when unmuting
    pageCount: 0 as number,
    currentPage: 1,
    currentTime: 0 as number, // In milliseconds
    totalTime: 0 as number, // In milliseconds
    playbackState: 'paused' as 'paused' | 'playing' | 'ended' | 'error',
    seeking: false as boolean,
    mediaEl: null as HTMLMediaElement | null,
  }),
  getters: {
    /**
     * Returns the effective volume, considering mute state.
     * If muted, returns 0; otherwise returns the current volume.
     *
     * @param state - The store state object.
     *
     * @returns Effective volume as a number.
     */
    effectiveVolume(state): number {
      return state.muted ? 0 : state.volume
    },
  },
  actions: {
    /**
     * Play the attached media element, if available.
     */
    async play() {
      if (!this.mediaEl) { return }
      try {
        await this.mediaEl.play()
      }
      catch (e) {
        this.playbackState = 'error'

        console.error('Failed to play media:', e)
      }
    },
    /**
     * Pause the attached media element, if available.
     */
    pause() {
      if (!this.mediaEl) { return }
      try {
        this.mediaEl.pause()
      }
      catch (e) {
        console.error('Failed to pause media:', e)
      }
    },
    /**
     * Toggle play/pause on the attached media element.
     */
    async togglePlayPause() {
      const el = this.mediaEl
      if (!el) { return }
      if (el.paused || el.ended) {
        await this.play()
      }
      else {
        this.pause()
      }
    },
    /**
     * Seek to a specific time (in milliseconds) on the attached media element.
     * Also updates the store's currentTime.
     */
    seekTo(milliseconds: number) {
      const el = this.mediaEl
      if (!Number.isFinite(milliseconds)) {
        return
      }

      const t = Math.max(0, milliseconds / 1000)
      this.currentTime = milliseconds

      if (el) {
        el.currentTime = t
      }
    },
    /**
     * Attach an HTMLMediaElement to the store and wire up sync in both directions.
     */
    attachMedia(el: HTMLMediaElement) {
      // Detach any previous media element first
      this.detachMedia()

      this.mediaEl = el

      // Initialize element from store
      el.muted = this.muted
      el.volume = (this.effectiveVolume as number) / 100
      el.playbackRate = this.playbackSpeed
      if (Number.isFinite(this.currentTime) && this.currentTime > 0) {
        try {
          el.currentTime = this.currentTime / 1000
        }
        catch {}
      }

      // Element -> Store synchronization
      const onTimeUpdate = () => {
        // Don't update currentTime during seeking to prevent slider jumping
        if (!this.seeking) {
          this.currentTime = Math.max(0, Math.floor(el.currentTime * 1000))
        }
      }
      const onDurationChange = () => {
        this.totalTime = Number.isFinite(el.duration) ? Math.max(0, Math.floor(el.duration * 1000)) : 0
      }
      const onPlay = () => {
        this.playbackState = 'playing'
      }
      const onPause = () => {
        this.playbackState = 'paused'
      }
      const onEnded = () => {
        this.playbackState = 'ended'
      }
      const onError = () => {
        this.playbackState = 'error'
      }
      const onVolumeChange = () => {
        // Only sync external changes, not our own programmatic changes
        // Check if the element's state differs from our store state
        const elementMuted = el.muted
        const elementVolume = Math.round((el.volume || 0) * 100)

        // Only update if there's a meaningful difference (external change)
        if (elementMuted !== this.muted || Math.abs(elementVolume - this.volume) > 0) {
          this.muted = elementMuted
          this.volume = elementVolume

          if (!this.muted && this.volume > 0) {
            this.prevVolume = this.volume
          }
        }
      }
      const onRateChange = () => {
        this.playbackSpeed = el.playbackRate
      }

      el.addEventListener('timeupdate', onTimeUpdate)
      el.addEventListener('durationchange', onDurationChange)
      el.addEventListener('play', onPlay)
      el.addEventListener('pause', onPause)
      el.addEventListener('ended', onEnded)
      el.addEventListener('error', onError)
      el.addEventListener('volumechange', onVolumeChange)
      el.addEventListener('ratechange', onRateChange)

      // Store listener references for cleanup using type-safe interface
      const mediaElWithListeners = el as MediaElementWithListeners
      mediaElWithListeners.__mc_listeners = {
        onTimeUpdate,
        onDurationChange,
        onPlay,
        onPause,
        onEnded,
        onError,
        onVolumeChange,
        onRateChange,
      }
    },

    /**
     * Detach current media element and remove listeners.
     */
    detachMedia() {
      const el = this.mediaEl as MediaElementWithListeners
      if (el && el.__mc_listeners) {
        const listeners = el.__mc_listeners
        el.removeEventListener('timeupdate', listeners.onTimeUpdate)
        el.removeEventListener('durationchange', listeners.onDurationChange)
        el.removeEventListener('play', listeners.onPlay)
        el.removeEventListener('pause', listeners.onPause)
        el.removeEventListener('ended', listeners.onEnded)
        el.removeEventListener('error', listeners.onError)
        el.removeEventListener('volumechange', listeners.onVolumeChange)
        el.removeEventListener('ratechange', listeners.onRateChange)
        delete el.__mc_listeners
      }
      this.mediaEl = null
    },

    /**
     * Sets the volume to the specified value, clamped between 0 and 100.
     * Automatically unmutes when volume is changed and updates prevVolume for non-zero values.
     *
     * @param value - The desired volume level (0-100).
     */
    setVolume(value: number) {
      const v = Math.max(0, Math.min(100, Math.round(value)))
      // Unmute when user changes volume
      this.muted = false
      if (v > 0) {
        this.prevVolume = v
      }
      this.volume = v
      if (this.mediaEl) {
        this.mediaEl.volume = v / 100
        this.mediaEl.muted = false
      }
    },
    /**
     * Toggles the mute state of the media player.
     * When unmuting, restores the previous volume if available, otherwise uses the current volume or defaults to 50.
     * When muting, saves the current volume (if > 0) and sets the muted state to true.
     */
    toggleMute() {
      if (this.muted) {
        // Unmute: restore previous non-zero volume if available; fallback to 50
        this.volume = this.prevVolume > 0 ? this.prevVolume : this.volume > 0 ? this.volume : 50
        this.muted = false
        if (this.mediaEl) {
          this.mediaEl.muted = false
          this.mediaEl.volume = this.volume / 100
        }
      }
      else {
        // Mute: remember the current volume if > 0, then set to 0
        if (this.volume > 0) {
          this.prevVolume = this.volume
        }
        this.muted = true
        if (this.mediaEl) {
          this.mediaEl.muted = true
          // Keep the actual volume on the element so it can be restored later
          this.mediaEl.volume = this.volume / 100
        }
      }
    },
    /**
     * Sets the playback speed to the specified value, clamped between 0.25x and 4x.
     *
     * @param value - The desired playback speed multiplier.
     */
    setPlaybackSpeed(value: number) {
      // allow common speeds roughly between 0.25x and 2x
      this.playbackSpeed = Math.max(0.25, Math.min(2, Number(value)))

      if (this.mediaEl) {
        this.mediaEl.playbackRate = this.playbackSpeed
      }
    },
    /**
     * Sets the seeking state to true, indicating that a seek operation is in progress.
     * Called when a user begins dragging the playback position slider.
     */
    startSeeking() {
      this.seeking = true
    },
    /**
     * Sets the seeking state to false, indicating that a seek operation has completed.
     * Called when a user releases the playback position slider after seeking.
     * Syncs the current time with the actual video position.
     */
    stopSeeking() {
      this.seeking = false
      // Sync with actual video position after seeking ends
      if (this.mediaEl) {
        this.currentTime = Math.max(0, Math.floor(this.mediaEl.currentTime * 1000))
      }
    },
    setPage(page: number) {
      if (this.pageCount <= 0 || !Number.isFinite(page) || page === 0) {
        return false
      }
      if (page < 1 || page > this.pageCount || page === this.currentPage) {
        return false
      }

      this.currentPage = page

      return true
    },
    nextPage(): boolean {
      return this.setPage(this.currentPage + 1)
    },
    prevPage(): boolean {
      return this.setPage(this.currentPage - 1)
    },
  },
})

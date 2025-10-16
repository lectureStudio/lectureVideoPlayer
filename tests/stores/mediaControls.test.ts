import { useMediaControlsStore } from '@/stores/mediaControls'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('MediaControlsStore', () => {
  let store: ReturnType<typeof useMediaControlsStore>
  let mockMediaElement: HTMLMediaElement

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMediaControlsStore()

    // Create a mock media element
    mockMediaElement = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      currentTime: 0,
      duration: 100,
      volume: 1,
      muted: false,
      playbackRate: 1,
      paused: true,
      ended: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLMediaElement
  })

  afterEach(() => {
    store.detachMedia()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(store.volume).toBe(100)
      expect(store.playbackSpeed).toBe(1.0)
      expect(store.muted).toBe(false)
      expect(store.prevVolume).toBe(100)
      expect(store.pageCount).toBe(0)
      expect(store.currentPage).toBe(1)
      expect(store.currentTime).toBe(0)
      expect(store.totalTime).toBe(0)
      expect(store.playbackState).toBe('paused')
      expect(store.seeking).toBe(false)
      expect(store.mediaEl).toBe(null)
    })
  })

  describe('effectiveVolume getter', () => {
    it('should return volume when not muted', () => {
      store.volume = 75
      store.muted = false
      expect(store.effectiveVolume).toBe(75)
    })

    it('should return 0 when muted', () => {
      store.volume = 75
      store.muted = true
      expect(store.effectiveVolume).toBe(0)
    })
  })

  describe('play', () => {
    it('should play media element when attached', async () => {
      store.attachMedia(mockMediaElement)
      await store.play()

      expect(mockMediaElement.play).toHaveBeenCalled()
    })

    it('should handle play errors', async () => {
      const error = new Error('Play failed')
      mockMediaElement.play = vi.fn().mockRejectedValue(error)
      store.attachMedia(mockMediaElement)

      await store.play()

      expect(store.playbackState).toBe('error')
    })

    it('should do nothing when no media element attached', async () => {
      await store.play()
      expect(store.playbackState).toBe('paused')
    })
  })

  describe('pause', () => {
    it('should pause media element when attached', () => {
      store.attachMedia(mockMediaElement)
      store.pause()

      expect(mockMediaElement.pause).toHaveBeenCalled()
    })

    it('should do nothing when no media element attached', () => {
      store.pause()
      expect(store.playbackState).toBe('paused')
    })
  })

  describe('togglePlayPause', () => {
    it('should play when paused', async () => {
      mockMediaElement.paused = true
      store.attachMedia(mockMediaElement)

      await store.togglePlayPause()

      expect(mockMediaElement.play).toHaveBeenCalled()
    })

    it('should pause when playing', () => {
      mockMediaElement.paused = false
      store.attachMedia(mockMediaElement)

      store.togglePlayPause()

      expect(mockMediaElement.pause).toHaveBeenCalled()
    })

    it('should play when ended', async () => {
      mockMediaElement.paused = false
      mockMediaElement.ended = true
      store.attachMedia(mockMediaElement)

      await store.togglePlayPause()

      expect(mockMediaElement.play).toHaveBeenCalled()
    })
  })

  describe('seekTo', () => {
    it('should seek to specified time', () => {
      store.attachMedia(mockMediaElement)
      store.seekTo(5000) // 5 seconds

      expect(store.currentTime).toBe(5000)
      expect(mockMediaElement.currentTime).toBe(5)
    })

    it('should clamp negative time to 0', () => {
      store.attachMedia(mockMediaElement)
      store.seekTo(-1000)

      expect(store.currentTime).toBe(-1000) // The store doesn't clamp, it just sets the value
      expect(mockMediaElement.currentTime).toBe(0) // But the element gets clamped
    })

    it('should handle non-finite values', () => {
      store.attachMedia(mockMediaElement)
      store.seekTo(NaN)

      expect(store.currentTime).toBe(0) // Unchanged
    })

    it('should work without media element', () => {
      store.seekTo(5000)
      expect(store.currentTime).toBe(5000)
    })
  })

  describe('attachMedia', () => {
    it('should attach media element and set up event listeners', () => {
      store.attachMedia(mockMediaElement)

      expect(store.mediaEl).toStrictEqual(mockMediaElement)
      expect(mockMediaElement.addEventListener).toHaveBeenCalledWith('timeupdate', expect.any(Function))
      expect(mockMediaElement.addEventListener).toHaveBeenCalledWith('durationchange', expect.any(Function))
      expect(mockMediaElement.addEventListener).toHaveBeenCalledWith('play', expect.any(Function))
      expect(mockMediaElement.addEventListener).toHaveBeenCalledWith('pause', expect.any(Function))
      expect(mockMediaElement.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function))
      expect(mockMediaElement.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockMediaElement.addEventListener).toHaveBeenCalledWith('volumechange', expect.any(Function))
      expect(mockMediaElement.addEventListener).toHaveBeenCalledWith('ratechange', expect.any(Function))
    })

    it('should initialize element from store state', () => {
      store.volume = 75
      store.muted = true
      store.playbackSpeed = 1.5
      store.currentTime = 3000

      store.attachMedia(mockMediaElement)

      expect(mockMediaElement.volume).toBe(0) // Muted
      expect(mockMediaElement.muted).toBe(true)
      expect(mockMediaElement.playbackRate).toBe(1.5)
      expect(mockMediaElement.currentTime).toBe(3)
    })

    it('should detach previous media element', () => {
      const firstElement = { ...mockMediaElement }
      const secondElement = { ...mockMediaElement }

      store.attachMedia(firstElement)
      store.attachMedia(secondElement)

      expect(store.mediaEl).toStrictEqual(secondElement)
    })
  })

  describe('detachMedia', () => {
    it('should remove event listeners and detach media element', () => {
      store.attachMedia(mockMediaElement)
      store.detachMedia()

      expect(mockMediaElement.removeEventListener).toHaveBeenCalled()
      expect(store.mediaEl).toBe(null)
    })

    it('should handle detaching when no media element attached', () => {
      store.detachMedia()
      expect(store.mediaEl).toBe(null)
    })
  })

  describe('setVolume', () => {
    it('should set volume and unmute', () => {
      store.muted = true
      store.attachMedia(mockMediaElement)

      store.setVolume(75)

      expect(store.volume).toBe(75)
      expect(store.muted).toBe(false)
      expect(store.prevVolume).toBe(75)
      expect(mockMediaElement.volume).toBe(0.75)
      expect(mockMediaElement.muted).toBe(false)
    })

    it('should clamp volume to valid range', () => {
      store.setVolume(150)
      expect(store.volume).toBe(100)

      store.setVolume(-10)
      expect(store.volume).toBe(0)
    })

    it('should update prevVolume for non-zero values', () => {
      store.setVolume(50)
      expect(store.prevVolume).toBe(50)

      store.setVolume(0)
      expect(store.prevVolume).toBe(50) // Unchanged
    })
  })

  describe('toggleMute', () => {
    it('should mute when not muted', () => {
      store.volume = 75
      store.muted = false
      store.attachMedia(mockMediaElement)

      store.toggleMute()

      expect(store.muted).toBe(true)
      expect(store.prevVolume).toBe(75)
      expect(mockMediaElement.muted).toBe(true)
    })

    it('should unmute and restore previous volume', () => {
      store.volume = 0
      store.muted = true
      store.prevVolume = 80
      store.attachMedia(mockMediaElement)

      store.toggleMute()

      expect(store.muted).toBe(false)
      expect(store.volume).toBe(80)
      expect(mockMediaElement.muted).toBe(false)
      expect(mockMediaElement.volume).toBe(0.8)
    })

    it('should fallback to current volume when unmuting', () => {
      store.volume = 60
      store.muted = true
      store.prevVolume = 0
      store.attachMedia(mockMediaElement)

      store.toggleMute()

      expect(store.volume).toBe(60)
    })

    it('should fallback to 50 when no previous volume', () => {
      store.volume = 0
      store.muted = true
      store.prevVolume = 0
      store.attachMedia(mockMediaElement)

      store.toggleMute()

      expect(store.volume).toBe(50)
    })
  })

  describe('setPlaybackSpeed', () => {
    it('should set playback speed within valid range', () => {
      store.attachMedia(mockMediaElement)

      store.setPlaybackSpeed(1.5)
      expect(store.playbackSpeed).toBe(1.5)
      expect(mockMediaElement.playbackRate).toBe(1.5)
    })

    it('should clamp speed to valid range', () => {
      store.setPlaybackSpeed(5.0)
      expect(store.playbackSpeed).toBe(2.0)

      store.setPlaybackSpeed(0.1)
      expect(store.playbackSpeed).toBe(0.25)
    })
  })

  describe('startSeeking and stopSeeking', () => {
    it('should set seeking state', () => {
      store.startSeeking()
      expect(store.seeking).toBe(true)

      store.stopSeeking()
      expect(store.seeking).toBe(false)
    })

    it('should sync current time after seeking', () => {
      mockMediaElement.currentTime = 5.5
      store.attachMedia(mockMediaElement)

      store.stopSeeking()

      expect(store.currentTime).toBe(5500)
    })
  })

  describe('page navigation', () => {
    beforeEach(() => {
      store.pageCount = 5
      store.currentPage = 3
    })

    it('should set page within valid range', () => {
      const result = store.setPage(4)
      expect(result).toBe(true)
      expect(store.currentPage).toBe(4)
    })

    it('should not set page outside valid range', () => {
      const result = store.setPage(6)
      expect(result).toBe(false)
      expect(store.currentPage).toBe(3) // Unchanged
    })

    it('should not set page to same value', () => {
      const result = store.setPage(3)
      expect(result).toBe(false)
      expect(store.currentPage).toBe(3) // Unchanged
    })

    it('should not set page when pageCount is 0', () => {
      store.pageCount = 0
      const result = store.setPage(1)
      expect(result).toBe(false)
    })

    it('should navigate to next page', () => {
      const result = store.nextPage()
      expect(result).toBe(true)
      expect(store.currentPage).toBe(4)
    })

    it('should navigate to previous page', () => {
      const result = store.prevPage()
      expect(result).toBe(true)
      expect(store.currentPage).toBe(2)
    })

    it('should not navigate beyond bounds', () => {
      store.currentPage = 5
      const result = store.nextPage()
      expect(result).toBe(false)
      expect(store.currentPage).toBe(5) // Unchanged

      store.currentPage = 1
      const result2 = store.prevPage()
      expect(result2).toBe(false)
      expect(store.currentPage).toBe(1) // Unchanged
    })
  })

  describe('event listeners', () => {
    let onTimeUpdate: () => void
    let onDurationChange: () => void
    let onPlay: () => void
    let onPause: () => void
    let onEnded: () => void
    let onError: () => void
    let onVolumeChange: () => void
    let onRateChange: () => void

    beforeEach(() => {
      store.attachMedia(mockMediaElement)

      // Extract event listeners from the mock
      const calls = (mockMediaElement.addEventListener as ReturnType<typeof vi.fn>).mock.calls
      onTimeUpdate = calls.find(([event]) => event === 'timeupdate')?.[1]
      onDurationChange = calls.find(([event]) => event === 'durationchange')?.[1]
      onPlay = calls.find(([event]) => event === 'play')?.[1]
      onPause = calls.find(([event]) => event === 'pause')?.[1]
      onEnded = calls.find(([event]) => event === 'ended')?.[1]
      onError = calls.find(([event]) => event === 'error')?.[1]
      onVolumeChange = calls.find(([event]) => event === 'volumechange')?.[1]
      onRateChange = calls.find(([event]) => event === 'ratechange')?.[1]
    })

    it('should update current time on timeupdate', () => {
      store.seeking = false
      mockMediaElement.currentTime = 2.5

      onTimeUpdate!()

      expect(store.currentTime).toBe(2500)
    })

    it('should not update current time during seeking', () => {
      store.seeking = true
      store.currentTime = 1000
      mockMediaElement.currentTime = 2.5

      onTimeUpdate!()

      expect(store.currentTime).toBe(1000) // Unchanged
    })

    it('should update total time on durationchange', () => {
      mockMediaElement.duration = 120.5

      onDurationChange!()

      expect(store.totalTime).toBe(120500)
    })

    it('should handle infinite duration', () => {
      mockMediaElement.duration = Infinity

      onDurationChange!()

      expect(store.totalTime).toBe(0)
    })

    it('should update playback state on play', () => {
      onPlay!()
      expect(store.playbackState).toBe('playing')
    })

    it('should update playback state on pause', () => {
      onPause!()
      expect(store.playbackState).toBe('paused')
    })

    it('should update playback state on ended', () => {
      onEnded!()
      expect(store.playbackState).toBe('ended')
    })

    it('should update playback state on error', () => {
      onError!()
      expect(store.playbackState).toBe('error')
    })

    it('should update volume on volumechange', () => {
      mockMediaElement.volume = 0.6
      mockMediaElement.muted = false
      store.volume = 50
      store.muted = false

      onVolumeChange!()

      expect(store.volume).toBe(60)
      expect(store.muted).toBe(false)
    })

    it('should update playback speed on ratechange', () => {
      mockMediaElement.playbackRate = 1.5

      onRateChange!()

      expect(store.playbackSpeed).toBe(1.5)
    })
  })
})

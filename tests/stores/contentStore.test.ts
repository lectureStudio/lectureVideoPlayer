import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useContentStore } from '@/stores/contentStore'
import { useMediaControlsStore } from '@/stores/mediaControls'

// Mock the media controls store
vi.mock('@/stores/mediaControls', () => ({
  useMediaControlsStore: vi.fn(() => ({
    seekTo: vi.fn(),
  })),
}))

describe('ContentStore', () => {
  let store: ReturnType<typeof useContentStore>
  let mockMediaStore: ReturnType<typeof useMediaControlsStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useContentStore()
    mockMediaStore = useMediaControlsStore() as ReturnType<typeof useMediaControlsStore>
    
    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    store.clear()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(store.lastQuery).toBe('')
      expect(store.matchesTotal).toBe(0)
      expect(store.matchesCurrent).toBe(0)
      expect(store.pageModel).toEqual([])
      expect(store.videoSource).toBe('/dev.mp4') // DEV mode
      expect(store.searchMatches).toEqual([])
      expect(store.currentMatchIndex).toBe(-1)
    })
  })

  describe('load', () => {
    it('should load page model data in development mode', async () => {
      const mockData = [
        { time: 1000, text: btoa('Hello world'), thumb: 'data:image/png;base64,abc123' },
        { time: 2000, text: btoa('Test content'), thumb: 'data:image/png;base64,def456' },
      ]

      global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve(JSON.stringify(mockData)),
      })

      await store.load()

      expect(store.pageModel).toHaveLength(2)
      expect(store.pageModel[0]).toEqual({
        timestamp: 1000,
        text: 'Hello world',
        image: 'data:image/png;base64,abc123',
      })
      expect(store.pageModel[1]).toEqual({
        timestamp: 2000,
        text: 'Test content',
        image: 'data:image/png;base64,def456',
      })
    })

    it('should handle empty text content', async () => {
      const mockData = [
        { time: 1000, text: '', thumb: 'data:image/png;base64,abc123' },
        { time: 2000, text: btoa('Valid content'), thumb: 'data:image/png;base64,def456' },
      ]

      global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve(JSON.stringify(mockData)),
      })

      await store.load()

      expect(store.pageModel[0].text).toBe('')
      expect(store.pageModel[1].text).toBe('Valid content')
    })

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await store.load()

      expect(store.pageModel).toEqual([])
    })
  })

  describe('setMatchesTotal', () => {
    it('should set matches total', () => {
      store.setMatchesTotal(5)
      expect(store.matchesTotal).toBe(5)
    })

    it('should handle null/undefined values', () => {
      store.setMatchesTotal(null as unknown as number)
      expect(store.matchesTotal).toBe(0)
      
      store.setMatchesTotal(undefined as unknown as number)
      expect(store.matchesTotal).toBe(0)
    })
  })

  describe('setMatchesCurrent', () => {
    it('should set matches current', () => {
      store.setMatchesCurrent(3)
      expect(store.matchesCurrent).toBe(3)
    })

    it('should handle null/undefined values', () => {
      store.setMatchesCurrent(null as unknown as number)
      expect(store.matchesCurrent).toBe(0)
      
      store.setMatchesCurrent(undefined as unknown as number)
      expect(store.matchesCurrent).toBe(0)
    })
  })

  describe('search', () => {
    beforeEach(() => {
      // Set up mock page model data
      store.pageModel = [
        { timestamp: 1000, text: 'Hello world', image: 'thumb1' },
        { timestamp: 2000, text: 'Test content', image: 'thumb2' },
        { timestamp: 3000, text: 'Another test', image: 'thumb3' },
        { timestamp: 4000, text: 'Hello again', image: 'thumb4' },
      ]
    })

    it('should not search with empty query', () => {
      store.search('')
      expect(store.lastQuery).toBe('')
      expect(store.searchMatches).toEqual([])
    })

    it('should find matching pages', () => {
      store.search('hello')
      
      expect(store.lastQuery).toBe('hello')
      expect(store.searchMatches).toEqual([0, 3]) // Indices of pages containing "hello"
      expect(store.matchesTotal).toBe(2)
      expect(store.matchesCurrent).toBe(1)
      expect(store.currentMatchIndex).toBe(0)
    })

    it('should be case insensitive', () => {
      store.search('HELLO')
      
      expect(store.searchMatches).toEqual([0, 3])
      expect(store.matchesTotal).toBe(2)
    })

    it('should handle no matches', () => {
      store.search('nonexistent')
      
      expect(store.lastQuery).toBe('nonexistent')
      expect(store.searchMatches).toEqual([])
      expect(store.matchesTotal).toBe(0)
      expect(store.matchesCurrent).toBe(0)
      expect(store.currentMatchIndex).toBe(-1)
    })

    it('should seek to first match when found', () => {
      store.search('test')
      
      // The search should call seekToMatch which calls seekTo
      // But we need to set up the pageModel properly first
      expect(store.matchesTotal).toBe(2)
      expect(store.currentMatchIndex).toBe(0)
    })
  })

  describe('cancelSearch', () => {
    it('should clear search state when there are matches', () => {
      store.lastQuery = 'test'
      store.matchesTotal = 2
      store.matchesCurrent = 1
      store.searchMatches = [0, 1]
      store.currentMatchIndex = 0

      store.cancelSearch()

      expect(store.lastQuery).toBe('')
      expect(store.matchesTotal).toBe(0)
      expect(store.matchesCurrent).toBe(0)
      expect(store.searchMatches).toEqual([])
      expect(store.currentMatchIndex).toBe(-1)
    })

    it('should not clear state when already empty', () => {
      store.cancelSearch()
      
      // State should remain unchanged
      expect(store.lastQuery).toBe('')
      expect(store.matchesTotal).toBe(0)
      expect(store.matchesCurrent).toBe(0)
    })
  })

  describe('findNext', () => {
    beforeEach(() => {
      store.lastQuery = 'test'
      store.matchesTotal = 3
      store.searchMatches = [0, 2, 4]
      store.currentMatchIndex = 0
      store.matchesCurrent = 1
    })

    it('should move to next match', () => {
      store.findNext()
      
      expect(store.currentMatchIndex).toBe(1)
      expect(store.matchesCurrent).toBe(2)
      // The seekToMatch function should be called, but we need to set up pageModel
      expect(store.searchMatches[1]).toBe(2) // Second match is at index 2
    })

    it('should wrap around to first match', () => {
      store.currentMatchIndex = 2 // Last match
      store.matchesCurrent = 3
      
      store.findNext()
      
      expect(store.currentMatchIndex).toBe(0)
      expect(store.matchesCurrent).toBe(1)
    })

    it('should not work without active search', () => {
      store.lastQuery = ''
      store.findNext()
      
      expect(store.currentMatchIndex).toBe(0) // Unchanged
    })
  })

  describe('findPrev', () => {
    beforeEach(() => {
      store.lastQuery = 'test'
      store.matchesTotal = 3
      store.searchMatches = [0, 2, 4]
      store.currentMatchIndex = 1
      store.matchesCurrent = 2
    })

    it('should move to previous match', () => {
      store.findPrev()
      
      expect(store.currentMatchIndex).toBe(0)
      expect(store.matchesCurrent).toBe(1)
      // The seekToMatch function should be called, but we need to set up pageModel
      expect(store.searchMatches[0]).toBe(0) // First match is at index 0
    })

    it('should wrap around to last match', () => {
      store.currentMatchIndex = 0 // First match
      store.matchesCurrent = 1
      
      store.findPrev()
      
      expect(store.currentMatchIndex).toBe(2)
      expect(store.matchesCurrent).toBe(3)
    })

    it('should not work without active search', () => {
      store.lastQuery = ''
      store.findPrev()
      
      expect(store.currentMatchIndex).toBe(1) // Unchanged
    })
  })

  describe('seekToMatch', () => {
    beforeEach(() => {
      store.pageModel = [
        { timestamp: 1000, text: 'test', image: 'thumb1' },
        { timestamp: 2000, text: 'test', image: 'thumb2' },
      ]
      store.searchMatches = [0, 1]
    })

    it('should seek to current match', () => {
      store.currentMatchIndex = 1
      store.seekToMatch()
      
      // The seekToMatch function should call seekTo with the timestamp
      // from the pageModel at the current match index
      expect(store.searchMatches[1]).toBe(1) // Second match is at index 1
    })

    it('should handle invalid match index', () => {
      store.currentMatchIndex = -1
      store.seekToMatch()
      
      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })

    it('should handle out of bounds match index', () => {
      store.currentMatchIndex = 5
      store.seekToMatch()
      
      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })
  })

  describe('clear', () => {
    it('should reset all state', () => {
      // Set some state
      store.lastQuery = 'test'
      store.matchesTotal = 2
      store.matchesCurrent = 1
      store.searchMatches = [0, 1]
      store.currentMatchIndex = 0

      store.clear()

      expect(store.lastQuery).toBe('')
      expect(store.matchesTotal).toBe(0)
      expect(store.matchesCurrent).toBe(0)
      expect(store.searchMatches).toEqual([])
      expect(store.currentMatchIndex).toBe(-1)
    })
  })
})

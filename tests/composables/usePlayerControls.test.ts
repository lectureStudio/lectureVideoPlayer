import { usePlayerControls } from '@/composables/usePlayerControls'
import { useContentStore } from '@/stores/contentStore'
import { useMediaControlsStore } from '@/stores/mediaControls'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the stores
vi.mock('@/stores/contentStore')
vi.mock('@/stores/mediaControls')

describe('usePlayerControls', () => {
  let mockContentStore: ReturnType<typeof useContentStore>
  let mockMediaStore: ReturnType<typeof useMediaControlsStore>
  let playerControls: ReturnType<typeof usePlayerControls>

  beforeEach(() => {
    setActivePinia(createPinia())

    // Create mock store instances
    mockContentStore = {
      pageModel: [
        { timestamp: 1000, text: 'Page 1', image: 'thumb1' },
        { timestamp: 2000, text: 'Page 2', image: 'thumb2' },
        { timestamp: 3000, text: 'Page 3', image: 'thumb3' },
        { timestamp: 4000, text: 'Page 4', image: 'thumb4' },
        { timestamp: 5000, text: 'Page 5', image: 'thumb5' },
      ],
    } as unknown as ReturnType<typeof useContentStore>

    mockMediaStore = {
      currentPage: 3,
      pageCount: 5,
      seekTo: vi.fn(),
      prevPage: vi.fn().mockImplementation(() => {
        mockMediaStore.currentPage = Math.max(1, mockMediaStore.currentPage - 1)
        return true
      }),
      nextPage: vi.fn().mockImplementation(() => {
        mockMediaStore.currentPage = Math.min(mockMediaStore.pageCount, mockMediaStore.currentPage + 1)
        return true
      }),
      setPage: vi.fn().mockImplementation((page: number) => {
        if (page >= 1 && page <= mockMediaStore.pageCount) {
          mockMediaStore.currentPage = page
          return true
        }
        return false
      }),
    } as unknown as ReturnType<typeof useMediaControlsStore>

    // Mock the store functions
    vi.mocked(useContentStore).mockReturnValue(mockContentStore)
    vi.mocked(useMediaControlsStore).mockReturnValue(mockMediaStore)

    playerControls = usePlayerControls()
  })

  describe('selectPrevPage', () => {
    it('should navigate to previous page and seek to timestamp', () => {
      playerControls.selectPrevPage()

      expect(mockMediaStore.prevPage).toHaveBeenCalled()
      expect(mockMediaStore.seekTo).toHaveBeenCalledWith(2000) // Page 2 timestamp (current page after prevPage)
    })

    it('should not seek when prevPage returns false', () => {
      vi.mocked(mockMediaStore.prevPage).mockReturnValue(false)

      playerControls.selectPrevPage()

      expect(mockMediaStore.prevPage).toHaveBeenCalled()
      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })

    it('should handle missing page data gracefully', () => {
      mockContentStore.pageModel = []
      mockMediaStore.currentPage = 1

      playerControls.selectPrevPage()

      expect(mockMediaStore.prevPage).toHaveBeenCalled()
      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })

    it('should handle page data without timestamp', () => {
      mockContentStore.pageModel = [
        { timestamp: 0, text: 'Page 1', image: 'thumb1' },
        { timestamp: 0, text: 'Page 2', image: 'thumb2' },
      ]
      mockMediaStore.currentPage = 2

      playerControls.selectPrevPage()

      expect(mockMediaStore.prevPage).toHaveBeenCalled()
      // Since timestamp is 0 (falsy), seekTo should not be called
      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })
  })

  describe('selectNextPage', () => {
    it('should navigate to next page and seek to timestamp', () => {
      playerControls.selectNextPage()

      expect(mockMediaStore.nextPage).toHaveBeenCalled()
      expect(mockMediaStore.seekTo).toHaveBeenCalledWith(4000) // Page 4 timestamp (current page after nextPage)
    })

    it('should not seek when nextPage returns false', () => {
      vi.mocked(mockMediaStore.nextPage).mockReturnValue(false)

      playerControls.selectNextPage()

      expect(mockMediaStore.nextPage).toHaveBeenCalled()
      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })

    it('should handle missing page data gracefully', () => {
      mockContentStore.pageModel = []
      mockMediaStore.currentPage = 1

      playerControls.selectNextPage()

      expect(mockMediaStore.nextPage).toHaveBeenCalled()
      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })
  })

  describe('selectPage', () => {
    it('should navigate to specified page and seek to timestamp', () => {
      playerControls.selectPage(2)

      expect(mockMediaStore.setPage).toHaveBeenCalledWith(2)
      expect(mockMediaStore.seekTo).toHaveBeenCalledWith(2000) // Page 2 timestamp
    })

    it('should not seek when setPage returns false', () => {
      vi.mocked(mockMediaStore.setPage).mockReturnValue(false)

      playerControls.selectPage(2)

      expect(mockMediaStore.setPage).toHaveBeenCalledWith(2)
      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })

    it('should handle page 1 correctly', () => {
      playerControls.selectPage(1)

      expect(mockMediaStore.setPage).toHaveBeenCalledWith(1)
      expect(mockMediaStore.seekTo).toHaveBeenCalledWith(1000) // Page 1 timestamp
    })

    it('should handle last page correctly', () => {
      playerControls.selectPage(5)

      expect(mockMediaStore.setPage).toHaveBeenCalledWith(5)
      expect(mockMediaStore.seekTo).toHaveBeenCalledWith(5000) // Page 5 timestamp
    })

    it('should handle missing page data gracefully', () => {
      mockContentStore.pageModel = []
      mockMediaStore.currentPage = 1

      playerControls.selectPage(2)

      expect(mockMediaStore.setPage).toHaveBeenCalledWith(2)
      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })

    it('should handle out of bounds page numbers', () => {
      vi.mocked(mockMediaStore.setPage).mockReturnValue(false)

      playerControls.selectPage(10) // Out of bounds

      expect(mockMediaStore.setPage).toHaveBeenCalledWith(10)
      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle empty page model', () => {
      mockContentStore.pageModel = []
      mockMediaStore.currentPage = 1

      playerControls.selectPrevPage()
      playerControls.selectNextPage()
      playerControls.selectPage(1)

      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })

    it('should handle single page', () => {
      mockContentStore.pageModel = [
        { timestamp: 1000, text: 'Only page', image: 'thumb1' },
      ]
      mockMediaStore.currentPage = 1
      mockMediaStore.pageCount = 1

      playerControls.selectPage(1)

      expect(mockMediaStore.setPage).toHaveBeenCalledWith(1)
      expect(mockMediaStore.seekTo).toHaveBeenCalledWith(1000)
    })

    it('should handle page model with undefined timestamps', () => {
      mockContentStore.pageModel = [
        { timestamp: undefined as unknown as number, text: 'Page 1', image: 'thumb1' },
        { timestamp: 2000, text: 'Page 2', image: 'thumb2' },
      ]
      mockMediaStore.currentPage = 2

      playerControls.selectPage(1)

      expect(mockMediaStore.setPage).toHaveBeenCalledWith(1)
      // Since timestamp is undefined (falsy), seekTo should not be called
      expect(mockMediaStore.seekTo).not.toHaveBeenCalled()
    })
  })

  describe('integration scenarios', () => {
    it('should work with realistic page navigation flow', () => {
      // Start at page 3
      mockMediaStore.currentPage = 3

      // Navigate to previous page (goes to page 2)
      playerControls.selectPrevPage()
      expect(mockMediaStore.seekTo).toHaveBeenCalledWith(2000) // Page 2

      // Navigate to next page (goes to page 3)
      playerControls.selectNextPage()
      expect(mockMediaStore.seekTo).toHaveBeenCalledWith(3000) // Page 3

      // Jump to first page
      playerControls.selectPage(1)
      expect(mockMediaStore.seekTo).toHaveBeenCalledWith(1000) // Page 1

      // Jump to last page
      playerControls.selectPage(5)
      expect(mockMediaStore.seekTo).toHaveBeenCalledWith(5000) // Page 5
    })

    it('should handle rapid navigation', () => {
      mockMediaStore.currentPage = 1

      // Rapid navigation
      playerControls.selectPage(2)
      playerControls.selectPage(3)
      playerControls.selectPage(4)
      playerControls.selectPage(5)

      expect(mockMediaStore.setPage).toHaveBeenCalledTimes(4)
      expect(mockMediaStore.seekTo).toHaveBeenCalledTimes(4)
    })
  })
})

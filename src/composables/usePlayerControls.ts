import { useContentStore } from '@/stores/contentStore'
import { useMediaControlsStore } from '@/stores/mediaControls'

export function usePlayerControls() {
  const media = useMediaControlsStore()
  const content = useContentStore()

  /**
   * Navigates to the previous page in the document and updates media playback time accordingly.
   *
   * @returns {void}
   *
   * @side-effect Updates media.currentTime if a valid timestamp is found
   */
  const selectPrevPage = (): void => {
    if (media.prevPage()) {
      const pageData = content.pageModel[media.currentPage - 1]
      if (pageData && pageData.timestamp) {
        media.seekTo(pageData.timestamp)
      }
    }
  }

  /**
   * Navigates to the next page in the document and updates media playback time accordingly.
   *
   * @returns {void}
   *
   * @side-effect Updates media.currentTime if a valid timestamp is found
   */
  const selectNextPage = (): void => {
    if (media.nextPage()) {
      const pageData = content.pageModel[media.currentPage - 1]
      if (pageData && pageData.timestamp) {
        media.seekTo(pageData.timestamp)
      }
    }
  }

  /**
   * Navigates to a specific page in the document and updates media playback time accordingly.
   *
   * @param {number} page - The target page number (1-based)
   *
   * @returns {void}
   *
   * @side-effect Updates media.currentTime if a valid timestamp is found
   */
  const selectPage = (page: number): void => {
    if (media.setPage(page)) {
      const pageData = content.pageModel[page - 1]
      if (pageData && pageData.timestamp) {
        media.seekTo(pageData.timestamp)
      }
    }
  }

  return {
    selectPrevPage,
    selectNextPage,
    selectPage,
  }
}

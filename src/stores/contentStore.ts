import { base64ToUtf8 } from '@/utils/text'
import { defineStore } from 'pinia'
import { useMediaControlsStore } from './mediaControls'

type PageModelEncoded = {
  time: number
  text: string
  thumb: string
}
type PageModel = {
  timestamp: number
  image: string
  text: string
}

// Check if we're in development mode
const isDev = import.meta.env.DEV

// In production, use the injected pageModelData
// In development, we'll load from dev.data file
const videoSource = isDev ? '/dev.mp4' : '#{videoSourcePath}'
const pageModelDataPath = isDev ? '/dev.data' : ''
const pageModelData = isDev ? '' : '#{pageModelData}'

export const useContentStore = defineStore('content', {
  state: () => ({
    lastQuery: '' as string,
    matchesTotal: 0 as number,
    matchesCurrent: 0 as number,
    pageModel: [] as PageModel[],
    videoSource: videoSource,
    searchMatches: [] as number[], // Array of pageModel indices that match the search
    currentMatchIndex: -1 as number, // Index in searchMatches array
  }),
  actions: {
    async load() {
      let encodedModel: PageModelEncoded[]

      if (isDev) {
        // In development mode, load from the dev.data file
        try {
          const response = await fetch(pageModelDataPath)
          const data = await response.text()

          encodedModel = JSON.parse(data) as PageModelEncoded[]
        }
        catch (error) {
          console.error('Failed to load dev.data file:', error)
          encodedModel = []
        }
      }
      else {
        // In production mode, use the injected pageModelData
        encodedModel = JSON.parse(pageModelData) as PageModelEncoded[]
      }

      // Decode base64 encoded image and text data
      this.pageModel = encodedModel.map((item: PageModelEncoded): PageModel => ({
        timestamp: item.time, // time is not base64 encoded
        image: item.thumb, // PNG format with data URL prefix
        text: (item.text && item.text.length > 0) ? base64ToUtf8(item.text) : '', // Decode base64 text as UTF-8
      }))
    },
    setMatchesTotal(total: number) {
      this.matchesTotal = total ?? 0
    },
    setMatchesCurrent(current: number) {
      this.matchesCurrent = current ?? 0
    },
    search(query: string) {
      if (!query) {
        return
      }

      this.lastQuery = query
      this.searchMatches = []
      this.currentMatchIndex = -1

      // Search through pageModel text content
      const searchTerm = query.toLowerCase()
      this.pageModel.forEach((page, index) => {
        if (page.text && page.text.toLowerCase().includes(searchTerm)) {
          this.searchMatches.push(index)
        }
      })

      this.matchesTotal = this.searchMatches.length
      this.matchesCurrent = 0

      // If we found matches, go to the first one
      if (this.matchesTotal > 0) {
        this.currentMatchIndex = 0
        this.matchesCurrent = 1
        this.seekToMatch()
      }
    },
    cancelSearch() {
      if (!this.lastQuery && this.matchesTotal === 0 && this.matchesCurrent === 0) {
        return
      }

      this.lastQuery = ''
      this.matchesTotal = 0
      this.matchesCurrent = 0
      this.searchMatches = []
      this.currentMatchIndex = -1
    },
    findNext() {
      if (!this.lastQuery || this.matchesTotal === 0) {
        return
      }

      // Move to next match (with wraparound)
      this.currentMatchIndex = (this.currentMatchIndex + 1) % this.matchesTotal
      this.matchesCurrent = this.currentMatchIndex + 1
      this.seekToMatch()
    },
    findPrev() {
      if (!this.lastQuery || this.matchesTotal === 0) {
        return
      }

      // Move to previous match (with wraparound)
      this.currentMatchIndex = this.currentMatchIndex <= 0
        ? this.matchesTotal - 1
        : this.currentMatchIndex - 1
      this.matchesCurrent = this.currentMatchIndex + 1
      this.seekToMatch()
    },
    seekToMatch() {
      if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.searchMatches.length) {
        const pageIndex = this.searchMatches[this.currentMatchIndex]
        if (pageIndex !== undefined && pageIndex >= 0 && pageIndex < this.pageModel.length) {
          const page = this.pageModel[pageIndex]
          if (page) {
            const mediaStore = useMediaControlsStore()
            mediaStore.seekTo(page.timestamp)
          }
        }
      }
    },
    clear() {
      this.lastQuery = ''
      this.matchesTotal = 0
      this.matchesCurrent = 0
      this.searchMatches = []
      this.currentMatchIndex = -1
    },
  },
})

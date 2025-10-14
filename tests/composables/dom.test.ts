import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sumParentsBoxModel, parsePx } from '@/composables/dom'

describe('dom utilities', () => {
  describe('sumParentsBoxModel', () => {
    let mockGetComputedStyle: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockGetComputedStyle = vi.fn()
      vi.spyOn(window, 'getComputedStyle').mockImplementation(mockGetComputedStyle)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should calculate box model dimensions for parent elements', () => {
      const mockStyles = {
        paddingLeft: '10px',
        paddingRight: '15px',
        paddingTop: '5px',
        paddingBottom: '8px',
        borderLeftWidth: '2px',
        borderRightWidth: '3px',
        borderTopWidth: '1px',
        borderBottomWidth: '4px',
        marginLeft: '20px',
        marginRight: '25px',
        marginTop: '12px',
        marginBottom: '18px',
      }

      mockGetComputedStyle.mockReturnValue(mockStyles)

      const element = document.createElement('div')
      const parent1 = document.createElement('div')
      const parent2 = document.createElement('div')

      parent2.appendChild(parent1)
      parent1.appendChild(element)

      const result = sumParentsBoxModel(element, 3)

      // Expected calculations:
      // Width: 10 + 15 + 2 + 3 + 20 + 25 = 75px (but we're only going up 1 parent, so 10 + 15 + 2 + 3 + 20 + 25 = 75px)
      // Height: 5 + 8 + 1 + 4 + 12 + 18 = 48px (but we're only going up 1 parent, so 5 + 8 + 1 + 4 + 12 + 18 = 48px)
      // Actually, we're going up 3 parents by default, so we need to account for that
      expect(result.totalWidth).toBe(150) // 75 * 2 (2 more parents)
      expect(result.totalHeight).toBe(96) // 48 * 2 (2 more parents)
    })

    it('should handle default parent count of 3', () => {
      const mockStyles = {
        paddingLeft: '10px',
        paddingRight: '10px',
        paddingTop: '5px',
        paddingBottom: '5px',
        borderLeftWidth: '0px',
        borderRightWidth: '0px',
        borderTopWidth: '0px',
        borderBottomWidth: '0px',
        marginLeft: '0px',
        marginRight: '0px',
        marginTop: '0px',
        marginBottom: '0px',
      }

      mockGetComputedStyle.mockReturnValue(mockStyles)

      const element = document.createElement('div')
      const parent1 = document.createElement('div')
      const parent2 = document.createElement('div')

      parent2.appendChild(parent1)
      parent1.appendChild(element)

      const result = sumParentsBoxModel(element)

      expect(result.totalWidth).toBe(40) // 10 + 10 * 2 (2 more parents)
      expect(result.totalHeight).toBe(20) // 5 + 5 * 2 (2 more parents)
    })

    it('should handle custom parent count', () => {
      const mockStyles = {
        paddingLeft: '10px',
        paddingRight: '10px',
        paddingTop: '5px',
        paddingBottom: '5px',
        borderLeftWidth: '0px',
        borderRightWidth: '0px',
        borderTopWidth: '0px',
        borderBottomWidth: '0px',
        marginLeft: '0px',
        marginRight: '0px',
        marginTop: '0px',
        marginBottom: '0px',
      }

      mockGetComputedStyle.mockReturnValue(mockStyles)

      const element = document.createElement('div')
      const parent1 = document.createElement('div')

      parent1.appendChild(element)

      const result = sumParentsBoxModel(element, 1)

      expect(result.totalWidth).toBe(20) // Only parent1
      expect(result.totalHeight).toBe(10)
    })

    it('should handle missing parent elements', () => {
      const element = document.createElement('div')
      // We can't set parentElement to null directly, so we'll test with no parents
      const result = sumParentsBoxModel(element, 3)

      expect(result.totalWidth).toBe(0)
      expect(result.totalHeight).toBe(0)
    })

    it('should handle invalid CSS values', () => {
      const mockStyles = {
        paddingLeft: 'invalid',
        paddingRight: '10px',
        paddingTop: '5px',
        paddingBottom: 'invalid',
        borderLeftWidth: '0px',
        borderRightWidth: '0px',
        borderTopWidth: '0px',
        borderBottomWidth: '0px',
        marginLeft: '0px',
        marginRight: '0px',
        marginTop: '0px',
        marginBottom: '0px',
      }

      mockGetComputedStyle.mockReturnValue(mockStyles)

      const element = document.createElement('div')
      const parent = document.createElement('div')
      parent.appendChild(element)

      const result = sumParentsBoxModel(element, 1)

      expect(result.totalWidth).toBe(10) // Only valid paddingRight
      expect(result.totalHeight).toBe(5) // Only valid paddingTop
    })

    it('should handle zero values', () => {
      const mockStyles = {
        paddingLeft: '0px',
        paddingRight: '0px',
        paddingTop: '0px',
        paddingBottom: '0px',
        borderLeftWidth: '0px',
        borderRightWidth: '0px',
        borderTopWidth: '0px',
        borderBottomWidth: '0px',
        marginLeft: '0px',
        marginRight: '0px',
        marginTop: '0px',
        marginBottom: '0px',
      }

      mockGetComputedStyle.mockReturnValue(mockStyles)

      const element = document.createElement('div')
      const parent = document.createElement('div')
      parent.appendChild(element)

      const result = sumParentsBoxModel(element, 1)

      expect(result.totalWidth).toBe(0)
      expect(result.totalHeight).toBe(0)
    })

    it('should handle fractional values', () => {
      const mockStyles = {
        paddingLeft: '10.5px',
        paddingRight: '15.7px',
        paddingTop: '5.2px',
        paddingBottom: '8.9px',
        borderLeftWidth: '0px',
        borderRightWidth: '0px',
        borderTopWidth: '0px',
        borderBottomWidth: '0px',
        marginLeft: '0px',
        marginRight: '0px',
        marginTop: '0px',
        marginBottom: '0px',
      }

      mockGetComputedStyle.mockReturnValue(mockStyles)

      const element = document.createElement('div')
      const parent = document.createElement('div')
      parent.appendChild(element)

      const result = sumParentsBoxModel(element, 1)

      expect(result.totalWidth).toBeCloseTo(26.2) // 10.5 + 15.7
      expect(result.totalHeight).toBeCloseTo(14.1) // 5.2 + 8.9
    })
  })

  describe('parsePx', () => {
    it('should parse valid pixel values', () => {
      expect(parsePx('10px')).toBe(10)
      expect(parsePx('15.5px')).toBe(15.5)
      expect(parsePx('0px')).toBe(0)
      expect(parsePx('100px')).toBe(100)
    })

    it('should parse numeric strings without units', () => {
      expect(parsePx('10')).toBe(10)
      expect(parsePx('15.5')).toBe(15.5)
      expect(parsePx('0')).toBe(0)
      expect(parsePx('100')).toBe(100)
    })

    it('should handle null and undefined', () => {
      expect(parsePx(null)).toBe(0)
      expect(parsePx(undefined)).toBe(0)
    })

    it('should handle empty string', () => {
      expect(parsePx('')).toBe(0)
    })

    it('should handle invalid values', () => {
      expect(parsePx('invalid')).toBe(0)
      expect(parsePx('abc')).toBe(0)
      expect(parsePx('px')).toBe(0)
      expect(parsePx('10em')).toBe(10) // parseFloat extracts the number part
      expect(parsePx('10%')).toBe(10) // parseFloat extracts the number part
    })

    it('should handle edge cases', () => {
      expect(parsePx('0.0px')).toBe(0)
      expect(parsePx('0.0')).toBe(0)
      expect(parsePx('-10px')).toBe(-10)
      expect(parsePx('-10')).toBe(-10)
    })

    it('should handle whitespace', () => {
      expect(parsePx(' 10px ')).toBe(10)
      expect(parsePx(' 15.5 ')).toBe(15.5)
      expect(parsePx('\t20px\n')).toBe(20)
    })

    it('should handle very large numbers', () => {
      expect(parsePx('999999px')).toBe(999999)
      expect(parsePx('999999.99px')).toBe(999999.99)
    })

    it('should handle very small numbers', () => {
      expect(parsePx('0.001px')).toBe(0.001)
      expect(parsePx('0.0001px')).toBe(0.0001)
    })

    it('should handle Infinity and NaN', () => {
      expect(parsePx('Infinity')).toBe(0)
      expect(parsePx('NaN')).toBe(0)
    })
  })

  describe('integration scenarios', () => {
    it('should work together in realistic scenarios', () => {
      const mockStyles = {
        paddingLeft: '10px',
        paddingRight: '10px',
        paddingTop: '5px',
        paddingBottom: '5px',
        borderLeftWidth: '2px',
        borderRightWidth: '2px',
        borderTopWidth: '1px',
        borderBottomWidth: '1px',
        marginLeft: '20px',
        marginRight: '20px',
        marginTop: '10px',
        marginBottom: '10px',
      }

      vi.spyOn(window, 'getComputedStyle').mockReturnValue(mockStyles)

      const element = document.createElement('div')
      const parent = document.createElement('div')
      parent.appendChild(element)

      const result = sumParentsBoxModel(element, 1)

      // Verify the calculation uses parsePx correctly
      expect(result.totalWidth).toBe(64) // 10 + 10 + 2 + 2 + 20 + 20
      expect(result.totalHeight).toBe(32) // 5 + 5 + 1 + 1 + 10 + 10
    })

    it('should handle mixed valid and invalid CSS values', () => {
      const mockStyles = {
        paddingLeft: '10px',
        paddingRight: 'invalid',
        paddingTop: '5px',
        paddingBottom: 'invalid',
        borderLeftWidth: '2px',
        borderRightWidth: 'invalid',
        borderTopWidth: '1px',
        borderBottomWidth: 'invalid',
        marginLeft: '20px',
        marginRight: 'invalid',
        marginTop: '10px',
        marginBottom: 'invalid',
      }

      vi.spyOn(window, 'getComputedStyle').mockReturnValue(mockStyles)

      const element = document.createElement('div')
      const parent = document.createElement('div')
      parent.appendChild(element)

      const result = sumParentsBoxModel(element, 1)

      // Only valid values should be included
      expect(result.totalWidth).toBe(32) // 10 + 0 + 2 + 0 + 20 + 0
      expect(result.totalHeight).toBe(16) // 5 + 0 + 1 + 0 + 10 + 0
    })
  })
})

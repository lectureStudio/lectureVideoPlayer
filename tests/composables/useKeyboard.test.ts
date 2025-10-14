import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useKeyboard, type KeyBinding } from '@/composables/useKeyboard'

describe('useKeyboard', () => {
  let mockAddEventListener: ReturnType<typeof vi.fn>
  let mockRemoveEventListener: ReturnType<typeof vi.fn>
  let mockPreventDefault: ReturnType<typeof vi.fn>
  let mockStopPropagation: ReturnType<typeof vi.fn>

  // Helper function to create a test component with useKeyboard
  const createTestComponent = (bindings: KeyBinding[]) => {
    return mount({
      setup() {
        return useKeyboard(bindings)
      },
      template: '<div></div>'
    })
  }

  beforeEach(() => {
    mockAddEventListener = vi.fn()
    mockRemoveEventListener = vi.fn()
    mockPreventDefault = vi.fn()
    mockStopPropagation = vi.fn()

    // Mock window.addEventListener
    vi.spyOn(window, 'addEventListener').mockImplementation(mockAddEventListener)
    vi.spyOn(window, 'removeEventListener').mockImplementation(mockRemoveEventListener)

    HTMLElement.prototype.addEventListener = mockAddEventListener
    HTMLElement.prototype.removeEventListener = mockRemoveEventListener
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('basic functionality', () => {
    it('should register event listener on mount', async () => {
      const handler = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), { capture: false })
      
      wrapper.unmount()
    })

    it('should remove event listener on unmount', async () => {
      const handler = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = mount({
        setup() {
          const { enabled } = useKeyboard(bindings)
          return { enabled }
        },
        template: '<div></div>'
      })

      await wrapper.vm.$nextTick()
      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), { capture: false })

      wrapper.unmount()

      expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), { capture: false })
    })

    it('should call handler when key matches', async () => {
      const handler = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      // Get the event listener function
      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      expect(eventListener).toBeDefined()

      // Create mock event
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      // Trigger the event
      eventListener(mockEvent)

      expect(handler).toHaveBeenCalledWith(mockEvent)
      expect(mockPreventDefault).toHaveBeenCalled()
      expect(mockStopPropagation).toHaveBeenCalled()
      
      wrapper.unmount()
    })

    it('should not call handler when key does not match', async () => {
      const handler = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const mockEvent = {
        key: 'b',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler).not.toHaveBeenCalled()
      expect(mockPreventDefault).not.toHaveBeenCalled()
      expect(mockStopPropagation).not.toHaveBeenCalled()
      
      wrapper.unmount()
    })
  })

  describe('key matching', () => {
    it('should match key with modifiers', async () => {
      const handler = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: { key: 's', ctrl: true },
          handler,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const mockEvent = {
        key: 's',
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler).toHaveBeenCalled()
      
      wrapper.unmount()
    })

    it('should not match when modifiers are wrong', async () => {
      const handler = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: { key: 's', ctrl: true },
          handler,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const mockEvent = {
        key: 's',
        ctrlKey: false, // Wrong modifier
        shiftKey: false,
        altKey: false,
        metaKey: false,
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler).not.toHaveBeenCalled()
      
      wrapper.unmount()
    })

    it('should match multiple key definitions', async () => {
      const handler = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: [
            { key: 'a' },
            { key: 'b' },
          ],
          handler,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]

      // Test first key
      const mockEventA = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEventA)
      expect(handler).toHaveBeenCalledWith(mockEventA)

      // Test second key
      const mockEventB = {
        key: 'b',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEventB)
      expect(handler).toHaveBeenCalledWith(mockEventB)
    })

    it('should handle repeat behavior', async () => {
      const handlerNoRepeat = vi.fn()
      const handlerOnlyRepeat = vi.fn()
      const handlerAllowRepeat = vi.fn()

      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a', repeat: false },
          handler: handlerNoRepeat,
        },
        {
          keys: { key: 'b', repeat: true },
          handler: handlerOnlyRepeat,
        },
        {
          keys: { key: 'c', repeat: 'allow' },
          handler: handlerAllowRepeat,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]

      // Test no repeat (should not trigger on repeat)
      const mockEventNoRepeat = {
        key: 'a',
        repeat: true,
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEventNoRepeat)
      expect(handlerNoRepeat).not.toHaveBeenCalled()

      // Test only repeat (should only trigger on repeat)
      const mockEventOnlyRepeat = {
        key: 'b',
        repeat: false,
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEventOnlyRepeat)
      expect(handlerOnlyRepeat).not.toHaveBeenCalled()

      // Test allow repeat (should trigger on both)
      const mockEventAllowRepeat = {
        key: 'c',
        repeat: true,
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEventAllowRepeat)
      expect(handlerAllowRepeat).toHaveBeenCalled()
      
      wrapper.unmount()
    })
  })

  describe('conditional execution', () => {
    it('should respect when condition', async () => {
      const handler = vi.fn()
      const condition = vi.fn().mockReturnValue(false)
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
          when: condition,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(condition).toHaveBeenCalled()
      expect(handler).not.toHaveBeenCalled()
      
      wrapper.unmount()
    })

    it('should execute when condition is true', async () => {
      const handler = vi.fn()
      const condition = vi.fn().mockReturnValue(true)
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
          when: condition,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(condition).toHaveBeenCalled()
      expect(handler).toHaveBeenCalled()
      
      wrapper.unmount()
    })
  })

  describe('enabled state', () => {
    it('should not execute when disabled', async () => {
      const handler = vi.fn()
      const enabled = ref(false)
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = mount({
        setup() {
          return useKeyboard(bindings, { enabled })
        },
        template: '<div></div>'
      })

      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler).not.toHaveBeenCalled()
      
      wrapper.unmount()
    })

    it('should execute when enabled', async () => {
      const handler = vi.fn()
      const enabled = ref(true)
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = mount({
        setup() {
          return useKeyboard(bindings, { enabled })
        },
        template: '<div></div>'
      })

      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler).toHaveBeenCalled()
      
      wrapper.unmount()
    })
  })

  describe('editable element handling', () => {
    it('should ignore events from input elements by default', async () => {
      const handler = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const inputElement = document.createElement('input')
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: inputElement,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler).not.toHaveBeenCalled()
      
      wrapper.unmount()
    })

    it('should not ignore events from input elements when ignoreEditable is false', async () => {
      const handler = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = mount({
        setup() {
          return useKeyboard(bindings, { ignoreEditable: false })
        },
        template: '<div></div>'
      })

      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const inputElement = document.createElement('input')
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: inputElement,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler).toHaveBeenCalled()
      
      wrapper.unmount()
    })

    it('should ignore events from textarea elements', async () => {
      const handler = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const textareaElement = document.createElement('textarea')
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: textareaElement,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler).not.toHaveBeenCalled()
      
      wrapper.unmount()
    })

    it('should ignore events from contentEditable elements', async () => {
      const handler = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const contentEditableElement = document.createElement('div')
      Object.defineProperty(contentEditableElement, 'isContentEditable', {
        value: true,
        writable: false
      })
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: contentEditableElement,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler).not.toHaveBeenCalled()
      
      wrapper.unmount()
    })
  })

  describe('scoping', () => {
    it('should only handle events within scoped element', async () => {
      const handler = vi.fn()
      const scopedElement = document.createElement('div')
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = mount({
        setup() {
          return useKeyboard(bindings, { onlyWhenTargetInside: scopedElement })
        },
        template: '<div></div>'
      })

      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const outsideElement = document.createElement('span')
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: outsideElement,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler).not.toHaveBeenCalled()
      
      wrapper.unmount()
    })

    it('should handle events within scoped element', async () => {
      const handler = vi.fn()
      const scopedElement = document.createElement('div')
      const childElement = document.createElement('span')
      scopedElement.appendChild(childElement)
      
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = mount({
        setup() {
          return useKeyboard(bindings, { onlyWhenTargetInside: scopedElement })
        },
        template: '<div></div>'
      })

      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: childElement,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler).toHaveBeenCalled()
      
      wrapper.unmount()
    })
  })

  describe('priority handling', () => {
    it('should execute higher priority bindings first', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler: handler1,
          priority: 1,
        },
        {
          keys: { key: 'a' },
          handler: handler2,
          priority: 2,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler2).toHaveBeenCalled() // Higher priority
      expect(handler1).not.toHaveBeenCalled() // Lower priority
      
      wrapper.unmount()
    })
  })

  describe('handler return value', () => {
    it('should not prevent default when handler returns false', async () => {
      const handler = vi.fn().mockReturnValue(false)
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = createTestComponent(bindings)
      await wrapper.vm.$nextTick()

      const eventListener = mockAddEventListener.mock.calls[0]?.[1]
      const mockEvent = {
        key: 'a',
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
        target: document.body,
      } as unknown as KeyboardEvent

      eventListener(mockEvent)

      expect(handler).toHaveBeenCalled()
      expect(mockPreventDefault).not.toHaveBeenCalled()
      expect(mockStopPropagation).not.toHaveBeenCalled()
      
      wrapper.unmount()
    })
  })

  describe('capture option', () => {
    it('should use capture phase when specified', async () => {
      const handler = vi.fn()
      const bindings: KeyBinding[] = [
        {
          keys: { key: 'a' },
          handler,
        },
      ]

      const wrapper = mount({
        setup() {
          return useKeyboard(bindings, { capture: true })
        },
        template: '<div></div>'
      })

      await wrapper.vm.$nextTick()

      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), { capture: true })
      
      wrapper.unmount()
    })
  })
})

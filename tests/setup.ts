import AppIcon from '@/components/AppIcon.vue'
import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock global objects that might not be available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock navigator.wakeLock
Object.defineProperty(navigator, 'wakeLock', {
  writable: true,
  configurable: true,
  value: {
    request: vi.fn().mockResolvedValue({
      release: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  },
})

// Mock fullscreen API
Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null,
})

Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
})

Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock fetch
global.fetch = vi.fn()

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
}

// Configure Vue Test Utils
config.global.stubs = {
  // Stub common components that might not be needed in unit tests
  'router-link': true,
  'router-view': true,
}

// Mock the fluentIconMap for AppIcon component
vi.mock('@/utils/icons', () => ({
  fluentIconMap: {
    'speaker-mute': '<svg data-name="speaker-mute"><path d="M0 0h24v24H0z"/></svg>',
    'speaker-low': '<svg data-name="speaker-low"><path d="M0 0h24v24H0z"/></svg>',
    'speaker-medium': '<svg data-name="speaker-medium"><path d="M0 0h24v24H0z"/></svg>',
    'speaker-high': '<svg data-name="speaker-high"><path d="M0 0h24v24H0z"/></svg>',
    'playback-speed': '<svg data-name="playback-speed"><path d="M0 0h24v24H0z"/></svg>',
  },
}))

// Register global components for tests
config.global.components = {
  AppIcon,
}

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    DEV: true,
  },
}))

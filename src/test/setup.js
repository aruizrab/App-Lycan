import { vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// --- localStorage mock (Map-based) ---
function createLocalStorageMock() {
  let store = new Map()
  return {
    getItem: vi.fn((key) => {
      const value = store.get(key)
      return value === undefined ? null : value
    }),
    setItem: vi.fn((key, value) => {
      store.set(key, String(value))
    }),
    removeItem: vi.fn((key) => {
      store.delete(key)
    }),
    clear: vi.fn(() => {
      store.clear()
    }),
    key: vi.fn((index) => {
      return [...store.keys()][index] ?? null
    }),
    get length() {
      return store.size
    },
    // Utility for tests to inspect raw store
    _store: store
  }
}

const mockLocalStorage = createLocalStorageMock()
vi.stubGlobal('localStorage', mockLocalStorage)

// --- crypto.randomUUID mock ---
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {}
}
if (typeof globalThis.crypto.randomUUID !== 'function') {
  let uuidCounter = 0
  globalThis.crypto.randomUUID = vi.fn(() => {
    uuidCounter++
    return `test-uuid-${uuidCounter}`
  })
}

// --- vue-router mock ---
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    currentRoute: { value: { path: '/', params: {}, query: {} } }
  })),
  useRoute: vi.fn(() => ({
    path: '/',
    params: {},
    query: {},
    name: 'home',
    meta: {}
  })),
  createRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    beforeEach: vi.fn(),
    afterEach: vi.fn(),
    install: vi.fn()
  })),
  createWebHistory: vi.fn()
}))

// --- Pinia reset per test ---
beforeEach(() => {
  // Clear localStorage between tests
  mockLocalStorage.clear()
  mockLocalStorage.getItem.mockClear()
  mockLocalStorage.setItem.mockClear()
  mockLocalStorage.removeItem.mockClear()
  mockLocalStorage.clear.mockClear()

  // Reset crypto.randomUUID counter
  if (globalThis.crypto.randomUUID.mockClear) {
    globalThis.crypto.randomUUID.mockClear()
  }

  // Fresh Pinia instance per test
  setActivePinia(createPinia())
})

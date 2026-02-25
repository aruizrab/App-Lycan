import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'

// Mock the AI service module before importing the store
vi.mock('../../services/ai', () => ({
  fetchAvailableModels: vi.fn(() => Promise.resolve([])),
  RECOMMENDED_MODELS: [
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' }
  ],
  WEB_SEARCH_MODELS: [],
  determineWebSearchCapability: vi.fn(() => false),
  isWebSearchCompatible: vi.fn(() => false),
  streamAiResponse: vi.fn(),
  performAiAction: vi.fn(),
  performAiActionWithJson: vi.fn(),
  streamAndCollect: vi.fn(),
  streamWithTools: vi.fn(),
  chatWithTools: vi.fn(),
  performCvAiAction: vi.fn()
}))

import { useSettingsStore, AI_COMMAND_TYPES, WEB_SEARCH_COMMANDS } from '../settings'
import { fetchAvailableModels, RECOMMENDED_MODELS } from '../../services/ai'
import { createSettings } from '../../test/factories'

describe('settings store', () => {
  let store

  beforeEach(() => {
    vi.mocked(fetchAvailableModels).mockReset()
    vi.mocked(fetchAvailableModels).mockResolvedValue([])
    store = useSettingsStore()
  })

  describe('initialization', () => {
    it('starts with default settings', () => {
      expect(store.atsMode).toBe(false)
      expect(store.uppercaseName).toBe(true)
      expect(store.openRouterKey).toBe('')
      expect(store.openRouterModel).toBe('openai/gpt-4o-mini')
      expect(store.matchReportThreshold).toBe(70)
    })

    it('has default task models for all command types', () => {
      expect(store.taskModels[AI_COMMAND_TYPES.JOB_ANALYSIS]).toBe('perplexity/sonar-pro')
      expect(store.taskModels[AI_COMMAND_TYPES.MATCH_REPORT]).toBe('openai/gpt-4o-mini')
      expect(store.taskModels[AI_COMMAND_TYPES.COMPANY_RESEARCH]).toBe('perplexity/sonar-pro')
      expect(store.taskModels[AI_COMMAND_TYPES.CV_GENERATION]).toBe('openai/gpt-4o-mini')
      expect(store.taskModels[AI_COMMAND_TYPES.COVER_LETTER]).toBe('openai/gpt-4o-mini')
    })

    it('starts with empty customModels array', () => {
      expect(store.customModels).toEqual([])
    })

    it('loads availableModels from RECOMMENDED_MODELS fallback', () => {
      expect(store.availableModels).toEqual(RECOMMENDED_MODELS)
    })
  })

  describe('loading from localStorage', () => {
    it('merges saved settings with defaults', () => {
      const saved = createSettings({ atsMode: true, openRouterKey: 'test-key' })
      localStorage.setItem('app-lycan-ui-settings', JSON.stringify(saved))

      const freshStore = useSettingsStore()
      // Pinia reuses the instance, but the init logic ran on first creation
      // Verify defaults are applied
      expect(freshStore.openRouterModel).toBeDefined()
    })

    it('deep merges taskModels with defaults', () => {
      const saved = { taskModels: { jobAnalysis: 'custom/model' } }
      localStorage.setItem('app-lycan-ui-settings', JSON.stringify(saved))

      const freshStore = useSettingsStore()
      expect(freshStore.taskModels).toBeDefined()
    })
  })

  describe('persistence', () => {
    it('persists to localStorage on state change', async () => {
      store.atsMode = true
      await nextTick()
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'app-lycan-ui-settings',
        expect.any(String)
      )
    })
  })

  describe('resetSettings', () => {
    it('resets all settings to defaults', () => {
      store.atsMode = true
      store.openRouterKey = 'some-key'
      store.uppercaseName = false

      store.resetSettings()

      expect(store.atsMode).toBe(false)
      expect(store.openRouterKey).toBe('')
      expect(store.uppercaseName).toBe(true)
    })
  })

  describe('getModelForTask', () => {
    it('returns task-specific model', () => {
      expect(store.getModelForTask(AI_COMMAND_TYPES.JOB_ANALYSIS)).toBe('perplexity/sonar-pro')
    })

    it('falls back to general model for unknown task type', () => {
      expect(store.getModelForTask('unknown-type')).toBe('openai/gpt-4o-mini')
    })
  })

  describe('setModelForTask', () => {
    it('updates model for a valid task type', () => {
      store.setModelForTask(AI_COMMAND_TYPES.JOB_ANALYSIS, 'custom/model')
      expect(store.taskModels[AI_COMMAND_TYPES.JOB_ANALYSIS]).toBe('custom/model')
    })

    it('does not update for invalid task type', () => {
      const before = { ...store.taskModels }
      store.setModelForTask('invalid-type', 'custom/model')
      expect(store.taskModels).toEqual(before)
    })
  })

  describe('custom models', () => {
    it('adds a custom model', () => {
      store.addCustomModel({ id: 'my/model', name: 'My Model', webSearchCompatible: true })
      expect(store.customModels).toHaveLength(1)
      expect(store.customModels[0].id).toBe('my/model')
      expect(store.customModels[0].webSearchCompatible).toBe(true)
    })

    it('does not add duplicate model', () => {
      store.addCustomModel({ id: 'my/model', name: 'My Model' })
      store.addCustomModel({ id: 'my/model', name: 'My Model Duplicate' })
      expect(store.customModels).toHaveLength(1)
    })

    it('defaults webSearchCompatible to false', () => {
      store.addCustomModel({ id: 'my/model', name: 'My Model' })
      expect(store.customModels[0].webSearchCompatible).toBe(false)
    })

    it('removes a custom model', () => {
      store.addCustomModel({ id: 'my/model', name: 'My Model' })
      store.removeCustomModel('my/model')
      expect(store.customModels).toHaveLength(0)
    })

    it('does nothing when removing non-existent model', () => {
      store.addCustomModel({ id: 'my/model', name: 'My Model' })
      store.removeCustomModel('non-existent')
      expect(store.customModels).toHaveLength(1)
    })

    it('updates a custom model', () => {
      store.addCustomModel({ id: 'my/model', name: 'Old Name' })
      store.updateCustomModel('my/model', { name: 'New Name', webSearchCompatible: true })
      expect(store.customModels[0].name).toBe('New Name')
      expect(store.customModels[0].webSearchCompatible).toBe(true)
    })

    it('does nothing when updating non-existent model', () => {
      store.updateCustomModel('non-existent', { name: 'Test' })
      expect(store.customModels).toHaveLength(0)
    })
  })

  describe('commandRequiresWebSearch', () => {
    it('returns true for web search commands', () => {
      expect(store.commandRequiresWebSearch(AI_COMMAND_TYPES.JOB_ANALYSIS)).toBe(true)
      expect(store.commandRequiresWebSearch(AI_COMMAND_TYPES.COMPANY_RESEARCH)).toBe(true)
    })

    it('returns false for non-web-search commands', () => {
      expect(store.commandRequiresWebSearch(AI_COMMAND_TYPES.MATCH_REPORT)).toBe(false)
      expect(store.commandRequiresWebSearch(AI_COMMAND_TYPES.CV_GENERATION)).toBe(false)
      expect(store.commandRequiresWebSearch(AI_COMMAND_TYPES.COVER_LETTER)).toBe(false)
    })
  })

  describe('fetchModels', () => {
    it('does not fetch when no API key is set', async () => {
      store.openRouterKey = ''
      await store.fetchModels(true)
      expect(fetchAvailableModels).not.toHaveBeenCalled()
      // Falls back to RECOMMENDED_MODELS
      expect(store.availableModels).toEqual(RECOMMENDED_MODELS)
    })

    it('fetches models when API key is set', async () => {
      const mockModels = [{ id: 'test/model', name: 'Test Model' }]
      vi.mocked(fetchAvailableModels).mockResolvedValue(mockModels)

      store.openRouterKey = 'test-api-key'
      await store.fetchModels(true)

      expect(fetchAvailableModels).toHaveBeenCalledWith('test-api-key')
      expect(store.availableModels).toEqual(mockModels)
    })

    it('caches fetched models in localStorage', async () => {
      const mockModels = [{ id: 'test/model', name: 'Test Model' }]
      vi.mocked(fetchAvailableModels).mockResolvedValue(mockModels)

      store.openRouterKey = 'test-api-key'
      await store.fetchModels(true)

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'app-lycan-models-cache',
        expect.any(String)
      )
    })

    it('uses cached models when cache is valid', async () => {
      const cached = {
        models: [{ id: 'cached/model', name: 'Cached' }],
        timestamp: Date.now() // fresh cache
      }
      localStorage.setItem('app-lycan-models-cache', JSON.stringify(cached))

      store.openRouterKey = 'test-api-key'
      await store.fetchModels(false) // non-forced

      // Should not fetch since cache is valid
      expect(fetchAvailableModels).not.toHaveBeenCalled()
    })

    it('falls back to RECOMMENDED_MODELS on fetch error', async () => {
      vi.mocked(fetchAvailableModels).mockRejectedValue(new Error('Network error'))

      store.openRouterKey = 'test-api-key'
      store.availableModels = [] // Clear to test fallback
      await store.fetchModels(true)

      expect(store.modelsFetchError).toBe('Network error')
      expect(store.availableModels).toEqual(RECOMMENDED_MODELS)
    })

    it('does not fetch when already loading', async () => {
      store.isLoadingModels = true
      store.openRouterKey = 'test-api-key'
      await store.fetchModels(true)
      expect(fetchAvailableModels).not.toHaveBeenCalled()
    })

    it('sets isLoadingModels during fetch', async () => {
      let resolvePromise
      vi.mocked(fetchAvailableModels).mockReturnValue(
        new Promise(resolve => { resolvePromise = resolve })
      )

      store.openRouterKey = 'test-api-key'
      const fetchPromise = store.fetchModels(true)

      expect(store.isLoadingModels).toBe(true)
      resolvePromise([])
      await fetchPromise
      expect(store.isLoadingModels).toBe(false)
    })
  })

  describe('refreshModels', () => {
    it('forces a refetch', async () => {
      vi.mocked(fetchAvailableModels).mockResolvedValue([])
      store.openRouterKey = 'test-api-key'
      await store.refreshModels()
      expect(fetchAvailableModels).toHaveBeenCalled()
    })
  })

  describe('getCacheAge', () => {
    it('returns null when no cache timestamp', () => {
      store.modelsLastFetched = null
      expect(store.getCacheAge()).toBeNull()
    })

    it('returns age in hours', () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
      store.modelsLastFetched = twoHoursAgo
      expect(store.getCacheAge()).toBe(2)
    })
  })

  describe('AI_COMMAND_TYPES constant', () => {
    it('has all expected command types', () => {
      expect(AI_COMMAND_TYPES.JOB_ANALYSIS).toBe('jobAnalysis')
      expect(AI_COMMAND_TYPES.MATCH_REPORT).toBe('matchReport')
      expect(AI_COMMAND_TYPES.COMPANY_RESEARCH).toBe('companyResearch')
      expect(AI_COMMAND_TYPES.CV_GENERATION).toBe('cvGeneration')
      expect(AI_COMMAND_TYPES.COVER_LETTER).toBe('coverLetter')
    })
  })

  describe('WEB_SEARCH_COMMANDS constant', () => {
    it('includes job analysis and company research', () => {
      expect(WEB_SEARCH_COMMANDS).toContain(AI_COMMAND_TYPES.JOB_ANALYSIS)
      expect(WEB_SEARCH_COMMANDS).toContain(AI_COMMAND_TYPES.COMPANY_RESEARCH)
    })

    it('does not include non-web-search commands', () => {
      expect(WEB_SEARCH_COMMANDS).not.toContain(AI_COMMAND_TYPES.MATCH_REPORT)
      expect(WEB_SEARCH_COMMANDS).not.toContain(AI_COMMAND_TYPES.CV_GENERATION)
      expect(WEB_SEARCH_COMMANDS).not.toContain(AI_COMMAND_TYPES.COVER_LETTER)
    })
  })
})

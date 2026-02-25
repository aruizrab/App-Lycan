import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useSystemPromptsStore, PROMPT_TYPES, DEFAULT_PROMPTS } from '../systemPrompts'

describe('systemPrompts store', () => {
  let store

  beforeEach(() => {
    store = useSystemPromptsStore()
  })

  describe('initialization', () => {
    it('initializes with all prompt types', () => {
      Object.values(PROMPT_TYPES).forEach(type => {
        expect(store[type]).toBeDefined()
        expect(store[type].default).toBeDefined()
        expect(store[type].custom).toEqual([])
        expect(store[type].activeId).toBe('default')
      })
    })

    it('has default prompts for all command types', () => {
      Object.values(PROMPT_TYPES).forEach(type => {
        expect(store[type].default).toBe(DEFAULT_PROMPTS[type])
      })
    })
  })

  describe('PROMPT_TYPES constant', () => {
    it('has all expected prompt types', () => {
      expect(PROMPT_TYPES.JOB_ANALYSIS).toBe('jobAnalysis')
      expect(PROMPT_TYPES.MATCH_REPORT).toBe('matchReport')
      expect(PROMPT_TYPES.COMPANY_RESEARCH).toBe('companyResearch')
      expect(PROMPT_TYPES.CV_GENERATION).toBe('cvGeneration')
      expect(PROMPT_TYPES.COVER_LETTER).toBe('coverLetter')
    })
  })

  describe('getActivePrompt', () => {
    it('returns default prompt when activeId is "default"', () => {
      const prompt = store.getActivePrompt(PROMPT_TYPES.JOB_ANALYSIS)
      expect(prompt.id).toBe('default')
      expect(prompt.name).toBe('Default')
      expect(prompt.content).toBe(DEFAULT_PROMPTS[PROMPT_TYPES.JOB_ANALYSIS])
      expect(prompt.isDefault).toBe(true)
    })

    it('returns custom prompt when set as active', () => {
      const customId = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'My Prompt', 'Custom content')
      store.setActivePrompt(PROMPT_TYPES.JOB_ANALYSIS, customId)

      const prompt = store.getActivePrompt(PROMPT_TYPES.JOB_ANALYSIS)
      expect(prompt.id).toBe(customId)
      expect(prompt.name).toBe('My Prompt')
      expect(prompt.content).toBe('Custom content')
      expect(prompt.isDefault).toBe(false)
    })

    it('falls back to default if active custom prompt is deleted', () => {
      const customId = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Temp', 'Content')
      store.setActivePrompt(PROMPT_TYPES.JOB_ANALYSIS, customId)
      store.deleteCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, customId)

      const prompt = store.getActivePrompt(PROMPT_TYPES.JOB_ANALYSIS)
      expect(prompt.id).toBe('default')
      expect(prompt.isDefault).toBe(true)
    })

    it('returns null for invalid prompt type', () => {
      expect(store.getActivePrompt('invalid-type')).toBeNull()
    })
  })

  describe('getAllPrompts', () => {
    it('returns default prompt plus custom prompts', () => {
      store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Custom 1', 'Content 1')
      store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Custom 2', 'Content 2')

      const prompts = store.getAllPrompts(PROMPT_TYPES.JOB_ANALYSIS)
      expect(prompts).toHaveLength(3)
      expect(prompts[0].isDefault).toBe(true)
      expect(prompts[1].name).toBe('Custom 1')
      expect(prompts[2].name).toBe('Custom 2')
    })

    it('returns empty array for invalid prompt type', () => {
      expect(store.getAllPrompts('invalid-type')).toEqual([])
    })
  })

  describe('setActivePrompt', () => {
    it('sets active prompt for a type', () => {
      const customId = store.addCustomPrompt(PROMPT_TYPES.MATCH_REPORT, 'Custom', 'Content')
      store.setActivePrompt(PROMPT_TYPES.MATCH_REPORT, customId)
      expect(store[PROMPT_TYPES.MATCH_REPORT].activeId).toBe(customId)
    })

    it('does nothing for invalid type', () => {
      store.setActivePrompt('invalid-type', 'some-id')
      // Should not throw
    })
  })

  describe('addCustomPrompt', () => {
    it('adds a custom prompt and returns its ID', () => {
      const id = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'My Prompt', 'Custom content')
      expect(id).toBeDefined()

      const prompts = store.getAllPrompts(PROMPT_TYPES.JOB_ANALYSIS)
      const custom = prompts.find(p => p.id === id)
      expect(custom).toBeDefined()
      expect(custom.name).toBe('My Prompt')
      expect(custom.content).toBe('Custom content')
    })

    it('sets createdAt and lastModified timestamps', () => {
      const id = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Timestamped', 'Content')
      const prompt = store[PROMPT_TYPES.JOB_ANALYSIS].custom.find(p => p.id === id)
      expect(prompt.createdAt).toBeDefined()
      expect(prompt.lastModified).toBeDefined()
    })

    it('returns null for invalid type', () => {
      expect(store.addCustomPrompt('invalid-type', 'Name', 'Content')).toBeNull()
    })
  })

  describe('updateCustomPrompt', () => {
    it('updates prompt name and content', () => {
      const id = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Old Name', 'Old Content')
      const result = store.updateCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, id, {
        name: 'New Name',
        content: 'New Content'
      })

      expect(result).toBe(true)
      const prompt = store[PROMPT_TYPES.JOB_ANALYSIS].custom.find(p => p.id === id)
      expect(prompt.name).toBe('New Name')
      expect(prompt.content).toBe('New Content')
    })

    it('updates lastModified on update', () => {
      const id = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Name', 'Content')
      const before = store[PROMPT_TYPES.JOB_ANALYSIS].custom.find(p => p.id === id).lastModified

      store.updateCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, id, { name: 'Updated' })
      const after = store[PROMPT_TYPES.JOB_ANALYSIS].custom.find(p => p.id === id).lastModified
      expect(after).toBeGreaterThanOrEqual(before)
    })

    it('returns false for non-existent prompt', () => {
      expect(store.updateCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'non-existent', { name: 'X' })).toBe(false)
    })

    it('returns false for invalid type', () => {
      expect(store.updateCustomPrompt('invalid-type', 'some-id', { name: 'X' })).toBe(false)
    })
  })

  describe('deleteCustomPrompt', () => {
    it('deletes a custom prompt', () => {
      const id = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'To Delete', 'Content')
      const result = store.deleteCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, id)

      expect(result).toBe(true)
      expect(store[PROMPT_TYPES.JOB_ANALYSIS].custom).toHaveLength(0)
    })

    it('resets activeId to default if deleted prompt was active', () => {
      const id = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Active', 'Content')
      store.setActivePrompt(PROMPT_TYPES.JOB_ANALYSIS, id)

      store.deleteCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, id)
      expect(store[PROMPT_TYPES.JOB_ANALYSIS].activeId).toBe('default')
    })

    it('does not reset activeId if different prompt deleted', () => {
      const id1 = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Active', 'Content 1')
      const id2 = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Other', 'Content 2')
      store.setActivePrompt(PROMPT_TYPES.JOB_ANALYSIS, id1)

      store.deleteCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, id2)
      expect(store[PROMPT_TYPES.JOB_ANALYSIS].activeId).toBe(id1)
    })

    it('returns false for non-existent prompt', () => {
      expect(store.deleteCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'non-existent')).toBe(false)
    })

    it('returns false for invalid type', () => {
      expect(store.deleteCustomPrompt('invalid-type', 'some-id')).toBe(false)
    })
  })

  describe('duplicatePrompt', () => {
    it('duplicates a custom prompt with " (Copy)" suffix', () => {
      const id = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Original', 'Content')
      const copyId = store.duplicatePrompt(PROMPT_TYPES.JOB_ANALYSIS, id)

      expect(copyId).toBeDefined()
      const copy = store[PROMPT_TYPES.JOB_ANALYSIS].custom.find(p => p.id === copyId)
      expect(copy.name).toBe('Original (Copy)')
      expect(copy.content).toBe('Content')
    })

    it('duplicates the default prompt', () => {
      const copyId = store.duplicatePrompt(PROMPT_TYPES.JOB_ANALYSIS, 'default')

      expect(copyId).toBeDefined()
      const copy = store[PROMPT_TYPES.JOB_ANALYSIS].custom.find(p => p.id === copyId)
      expect(copy.name).toBe('Default (Copy)')
      expect(copy.content).toBe(DEFAULT_PROMPTS[PROMPT_TYPES.JOB_ANALYSIS])
    })

    it('returns null for non-existent source prompt', () => {
      expect(store.duplicatePrompt(PROMPT_TYPES.JOB_ANALYSIS, 'non-existent')).toBeNull()
    })

    it('returns null for invalid type', () => {
      expect(store.duplicatePrompt('invalid-type', 'default')).toBeNull()
    })
  })

  describe('resetToDefault', () => {
    it('resets active prompt to default', () => {
      const id = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Custom', 'Content')
      store.setActivePrompt(PROMPT_TYPES.JOB_ANALYSIS, id)

      store.resetToDefault(PROMPT_TYPES.JOB_ANALYSIS)
      expect(store[PROMPT_TYPES.JOB_ANALYSIS].activeId).toBe('default')
    })

    it('does nothing for invalid type', () => {
      store.resetToDefault('invalid-type')
      // Should not throw
    })
  })

  describe('getCustomPromptsCount', () => {
    it('returns 0 when no custom prompts', () => {
      expect(store.getCustomPromptsCount(PROMPT_TYPES.JOB_ANALYSIS)).toBe(0)
    })

    it('returns correct count', () => {
      store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Prompt 1', 'Content 1')
      store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Prompt 2', 'Content 2')
      expect(store.getCustomPromptsCount(PROMPT_TYPES.JOB_ANALYSIS)).toBe(2)
    })

    it('returns 0 for invalid type', () => {
      expect(store.getCustomPromptsCount('invalid-type')).toBe(0)
    })
  })

  describe('exportPrompts / importPrompts', () => {
    it('exports all custom prompts as JSON', () => {
      store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Exported', 'Export content')
      const exported = store.exportPrompts()
      const parsed = JSON.parse(exported)

      expect(parsed[PROMPT_TYPES.JOB_ANALYSIS]).toBeDefined()
      expect(parsed[PROMPT_TYPES.JOB_ANALYSIS].custom).toHaveLength(1)
      expect(parsed[PROMPT_TYPES.JOB_ANALYSIS].custom[0].name).toBe('Exported')
    })

    it('imports prompts in merge mode (default)', () => {
      store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Existing', 'Content')

      const toImport = {
        [PROMPT_TYPES.JOB_ANALYSIS]: {
          custom: [{ id: 'imported-1', name: 'Imported', content: 'Imported content', createdAt: Date.now(), lastModified: Date.now() }],
          activeId: 'imported-1'
        }
      }
      const result = store.importPrompts(JSON.stringify(toImport))

      expect(result).toBe(true)
      expect(store[PROMPT_TYPES.JOB_ANALYSIS].custom).toHaveLength(2)
    })

    it('does not add duplicates on merge import', () => {
      const id = store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Existing', 'Content')

      const toImport = {
        [PROMPT_TYPES.JOB_ANALYSIS]: {
          custom: [{ id, name: 'Duplicate', content: 'Duplicate content', createdAt: Date.now(), lastModified: Date.now() }]
        }
      }
      store.importPrompts(JSON.stringify(toImport))

      expect(store[PROMPT_TYPES.JOB_ANALYSIS].custom).toHaveLength(1)
      expect(store[PROMPT_TYPES.JOB_ANALYSIS].custom[0].name).toBe('Existing') // not overwritten
    })

    it('imports prompts in replace mode', () => {
      store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Old', 'Old content')

      const toImport = {
        [PROMPT_TYPES.JOB_ANALYSIS]: {
          custom: [{ id: 'new-1', name: 'New', content: 'New content', createdAt: Date.now(), lastModified: Date.now() }],
          activeId: 'new-1'
        }
      }
      const result = store.importPrompts(JSON.stringify(toImport), false)

      expect(result).toBe(true)
      expect(store[PROMPT_TYPES.JOB_ANALYSIS].custom).toHaveLength(1)
      expect(store[PROMPT_TYPES.JOB_ANALYSIS].custom[0].name).toBe('New')
      expect(store[PROMPT_TYPES.JOB_ANALYSIS].activeId).toBe('new-1')
    })

    it('returns false on invalid JSON', () => {
      expect(store.importPrompts('not json')).toBe(false)
    })

    it('ignores unknown prompt types in import', () => {
      const toImport = {
        unknownType: {
          custom: [{ id: '1', name: 'Test', content: 'Content' }]
        }
      }
      const result = store.importPrompts(JSON.stringify(toImport))
      expect(result).toBe(true)
      // Should not add unknown type to state
    })
  })

  describe('persistence', () => {
    it('auto-saves to localStorage on change', async () => {
      store.addCustomPrompt(PROMPT_TYPES.JOB_ANALYSIS, 'Persisted', 'Content')
      await nextTick()
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'app-lycan-system-prompts',
        expect.any(String)
      )
    })
  })

  describe('loading from localStorage', () => {
    it('preserves latest default prompts on load', () => {
      // Simulate saved state with old default
      const saved = {
        [PROMPT_TYPES.JOB_ANALYSIS]: {
          default: 'Old default prompt',
          custom: [],
          activeId: 'default'
        }
      }
      localStorage.setItem('app-lycan-system-prompts', JSON.stringify(saved))

      const freshStore = useSystemPromptsStore()
      // Default should always be the current code's default, not the saved one
      expect(freshStore[PROMPT_TYPES.JOB_ANALYSIS].default).toBe(DEFAULT_PROMPTS[PROMPT_TYPES.JOB_ANALYSIS])
    })
  })
})

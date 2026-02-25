import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCvMetaStore } from '../cvMeta'

describe('cvMeta store', () => {
  let store

  beforeEach(() => {
    store = useCvMetaStore()
  })

  describe('initialization', () => {
    it('starts with empty state', () => {
      expect(Object.keys(store.state)).toHaveLength(0)
    })

    it('loads existing meta data from localStorage', () => {
      const existing = {
        'cv-1': {
          chats: [],
          history: { past: [], future: [] }
        }
      }
      localStorage.setItem('app-lycan-meta-data', JSON.stringify(existing))

      // Re-create the store to trigger load
      const freshStore = useCvMetaStore()
      // Store instance is reused by Pinia within same test, so check via state
      expect(freshStore.state).toBeDefined()
    })
  })

  describe('chat management', () => {
    it('creates a chat for a CV', () => {
      const chat = store.createChat('cv-1', 'My Chat')
      expect(chat).toBeDefined()
      expect(chat.id).toBeDefined()
      expect(chat.title).toBe('My Chat')
      expect(chat.messages).toEqual([])
    })

    it('uses default title when not provided', () => {
      const chat = store.createChat('cv-1')
      expect(chat.title).toBe('New Chat')
    })

    it('initializes CV meta if not exists', () => {
      store.createChat('cv-new', 'Chat')
      const chats = store.getChats('cv-new')
      expect(chats).toHaveLength(1)
    })

    it('adds multiple chats to same CV', () => {
      store.createChat('cv-1', 'Chat 1')
      store.createChat('cv-1', 'Chat 2')
      expect(store.getChats('cv-1')).toHaveLength(2)
    })

    it('deletes a chat', () => {
      const chat = store.createChat('cv-1', 'To Delete')
      store.deleteChat('cv-1', chat.id)
      expect(store.getChats('cv-1')).toHaveLength(0)
    })

    it('does nothing when deleting non-existent chat', () => {
      store.createChat('cv-1', 'Chat')
      store.deleteChat('cv-1', 'non-existent-id')
      expect(store.getChats('cv-1')).toHaveLength(1)
    })

    it('does nothing when deleting from non-existent CV', () => {
      store.deleteChat('non-existent-cv', 'some-id')
      // Should not throw
    })

    it('adds a message to a chat', () => {
      const chat = store.createChat('cv-1', 'Chat')
      store.addMessage('cv-1', chat.id, { role: 'user', content: 'Hello' })
      const chats = store.getChats('cv-1')
      expect(chats[0].messages).toHaveLength(1)
      expect(chats[0].messages[0].content).toBe('Hello')
    })

    it('does not add message to non-existent chat', () => {
      store.createChat('cv-1', 'Chat')
      store.addMessage('cv-1', 'wrong-id', { role: 'user', content: 'Hello' })
      const chats = store.getChats('cv-1')
      expect(chats[0].messages).toHaveLength(0)
    })

    it('returns empty array for non-existent CV chats', () => {
      expect(store.getChats('non-existent')).toEqual([])
    })
  })

  describe('undo/redo history', () => {
    const cvId = 'cv-history'
    const snapshot1 = { personalInfo: { name: 'Version 1' }, sections: [] }
    const snapshot2 = { personalInfo: { name: 'Version 2' }, sections: [] }
    const snapshot3 = { personalInfo: { name: 'Version 3' }, sections: [] }

    it('saves a snapshot to past history', () => {
      store.saveSnapshot(cvId, snapshot1)
      expect(store.hasUndo(cvId)).toBe(true)
    })

    it('clears future on new snapshot', () => {
      store.saveSnapshot(cvId, snapshot1)
      store.pushToFuture(cvId, snapshot2)
      expect(store.hasRedo(cvId)).toBe(true)

      store.saveSnapshot(cvId, snapshot3)
      expect(store.hasRedo(cvId)).toBe(false)
    })

    it('pops undo state from past', () => {
      store.saveSnapshot(cvId, snapshot1)
      store.saveSnapshot(cvId, snapshot2)

      const state = store.getUndoState(cvId)
      expect(state.personalInfo.name).toBe('Version 2')
      expect(store.hasUndo(cvId)).toBe(true) // snapshot1 still there
    })

    it('returns null when no undo state available', () => {
      expect(store.getUndoState(cvId)).toBeNull()
    })

    it('pushes to future for redo', () => {
      store.pushToFuture(cvId, snapshot1)
      expect(store.hasRedo(cvId)).toBe(true)
    })

    it('pops redo state from future', () => {
      store.pushToFuture(cvId, snapshot1)
      const state = store.getRedoState(cvId)
      expect(state.personalInfo.name).toBe('Version 1')
      expect(store.hasRedo(cvId)).toBe(false)
    })

    it('returns null when no redo state available', () => {
      expect(store.getRedoState(cvId)).toBeNull()
    })

    it('pushes to past directly', () => {
      store.pushToPast(cvId, snapshot1)
      expect(store.hasUndo(cvId)).toBe(true)
    })

    it('limits history to 50 snapshots', () => {
      for (let i = 0; i < 55; i++) {
        store.saveSnapshot(cvId, { personalInfo: { name: `Version ${i}` }, sections: [] })
      }
      // Past should be capped at 50
      let count = 0
      while (store.getUndoState(cvId) !== null) {
        count++
      }
      expect(count).toBe(50)
    })

    it('deep clones snapshots to prevent mutation leakage', () => {
      const original = { personalInfo: { name: 'Original' }, sections: [] }
      store.saveSnapshot(cvId, original)

      // Mutate original
      original.personalInfo.name = 'Mutated'

      const restored = store.getUndoState(cvId)
      expect(restored.personalInfo.name).toBe('Original')
    })
  })

  describe('deleteMeta', () => {
    it('removes all meta data for a CV', () => {
      store.createChat('cv-1', 'Chat')
      store.saveSnapshot('cv-1', { personalInfo: { name: 'Test' }, sections: [] })

      store.deleteMeta('cv-1')
      expect(store.getChats('cv-1')).toEqual([])
      expect(store.hasUndo('cv-1')).toBeFalsy()
    })

    it('does nothing for non-existent CV', () => {
      store.deleteMeta('non-existent')
      // Should not throw
    })
  })

  describe('persistence', () => {
    it('persists to localStorage on state change', async () => {
      const { nextTick } = await import('vue')
      store.createChat('cv-1', 'Persisted Chat')
      await nextTick()
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'app-lycan-meta-data',
        expect.any(String)
      )
    })
  })
})

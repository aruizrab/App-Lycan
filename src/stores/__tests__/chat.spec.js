import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { useChatStore } from '../chat'
import { createChatSession } from '../../test/factories'

describe('chat store', () => {
  let store

  beforeEach(() => {
    store = useChatStore()
  })

  describe('initialization', () => {
    it('starts with empty sessions', () => {
      expect(store.sessions).toEqual([])
      expect(store.currentSessionId).toBeNull()
      expect(store.currentSession).toBeNull()
      expect(store.messages).toEqual([])
    })

    it('starts with default streaming state', () => {
      expect(store.isStreaming).toBe(false)
      expect(store.streamingContent).toBe('')
      expect(store.streamingReasoning).toBe('')
      expect(store.streamingToolCalls).toEqual([])
      expect(store.streamingError).toBeNull()
    })
  })

  describe('loading from localStorage', () => {
    it('loads saved sessions on init', () => {
      const saved = {
        sessions: [createChatSession({ id: 'saved-session' })],
        currentSessionId: 'saved-session'
      }
      localStorage.setItem('app-lycan-chat-history', JSON.stringify(saved))

      const freshStore = useChatStore()
      expect(freshStore.sessions).toBeDefined()
    })
  })

  describe('createSession', () => {
    it('creates a new session', () => {
      const session = store.createSession()
      expect(session).toBeDefined()
      expect(session.id).toBeDefined()
      expect(session.messages).toEqual([])
    })

    it('sets default title with session count', () => {
      const session = store.createSession()
      expect(session.title).toBe('Chat 1')
    })

    it('accepts custom title', () => {
      const session = store.createSession({ title: 'Custom Chat' })
      expect(session.title).toBe('Custom Chat')
    })

    it('accepts context', () => {
      const session = store.createSession({ context: { cvId: 'cv-1' } })
      expect(session.context.cvId).toBe('cv-1')
    })

    it('sets the new session as current', () => {
      const session = store.createSession()
      expect(store.currentSessionId).toBe(session.id)
    })

    it('adds session to beginning of list', () => {
      const first = store.createSession({ title: 'First' })
      const second = store.createSession({ title: 'Second' })
      expect(store.sessions[0].id).toBe(second.id)
      expect(store.sessions[1].id).toBe(first.id)
    })
  })

  describe('sessionCount', () => {
    it('returns 0 for empty store', () => {
      expect(store.sessionCount).toBe(0)
    })

    it('returns correct count', () => {
      store.createSession()
      store.createSession()
      expect(store.sessionCount).toBe(2)
    })
  })

  describe('ensureSession', () => {
    it('creates a session if none exists', () => {
      const session = store.ensureSession()
      expect(session).toBeDefined()
      expect(store.sessions).toHaveLength(1)
    })

    it('returns existing session if one is current', () => {
      const first = store.createSession()
      const returned = store.ensureSession()
      expect(returned.id).toBe(first.id)
    })

    it('merges context into existing session', () => {
      store.createSession({ context: { cvId: 'cv-1' } })
      store.ensureSession({ documentType: 'cv' })

      expect(store.currentSession.context.cvId).toBe('cv-1')
      expect(store.currentSession.context.documentType).toBe('cv')
    })
  })

  describe('selectSession', () => {
    it('selects an existing session', () => {
      const first = store.createSession({ title: 'First' })
      store.createSession({ title: 'Second' })

      store.selectSession(first.id)
      expect(store.currentSessionId).toBe(first.id)
    })

    it('does nothing for non-existent session', () => {
      const session = store.createSession()
      store.selectSession('non-existent')
      expect(store.currentSessionId).toBe(session.id) // unchanged
    })
  })

  describe('deleteSession', () => {
    it('deletes a session', () => {
      const session = store.createSession()
      store.deleteSession(session.id)
      expect(store.sessions).toHaveLength(0)
    })

    it('selects another session if current is deleted', () => {
      const first = store.createSession({ title: 'First' })
      const second = store.createSession({ title: 'Second' })

      store.deleteSession(second.id)
      expect(store.currentSessionId).toBe(first.id)
    })

    it('sets currentSessionId to null if all sessions deleted', () => {
      const session = store.createSession()
      store.deleteSession(session.id)
      expect(store.currentSessionId).toBeNull()
    })

    it('does not change currentSessionId if different session deleted', () => {
      const first = store.createSession({ title: 'First' })
      const second = store.createSession({ title: 'Second' })
      // second is current

      store.deleteSession(first.id)
      expect(store.currentSessionId).toBe(second.id)
    })
  })

  describe('renameSession', () => {
    it('renames a session', () => {
      const session = store.createSession({ title: 'Original' })
      store.renameSession(session.id, 'Renamed')
      expect(store.currentSession.title).toBe('Renamed')
    })

    it('updates updatedAt timestamp', () => {
      const session = store.createSession()
      const before = session.updatedAt
      store.renameSession(session.id, 'New Title')
      expect(store.currentSession.updatedAt).toBeGreaterThanOrEqual(before)
    })

    it('does nothing for non-existent session', () => {
      store.createSession({ title: 'Existing' })
      store.renameSession('non-existent', 'New Title')
      expect(store.currentSession.title).toBe('Existing')
    })
  })

  describe('addMessage', () => {
    it('adds a message to the current session', () => {
      store.createSession()
      const msg = store.addMessage({ role: 'user', content: 'Hello' })

      expect(msg).toBeDefined()
      expect(msg.id).toBeDefined()
      expect(msg.role).toBe('user')
      expect(msg.content).toBe('Hello')
      expect(msg.timestamp).toBeDefined()
    })

    it('creates a session if none exists', () => {
      store.addMessage({ role: 'user', content: 'Hello' })
      expect(store.sessions).toHaveLength(1)
    })

    it('auto-generates title from first user message', () => {
      store.createSession()
      store.addMessage({ role: 'user', content: 'How do I write a great CV?' })
      expect(store.currentSession.title).toBe('How do I write a great CV?')
    })

    it('truncates long messages for title', () => {
      store.createSession()
      const longMessage = 'A'.repeat(100)
      store.addMessage({ role: 'user', content: longMessage })
      expect(store.currentSession.title).toBe('A'.repeat(50) + '...')
    })

    it('does not change title after first message', () => {
      store.createSession()
      store.addMessage({ role: 'user', content: 'First message' })
      store.addMessage({ role: 'user', content: 'Second message' })
      expect(store.currentSession.title).toBe('First message')
    })

    it('updates session updatedAt', () => {
      const session = store.createSession()
      const before = session.updatedAt
      store.addMessage({ role: 'user', content: 'Hello' })
      expect(store.currentSession.updatedAt).toBeGreaterThanOrEqual(before)
    })

    it('accessible via messages computed', () => {
      store.createSession()
      store.addMessage({ role: 'user', content: 'Hello' })
      store.addMessage({ role: 'assistant', content: 'Hi there' })

      expect(store.messages).toHaveLength(2)
      expect(store.messages[0].role).toBe('user')
      expect(store.messages[1].role).toBe('assistant')
    })
  })

  describe('updateLastAssistantMessage', () => {
    it('updates the last assistant message content', () => {
      store.createSession()
      store.addMessage({ role: 'assistant', content: 'Initial' })
      store.updateLastAssistantMessage('Updated content')
      expect(store.messages[0].content).toBe('Updated content')
    })

    it('does nothing if last message is not assistant', () => {
      store.createSession()
      store.addMessage({ role: 'user', content: 'Question' })
      store.updateLastAssistantMessage('Should not change')
      expect(store.messages[0].content).toBe('Question')
    })

    it('does nothing if no session', () => {
      store.updateLastAssistantMessage('No session')
      // Should not throw
    })
  })

  describe('getApiMessages', () => {
    beforeEach(() => {
      store.createSession()
    })

    it('returns conversation messages for API', () => {
      store.addMessage({ role: 'user', content: 'Hello' })
      store.addMessage({ role: 'assistant', content: 'Hi' })

      const apiMessages = store.getApiMessages()
      expect(apiMessages).toHaveLength(2)
      expect(apiMessages[0]).toEqual({ role: 'user', content: 'Hello' })
      expect(apiMessages[1]).toEqual({ role: 'assistant', content: 'Hi' })
    })

    it('prepends system prompt if provided', () => {
      store.addMessage({ role: 'user', content: 'Hello' })

      const apiMessages = store.getApiMessages('You are a helpful assistant.')
      expect(apiMessages[0]).toEqual({ role: 'system', content: 'You are a helpful assistant.' })
      expect(apiMessages[1]).toEqual({ role: 'user', content: 'Hello' })
    })

    it('excludes error messages', () => {
      store.addMessage({ role: 'user', content: 'Hello' })
      store.addMessage({ role: 'error', content: 'Something went wrong' })
      store.addMessage({ role: 'assistant', content: 'Hi' })

      const apiMessages = store.getApiMessages()
      expect(apiMessages).toHaveLength(2)
      expect(apiMessages.find(m => m.role === 'error')).toBeUndefined()
    })

    it('injects ephemeral context before last user message', () => {
      store.addMessage({ role: 'user', content: 'Help me' })

      const apiMessages = store.getApiMessages(null, 'Current CV data here')
      expect(apiMessages).toHaveLength(2)
      // Context system message inserted before last user message
      expect(apiMessages[0].role).toBe('system')
      expect(apiMessages[0].content).toContain('Current CV data here')
      expect(apiMessages[1].role).toBe('user')
    })

    it('includes both system prompt and ephemeral context', () => {
      store.addMessage({ role: 'user', content: 'Help me' })

      const apiMessages = store.getApiMessages('System prompt', 'Ephemeral context')
      expect(apiMessages).toHaveLength(3)
      expect(apiMessages[0]).toEqual({ role: 'system', content: 'System prompt' })
      expect(apiMessages[1].role).toBe('system') // ephemeral context
      expect(apiMessages[2].role).toBe('user')
    })

    it('returns only system prompt when no messages', () => {
      const apiMessages = store.getApiMessages('System prompt')
      expect(apiMessages).toHaveLength(1)
      expect(apiMessages[0].role).toBe('system')
    })
  })

  describe('streaming state management', () => {
    it('startStreaming resets streaming state', () => {
      store.streamingContent = 'leftover'
      store.streamingError = 'old error'

      store.startStreaming()

      expect(store.isStreaming).toBe(true)
      expect(store.streamingContent).toBe('')
      expect(store.streamingReasoning).toBe('')
      expect(store.streamingToolCalls).toEqual([])
      expect(store.streamingError).toBeNull()
    })

    it('updateStreamingContent updates content', () => {
      store.startStreaming()
      store.updateStreamingContent('Partial response...')
      expect(store.streamingContent).toBe('Partial response...')
    })

    it('updateStreamingReasoning updates reasoning', () => {
      store.startStreaming()
      store.updateStreamingReasoning('Thinking about it...')
      expect(store.streamingReasoning).toBe('Thinking about it...')
    })

    it('addStreamingToolCall adds tool call', () => {
      store.startStreaming()
      store.addStreamingToolCall({ name: 'save_cv', arguments: '{}' })
      expect(store.streamingToolCalls).toHaveLength(1)
      expect(store.streamingToolCalls[0].name).toBe('save_cv')
    })
  })

  describe('finishStreaming', () => {
    beforeEach(() => {
      store.createSession()
      store.startStreaming()
    })

    it('adds assistant message from streaming content', () => {
      store.updateStreamingContent('Final answer')
      store.finishStreaming()

      expect(store.isStreaming).toBe(false)
      expect(store.messages).toHaveLength(1)
      expect(store.messages[0].role).toBe('assistant')
      expect(store.messages[0].content).toBe('Final answer')
    })

    it('uses provided content over streaming content', () => {
      store.updateStreamingContent('Streaming content')
      store.finishStreaming({ content: 'Override content' })

      expect(store.messages[0].content).toBe('Override content')
    })

    it('includes reasoning in message', () => {
      store.updateStreamingReasoning('My reasoning')
      store.updateStreamingContent('Answer')
      store.finishStreaming()

      expect(store.messages[0].reasoning).toBe('My reasoning')
    })

    it('includes tool calls in message', () => {
      store.addStreamingToolCall({ name: 'tool1' })
      store.updateStreamingContent('Answer')
      store.finishStreaming()

      expect(store.messages[0].toolCalls).toHaveLength(1)
    })

    it('includes metadata in message', () => {
      store.updateStreamingContent('Answer')
      store.finishStreaming({ metadata: { model: 'gpt-4o' } })

      expect(store.messages[0].metadata.model).toBe('gpt-4o')
    })

    it('resets streaming state', () => {
      store.updateStreamingContent('Content')
      store.finishStreaming()

      expect(store.streamingContent).toBe('')
      expect(store.streamingReasoning).toBe('')
      expect(store.streamingToolCalls).toEqual([])
    })

    it('does not add message if no content, reasoning, or tool calls', () => {
      store.finishStreaming()
      expect(store.messages).toHaveLength(0)
    })
  })

  describe('handleStreamingError', () => {
    it('sets error state and adds error message', () => {
      store.createSession()
      store.startStreaming()

      store.handleStreamingError('Something went wrong')

      expect(store.isStreaming).toBe(false)
      expect(store.streamingError).toBe('Something went wrong')
      expect(store.messages).toHaveLength(1)
      expect(store.messages[0].role).toBe('error')
      expect(store.messages[0].content).toBe('Something went wrong')
    })

    it('handles Error objects', () => {
      store.createSession()
      store.startStreaming()

      store.handleStreamingError(new Error('Network failure'))

      expect(store.streamingError).toBe('Network failure')
      expect(store.messages[0].content).toBe('Network failure')
    })

    it('clears streaming content', () => {
      store.createSession()
      store.startStreaming()
      store.updateStreamingContent('Partial content')

      store.handleStreamingError('Error')
      expect(store.streamingContent).toBe('')
    })
  })

  describe('clearStreaming', () => {
    it('resets all streaming state without adding message', () => {
      store.startStreaming()
      store.updateStreamingContent('Content')
      store.updateStreamingReasoning('Reasoning')
      store.streamingError = 'Error'

      store.clearStreaming()

      expect(store.isStreaming).toBe(false)
      expect(store.streamingContent).toBe('')
      expect(store.streamingReasoning).toBe('')
      expect(store.streamingToolCalls).toEqual([])
      expect(store.streamingError).toBeNull()
    })
  })

  describe('clearAllSessions', () => {
    it('removes all sessions and resets current', () => {
      store.createSession()
      store.createSession()

      store.clearAllSessions()

      expect(store.sessions).toEqual([])
      expect(store.currentSessionId).toBeNull()
    })
  })

  describe('updateContext', () => {
    it('merges context into current session', () => {
      store.createSession({ context: { cvId: 'cv-1' } })
      store.updateContext({ documentType: 'cv' })

      expect(store.currentSession.context.cvId).toBe('cv-1')
      expect(store.currentSession.context.documentType).toBe('cv')
    })

    it('does nothing if no current session', () => {
      store.updateContext({ key: 'value' })
      // Should not throw
    })
  })

  describe('persistence', () => {
    it('auto-saves to localStorage on change', async () => {
      store.createSession()
      await nextTick()
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'app-lycan-chat-history',
        expect.any(String)
      )
    })

    it('persists session and message data', async () => {
      store.createSession({ title: 'Persisted Chat' })
      store.addMessage({ role: 'user', content: 'Saved message' })
      await nextTick()

      const calls = localStorage.setItem.mock.calls.filter(c => c[0] === 'app-lycan-chat-history')
      expect(calls.length).toBeGreaterThan(0)

      const lastCall = calls[calls.length - 1]
      const saved = JSON.parse(lastCall[1])
      expect(saved.sessions).toHaveLength(1)
      expect(saved.sessions[0].title).toBe('Saved message') // auto-titled from first message
    })
  })

  describe('token usage tracking', () => {
    it('starts with null token usage', () => {
      store.createSession()
      expect(store.tokenUsage).toBeNull()
      expect(store.currentSession.tokenUsage).toBeNull()
    })

    it('updates token usage from API response', () => {
      store.createSession()
      store.updateTokenUsage({
        promptTokens: 1500,
        completionTokens: 500,
        totalTokens: 2000
      })

      expect(store.tokenUsage).toEqual({
        promptTokens: 1500,
        completionTokens: 500,
        totalTokens: 2000
      })
    })

    it('can reset token usage to null', () => {
      store.createSession()
      store.updateTokenUsage({ promptTokens: 100, completionTokens: 50, totalTokens: 150 })
      store.updateTokenUsage(null)
      expect(store.tokenUsage).toBeNull()
    })

    it('does nothing when no current session', () => {
      // No session exists
      store.updateTokenUsage({ promptTokens: 100, completionTokens: 50, totalTokens: 150 })
      // Should not throw
      expect(store.tokenUsage).toBeNull()
    })
  })

  describe('summarization state', () => {
    it('starts with isSummarizing false', () => {
      expect(store.isSummarizing).toBe(false)
    })

    it('can start and finish summarizing', () => {
      store.startSummarizing()
      expect(store.isSummarizing).toBe(true)

      store.finishSummarizing()
      expect(store.isSummarizing).toBe(false)
    })
  })

  describe('getApiMessages with summary messages', () => {
    it('renders summary messages as system context', () => {
      store.createSession()
      // Simulate a summary message in the session
      store.currentSession.messages.push({
        id: 'summary-1',
        role: 'assistant',
        content: 'Previously, the user asked about Vue.js.',
        metadata: { isSummary: true, summarizedCount: 4 },
        timestamp: Date.now()
      })
      store.addMessage({ role: 'user', content: 'Continue.' })

      const apiMessages = store.getApiMessages('You are helpful.')

      // system prompt + summary as system + user message
      expect(apiMessages[0]).toEqual({ role: 'system', content: 'You are helpful.' })
      expect(apiMessages[1].role).toBe('system')
      expect(apiMessages[1].content).toContain('Previous Conversation Summary')
      expect(apiMessages[1].content).toContain('Vue.js')
      expect(apiMessages[2]).toEqual({ role: 'user', content: 'Continue.' })
    })
  })
})

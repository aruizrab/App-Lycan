import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'app-lycan-chat-history'
const DEFAULT_SESSION_MODEL = 'openai/gpt-4o-mini'

const normalizeModelId = (modelId) => {
  if (typeof modelId !== 'string') return ''
  return modelId.endsWith(':online') ? modelId.slice(0, -7) : modelId
}

const inferSessionModel = (session, fallbackModel = DEFAULT_SESSION_MODEL) => {
  if (session?.model) return normalizeModelId(session.model)

  if (Array.isArray(session?.messages)) {
    const assistantWithModel = [...session.messages]
      .reverse()
      .find((msg) => msg.role === 'assistant' && msg.metadata?.model)

    if (assistantWithModel?.metadata?.model) {
      return normalizeModelId(assistantWithModel.metadata.model)
    }
  }

  return fallbackModel
}

/**
 * Unified chat store for AI conversations
 * Accessible from any view (CV, Cover Letter, Workspace)
 */
export const useChatStore = defineStore('chat', () => {
  // All chat sessions
  const sessions = ref([])

  // Currently active session ID
  const currentSessionId = ref(null)

  // Current streaming state
  const isStreaming = ref(false)
  const streamingContent = ref('')
  const streamingReasoning = ref('')
  const streamingToolCalls = ref([])
  const streamingToolOutputs = ref({}) // { [toolCallId]: accumulated text }
  const streamingError = ref(null)

  // Summarization state
  const isSummarizing = ref(false)

  // Load from storage on init
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        sessions.value = (data.sessions || []).map((session) => ({
          ...session,
          messages: Array.isArray(session.messages) ? session.messages : [],
          context: session.context && typeof session.context === 'object' ? session.context : {},
          model: inferSessionModel(session),
          branches: Array.isArray(session.branches) ? session.branches : []
        }))
        currentSessionId.value = data.currentSessionId || null
      }
    } catch (e) {
      console.warn('Failed to load chat history', e)
    }
  }

  // Persist to storage
  const persist = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sessions: sessions.value,
          currentSessionId: currentSessionId.value
        })
      )
    } catch (e) {
      console.warn('Failed to persist chat history', e)
    }
  }

  // Initialize
  loadFromStorage()

  // Watch for changes and persist
  watch([sessions, currentSessionId], persist, { deep: true })

  // Current session
  const currentSession = computed(() => {
    if (!currentSessionId.value) return null
    return sessions.value.find((s) => s.id === currentSessionId.value)
  })

  // Current session messages
  const messages = computed(() => {
    return currentSession.value?.messages || []
  })

  // Session count
  const sessionCount = computed(() => sessions.value.length)

  /**
   * Create a new chat session
   * @param {Object} options - Session options
   * @param {string} options.title - Session title
   * @param {Object} options.context - Initial context (cvId, coverLetterId, etc.)
   * @returns {Object} The new session
   */
  const createSession = (options = {}) => {
    const session = {
      id: crypto.randomUUID(),
      title: options.title || `Chat ${sessions.value.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      context: options.context || {},
      model: normalizeModelId(options.model) || DEFAULT_SESSION_MODEL,
      tokenUsage: null, // { promptTokens, completionTokens, totalTokens } — set after first API response
      branches: [] // Saved conversation snapshots created when editing/retrying
    }
    sessions.value.unshift(session) // Add to beginning
    currentSessionId.value = session.id
    return session
  }

  /**
   * Get or create a session for the current context
   * Automatically creates a session if none exists
   */
  const ensureSession = (options = {}) => {
    const hasStructuredOptions =
      Object.prototype.hasOwnProperty.call(options, 'context') ||
      Object.prototype.hasOwnProperty.call(options, 'model')
    const context = hasStructuredOptions ? options.context || {} : options
    const model = hasStructuredOptions ? options.model : null

    if (currentSession.value) {
      // Update context if provided
      if (Object.keys(context).length > 0) {
        currentSession.value.context = {
          ...currentSession.value.context,
          ...context
        }
      }

      if (!currentSession.value.model && model) {
        currentSession.value.model = normalizeModelId(model)
      }

      return currentSession.value
    }
    return createSession({ context, model })
  }

  /**
   * Select an existing session
   * @param {string} sessionId - Session ID to select
   */
  const selectSession = (sessionId) => {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (session) {
      currentSessionId.value = sessionId
    }
  }

  /**
   * Delete a session
   * @param {string} sessionId - Session ID to delete
   */
  const deleteSession = (sessionId) => {
    const index = sessions.value.findIndex((s) => s.id === sessionId)
    if (index !== -1) {
      sessions.value.splice(index, 1)
      // If deleted current session, select another or null
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = sessions.value[0]?.id || null
      }
    }
  }

  /**
   * Rename a session
   * @param {string} sessionId - Session ID
   * @param {string} title - New title
   */
  const renameSession = (sessionId, title) => {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (session) {
      session.title = title
      session.updatedAt = Date.now()
    }
  }

  /**
   * Get the model configured for the current session
   * @param {string} defaultModel - Fallback model if session has none
   */
  const getCurrentSessionModel = (defaultModel = DEFAULT_SESSION_MODEL, allowedModelIds = null) => {
    if (!currentSession.value) return normalizeModelId(defaultModel) || DEFAULT_SESSION_MODEL

    const sessionModel = normalizeModelId(currentSession.value.model)
    const allowedModels =
      Array.isArray(allowedModelIds) && allowedModelIds.length > 0
        ? new Set(allowedModelIds.map(normalizeModelId).filter(Boolean))
        : null

    if (sessionModel && (!allowedModels || allowedModels.has(sessionModel))) {
      return sessionModel
    }

    const resolvedDefault = normalizeModelId(defaultModel) || DEFAULT_SESSION_MODEL
    currentSession.value.model = resolvedDefault
    currentSession.value.updatedAt = Date.now()
    return resolvedDefault
  }

  /**
   * Set model for current session (only allowed when no messages exist)
   * @param {string} modelId - Model ID
   * @returns {boolean} True when updated, false when blocked or invalid
   */
  const setCurrentSessionModel = (modelId) => {
    if (!currentSession.value) return false
    if (currentSession.value.messages.length > 0) return false

    const normalized = normalizeModelId(modelId)
    if (!normalized) return false

    currentSession.value.model = normalized
    currentSession.value.updatedAt = Date.now()
    return true
  }

  /**
   * Add a message to the current session
   * Creates a session if none exists
   * @param {Object} message - Message object
   * @param {string} message.role - 'user', 'assistant', or 'error'
   * @param {string} message.content - Message content
   * @param {Object} message.metadata - Optional metadata (command, model, etc.)
   */
  const addMessage = (message) => {
    const session = ensureSession()
    const fullMessage = {
      id: crypto.randomUUID(),
      ...message,
      timestamp: Date.now()
    }
    session.messages.push(fullMessage)
    session.updatedAt = Date.now()

    // Auto-generate title from first user message
    if (session.messages.length === 1 && message.role === 'user') {
      const preview = message.content.substring(0, 50)
      session.title = preview + (message.content.length > 50 ? '...' : '')
    }

    return fullMessage
  }

  /**
   * Update the last assistant message (for streaming)
   * @param {string} content - New content
   */
  const updateLastAssistantMessage = (content) => {
    if (!currentSession.value) return
    const messages = currentSession.value.messages
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content = content
    }
  }

  /**
   * Truncate all messages from the given message ID (inclusive) to the end.
   * @param {string} messageId - The ID of the message to truncate from
   * @returns {number} The index that was truncated from, or -1 if not found
   */
  const truncateFromMessage = (messageId) => {
    if (!currentSession.value) return -1
    const index = currentSession.value.messages.findIndex((m) => m.id === messageId)
    if (index === -1) return -1
    currentSession.value.messages = currentSession.value.messages.slice(0, index)
    currentSession.value.updatedAt = Date.now()
    return index
  }

  /**
   * Save the current message list as a branch snapshot.
   * Branches allow the user to switch back to previous conversation paths.
   * @returns {Object|null} The saved branch object, or null if no session exists
   */
  const saveBranch = () => {
    if (!currentSession.value) return null
    if (!Array.isArray(currentSession.value.branches)) {
      currentSession.value.branches = []
    }
    const branch = {
      id: crypto.randomUUID(),
      messages: JSON.parse(JSON.stringify(currentSession.value.messages)),
      createdAt: Date.now()
    }
    currentSession.value.branches.push(branch)
    currentSession.value.updatedAt = Date.now()
    return branch
  }

  /**
   * Switch to a saved branch by ID.
   * The current messages are saved as a new branch before switching.
   * @param {string} branchId - The branch ID to restore
   */
  const switchBranch = (branchId) => {
    if (!currentSession.value) return
    if (!Array.isArray(currentSession.value.branches)) return
    const branchIndex = currentSession.value.branches.findIndex((b) => b.id === branchId)
    if (branchIndex === -1) return

    const targetBranch = currentSession.value.branches[branchIndex]

    // Save current messages as a new branch in place of the one being restored
    const currentBranch = {
      id: crypto.randomUUID(),
      messages: JSON.parse(JSON.stringify(currentSession.value.messages)),
      createdAt: Date.now()
    }

    // Restore the target branch's messages
    currentSession.value.messages = JSON.parse(JSON.stringify(targetBranch.messages))

    // Replace the target branch slot with current (swap them)
    currentSession.value.branches.splice(branchIndex, 1, currentBranch)
    currentSession.value.updatedAt = Date.now()
  }

  /**
   * Branches for the current session
   */
  const currentBranches = computed(() => {
    return currentSession.value?.branches || []
  })

  /**
   * Get messages formatted for OpenRouter API
   * @param {Object} systemPrompt - Optional system prompt to prepend (persistent)
   * @param {string} ephemeralContext - Optional context injected before last user message (not persisted)
   */
  const getApiMessages = (systemPrompt = null, ephemeralContext = null) => {
    const apiMessages = []

    if (systemPrompt) {
      apiMessages.push({
        role: 'system',
        content: systemPrompt
      })
    }

    const conversationMessages = []
    // Add conversation history (excluding errors)
    for (const msg of messages.value) {
      if (msg.role === 'error') continue

      // Summary messages are injected as system context
      if (msg.metadata?.isSummary) {
        conversationMessages.push({
          role: 'system',
          content: `## Previous Conversation Summary\n\n${msg.content}`
        })
        continue
      }

      conversationMessages.push({
        role: msg.role,
        content: msg.content
      })
    }

    // If ephemeral context provided, inject it right before the last user message
    // This gives maximum attention weight to current app state
    if (ephemeralContext && conversationMessages.length > 0) {
      const lastUserIndex = conversationMessages.length - 1

      // Insert context message before last user message
      conversationMessages.splice(lastUserIndex, 0, {
        role: 'system',
        content: `## Current App Context\n\n${ephemeralContext}`
      })
    }

    apiMessages.push(...conversationMessages)
    return apiMessages
  }

  /**
   * Start streaming state
   */
  const startStreaming = () => {
    isStreaming.value = true
    streamingContent.value = ''
    streamingReasoning.value = ''
    streamingToolCalls.value = []
    streamingToolOutputs.value = {}
    streamingError.value = null
  }

  /**
   * Update streaming content
   * @param {string} content - Current full content
   */
  const updateStreamingContent = (content) => {
    streamingContent.value = content
  }

  /**
   * Update streaming reasoning
   * @param {string} reasoning - Current full reasoning
   */
  const updateStreamingReasoning = (reasoning) => {
    streamingReasoning.value = reasoning
  }

  /**
   * Add a tool call to streaming state
   * @param {Object} toolCall - Tool call object
   */
  const addStreamingToolCall = (toolCall) => {
    streamingToolCalls.value.push(toolCall)
  }

  /**
   * Update streaming output for a specific tool call (e.g. sub-agent)
   * @param {string} toolCallId - The tool call ID
   * @param {string} chunk - New chunk of text
   * @param {string} accumulated - Full accumulated text so far
   */
  const updateToolOutput = (toolCallId, chunk, accumulated) => {
    streamingToolOutputs.value[toolCallId] = accumulated
  }

  /**
   * Finish streaming and add the message
   * @param {Object} params - Parameters
   * @param {string} params.content - Final content
   * @param {string} params.reasoning - Reasoning content
   * @param {Array} params.toolCalls - Tool calls for this round
   * @param {Object} params.metadata - Metadata
   */
  const finishStreaming = ({
    content = null,
    reasoning = null,
    toolCalls = null,
    metadata = {}
  } = {}) => {
    const finalContent = content || streamingContent.value
    const finalReasoning = reasoning || streamingReasoning.value
    const finalToolCalls =
      toolCalls || (streamingToolCalls.value.length > 0 ? streamingToolCalls.value : null)

    if (finalContent || finalReasoning || finalToolCalls) {
      addMessage({
        role: 'assistant',
        content: finalContent,
        reasoning: finalReasoning,
        toolCalls: finalToolCalls ? [...finalToolCalls] : undefined,
        metadata
      })
    }
    isStreaming.value = false
    streamingContent.value = ''
    streamingReasoning.value = ''
    streamingToolCalls.value = []
    streamingToolOutputs.value = {}
  }

  /**
   * Handle streaming error
   * @param {Error|string} error - Error object or message
   */
  const handleStreamingError = (error) => {
    const errorMessage = typeof error === 'string' ? error : error.message
    streamingError.value = errorMessage
    isStreaming.value = false
    streamingContent.value = ''

    addMessage({
      role: 'error',
      content: errorMessage
    })
  }

  /**
   * Clear streaming state
   */
  const clearStreaming = () => {
    isStreaming.value = false
    streamingContent.value = ''
    streamingReasoning.value = ''
    streamingToolCalls.value = []
    streamingToolOutputs.value = {}
    streamingError.value = null
  }

  // ── Token usage tracking ──────────────────────────────────────────

  /**
   * Token usage for the current session
   */
  const tokenUsage = computed(() => {
    return currentSession.value?.tokenUsage || null
  })

  /**
   * Update token usage from an API response.
   * @param {{ promptTokens: number, completionTokens: number, totalTokens: number } | null} usage
   */
  const updateTokenUsage = (usage) => {
    if (!currentSession.value) return
    currentSession.value.tokenUsage = usage ? { ...usage } : null
    currentSession.value.updatedAt = Date.now()
  }

  // ── Summarization state ──────────────────────────────────────────

  /**
   * Start summarization state (freezes chat)
   */
  const startSummarizing = () => {
    isSummarizing.value = true
  }

  /**
   * Finish summarization state
   */
  const finishSummarizing = () => {
    isSummarizing.value = false
  }

  /**
   * Clear all sessions
   */
  const clearAllSessions = () => {
    sessions.value = []
    currentSessionId.value = null
  }

  /**
   * Update session context
   * @param {Object} context - Context to merge
   */
  const updateContext = (context) => {
    if (currentSession.value) {
      currentSession.value.context = {
        ...currentSession.value.context,
        ...context
      }
    }
  }

  return {
    // State
    sessions,
    currentSessionId,
    currentSession,
    messages,
    sessionCount,
    isStreaming,
    streamingContent,
    streamingReasoning,
    streamingToolCalls,
    streamingToolOutputs,
    streamingError,
    isSummarizing,

    // Session management
    createSession,
    ensureSession,
    selectSession,
    deleteSession,
    renameSession,
    getCurrentSessionModel,
    setCurrentSessionModel,

    // Message management
    addMessage,
    updateLastAssistantMessage,
    truncateFromMessage,
    saveBranch,
    switchBranch,
    currentBranches,
    getApiMessages,

    // Streaming
    startStreaming,
    updateStreamingContent,
    updateStreamingReasoning,
    addStreamingToolCall,
    updateToolOutput,
    finishStreaming,
    handleStreamingError,
    clearStreaming,

    // Token usage
    tokenUsage,
    updateTokenUsage,

    // Summarization
    startSummarizing,
    finishSummarizing,

    // Context
    updateContext,

    // Utilities
    clearAllSessions
  }
})

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'app-lycan-chat-history'

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
    const streamingError = ref(null)

    // Load from storage on init
    const loadFromStorage = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const data = JSON.parse(saved)
                sessions.value = data.sessions || []
                currentSessionId.value = data.currentSessionId || null
            }
        } catch (e) {
            console.warn('Failed to load chat history', e)
        }
    }

    // Persist to storage
    const persist = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                sessions: sessions.value,
                currentSessionId: currentSessionId.value
            }))
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
        return sessions.value.find(s => s.id === currentSessionId.value)
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
            context: options.context || {}
        }
        sessions.value.unshift(session) // Add to beginning
        currentSessionId.value = session.id
        return session
    }

    /**
     * Get or create a session for the current context
     * Automatically creates a session if none exists
     */
    const ensureSession = (context = {}) => {
        if (currentSession.value) {
            // Update context if provided
            if (Object.keys(context).length > 0) {
                currentSession.value.context = {
                    ...currentSession.value.context,
                    ...context
                }
            }
            return currentSession.value
        }
        return createSession({ context })
    }

    /**
     * Select an existing session
     * @param {string} sessionId - Session ID to select
     */
    const selectSession = (sessionId) => {
        const session = sessions.value.find(s => s.id === sessionId)
        if (session) {
            currentSessionId.value = sessionId
        }
    }

    /**
     * Delete a session
     * @param {string} sessionId - Session ID to delete
     */
    const deleteSession = (sessionId) => {
        const index = sessions.value.findIndex(s => s.id === sessionId)
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
        const session = sessions.value.find(s => s.id === sessionId)
        if (session) {
            session.title = title
            session.updatedAt = Date.now()
        }
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
     * Get messages formatted for OpenRouter API
     * @param {Object} systemPrompt - Optional system prompt to prepend
     */
    const getApiMessages = (systemPrompt = null) => {
        const apiMessages = []

        if (systemPrompt) {
            apiMessages.push({
                role: 'system',
                content: systemPrompt
            })
        }

        // Add conversation history (excluding errors)
        for (const msg of messages.value) {
            if (msg.role === 'error') continue
            apiMessages.push({
                role: msg.role,
                content: msg.content
            })
        }

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
     * Finish streaming and add the message
     * @param {Object} params - Parameters
     * @param {string} params.content - Final content
     * @param {string} params.reasoning - Reasoning content
     * @param {Array} params.toolCalls - Tool calls for this round
     * @param {Object} params.metadata - Metadata
     */
    const finishStreaming = ({ content = null, reasoning = null, toolCalls = null, metadata = {} } = {}) => {
        const finalContent = content || streamingContent.value
        const finalReasoning = reasoning || streamingReasoning.value
        const finalToolCalls = toolCalls || (streamingToolCalls.value.length > 0 ? streamingToolCalls.value : null)

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
        streamingError.value = null
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
        streamingError,

        // Session management
        createSession,
        ensureSession,
        selectSession,
        deleteSession,
        renameSession,

        // Message management
        addMessage,
        updateLastAssistantMessage,
        getApiMessages,

        // Streaming
        startStreaming,
        updateStreamingContent,
        updateStreamingReasoning,
        addStreamingToolCall,
        finishStreaming,
        handleStreamingError,
        clearStreaming,

        // Context
        updateContext,

        // Utilities
        clearAllSessions
    }
})

/**
 * Context window management for AI chat sessions.
 * Handles token estimation, usage tracking, and conversation summarization.
 */
import { streamAndCollect } from './ai'

/** Approximate tokens per character (conservative estimate for mixed content) */
const CHARS_PER_TOKEN = 4

/**
 * Estimate token count from text using a character-based heuristic.
 * ~4 characters per token is a reasonable cross-model average.
 * @param {string} text
 * @returns {number}
 */
export const estimateTokens = (text) => {
    if (!text) return 0
    return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Estimate total tokens for an array of API messages.
 * Accounts for message overhead (~4 tokens per message for role/framing).
 * @param {Array<{role: string, content: string}>} messages
 * @returns {number}
 */
export const estimateMessagesTokens = (messages) => {
    if (!messages || messages.length === 0) return 0

    const MESSAGE_OVERHEAD = 4 // tokens per message for role, separators, etc.
    return messages.reduce((total, msg) => {
        return total + estimateTokens(msg.content || '') + MESSAGE_OVERHEAD
    }, 0)
}

/**
 * Determine whether the conversation should be summarized.
 * @param {Object} params
 * @param {number} params.currentTokens - Current total tokens used (from API usage or estimate)
 * @param {number} params.contextLength - Model's context window size in tokens
 * @param {number} params.threshold - Percentage threshold (0-100) at which to trigger summarization
 * @param {number} params.newMessageTokens - Estimated tokens for the next user message
 * @returns {boolean}
 */
export const shouldSummarize = ({ currentTokens, contextLength, threshold, newMessageTokens = 0 }) => {
    if (!contextLength || contextLength <= 0) return false
    if (!currentTokens && currentTokens !== 0) return false

    const projectedUsage = currentTokens + newMessageTokens
    const usagePercent = (projectedUsage / contextLength) * 100
    return usagePercent >= threshold
}

/**
 * Calculate context usage percentage.
 * @param {number} currentTokens
 * @param {number} contextLength
 * @returns {number} Percentage (0-100), clamped
 */
export const getContextPercentage = (currentTokens, contextLength) => {
    if (!contextLength || contextLength <= 0) return 0
    return Math.min(100, Math.round((currentTokens / contextLength) * 100))
}

/**
 * Get the color class for the context percentage indicator.
 * @param {number} percentage
 * @returns {'green' | 'yellow' | 'red'}
 */
export const getContextSeverity = (percentage) => {
    if (percentage >= 80) return 'red'
    if (percentage >= 60) return 'yellow'
    return 'green'
}

/** Number of recent message pairs (user+assistant) to keep verbatim during summarization */
const KEEP_RECENT_MESSAGES = 4

/**
 * Summarize the oldest messages in a conversation by calling the AI.
 * Keeps the most recent messages intact and replaces earlier ones with a summary.
 *
 * @param {Object} params
 * @param {Array} params.messages - All session messages (store format with id, role, content, metadata, etc.)
 * @param {string} params.apiKey - OpenRouter API key
 * @param {string} params.model - Model ID to use for summarization
 * @param {number} [params.keepCount=4] - Number of recent messages to keep verbatim
 * @returns {Promise<{summary: string, removedCount: number}>}
 */
export const summarizeOldMessages = async ({ messages, apiKey, model, keepCount = KEEP_RECENT_MESSAGES }) => {
    if (!messages || messages.length <= keepCount) {
        return { summary: null, removedCount: 0 }
    }

    // Split messages: old (to summarize) and recent (to keep)
    const messagesToSummarize = messages.slice(0, messages.length - keepCount)
    const removedCount = messagesToSummarize.length

    if (removedCount === 0) {
        return { summary: null, removedCount: 0 }
    }

    // Build the conversation text for summarization
    const conversationText = messagesToSummarize
        .filter(msg => msg.role !== 'error')
        .map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Assistant'
            // Include a note about tool calls if present
            const toolNote = msg.toolCalls?.length
                ? ` [Used tools: ${msg.toolCalls.map(tc => tc.function?.name).join(', ')}]`
                : ''
            // Handle summary messages
            const summaryNote = msg.metadata?.isSummary ? ' [This was itself a summary of earlier conversation]' : ''
            return `${role}${toolNote}${summaryNote}: ${msg.content || '(no text content)'}`
        })
        .join('\n\n')

    const summaryMessages = [
        {
            role: 'system',
            content: `You are a precise conversation summarizer. Summarize the following conversation excerpt concisely but faithfully. Preserve:
- Key decisions made
- Important facts, names, data, and numbers mentioned
- Any instructions or preferences expressed by the user
- Context needed to continue the conversation naturally
- Tool actions that were performed and their outcomes

Write the summary as a cohesive narrative, not as a list of individual messages. Keep it as short as possible while retaining all essential information.`
        },
        {
            role: 'user',
            content: `Summarize this conversation:\n\n${conversationText}`
        }
    ]

    const summary = await streamAndCollect(apiKey, model, summaryMessages, null)
    return { summary, removedCount }
}

/**
 * Apply a summary to a session's messages by replacing old messages with a summary message.
 * Mutates the messages array in place (for Pinia reactivity).
 *
 * @param {Array} messages - Session messages array (reactive, from store)
 * @param {string} summary - The summary text
 * @param {number} removedCount - Number of messages being replaced
 * @returns {Object} The summary message that was inserted
 */
export const applyConversationSummary = (messages, summary, removedCount) => {
    const summaryMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: summary,
        metadata: {
            isSummary: true,
            summarizedCount: removedCount,
            summarizedAt: Date.now()
        },
        timestamp: Date.now()
    }

    // Remove old messages and insert summary at position 0
    messages.splice(0, removedCount, summaryMessage)

    return summaryMessage
}

/**
 * Format token count for display (e.g., 12400 → "12.4K", 1200000 → "1.2M")
 * @param {number} tokens
 * @returns {string}
 */
export const formatTokenCount = (tokens) => {
    if (tokens == null || isNaN(tokens)) return '—'
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
    return String(tokens)
}

import { describe, it, expect } from 'vitest'
import {
    estimateTokens,
    estimateMessagesTokens,
    shouldSummarize,
    getContextPercentage,
    getContextSeverity,
    formatTokenCount,
    applyConversationSummary
} from '../contextManager'

describe('contextManager', () => {
    describe('estimateTokens', () => {
        it('returns 0 for empty/null input', () => {
            expect(estimateTokens('')).toBe(0)
            expect(estimateTokens(null)).toBe(0)
            expect(estimateTokens(undefined)).toBe(0)
        })

        it('estimates ~1 token per 4 characters', () => {
            expect(estimateTokens('abcd')).toBe(1)
            expect(estimateTokens('abcde')).toBe(2) // ceil(5/4) = 2
            expect(estimateTokens('a'.repeat(100))).toBe(25)
        })

        it('handles unicode text', () => {
            const text = 'Hello 世界!'
            expect(estimateTokens(text)).toBeGreaterThan(0)
        })
    })

    describe('estimateMessagesTokens', () => {
        it('returns 0 for empty array', () => {
            expect(estimateMessagesTokens([])).toBe(0)
            expect(estimateMessagesTokens(null)).toBe(0)
        })

        it('accounts for message overhead', () => {
            const messages = [
                { role: 'user', content: 'Hi' } // 1 token content + 4 overhead = 5
            ]
            expect(estimateMessagesTokens(messages)).toBe(5)
        })

        it('sums tokens across multiple messages', () => {
            const messages = [
                { role: 'system', content: 'a'.repeat(40) }, // 10 + 4 = 14
                { role: 'user', content: 'a'.repeat(20) }, // 5 + 4 = 9
                { role: 'assistant', content: 'a'.repeat(80) } // 20 + 4 = 24
            ]
            expect(estimateMessagesTokens(messages)).toBe(47)
        })

        it('handles messages with null content', () => {
            const messages = [
                { role: 'assistant', content: null }
            ]
            expect(estimateMessagesTokens(messages)).toBe(4) // just overhead
        })
    })

    describe('shouldSummarize', () => {
        it('returns true when usage exceeds threshold', () => {
            expect(shouldSummarize({
                currentTokens: 8500,
                contextLength: 10000,
                threshold: 80,
                newMessageTokens: 500
            })).toBe(true)
        })

        it('returns false when usage is below threshold', () => {
            expect(shouldSummarize({
                currentTokens: 5000,
                contextLength: 10000,
                threshold: 80,
                newMessageTokens: 100
            })).toBe(false)
        })

        it('considers new message tokens in projection', () => {
            // 7900 + 200 = 8100 → 81% → triggers at 80%
            expect(shouldSummarize({
                currentTokens: 7900,
                contextLength: 10000,
                threshold: 80,
                newMessageTokens: 200
            })).toBe(true)

            // 7900 + 0 = 7900 → 79% → does not trigger
            expect(shouldSummarize({
                currentTokens: 7900,
                contextLength: 10000,
                threshold: 80,
                newMessageTokens: 0
            })).toBe(false)
        })

        it('returns false when contextLength is 0 or invalid', () => {
            expect(shouldSummarize({
                currentTokens: 5000,
                contextLength: 0,
                threshold: 80
            })).toBe(false)

            expect(shouldSummarize({
                currentTokens: 5000,
                contextLength: -1,
                threshold: 80
            })).toBe(false)
        })

        it('returns false when currentTokens is null/undefined', () => {
            expect(shouldSummarize({
                currentTokens: null,
                contextLength: 10000,
                threshold: 80
            })).toBe(false)
        })

        it('handles exact threshold boundary', () => {
            // 80% exactly should trigger
            expect(shouldSummarize({
                currentTokens: 8000,
                contextLength: 10000,
                threshold: 80,
                newMessageTokens: 0
            })).toBe(true)
        })
    })

    describe('getContextPercentage', () => {
        it('returns 0 for missing context length', () => {
            expect(getContextPercentage(5000, 0)).toBe(0)
            expect(getContextPercentage(5000, null)).toBe(0)
        })

        it('calculates percentage correctly', () => {
            expect(getContextPercentage(5000, 10000)).toBe(50)
            expect(getContextPercentage(0, 10000)).toBe(0)
            expect(getContextPercentage(128000, 128000)).toBe(100)
        })

        it('clamps at 100%', () => {
            expect(getContextPercentage(15000, 10000)).toBe(100)
        })

        it('rounds to nearest integer', () => {
            expect(getContextPercentage(3333, 10000)).toBe(33)
        })
    })

    describe('getContextSeverity', () => {
        it('returns green for low usage', () => {
            expect(getContextSeverity(0)).toBe('green')
            expect(getContextSeverity(30)).toBe('green')
            expect(getContextSeverity(59)).toBe('green')
        })

        it('returns yellow for medium usage', () => {
            expect(getContextSeverity(60)).toBe('yellow')
            expect(getContextSeverity(70)).toBe('yellow')
            expect(getContextSeverity(79)).toBe('yellow')
        })

        it('returns red for high usage', () => {
            expect(getContextSeverity(80)).toBe('red')
            expect(getContextSeverity(100)).toBe('red')
        })
    })

    describe('formatTokenCount', () => {
        it('formats small numbers as-is', () => {
            expect(formatTokenCount(0)).toBe('0')
            expect(formatTokenCount(500)).toBe('500')
            expect(formatTokenCount(999)).toBe('999')
        })

        it('formats thousands with K suffix', () => {
            expect(formatTokenCount(1000)).toBe('1.0K')
            expect(formatTokenCount(12400)).toBe('12.4K')
            expect(formatTokenCount(128000)).toBe('128.0K')
        })

        it('formats millions with M suffix', () => {
            expect(formatTokenCount(1000000)).toBe('1.0M')
            expect(formatTokenCount(1200000)).toBe('1.2M')
        })

        it('handles null/NaN', () => {
            expect(formatTokenCount(null)).toBe('—')
            expect(formatTokenCount(undefined)).toBe('—')
            expect(formatTokenCount(NaN)).toBe('—')
        })
    })

    describe('applyConversationSummary', () => {
        it('replaces old messages with a summary message', () => {
            const messages = [
                { id: 'msg1', role: 'user', content: 'Hello' },
                { id: 'msg2', role: 'assistant', content: 'Hi there' },
                { id: 'msg3', role: 'user', content: 'Help me' },
                { id: 'msg4', role: 'assistant', content: 'Sure' },
                { id: 'msg5', role: 'user', content: 'Latest' },
                { id: 'msg6', role: 'assistant', content: 'Response' }
            ]

            const summary = 'User greeted and asked for help. Assistant agreed.'
            const summaryMsg = applyConversationSummary(messages, summary, 4)

            // Should now have 3 messages: summary + the 2 kept
            expect(messages.length).toBe(3)
            expect(messages[0]).toBe(summaryMsg)
            expect(messages[0].metadata.isSummary).toBe(true)
            expect(messages[0].metadata.summarizedCount).toBe(4)
            expect(messages[0].content).toBe(summary)
            expect(messages[0].role).toBe('assistant')

            // Kept messages
            expect(messages[1].id).toBe('msg5')
            expect(messages[2].id).toBe('msg6')
        })

        it('assigns an id and timestamp to the summary message', () => {
            const messages = [
                { id: 'msg1', role: 'user', content: 'a' },
                { id: 'msg2', role: 'assistant', content: 'b' }
            ]

            const summaryMsg = applyConversationSummary(messages, 'Summary', 1)
            expect(summaryMsg.id).toBeTruthy()
            expect(summaryMsg.timestamp).toBeGreaterThan(0)
        })
    })
})

/**
 * AI Commands — Slash command definitions and processing
 *
 * Each command maps to:
 *   - An external markdown prompt file (loaded at runtime)
 *   - A set of allowed tools
 *   - A user message template
 */

import { PROMPT_TYPES } from '../stores/systemPrompts'
import { AI_COMMAND_TYPES } from '../stores/settings'

/**
 * URL detection regex
 */
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i
export const isUrl = (input) => URL_REGEX.test(input?.trim() || '')

/**
 * Command definitions.
 * These replace the old AI_COMMANDS object and map cleanly to the new tool system.
 */
export const AI_COMMANDS = {
    analyze: {
        id: 'analyze',
        name: 'Analyze Job',
        description: 'Analyze a job posting from URL or pasted text',
        promptFile: 'commands/analyze.md',
        promptType: PROMPT_TYPES.JOB_ANALYSIS,
        commandType: AI_COMMAND_TYPES.JOB_ANALYSIS,
        /** Build user message from raw input */
        buildUserMessage: (content) =>
            content
                ? `Analyze this job offer: ${content}`
                : 'Analyze the job posting in this workspace.',
        /** Whether this command needs web search */
        requiresWebSearch: (input) => isUrl(input)
    },
    match: {
        id: 'match',
        name: 'Profile Match',
        description: 'Generate a match report between your profile and the job',
        promptFile: 'commands/match.md',
        promptType: PROMPT_TYPES.MATCH_REPORT,
        commandType: AI_COMMAND_TYPES.MATCH_REPORT,
        buildUserMessage: () => "Generate a match report for my User Profile and the job offer in this workspace's context.",
        requiresWebSearch: false
    },
    research: {
        id: 'research',
        name: 'Research Company',
        description: 'Research a company for legitimacy and strategic info',
        promptFile: 'commands/research.md',
        promptType: PROMPT_TYPES.COMPANY_RESEARCH,
        commandType: AI_COMMAND_TYPES.COMPANY_RESEARCH,
        buildUserMessage: (content) =>
            content
                ? `Research this company: ${content}`
                : 'Research the company from the job analysis in this workspace.',
        requiresWebSearch: true
    }
}

/**
 * Parse user input to detect a slash command.
 * @param {string} text - Raw input text
 * @returns {{ commandId: string|null, content: string }}
 */
export const parseCommand = (text) => {
    if (!text.startsWith('/')) {
        return { commandId: null, content: text }
    }

    const parts = text.split(' ')
    const potentialCmd = parts[0].slice(1).toLowerCase()
    const cmd = AI_COMMANDS[potentialCmd]

    if (cmd) {
        return {
            commandId: cmd.id,
            content: parts.slice(1).join(' ').trim()
        }
    }

    return { commandId: null, content: text }
}

/**
 * Get a command definition by id.
 */
export const getCommand = (commandId) => AI_COMMANDS[commandId] || null

/**
 * Get all available commands (as array).
 */
export const getAllCommands = () => Object.values(AI_COMMANDS)

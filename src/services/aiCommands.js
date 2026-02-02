import { useSettingsStore, AI_COMMAND_TYPES } from '../stores/settings'
import { useUserProfileStore } from '../stores/userProfile'
import { useWorkspaceStore } from '../stores/workspace'
import { useSystemPromptsStore, PROMPT_TYPES } from '../stores/systemPrompts'
import {
    streamAndCollect,
    performAiActionWithJson,
    isWebSearchCompatible,
    RECOMMENDED_MODELS
} from './ai'

/**
 * URL detection regex for job posting links
 */
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i

/**
 * Check if input looks like a URL
 */
export const isUrl = (input) => {
    return URL_REGEX.test(input?.trim() || '')
}

/**
 * AI Command definitions with their requirements
 */
export const AI_COMMANDS = {
    ANALYZE: {
        id: 'analyze',
        name: 'Analyze Job',
        description: 'Analyze a job posting from URL or pasted text',
        commandType: AI_COMMAND_TYPES.JOB_ANALYSIS,
        promptType: PROMPT_TYPES.JOB_ANALYSIS,
        requiresWebSearch: (input) => isUrl(input), // Only for URL mode
        requiresContext: [],
        outputsTo: 'jobAnalysis'
    },
    MATCH: {
        id: 'match',
        name: 'Profile Match',
        description: 'Analyze how well your profile matches the job',
        commandType: AI_COMMAND_TYPES.MATCH_REPORT,
        promptType: PROMPT_TYPES.MATCH_REPORT,
        requiresWebSearch: false,
        requiresContext: ['userProfile', 'jobAnalysis'],
        outputsTo: 'matchReport'
    },
    RESEARCH: {
        id: 'research',
        name: 'Research Company',
        description: 'Research the company for legitimacy and strategic info',
        commandType: AI_COMMAND_TYPES.COMPANY_RESEARCH,
        promptType: PROMPT_TYPES.COMPANY_RESEARCH,
        requiresWebSearch: true,
        requiresContext: ['jobAnalysis'],
        outputsTo: 'companyResearch'
    },
    CV: {
        id: 'cv',
        name: 'Generate/Edit CV',
        description: 'Create or improve a CV based on job context',
        commandType: AI_COMMAND_TYPES.CV_GENERATION,
        promptType: PROMPT_TYPES.CV_GENERATION,
        requiresWebSearch: false,
        requiresContext: ['userProfile'],
        optionalContext: ['jobAnalysis', 'matchReport'],
        outputsTo: 'cv'
    },
    COVER_LETTER: {
        id: 'cover',
        name: 'Write Cover Letter',
        description: 'Write a personalized cover letter',
        commandType: AI_COMMAND_TYPES.COVER_LETTER,
        promptType: PROMPT_TYPES.COVER_LETTER,
        requiresWebSearch: false,
        requiresContext: ['userProfile'],
        optionalContext: ['jobAnalysis', 'matchReport', 'companyResearch'],
        outputsTo: 'coverLetter'
    }
}

/**
 * Context item labels for display
 */
const CONTEXT_LABELS = {
    userProfile: 'User Profile',
    jobAnalysis: 'Job Analysis',
    matchReport: 'Match Report',
    companyResearch: 'Company Research',
    cvData: 'Current CV',
    coverLetterData: 'Current Cover Letter'
}

/**
 * Assemble context for an AI command
 * Returns both the context object and a preview for UI display
 */
export const assembleContext = (command, additionalContext = {}) => {
    const userProfileStore = useUserProfileStore()
    const workspaceStore = useWorkspaceStore()

    const context = {}
    const contextPreview = []
    const missingRequired = []

    // Helper to add context if available
    const addContext = (key, value, required = false) => {
        if (value && (typeof value === 'string' ? value.trim() : true)) {
            context[key] = value
            contextPreview.push({
                key,
                label: CONTEXT_LABELS[key] || key,
                hasContent: true,
                preview: typeof value === 'string'
                    ? value.substring(0, 200) + (value.length > 200 ? '...' : '')
                    : JSON.stringify(value).substring(0, 200)
            })
        } else if (required) {
            missingRequired.push(CONTEXT_LABELS[key] || key)
            contextPreview.push({
                key,
                label: CONTEXT_LABELS[key] || key,
                hasContent: false,
                preview: 'Missing (required)'
            })
        }
    }

    // Check required context
    command.requiresContext?.forEach(contextKey => {
        switch (contextKey) {
            case 'userProfile':
                addContext('userProfile', userProfileStore.getProfileSummary.value, true)
                break
            case 'jobAnalysis':
                addContext('jobAnalysis', workspaceStore.getJobAnalysis.value?.content, true)
                break
            case 'matchReport':
                addContext('matchReport', workspaceStore.getMatchReport.value?.content, true)
                break
            case 'companyResearch':
                addContext('companyResearch', workspaceStore.getCompanyResearch.value?.content, true)
                break
        }
    })

    // Check optional context
    command.optionalContext?.forEach(contextKey => {
        switch (contextKey) {
            case 'jobAnalysis':
                addContext('jobAnalysis', workspaceStore.getJobAnalysis.value?.content)
                break
            case 'matchReport':
                addContext('matchReport', workspaceStore.getMatchReport.value?.content)
                break
            case 'companyResearch':
                addContext('companyResearch', workspaceStore.getCompanyResearch.value?.content)
                break
        }
    })

    // Add any additional context passed in
    Object.entries(additionalContext).forEach(([key, value]) => {
        if (value) {
            addContext(key, value)
        }
    })

    return {
        context,
        contextPreview,
        missingRequired,
        isValid: missingRequired.length === 0
    }
}

/**
 * Format context for inclusion in prompt
 */
const formatContextForPrompt = (context) => {
    const parts = []

    if (context.userProfile) {
        parts.push(`## User's Professional Profile\n${context.userProfile}`)
    }

    if (context.jobAnalysis) {
        parts.push(`## Job Analysis\n${context.jobAnalysis}`)
    }

    if (context.matchReport) {
        parts.push(`## Profile Match Report\n${context.matchReport}`)
    }

    if (context.companyResearch) {
        parts.push(`## Company Research\n${context.companyResearch}`)
    }

    if (context.cvData) {
        parts.push(`## Current CV Data\n${JSON.stringify(context.cvData, null, 2)}`)
    }

    if (context.coverLetterData) {
        parts.push(`## Current Cover Letter Data\n${JSON.stringify(context.coverLetterData, null, 2)}`)
    }

    return parts.join('\n\n---\n\n')
}

/**
 * Execute an AI command with streaming
 * Returns an object with methods to control the stream
 */
export const executeAiCommand = async (commandId, userInput, options = {}) => {
    const settingsStore = useSettingsStore()
    const systemPromptsStore = useSystemPromptsStore()
    const workspaceStore = useWorkspaceStore()

    // Find command definition
    const command = Object.values(AI_COMMANDS).find(c => c.id === commandId)
    if (!command) {
        throw new Error(`Unknown command: ${commandId}`)
    }

    // Get API key
    const apiKey = settingsStore.openRouterKey.value
    if (!apiKey) {
        throw new Error('OpenRouter API key is not configured. Please set it in settings.')
    }

    // Get model for this task
    const model = settingsStore.getModelForTask(command.commandType)

    // Check web search requirement
    const needsWebSearch = typeof command.requiresWebSearch === 'function'
        ? command.requiresWebSearch(userInput)
        : command.requiresWebSearch

    if (needsWebSearch) {
        const allModels = [...RECOMMENDED_MODELS, ...settingsStore.customModels.value]
        if (!isWebSearchCompatible(model, allModels)) {
            throw new Error(
                `The selected model (${model}) does not support web search. ` +
                `Please select a web-search compatible model for ${command.name} in settings.`
            )
        }
    }

    // Assemble context
    const { context, missingRequired, isValid } = assembleContext(command, options.additionalContext)

    if (!isValid && !options.skipValidation) {
        throw new Error(`Missing required context: ${missingRequired.join(', ')}`)
    }

    // Get system prompt
    const activePrompt = systemPromptsStore.getActivePrompt(command.promptType)
    if (!activePrompt) {
        throw new Error(`No system prompt configured for ${command.name}`)
    }

    // Build messages
    const contextText = formatContextForPrompt(context)
    const messages = [
        { role: 'system', content: activePrompt.content },
        {
            role: 'user',
            content: contextText
                ? `${contextText}\n\n---\n\n## User Request\n${userInput}`
                : userInput
        }
    ]

    // Execute with streaming
    const { onChunk, onComplete, onError } = options

    try {
        const fullResponse = await streamAndCollect(
            apiKey,
            model,
            messages,
            onChunk
        )

        // Handle output based on command type
        const result = {
            command: commandId,
            content: fullResponse,
            model,
            timestamp: Date.now()
        }

        // Auto-save to workspace context if configured
        if (options.autoSave !== false) {
            switch (command.outputsTo) {
                case 'jobAnalysis':
                    workspaceStore.setJobAnalysis({
                        content: fullResponse,
                        source: isUrl(userInput) ? 'url' : 'ai',
                        sourceUrl: isUrl(userInput) ? userInput : null,
                        jobTitle: extractJobTitle(fullResponse),
                        company: extractCompanyName(fullResponse)
                    })
                    break
                case 'matchReport':
                    const score = extractMatchScore(fullResponse)
                    workspaceStore.setMatchReport({
                        content: fullResponse,
                        score,
                        strengths: extractListSection(fullResponse, 'strengths'),
                        weaknesses: extractListSection(fullResponse, 'weaknesses'),
                        recommendation: extractRecommendation(fullResponse, score, settingsStore.matchReportThreshold.value)
                    })
                    result.shouldOfferMatch = false // Already is match report
                    break
                case 'companyResearch':
                    workspaceStore.setCompanyResearch({
                        content: fullResponse,
                        companyName: extractCompanyName(fullResponse),
                        legitimacyScore: extractLegitimacyScore(fullResponse),
                        redFlags: extractListSection(fullResponse, 'red flags')
                    })
                    break
                // CV and cover letter are handled by the calling component
            }
        }

        // Check if we should offer match report after job analysis
        if (command.outputsTo === 'jobAnalysis' && !workspaceStore.getMatchReport.value) {
            result.shouldOfferMatch = true
        }

        if (onComplete) {
            onComplete(result)
        }

        return result
    } catch (error) {
        if (onError) {
            onError(error)
        }
        throw error
    }
}

/**
 * Execute CV generation command (returns structured JSON)
 */
export const executeCvCommand = async (userInput, cvData, options = {}) => {
    const settingsStore = useSettingsStore()
    const systemPromptsStore = useSystemPromptsStore()

    const command = AI_COMMANDS.CV
    const apiKey = settingsStore.openRouterKey.value
    if (!apiKey) {
        throw new Error('OpenRouter API key is not configured.')
    }

    const model = settingsStore.getModelForTask(command.commandType)
    const { context } = assembleContext(command, { cvData })

    const activePrompt = systemPromptsStore.getActivePrompt(command.promptType)
    const contextText = formatContextForPrompt(context)

    const messages = [
        { role: 'system', content: activePrompt.content },
        {
            role: 'user',
            content: `${contextText}\n\n---\n\n## User Request\n${userInput}`
        }
    ]

    // CV commands use JSON response format
    return performAiActionWithJson(apiKey, model, messages)
}

// ============================================
// Helper functions for parsing AI responses
// ============================================

/**
 * Extract job title from analysis content
 */
const extractJobTitle = (content) => {
    const match = content.match(/(?:job\s*title|position)[:\s]*([^\n<]+)/i)
    return match ? match[1].trim().replace(/<[^>]+>/g, '') : null
}

/**
 * Extract company name from content
 */
const extractCompanyName = (content) => {
    const match = content.match(/(?:company|employer)[:\s]*([^\n<]+)/i)
    return match ? match[1].trim().replace(/<[^>]+>/g, '') : null
}

/**
 * Extract match score from report
 */
const extractMatchScore = (content) => {
    const match = content.match(/(?:match\s*score|score)[:\s]*(\d+)/i)
    return match ? parseInt(match[1], 10) : null
}

/**
 * Extract legitimacy score from company research
 */
const extractLegitimacyScore = (content) => {
    const match = content.match(/(?:legitimacy\s*score)[:\s]*(\d+)/i)
    return match ? parseInt(match[1], 10) : null
}

/**
 * Extract list section from content
 */
const extractListSection = (content, sectionName) => {
    const regex = new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=##|$)`, 'i')
    const match = content.match(regex)
    if (!match) return []

    const listItems = match[1].match(/[-•*]\s*([^\n]+)/g)
    return listItems ? listItems.map(item => item.replace(/^[-•*]\s*/, '').trim()) : []
}

/**
 * Determine recommendation based on score and threshold
 */
const extractRecommendation = (content, score, threshold) => {
    // First try to extract from content
    const match = content.match(/recommendation[:\s]*(apply|consider|skip)/i)
    if (match) {
        return match[1].toLowerCase()
    }

    // Fall back to score-based logic
    if (score === null) return 'consider'
    if (score >= threshold) return 'apply'
    if (score >= threshold - 20) return 'consider'
    return 'skip'
}

/**
 * Get context preview for UI display
 */
export const getContextPreview = (commandId, additionalContext = {}) => {
    const command = Object.values(AI_COMMANDS).find(c => c.id === commandId)
    if (!command) return { contextPreview: [], isValid: false, missingRequired: [] }

    return assembleContext(command, additionalContext)
}

/**
 * Check if a command can be executed (has required context)
 */
export const canExecuteCommand = (commandId, additionalContext = {}) => {
    const { isValid, missingRequired } = getContextPreview(commandId, additionalContext)
    return { canExecute: isValid, missingRequired }
}

/**
 * Get command by ID
 */
export const getCommand = (commandId) => {
    return Object.values(AI_COMMANDS).find(c => c.id === commandId)
}

/**
 * Get all available commands
 */
export const getAllCommands = () => {
    return Object.values(AI_COMMANDS)
}

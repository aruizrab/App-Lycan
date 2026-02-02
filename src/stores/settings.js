import { defineStore } from 'pinia'
import { reactive, watch, toRefs } from 'vue'

const STORAGE_KEY = 'app-lycan-ui-settings'

/**
 * AI Command types that can have their own model settings
 */
export const AI_COMMAND_TYPES = {
    JOB_ANALYSIS: 'jobAnalysis',
    MATCH_REPORT: 'matchReport',
    COMPANY_RESEARCH: 'companyResearch',
    CV_GENERATION: 'cvGeneration',
    COVER_LETTER: 'coverLetter'
}

/**
 * Commands that require web search capabilities
 */
export const WEB_SEARCH_COMMANDS = [
    AI_COMMAND_TYPES.JOB_ANALYSIS, // When using URL mode
    AI_COMMAND_TYPES.COMPANY_RESEARCH
]

const defaultSettings = () => ({
    // Display settings
    atsMode: false,
    showPictureInAts: false,
    uppercaseName: true,
    uppercaseRole: true,
    uppercaseHeaders: true,
    uppercaseCoverLetterTitle: true,
    picturePosition: 'left',

    // OpenRouter general settings
    openRouterKey: '',
    openRouterModel: 'openai/gpt-4o-mini', // Default general model

    // Per-task model settings
    taskModels: {
        [AI_COMMAND_TYPES.JOB_ANALYSIS]: 'perplexity/sonar-pro', // Web search for URL mode
        [AI_COMMAND_TYPES.MATCH_REPORT]: 'openai/gpt-4o-mini',
        [AI_COMMAND_TYPES.COMPANY_RESEARCH]: 'perplexity/sonar-pro', // Web search required
        [AI_COMMAND_TYPES.CV_GENERATION]: 'openai/gpt-4o-mini',
        [AI_COMMAND_TYPES.COVER_LETTER]: 'openai/gpt-4o-mini'
    },

    // Custom models added by user
    // Structure: [{ id: string, name: string, webSearchCompatible: boolean }]
    customModels: [],

    // Match report threshold (percentage)
    matchReportThreshold: 70
})

export const useSettingsStore = defineStore('settings', () => {
    const state = reactive(defaultSettings())

    const loadFromStorage = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                // Merge with defaults to handle new settings added in updates
                const defaults = defaultSettings()
                Object.assign(state, {
                    ...defaults,
                    ...parsed,
                    // Deep merge taskModels
                    taskModels: {
                        ...defaults.taskModels,
                        ...(parsed.taskModels || {})
                    }
                })
            }
        } catch (e) {
            console.warn('Failed to load settings, using defaults', e)
        }
    }

    const persist = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        } catch (e) {
            console.warn('Failed to persist settings', e)
        }
    }

    loadFromStorage()

    watch(state, persist, { deep: true })

    const resetSettings = () => {
        Object.assign(state, defaultSettings())
    }

    /**
     * Get model for a specific AI command type
     */
    const getModelForTask = (taskType) => {
        return state.taskModels[taskType] || state.openRouterModel
    }

    /**
     * Set model for a specific AI command type
     */
    const setModelForTask = (taskType, modelId) => {
        if (state.taskModels.hasOwnProperty(taskType)) {
            state.taskModels[taskType] = modelId
        }
    }

    /**
     * Add a custom model
     */
    const addCustomModel = (model) => {
        if (!state.customModels.find(m => m.id === model.id)) {
            state.customModels.push({
                id: model.id,
                name: model.name || model.id,
                webSearchCompatible: model.webSearchCompatible || false
            })
        }
    }

    /**
     * Remove a custom model
     */
    const removeCustomModel = (modelId) => {
        const index = state.customModels.findIndex(m => m.id === modelId)
        if (index !== -1) {
            state.customModels.splice(index, 1)
        }
    }

    /**
     * Update custom model properties
     */
    const updateCustomModel = (modelId, updates) => {
        const model = state.customModels.find(m => m.id === modelId)
        if (model) {
            Object.assign(model, updates)
        }
    }

    /**
     * Check if a command requires web search
     */
    const commandRequiresWebSearch = (commandType) => {
        return WEB_SEARCH_COMMANDS.includes(commandType)
    }

    return {
        ...toRefs(state),
        resetSettings,
        getModelForTask,
        setModelForTask,
        addCustomModel,
        removeCustomModel,
        updateCustomModel,
        commandRequiresWebSearch
    }
})

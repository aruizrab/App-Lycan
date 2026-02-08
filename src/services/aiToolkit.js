/**
 * AI Toolkit — Tool Definitions & Handlers
 *
 * Defines every tool the AI can use to interact with App-Lycan and
 * wires each one to the centralized data-access layer.
 *
 * Tool categories:
 *   NAVIGATION  – go_to
 *   READING     – get_app_context, get_workspaces, get_workspace, get_cv,
 *                 get_cover_letter, get_workspace_context
 *   CREATION    – create_workspace, create_cv, create_cover_letter,
 *                 add_workspace_context
 *   EDITING     – edit_workspace, edit_cv, edit_cover_letter,
 *                 edit_workspace_context
 *   DELETION    – delete_workspace, delete_cv, delete_cover_letter,
 *                 delete_workspace_context
 *   UTILITY     – analyze_job, generate_match_report, research_company
 */

import * as data from './dataAccess'
import { useSystemPromptsStore, PROMPT_TYPES } from '../stores/systemPrompts'
import { useSettingsStore, AI_COMMAND_TYPES } from '../stores/settings'
import { useUserProfileStore } from '../stores/userProfile'
import { streamAndCollect, isWebSearchCompatible } from './ai'
import cvSchema from '../schemas/cvSchema.json'
import coverLetterSchema from '../schemas/coverLetterSchema.json'

// =========================================================
// Tool Definitions (OpenRouter / OpenAI format)
// =========================================================

export const AI_TOOLS = [
    // ── NAVIGATION ──────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'go_to',
            description: 'Navigate to a specific view in App-Lycan. Use this to move the user to a different page.',
            parameters: {
                type: 'object',
                properties: {
                    view: {
                        type: 'string',
                        enum: ['general_dashboard', 'workspace_dashboard', 'cv_editor', 'cover_letter_editor'],
                        description: 'The target view to navigate to.'
                    },
                    workspace_name: {
                        type: 'string',
                        description: 'Required for workspace_dashboard, cv_editor, cover_letter_editor.'
                    },
                    cv_name: {
                        type: 'string',
                        description: 'Required for cv_editor.'
                    },
                    cover_letter_name: {
                        type: 'string',
                        description: 'Required for cover_letter_editor.'
                    }
                },
                required: ['view']
            }
        }
    },

    // ── READING ─────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'get_app_context',
            description: 'Get the full current app context including current view, workspaces, and active documents.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_workspaces',
            description: 'Get all workspaces with their CV and Cover Letter names.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_workspace',
            description: 'Get data of a single workspace by name.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Name of the workspace.' }
                },
                required: ['workspace_name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_cv',
            description: 'Get the full data of a CV document.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Name of the workspace containing the CV.' },
                    cv_name: { type: 'string', description: 'Name of the CV.' }
                },
                required: ['workspace_name', 'cv_name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_cover_letter',
            description: 'Get the full data of a Cover Letter document.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Name of the workspace containing the Cover Letter.' },
                    cover_letter_name: { type: 'string', description: 'Name of the Cover Letter.' }
                },
                required: ['workspace_name', 'cover_letter_name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_workspace_context',
            description: 'Get a specific context field from a workspace, or list all context keys if context_key is omitted.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Name of the workspace.' },
                    context_key: { type: 'string', description: 'Optional. The context key to retrieve (e.g. "job_analysis"). If omitted, returns a list of all context keys.' }
                },
                required: ['workspace_name']
            }
        }
    },

    // ── CREATION ────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'create_workspace',
            description: 'Create a new workspace.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Name for the new workspace.' }
                },
                required: ['workspace_name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_cv',
            description: 'Create a new CV in a workspace. The cv_data must follow the schema and include a "name" property for the document name. Optionally include "data" property with CV content.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Workspace to create the CV in.' },
                    cv_data: cvSchema
                },
                required: ['workspace_name', 'cv_data']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_cover_letter',
            description: 'Create a new Cover Letter in a workspace. The cover_letter_data must follow the schema and include a "name" property for the document name. Optionally include "data" property with content.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Workspace to create the Cover Letter in.' },
                    cover_letter_data: coverLetterSchema
                },
                required: ['workspace_name', 'cover_letter_data']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'add_workspace_context',
            description: 'Add a new context field to a workspace. Used to store AI-generated analysis, reports, or research that can be retrieved later.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Name of the workspace.' },
                    context_key: { type: 'string', description: 'Key name for the context (e.g. "job_analysis", "match_report", "company_research").' },
                    context_content: { type: 'string', description: 'Rich text content to store.' }
                },
                required: ['workspace_name', 'context_key', 'context_content']
            }
        }
    },

    // ── EDITING ─────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'edit_workspace',
            description: 'Rename a workspace.',
            parameters: {
                type: 'object',
                properties: {
                    current_workspace_name: { type: 'string', description: 'Current name of the workspace.' },
                    new_workspace_name: { type: 'string', description: 'New name for the workspace.' }
                },
                required: ['current_workspace_name', 'new_workspace_name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'edit_cv',
            description: 'Edit a CV. Provide CV data following the schema structure. Include "name" property to rename, "data" property to update content, or both.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Workspace containing the CV.' },
                    current_cv_name: { type: 'string', description: 'Current name of the CV to edit.' },
                    cv_data: cvSchema,
                    data_editing_mode: {
                        type: 'string',
                        enum: ['merge', 'replace'],
                        description: 'Optional. "merge" (default) updates only provided fields; "replace" overwrites entirely.'
                    }
                },
                required: ['workspace_name', 'current_cv_name', 'cv_data']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'edit_cover_letter',
            description: 'Edit a Cover Letter. Provide cover letter data following the schema structure. Include "name" property to rename, "data" property to update content, or both.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Workspace containing the Cover Letter.' },
                    current_cover_letter_name: { type: 'string', description: 'Current name of the Cover Letter to edit.' },
                    cover_letter_data: coverLetterSchema,
                    data_editing_mode: {
                        type: 'string',
                        enum: ['merge', 'replace'],
                        description: 'Optional. "merge" (default) updates only provided fields; "replace" overwrites entirely.'
                    }
                },
                required: ['workspace_name', 'current_cover_letter_name', 'cover_letter_data']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'edit_workspace_context',
            description: 'Update the content of an existing workspace context field.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Name of the workspace.' },
                    context_key: { type: 'string', description: 'The context key to update.' },
                    new_context_content: { type: 'string', description: 'New rich text content for the context.' }
                },
                required: ['workspace_name', 'context_key', 'new_context_content']
            }
        }
    },

    // ── DELETION ────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'delete_workspace',
            description: 'Delete a workspace. Requires user confirmation in the UI.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Name of the workspace to delete.' }
                },
                required: ['workspace_name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'delete_cv',
            description: 'Delete a CV from a workspace. Requires user confirmation in the UI.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Workspace containing the CV.' },
                    cv_name: { type: 'string', description: 'Name of the CV to delete.' }
                },
                required: ['workspace_name', 'cv_name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'delete_cover_letter',
            description: 'Delete a Cover Letter from a workspace. Requires user confirmation in the UI.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Workspace containing the Cover Letter.' },
                    cover_letter_name: { type: 'string', description: 'Name of the Cover Letter to delete.' }
                },
                required: ['workspace_name', 'cover_letter_name']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'delete_workspace_context',
            description: 'Delete a context field from a workspace. Requires user confirmation in the UI.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Name of the workspace.' },
                    context_key: { type: 'string', description: 'The context key to delete.' }
                },
                required: ['workspace_name', 'context_key']
            }
        }
    },

    // ── UTILITY ─────────────────────────────────────────────
    {
        type: 'function',
        function: {
            name: 'analyze_job',
            description: 'Analyze a job offer text and return a rich text analysis. Delegates to a specialized agent.',
            parameters: {
                type: 'object',
                properties: {
                    job_offer_content: { type: 'string', description: 'The full text of the job offer to analyze.' },
                    current_analysis: { type: 'string', description: 'Optional. Existing analysis to iterate on.' },
                    iteration_prompt: { type: 'string', description: 'Optional. Instructions for improving the existing analysis.' }
                },
                required: ['job_offer_content']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'generate_match_report',
            description: 'Generate a match report comparing the user profile against a job analysis. Automatically fetches job context and user profile.',
            parameters: {
                type: 'object',
                properties: {
                    workspace_name: { type: 'string', description: 'Workspace containing the job context.' },
                    job_context_key: { type: 'string', description: 'Context key for the job analysis (e.g. "job_analysis").' },
                    current_report: { type: 'string', description: 'Optional. Existing match report to iterate on.' },
                    iteration_prompt: { type: 'string', description: 'Optional. Instructions for improving the existing report.' }
                },
                required: ['workspace_name', 'job_context_key']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'research_company',
            description: 'Research a company and return a rich text report. Uses web search capabilities.',
            parameters: {
                type: 'object',
                properties: {
                    company_info: { type: 'string', description: 'Company name, URL, or description to research.' },
                    current_research: { type: 'string', description: 'Optional. Existing research to iterate on.' },
                    iteration_prompt: { type: 'string', description: 'Optional. Instructions for improving the existing research.' }
                },
                required: ['company_info']
            }
        }
    }
]

// =========================================================
// Command → Tool mapping (which tools each command can use)
// =========================================================

export const COMMAND_TOOLS = {
    analyze: [
        'get_app_context', 'get_workspaces', 'get_workspace', 'get_workspace_context',
        'go_to', 'create_workspace', 'analyze_job',
        'add_workspace_context', 'edit_workspace_context'
    ],
    match: [
        'get_app_context', 'get_workspace_context',
        'generate_match_report',
        'add_workspace_context', 'edit_workspace_context'
    ],
    research: [
        'get_app_context', 'get_workspaces', 'get_workspace', 'get_workspace_context',
        'go_to', 'create_workspace', 'research_company',
        'add_workspace_context', 'edit_workspace_context'
    ]
}

/**
 * Get tools filtered for a specific command, or all tools if no command.
 * @param {string|null} commandId
 * @returns {Array} Tool definitions
 */
export const getToolsForCommand = (commandId) => {
    if (!commandId || !COMMAND_TOOLS[commandId]) {
        return AI_TOOLS
    }
    const allowedNames = new Set(COMMAND_TOOLS[commandId])
    return AI_TOOLS.filter(t => allowedNames.has(t.function.name))
}

/** Alias for backward compat */
export const getToolsForApi = () => AI_TOOLS

// =========================================================
// Handler registry
// =========================================================

const toolHandlers = new Map()

export const registerToolHandler = (toolName, handler) => {
    toolHandlers.set(toolName, handler)
}

export const executeToolCall = async (toolCall) => {
    const { name, arguments: argsString } = toolCall.function
    const handler = toolHandlers.get(name)
    if (!handler) {
        return { tool: name, error: `No handler registered for tool: ${name}` }
    }

    let args
    try {
        // Handle empty or missing arguments for tools with no parameters
        if (!argsString || argsString === '') {
            args = {}
        } else {
            args = typeof argsString === 'string' ? JSON.parse(argsString) : argsString
        }
    } catch (e) {
        return { tool: name, error: `Failed to parse tool arguments: ${e.message}` }
    }

    try {
        const result = await handler(args)
        return { tool: name, ...result }
    } catch (e) {
        return { tool: name, error: e.message }
    }
}

// =========================================================
// Setup handlers (called once with router instance)
// =========================================================

/**
 * Wire up all tool handlers.
 * @param {import('vue-router').Router} router - Vue Router instance for navigation tools
 * @param {import('vue-router').RouteLocationNormalized} route - Current route (reactive)
 */
export const setupToolHandlers = (router, route) => {

    // ── NAVIGATION ──────────────────────────────────────────
    registerToolHandler('go_to', async (args) => {
        return data.navigateTo(router, {
            view: args.view,
            workspaceName: args.workspace_name,
            cvName: args.cv_name,
            coverLetterName: args.cover_letter_name
        })
    })

    // ── READING ─────────────────────────────────────────────
    registerToolHandler('get_app_context', async () => {
        return data.buildAppContext(route)
    })

    registerToolHandler('get_workspaces', async () => {
        return { workspaces: data.getAllWorkspaces() }
    })

    registerToolHandler('get_workspace', async (args) => {
        if (!args.workspace_name) return { error: 'workspace_name is required' }
        return data.getWorkspace(args.workspace_name)
    })

    registerToolHandler('get_cv', async (args) => {
        if (!args.workspace_name) return { error: 'workspace_name is required' }
        if (!args.cv_name) return { error: 'cv_name is required' }
        return data.getCv(args.workspace_name, args.cv_name)
    })

    registerToolHandler('get_cover_letter', async (args) => {
        if (!args.workspace_name) return { error: 'workspace_name is required' }
        if (!args.cover_letter_name) return { error: 'cover_letter_name is required' }
        return data.getCoverLetter(args.workspace_name, args.cover_letter_name)
    })

    registerToolHandler('get_workspace_context', async (args) => {
        if (!args.workspace_name) return { error: 'workspace_name is required' }
        return data.getWorkspaceContext(args.workspace_name, args.context_key)
    })

    // ── CREATION ────────────────────────────────────────────
    registerToolHandler('create_workspace', async (args) => {
        if (!args.workspace_name) return { error: 'workspace_name is required' }
        return data.createWorkspace(args.workspace_name)
    })

    registerToolHandler('create_cv', async (args) => {
        if (!args.cv_data || typeof args.cv_data !== 'object') {
            return {
                error: 'cv_data is required and must be an object following the CV schema',
                received_params: Object.keys(args)
            }
        }

        // Extract name from schema-compliant cv_data
        const cvName = args.cv_data.name
        if (!cvName) {
            return {
                error: 'cv_data.name is required for creating a CV',
                received: args.cv_data
            }
        }

        // Extract data content if provided
        const cvData = args.cv_data.data

        return data.createCv(args.workspace_name, cvName, cvData)
    })

    registerToolHandler('create_cover_letter', async (args) => {
        if (!args.cover_letter_data || typeof args.cover_letter_data !== 'object') {
            return {
                error: 'cover_letter_data is required and must be an object following the Cover Letter schema',
                received_params: Object.keys(args)
            }
        }

        // Extract name from schema-compliant cover_letter_data
        const clName = args.cover_letter_data.name
        if (!clName) {
            return {
                error: 'cover_letter_data.name is required for creating a Cover Letter',
                received: args.cover_letter_data
            }
        }

        // Extract data content if provided
        const clData = args.cover_letter_data.data

        return data.createCoverLetter(args.workspace_name, clName, clData)
    })

    registerToolHandler('add_workspace_context', async (args) => {
        return data.addWorkspaceContext(args.workspace_name, args.context_key, args.context_content)
    })

    // ── EDITING ─────────────────────────────────────────────
    registerToolHandler('edit_workspace', async (args) => {
        return data.editWorkspace(args.current_workspace_name, args.new_workspace_name)
    })

    registerToolHandler('edit_cv', async (args) => {
        if (!args.cv_data || typeof args.cv_data !== 'object') {
            return {
                error: 'cv_data is required and must be an object following the CV schema',
                received_params: Object.keys(args)
            }
        }

        // Extract name and data from schema-compliant cv_data
        const newCvName = args.cv_data.name
        const newCvData = args.cv_data.data

        const result = await data.editCv(args.workspace_name, args.current_cv_name, {
            newCvName: newCvName,
            newCvData: newCvData,
            dataEditingMode: args.data_editing_mode
        })

        // Enhance success response with parameter info
        if (result.success) {
            return {
                ...result,
                params_received: {
                    name: newCvName ? 'provided (rename)' : 'not provided',
                    data: newCvData ? 'provided (content update)' : 'not provided',
                    data_editing_mode: args.data_editing_mode || 'default (merge)'
                }
            }
        }
        return result
    })

    registerToolHandler('edit_cover_letter', async (args) => {
        if (!args.cover_letter_data || typeof args.cover_letter_data !== 'object') {
            return {
                error: 'cover_letter_data is required and must be an object following the Cover Letter schema',
                received_params: Object.keys(args)
            }
        }

        // Extract name and data from schema-compliant cover_letter_data
        const newClName = args.cover_letter_data.name
        const newClData = args.cover_letter_data.data

        const result = await data.editCoverLetter(args.workspace_name, args.current_cover_letter_name, {
            newClName: newClName,
            newClData: newClData,
            dataEditingMode: args.data_editing_mode
        })

        // Enhance success response with parameter info
        if (result.success) {
            return {
                ...result,
                params_received: {
                    name: newClName ? 'provided (rename)' : 'not provided',
                    data: newClData ? 'provided (content update)' : 'not provided',
                    data_editing_mode: args.data_editing_mode || 'default (merge)'
                }
            }
        }
        return result
    })

    registerToolHandler('edit_workspace_context', async (args) => {
        return data.editWorkspaceContext(args.workspace_name, args.context_key, args.new_context_content)
    })

    // ── DELETION ────────────────────────────────────────────
    registerToolHandler('delete_workspace', async (args) => {
        return data.deleteWorkspaceWithConfirm(args.workspace_name)
    })

    registerToolHandler('delete_cv', async (args) => {
        return data.deleteCvWithConfirm(args.workspace_name, args.cv_name)
    })

    registerToolHandler('delete_cover_letter', async (args) => {
        return data.deleteCoverLetterWithConfirm(args.workspace_name, args.cover_letter_name)
    })

    registerToolHandler('delete_workspace_context', async (args) => {
        return data.deleteWorkspaceContextWithConfirm(args.workspace_name, args.context_key)
    })

    // ── UTILITY: analyze_job ────────────────────────────────
    registerToolHandler('analyze_job', async (args) => {
        if (!args.job_offer_content) return { error: 'job_offer_content is required' }

        const settingsStore = useSettingsStore()
        const systemPromptsStore = useSystemPromptsStore()

        const apiKey = settingsStore.openRouterKey
        if (!apiKey) return { error: 'OpenRouter API key is not configured' }

        const model = settingsStore.getModelForTask(AI_COMMAND_TYPES.JOB_ANALYSIS)
        if (!model) return { error: 'No model configured for job analysis' }

        const activePrompt = systemPromptsStore.getActivePrompt(PROMPT_TYPES.JOB_ANALYSIS)
        if (!activePrompt) return { error: 'No system prompt configured for job analysis' }

        const messages = [{ role: 'system', content: activePrompt.content }]

        let userContent = `Analyze the following job offer:\n\n${args.job_offer_content}`
        if (args.current_analysis) {
            userContent += `\n\n---\n\n## Current Analysis (to improve)\n${args.current_analysis}`
        }
        if (args.iteration_prompt) {
            userContent += `\n\n## Iteration Instructions\n${args.iteration_prompt}`
        }
        messages.push({ role: 'user', content: userContent })

        try {
            const result = await streamAndCollect(apiKey, model, messages, null)
            return { success: true, analysis: result }
        } catch (e) {
            return { error: `Analysis failed: ${e.message}` }
        }
    })

    // ── UTILITY: generate_match_report ──────────────────────
    registerToolHandler('generate_match_report', async (args) => {
        if (!args.workspace_name) return { error: 'workspace_name is required' }
        if (!args.job_context_key) return { error: 'job_context_key is required' }

        // Fetch job context
        const jobCtx = data.getWorkspaceContext(args.workspace_name, args.job_context_key)
        if (jobCtx.error) return { error: jobCtx.error }

        // Fetch user profile
        const profile = data.getUserProfile()
        if (!profile.summary && !profile.professionalExperience) {
            return { error: 'User profile is empty. Please fill in your profile first.' }
        }

        const settingsStore = useSettingsStore()
        const systemPromptsStore = useSystemPromptsStore()

        const apiKey = settingsStore.openRouterKey
        if (!apiKey) return { error: 'OpenRouter API key is not configured' }

        const model = settingsStore.getModelForTask(AI_COMMAND_TYPES.MATCH_REPORT)
        if (!model) return { error: 'No model configured for match report' }

        const activePrompt = systemPromptsStore.getActivePrompt(PROMPT_TYPES.MATCH_REPORT)
        if (!activePrompt) return { error: 'No system prompt configured for match report' }

        const messages = [{ role: 'system', content: activePrompt.content }]

        const jobContent = typeof jobCtx.content === 'object' ? (jobCtx.content.content || JSON.stringify(jobCtx.content)) : jobCtx.content
        let userContent = `## User Profile\n${profile.summary || profile.professionalExperience}\n\n## Job Analysis\n${jobContent}`
        if (args.current_report) {
            userContent += `\n\n---\n\n## Current Match Report (to improve)\n${args.current_report}`
        }
        if (args.iteration_prompt) {
            userContent += `\n\n## Iteration Instructions\n${args.iteration_prompt}`
        }
        messages.push({ role: 'user', content: userContent })

        try {
            const result = await streamAndCollect(apiKey, model, messages, null)
            return { success: true, report: result }
        } catch (e) {
            return { error: `Match report generation failed: ${e.message}` }
        }
    })

    // ── UTILITY: research_company ───────────────────────────
    registerToolHandler('research_company', async (args) => {
        if (!args.company_info) return { error: 'company_info is required' }

        const settingsStore = useSettingsStore()
        const systemPromptsStore = useSystemPromptsStore()

        const apiKey = settingsStore.openRouterKey
        if (!apiKey) return { error: 'OpenRouter API key is not configured' }

        const model = settingsStore.getModelForTask(AI_COMMAND_TYPES.COMPANY_RESEARCH)
        if (!model) return { error: 'No model configured for company research' }

        const activePrompt = systemPromptsStore.getActivePrompt(PROMPT_TYPES.COMPANY_RESEARCH)
        if (!activePrompt) return { error: 'No system prompt configured for company research' }

        const messages = [{ role: 'system', content: activePrompt.content }]

        let userContent = `Research the following company:\n\n${args.company_info}`
        if (args.current_research) {
            userContent += `\n\n---\n\n## Current Research (to improve)\n${args.current_research}`
        }
        if (args.iteration_prompt) {
            userContent += `\n\n## Iteration Instructions\n${args.iteration_prompt}`
        }
        messages.push({ role: 'user', content: userContent })

        // Enable web search for company research
        const streamOptions = {}
        if (isWebSearchCompatible(model, settingsStore.availableModels || [], settingsStore.customModels || [])) {
            streamOptions.plugins = [{ id: 'web' }]
        }

        try {
            const result = await streamAndCollect(apiKey, model, messages, null, streamOptions)
            return { success: true, research: result }
        } catch (e) {
            return { error: `Company research failed: ${e.message}` }
        }
    })
}

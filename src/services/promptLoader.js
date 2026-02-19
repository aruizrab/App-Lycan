/**
 * Prompt Loader
 *
 * Loads markdown prompt files from public/prompts/ and injects dynamic context.
 * Used by AiStreamingChat to build system prompts.
 */

const PROMPT_CACHE = new Map()

/**
 * Fetch a markdown prompt file from public/prompts/.
 * Results are cached in memory for the session.
 * @param {string} filename - e.g. 'general.md', 'analyze-command.md'
 * @returns {Promise<string>} The prompt text
 */
export const loadPrompt = async (filename) => {
    if (PROMPT_CACHE.has(filename)) {
        return PROMPT_CACHE.get(filename)
    }

    try {
        const url = `${import.meta.env.BASE_URL}prompts/${filename}`
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Failed to load prompt: ${filename} (${response.status})`)
        }
        const text = await response.text()
        PROMPT_CACHE.set(filename, text)
        return text
    } catch (error) {
        console.error(`[promptLoader] Error loading ${filename}:`, error)
        throw error
    }
}

/**
 * Load the general system prompt (static instructions only).
 * App context is now injected ephemerally, not in the system prompt.
 * @returns {Promise<string>} General prompt without app context
 */
export const loadGeneralPrompt = async () => {
    const template = await loadPrompt('general.md')
    // Remove the dynamic context section - it will be injected ephemerally
    return template.replace('{{APP_CONTEXT}}', '(Context injected dynamically per message)')
}

/**
 * Load a command-specific prompt and combine with the general prompt.
 * @param {string} commandPromptFile - e.g. 'commands/analyze.md' or legacy 'analyze-command.md'
 * @returns {Promise<string>} Combined system prompt (static only)
 */
export const loadCommandPrompt = async (commandPromptFile) => {
    const [generalPrompt, commandPrompt] = await Promise.all([
        loadGeneralPrompt(),
        loadPrompt(commandPromptFile)
    ])

    return `${generalPrompt}\n\n---\n\n${commandPrompt}`
}

/**
 * Load an agent-specific prompt from public/prompts/agents/.
 * @param {string} agentPromptFile - e.g. 'agents/job-analysis.md'
 * @returns {Promise<string>} The agent prompt text
 */
export const loadAgentPrompt = async (agentPromptFile) => {
    return loadPrompt(agentPromptFile)
}

/**
 * Clear the prompt cache (useful during development).
 */
export const clearPromptCache = () => {
    PROMPT_CACHE.clear()
}

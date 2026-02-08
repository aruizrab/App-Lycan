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
 * Load the general system prompt and inject app context JSON.
 * @param {string} appContextJson - JSON string of app context
 * @returns {Promise<string>} Rendered general prompt
 */
export const loadGeneralPrompt = async (appContextJson) => {
    const template = await loadPrompt('general.md')
    return template.replace('{{APP_CONTEXT}}', appContextJson)
}

/**
 * Load a command-specific prompt and combine with the general prompt.
 * @param {string} commandPromptFile - e.g. 'analyze-command.md'
 * @param {string} appContextJson - JSON string of app context
 * @returns {Promise<string>} Combined system prompt
 */
export const loadCommandPrompt = async (commandPromptFile, appContextJson) => {
    const [generalPrompt, commandPrompt] = await Promise.all([
        loadGeneralPrompt(appContextJson),
        loadPrompt(commandPromptFile)
    ])

    return `${generalPrompt}\n\n---\n\n${commandPrompt}`
}

/**
 * Clear the prompt cache (useful during development).
 */
export const clearPromptCache = () => {
    PROMPT_CACHE.clear()
}

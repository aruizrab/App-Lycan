import { OpenRouter } from '@openrouter/sdk'

/**
 * Providers that support native web search according to OpenRouter docs
 * https://openrouter.ai/docs/guides/features/plugins/web-search
 */
const WEB_SEARCH_PROVIDERS = ['anthropic', 'openai', 'perplexity', 'x-ai']

/**
 * Legacy hardcoded models - kept for fallback if API fetch fails
 * @deprecated Use fetchAvailableModels() instead
 */
export const WEB_SEARCH_MODELS = [
    { id: 'perplexity/sonar-pro', name: 'Perplexity Sonar Pro', webSearchCompatible: true },
    { id: 'perplexity/sonar', name: 'Perplexity Sonar', webSearchCompatible: true },
    { id: 'perplexity/sonar-reasoning', name: 'Perplexity Sonar Reasoning', webSearchCompatible: true },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (Search)', webSearchCompatible: true },
    { id: 'google/gemini-2.5-pro-preview-03-25', name: 'Gemini 2.5 Pro (Search)', webSearchCompatible: true }
]

/**
 * @deprecated Use fetchAvailableModels() instead
 */
export const RECOMMENDED_MODELS = [
    { id: 'openai/gpt-4o', name: 'GPT-4o', webSearchCompatible: false },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', webSearchCompatible: false },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', webSearchCompatible: false },
    { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', webSearchCompatible: false },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', webSearchCompatible: false },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', webSearchCompatible: false },
    ...WEB_SEARCH_MODELS
]

/**
 * Determine if a model supports web search based on its provider
 */
export const determineWebSearchCapability = (modelId) => {
    const provider = modelId.split('/')[0]?.toLowerCase()
    return WEB_SEARCH_PROVIDERS.includes(provider)
}

/**
 * Fetch available models from OpenRouter API
 * @param {string} apiKey - OpenRouter API key
 * @returns {Promise<Array>} Array of model objects with { id, name, webSearchCompatible, provider, contextLength, pricing }
 */
export const fetchAvailableModels = async (apiKey) => {
    try {
        if (!apiKey) {
            throw new Error('API key is required to fetch models')
        }

        const client = createClient(apiKey)
        const response = await client.models.list()

        if (!response || !response.data) {
            throw new Error('Invalid response from OpenRouter API')
        }

        // Transform API response to our model format
        return response.data.map(model => {
            const provider = model.id.split('/')[0]
            return {
                id: model.id,
                name: model.name,
                webSearchCompatible: determineWebSearchCapability(model.id),
                provider: provider,
                contextLength: model.contextLength || 0,
                pricing: {
                    prompt: parseFloat(model.pricing?.prompt || 0),
                    completion: parseFloat(model.pricing?.completion || 0)
                }
            }
        })
    } catch (error) {
        console.error('Failed to fetch models from OpenRouter:', error)
        throw error
    }
}

/**
 * Check if a model supports web search
 */
export const isWebSearchCompatible = (modelId, availableModels = [], customModels = []) => {
    // Check in available models first
    const model = availableModels.find(m => m.id === modelId)
    if (model) {
        return model.webSearchCompatible || false
    }

    // Check in custom models
    const customModel = customModels.find(m => m.id === modelId)
    if (customModel) {
        return customModel.webSearchCompatible || false
    }

    // Fallback: determine by provider
    return determineWebSearchCapability(modelId)
}

/**
 * Create OpenRouter client instance
 */
const createClient = (apiKey) => {
    if (!apiKey) {
        throw new Error('OpenRouter API Key is missing. Please configure it in settings.')
    }

    return new OpenRouter({
        apiKey,
        defaultHeaders: {
            'HTTP-Referer': window.location.origin,
            'X-Title': 'App-Lycan'
        }
    })
}

/**
 * Perform AI action with streaming support
 * Returns an async generator that yields chunks of content
 */
export async function* streamAiResponse(apiKey, model, messages, options = {}) {
    const client = createClient(apiKey)

    const payload = {
        model,
        messages,
        stream: true,
        ...options
    }

    try {
        const stream = await client.chat.completions.create(payload)

        for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content
            if (content) {
                yield { type: 'content', content }
            }

            // Check for finish reason
            if (chunk.choices?.[0]?.finish_reason) {
                yield { type: 'done', finishReason: chunk.choices[0].finish_reason }
            }
        }
    } catch (error) {
        console.error('AI Streaming Error:', error)
        yield { type: 'error', error: error.message || 'Unknown streaming error' }
        throw error
    }
}

/**
 * Perform AI action without streaming (for JSON responses)
 */
export const performAiAction = async (apiKey, model, messages, options = {}) => {
    const client = createClient(apiKey)

    const payload = {
        model,
        messages,
        ...options
    }

    try {
        const response = await client.chat.completions.create(payload)
        return response.choices[0].message.content
    } catch (error) {
        console.error('AI Service Error:', error)
        throw error
    }
}

/**
 * Perform AI action expecting JSON response with schema enforcement
 */
export const performAiActionWithJson = async (apiKey, model, messages, jsonSchema = null) => {
    const client = createClient(apiKey)

    const payload = {
        model,
        messages,
        response_format: jsonSchema
            ? { type: 'json_schema', json_schema: jsonSchema }
            : { type: 'json_object' }
    }

    try {
        const response = await client.chat.completions.create(payload)
        const content = response.choices[0].message.content

        try {
            return JSON.parse(content)
        } catch (e) {
            console.error('Failed to parse AI response', content)
            throw new Error('AI response was not valid JSON')
        }
    } catch (error) {
        console.error('AI Service Error:', error)
        throw error
    }
}

/**
 * Legacy function for backward compatibility with existing CV editing
 */
export const performCvAiAction = async (apiKey, model, cvData, userPrompt, systemInstructions) => {
    const messages = [
        { role: 'system', content: systemInstructions },
        {
            role: 'user',
            content: JSON.stringify({ cvData, userPrompt })
        }
    ]

    return performAiActionWithJson(apiKey, model, messages)
}

/**
 * Stream AI response and collect full text
 * Useful when you want streaming UI but also need the complete response
 */
export const streamAndCollect = async (apiKey, model, messages, onChunk, options = {}) => {
    let fullContent = ''

    for await (const chunk of streamAiResponse(apiKey, model, messages, options)) {
        if (chunk.type === 'content') {
            fullContent += chunk.content
            if (onChunk) {
                onChunk(chunk.content, fullContent)
            }
        } else if (chunk.type === 'error') {
            throw new Error(chunk.error)
        }
    }

    return fullContent
}

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
  {
    id: 'perplexity/sonar-reasoning',
    name: 'Perplexity Sonar Reasoning',
    webSearchCompatible: true
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash (Search)',
    webSearchCompatible: true
  },
  {
    id: 'google/gemini-2.5-pro-preview-03-25',
    name: 'Gemini 2.5 Pro (Search)',
    webSearchCompatible: true
  }
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
 * @returns {Promise<Array>} Array of model objects with { id, name, webSearchCompatible, provider, contextLength, pricing, architecture, description }
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
    return response.data
      .filter((model) => {
        // Only include models that support text input AND text output
        const inputModalities =
          model.architecture?.input_modalities || model.architecture?.inputModalities || []
        const outputModalities =
          model.architecture?.output_modalities || model.architecture?.outputModalities || []
        return inputModalities.includes('text') && outputModalities.includes('text')
      })
      .map((model) => {
        const provider = model.id.split('/')[0]
        return {
          id: model.id,
          name: model.name,
          webSearchCompatible: determineWebSearchCapability(model.id),
          provider: provider,
          contextLength: model.contextLength || model.context_length || 0,
          pricing: {
            prompt: parseFloat(model.pricing?.prompt || 0),
            completion: parseFloat(model.pricing?.completion || 0)
          },
          description: model.description || '',
          architecture: {
            inputModalities:
              model.architecture?.input_modalities || model.architecture?.inputModalities || [],
            outputModalities:
              model.architecture?.output_modalities || model.architecture?.outputModalities || []
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
  const model = availableModels.find((m) => m.id === modelId)
  if (model) {
    return model.webSearchCompatible || false
  }

  // Check in custom models
  const customModel = customModels.find((m) => m.id === modelId)
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
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('OpenRouter API Key is missing or invalid. Please configure it in settings.')
  }

  try {
    const client = new OpenRouter({
      apiKey: apiKey.trim(),
      defaultHeaders: {
        'HTTP-Referer': window.location.origin,
        'X-Title': 'App-Lycan'
      }
    })

    console.log('[createClient] OpenRouter client created successfully')
    return client
  } catch (error) {
    console.error('[createClient] Error creating OpenRouter client:', error)
    throw new Error(`Failed to initialize OpenRouter: ${error.message}`)
  }
}

/**
 * Perform AI action with streaming support
 * Returns an async generator that yields chunks of content
 */
export async function* streamAiResponse(apiKey, model, messages, options = {}) {
  // Validate inputs before creating client
  if (!apiKey) {
    const errorMsg = 'OpenRouter API key is not configured. Please set it in settings.'
    console.error('AI Streaming Error:', errorMsg)
    yield { type: 'error', error: errorMsg }
    throw new Error(errorMsg)
  }

  if (!model) {
    const errorMsg = 'Model is not specified. Please select a model in settings.'
    console.error('AI Streaming Error:', errorMsg)
    yield { type: 'error', error: errorMsg }
    throw new Error(errorMsg)
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    const errorMsg = 'Messages array is required and must not be empty.'
    console.error('AI Streaming Error:', errorMsg)
    yield { type: 'error', error: errorMsg }
    throw new Error(errorMsg)
  }

  try {
    const client = createClient(apiKey)

    const payload = {
      model,
      messages,
      stream: true,
      ...options
    }

    // Log web search plugin usage
    if (payload.plugins?.some((p) => p.id === 'web')) {
      console.log('[streamAiResponse] Web search plugin enabled for model:', model)
    }

    const stream = await client.chat.send(payload)

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content
      if (content) {
        yield { type: 'content', content }
      }

      // Check for annotations (web search results)
      const annotations = chunk.choices?.[0]?.message?.annotations
      if (annotations && annotations.length > 0) {
        console.log('[streamAiResponse] Received web search annotations:', annotations.length)
        yield { type: 'annotations', annotations }
      }

      // Check for finish reason
      if (chunk.choices?.[0]?.finish_reason) {
        yield { type: 'done', finishReason: chunk.choices[0].finish_reason }
      }
    }
  } catch (error) {
    console.error('AI Streaming Error:', error)
    const errorMessage = error.message || 'Unknown streaming error'
    yield { type: 'error', error: errorMessage }
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
    const response = await client.chat.send(payload)
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
    const response = await client.chat.send(payload)
    const content = response.choices[0].message.content

    try {
      return JSON.parse(content)
    } catch {
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

/**
 * Enhanced streaming with tool call support
 * Returns an async generator that yields content, tool calls, and completion events
 *
 * @param {string} apiKey - OpenRouter API key
 * @param {string} model - Model ID
 * @param {Array} messages - Chat messages
 * @param {Object} options - Options including tools, plugins, etc.
 */
export async function* streamWithTools(apiKey, model, messages, options = {}) {
  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured. Please set it in settings.')
  }
  if (!model) {
    throw new Error('Model is not specified. Please select a model in settings.')
  }

  const client = createClient(apiKey)

  // Extract custom options that shouldn't be sent to API
  const { enableWebSearch, ...apiOptions } = options

  // If web search is enabled, append :online to model name
  const effectiveModel = enableWebSearch && !model.includes(':online') ? `${model}:online` : model

  const payload = {
    model: effectiveModel,
    messages,
    stream: true,
    ...apiOptions
  }

  // Log the complete payload being sent to OpenRouter
  console.log('[streamWithTools] Complete API payload:', {
    model: payload.model,
    messagesCount: payload.messages?.length,
    lastUserMessage: payload.messages
      ?.findLast((m) => m.role === 'user')
      ?.content?.substring(0, 200),
    webSearchEnabled: enableWebSearch,
    modelHasOnlineSuffix: effectiveModel.includes(':online'),
    stream: payload.stream,
    tools: payload.tools ? `${payload.tools.length} tools` : 'none'
  })

  try {
    const stream = await client.chat.send(payload)

    let currentToolCalls = []
    let toolCallBuffers = new Map() // Buffer for streaming tool call arguments

    for await (const chunk of stream) {
      // Capture usage data (typically present in the final chunk)
      const usage = chunk.usage
      if (usage) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: usage.prompt_tokens ?? usage.promptTokens ?? 0,
            completionTokens: usage.completion_tokens ?? usage.completionTokens ?? 0,
            totalTokens: usage.total_tokens ?? usage.totalTokens ?? 0
          }
        }
      }

      const choice = chunk.choices?.[0]
      if (!choice) {
        continue
      }

      const delta = choice.delta

      // Handle content and reasoning separately
      // Reasoning models (o1, o3, gpt-5) have both 'content' (user-facing) and 'reasoning' (internal thinking)
      if (delta?.content) {
        yield { type: 'content', content: delta.content }
      }
      if (delta?.reasoning) {
        yield { type: 'reasoning', content: delta.reasoning }
      }

      // Handle tool calls (streamed incrementally)
      // Check both tool_calls and toolCalls (SDK inconsistency)
      const toolCallsData = delta?.tool_calls || delta?.toolCalls
      if (toolCallsData) {
        for (const toolCallDelta of toolCallsData) {
          const index = toolCallDelta.index

          if (!toolCallBuffers.has(index)) {
            toolCallBuffers.set(index, {
              id: toolCallDelta.id || '',
              type: 'function',
              function: {
                name: toolCallDelta.function?.name || '',
                arguments: ''
              }
            })
          }

          const buffer = toolCallBuffers.get(index)

          if (toolCallDelta.id) {
            buffer.id = toolCallDelta.id
          }
          if (toolCallDelta.function?.name) {
            buffer.function.name = toolCallDelta.function.name
          }
          if (toolCallDelta.function?.arguments) {
            buffer.function.arguments += toolCallDelta.function.arguments
          }
        }
      }

      // Check for finish reason (check both snake_case and camelCase)
      const finishReason = choice.finish_reason || choice.finishReason
      if (finishReason) {
        if (finishReason === 'tool_calls') {
          // Collect completed tool calls
          currentToolCalls = Array.from(toolCallBuffers.values())
          yield { type: 'tool_calls', toolCalls: currentToolCalls }
        }
        yield { type: 'done', finishReason: finishReason }
      }
    }
  } catch (error) {
    console.error('AI Streaming Error:', error)
    yield { type: 'error', error: error.message || 'Unknown streaming error' }
    throw error
  }
}

/**
 * Chat completion with automatic tool call handling
 * Handles the tool call loop automatically
 *
 * @param {string} apiKey - OpenRouter API key
 * @param {string} model - Model ID
 * @param {Array} messages - Initial messages
 * @param {Object} options - Options
 * @param {Function} options.onContent - Callback for content chunks
 * @param {Function} options.onToolCall - Callback when tool is called
 * @param {Function} options.onRoundComplete - Callback after each assistant turn completes (before tool execution)
 * @param {Function} options.executeToolCall - Function to execute tool calls
 * @param {number} options.maxToolRounds - Max tool call rounds (default 5)
 */
export const chatWithTools = async (apiKey, model, messages, options = {}) => {
  const {
    onContent,
    onReasoning,
    onToolCall: _onToolCall,
    onRoundComplete,
    onUsage,
    executeToolCall,
    maxToolRounds = 5,
    ...streamOptions
  } = options

  let conversationMessages = [...messages]
  let userFacingContent = '' // Only actual content for the user
  let reasoningContent = '' // Internal reasoning (for o1/o3 models)
  let toolRounds = 0

  while (toolRounds < maxToolRounds) {
    let roundContent = ''
    let roundReasoning = ''
    let toolCalls = null
    let finishReason = null

    // Stream the response
    for await (const chunk of streamWithTools(apiKey, model, conversationMessages, streamOptions)) {
      switch (chunk.type) {
        case 'content':
          roundContent += chunk.content
          if (onContent) onContent(chunk.content, roundContent)
          break
        case 'reasoning':
          roundReasoning += chunk.content
          if (onReasoning) onReasoning(chunk.content, roundReasoning)
          break
        case 'tool_calls':
          toolCalls = chunk.toolCalls
          break
        case 'usage':
          if (onUsage) onUsage(chunk.usage)
          break
        case 'done':
          finishReason = chunk.finishReason
          break
        case 'error':
          throw new Error(chunk.error)
      }
    }

    userFacingContent += roundContent
    reasoningContent += roundReasoning

    // After each assistant turn, notify via callback
    if (onRoundComplete && (roundContent || roundReasoning || toolCalls)) {
      onRoundComplete({
        content: roundContent,
        reasoning: roundReasoning,
        toolCalls: toolCalls,
        isLastRound: finishReason !== 'tool_calls' || !toolCalls || !executeToolCall
      })
    }

    // If no tool calls, we're done
    if (finishReason !== 'tool_calls' || !toolCalls || !executeToolCall) {
      break
    }

    // Execute tool calls
    toolRounds++

    // Add assistant message with tool calls (OpenRouter SDK expects camelCase)
    conversationMessages.push({
      role: 'assistant',
      content: roundContent || null,
      toolCalls: toolCalls
    })

    // Execute each tool and add results
    for (const toolCall of toolCalls) {
      try {
        // Create per-tool-call onProgress callback if the caller supports it
        const onProgress = options.onToolProgress
          ? (chunk, accumulated) => options.onToolProgress(toolCall.id, chunk, accumulated)
          : undefined
        const result = await executeToolCall(toolCall, onProgress)
        conversationMessages.push({
          role: 'tool',
          toolCallId: toolCall.id, // OpenRouter SDK expects camelCase
          content: JSON.stringify(result)
        })
      } catch (error) {
        conversationMessages.push({
          role: 'tool',
          toolCallId: toolCall.id, // OpenRouter SDK expects camelCase
          content: JSON.stringify({ error: error.message })
        })
      }
    }
  }

  return {
    content: userFacingContent,
    reasoning: reasoningContent,
    messages: conversationMessages,
    toolRounds
  }
}

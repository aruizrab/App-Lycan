<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  Loader2,
  Send,
  ChevronDown,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Monitor,
  X,
  Plus,
  Trash2,
  Settings,
  Wrench,
  Brain,
  BookOpen
} from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'
import { useSettingsStore } from '../stores/settings'
import { useSettingsModal } from '../composables/useSettingsModal'
import { useMarkdown } from '../composables/useMarkdown'
import { chatWithTools, determineWebSearchCapability } from '../services/ai'
import { AI_COMMANDS, parseCommand, getAllCommands } from '../services/aiCommands'
import {
  getToolsForCommand,
  executeToolCall,
  setupToolHandlers,
  TOOL_DISPLAY_NAMES
} from '../services/aiToolkit'
import { loadGeneralPrompt, loadCommandPrompt } from '../services/promptLoader'
import { useAppContext } from '../composables/useAppContext'
import {
  estimateTokens,
  estimateMessagesTokens,
  shouldSummarize,
  getContextPercentage,
  getContextSeverity,
  formatTokenCount,
  summarizeOldMessages,
  applyConversationSummary
} from '../services/contextManager'

const props = defineProps({
  /** Current context (e.g., CV data, Cover Letter data) */
  contextData: {
    type: Object,
    default: () => ({})
  },
  /** Context type for the AI */
  contextType: {
    type: String,
    default: null,
    validator: (v) => [null, 'cv', 'cover-letter'].includes(v)
  },
  /** Document ID being edited (for context) */
  documentId: {
    type: String,
    default: null
  },
  /** Show close button */
  showClose: {
    type: Boolean,
    default: false
  },
  /** Show the built-in header row */
  showHeader: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['apply-changes', 'tool-executed', 'close'])

const chatStore = useChatStore()
const settingsStore = useSettingsStore()
const { openSettingsModal } = useSettingsModal()
const { renderMarkdown } = useMarkdown()
const route = useRoute()
const router = useRouter()
const { appContextJson } = useAppContext()

// Local state
const userInput = ref('')
const showCommandMenu = ref(false)
const commandMenuIndex = ref(0)
const messagesContainer = ref(null)
const showSessionList = ref(false)
const toolsInitialized = ref(false)
const expandedReasoning = ref(new Set()) // Track which messages have expanded reasoning
const expandedToolCalls = ref(new Set()) // Track which tool calls have expanded parameters
const modelSearchQuery = ref('')
const showModelDropdown = ref(false)

// ── Streaming animation ────────────────────────────────────────────────────
// Characters from the API buffer here before being drained at a fixed rate.
const _streamQueue = ref('')
// Characters actually shown on screen (fed by the drain timer).
const _streamDisplayed = ref('')
// Word-level chunks for the blur-in animation.
const streamChunks = ref([]) // { text: string, id: number, isNew: boolean }
let _drainTimerId = null
let _chunkIdSeq = 0
let _prevDisplayLen = 0
const DRAIN_CHARS = 4 // chars per tick  (~250 chars/s at 16 ms/tick)
const DRAIN_TICK = 16 // ms
const CHUNK_ANIM = 300 // ms the blur-in animation lasts

// Initialize tool handlers once
onMounted(() => {
  if (!toolsInitialized.value) {
    setupToolHandlers(router, route)
    toolsInitialized.value = true
  }
  if (props.contextType || props.documentId) {
    chatStore.updateContext({
      type: props.contextType,
      documentId: props.documentId
    })
  }

  // Start the character-drip drain loop
  _drainTimerId = setInterval(() => {
    if (!_streamQueue.value.length) return
    const take = _streamQueue.value.slice(0, DRAIN_CHARS)
    _streamQueue.value = _streamQueue.value.slice(DRAIN_CHARS)
    _streamDisplayed.value += take
  }, DRAIN_TICK)
})

onUnmounted(() => {
  clearInterval(_drainTimerId)
})

// Computed
const messages = computed(() => chatStore.messages)
const isLoading = computed(() => chatStore.isStreaming)
const streamingContent = computed(() => chatStore.streamingContent)
const streamingReasoning = computed(() => chatStore.streamingReasoning)
const streamingToolCalls = computed(() => chatStore.streamingToolCalls)
const streamingToolOutputs = computed(() => chatStore.streamingToolOutputs)
const currentSession = computed(() => chatStore.currentSession)
const sessions = computed(() => chatStore.sessions)

const availableCommands = computed(() => getAllCommands())

const normalizeModelId = (modelId) => {
  if (typeof modelId !== 'string') return ''
  return modelId.endsWith(':online') ? modelId.slice(0, -7) : modelId
}

const allModels = computed(() => {
  const mergedModels = [...settingsStore.availableModels, ...settingsStore.customModels]
  const byId = new Map()

  for (const model of mergedModels) {
    if (!model?.id || byId.has(model.id)) continue
    byId.set(model.id, model)
  }

  return Array.from(byId.values())
})

const availableModelIds = computed(() => new Set(allModels.value.map((model) => model.id)))

const fallbackModelId = computed(() => {
  return normalizeModelId(settingsStore.openRouterModel) || 'openai/gpt-4o-mini'
})

const currentSessionModelId = computed(() => {
  return chatStore.getCurrentSessionModel(
    fallbackModelId.value,
    Array.from(availableModelIds.value)
  )
})

const canSwitchModel = computed(() => {
  return messages.value.length === 0 && !isBusy.value
})

const modelSwitchLockReason = computed(() => {
  if (messages.value.length > 0) {
    return 'Model can only be changed before the first message in this chat.'
  }
  if (isBusy.value) {
    return 'Please wait for the current AI task to finish.'
  }
  return 'Change model for this chat'
})

const filteredCommands = computed(() => {
  if (!userInput.value.startsWith('/')) return []
  const query = userInput.value.slice(1).toLowerCase()
  if (!query) return availableCommands.value
  return availableCommands.value.filter(
    (c) => c.id.toLowerCase().includes(query) || c.name.toLowerCase().includes(query)
  )
})

const currentModel = computed(() => {
  const modelId = currentSessionModelId.value
  const model = allModels.value.find((m) => m.id === modelId)
  return model?.name || modelId?.split('/').pop() || 'Not configured'
})

const filteredModels = computed(() => {
  if (!modelSearchQuery.value) return allModels.value
  const query = modelSearchQuery.value.toLowerCase()
  return allModels.value.filter(
    (m) => m.name?.toLowerCase().includes(query) || m.id?.toLowerCase().includes(query)
  )
})

// Context window tracking
const isSummarizing = computed(() => chatStore.isSummarizing)
const isBusy = computed(() => isLoading.value || isSummarizing.value)

const modelContextLength = computed(() => {
  const model = allModels.value.find((m) => m.id === currentSessionModelId.value)
  return model?.contextLength || 0
})

const currentTokenCount = computed(() => {
  // Prefer actual API usage data if available
  if (chatStore.tokenUsage?.totalTokens) {
    return chatStore.tokenUsage.totalTokens
  }
  // Fall back to char-based estimation from messages
  if (messages.value.length === 0) return 0
  return estimateMessagesTokens(
    messages.value
      .filter((m) => m.role !== 'error')
      .map((m) => ({ role: m.role, content: m.content || '' }))
  )
})

const contextPercentage = computed(() => {
  return getContextPercentage(currentTokenCount.value, modelContextLength.value)
})

const contextSeverity = computed(() => {
  return getContextSeverity(contextPercentage.value)
})

const contextColorClass = computed(() => {
  switch (contextSeverity.value) {
    case 'red':
      return 'text-red-500'
    case 'yellow':
      return 'text-amber-500'
    default:
      return 'text-green-500'
  }
})

// Methods
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Helper to check if message is tool-only (no content, only tool calls)
const isToolOnlyMessage = (msg) => {
  return (
    msg.role === 'assistant' &&
    msg.toolCalls &&
    msg.toolCalls.length > 0 &&
    !msg.content &&
    !msg.reasoning
  )
}

// Get spacing class for message based on previous message
const getMessageSpacing = (idx) => {
  if (idx === 0) return 'mt-0'
  const currentMsg = messages.value[idx]
  const prevMsg = messages.value[idx - 1]

  // If both current and previous are tool-only messages, use minimal spacing
  if (isToolOnlyMessage(currentMsg) && isToolOnlyMessage(prevMsg)) {
    return 'mt-1'
  }

  // Otherwise use normal spacing
  return 'mt-4'
}

// Watchers
watch(userInput, (val) => {
  showCommandMenu.value = val.startsWith('/')
  if (showCommandMenu.value) {
    commandMenuIndex.value = 0
  }
})

watch(() => messages.value.length, scrollToBottom)
watch(streamingContent, scrollToBottom)

// Feed new API tokens into the drip queue
watch(streamingContent, (next, prev) => {
  const prevStr = prev || ''
  if (!next) {
    // Stream reset — flush & clear immediately
    _streamQueue.value = ''
    _streamDisplayed.value = ''
    streamChunks.value = []
    _prevDisplayLen = 0
    return
  }
  if (next.length > prevStr.length) {
    _streamQueue.value += next.slice(prevStr.length)
  }
})

// Convert newly dripped characters → animated word chunks
watch(_streamDisplayed, (next) => {
  const newText = next.slice(_prevDisplayLen)
  _prevDisplayLen = next.length
  if (!newText) return

  // Split on word boundaries so each token blurs in as a unit
  const tokens = newText.match(/\S+|\s+/g) || [newText]
  for (const token of tokens) {
    const id = _chunkIdSeq++
    streamChunks.value.push({ text: token, id, isNew: true })
    setTimeout(() => {
      const i = streamChunks.value.findIndex((c) => c.id === id)
      if (i !== -1) streamChunks.value[i] = { ...streamChunks.value[i], isNew: false }
    }, CHUNK_ANIM)
  }

  // Prevent unbounded growth on very long responses
  if (streamChunks.value.length > 1000) {
    streamChunks.value.splice(0, 400)
  }
})

// When streaming ends, flush the remaining queue then clean up
watch(isLoading, (loading) => {
  if (!loading) {
    _streamDisplayed.value += _streamQueue.value
    _streamQueue.value = ''
    // streamChunks are still visible (animating); the v-if="isLoading" wrapper
    // hides them once streaming is done, so we just need a quiet reset.
    setTimeout(() => {
      streamChunks.value = []
      _streamDisplayed.value = ''
      _prevDisplayLen = 0
    }, CHUNK_ANIM + 80)
  }
})

const selectCommand = (cmd) => {
  userInput.value = `/${cmd.id} `
  showCommandMenu.value = false
}

const handleKeydown = (e) => {
  // Command menu navigation
  if (showCommandMenu.value && filteredCommands.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      commandMenuIndex.value = (commandMenuIndex.value + 1) % filteredCommands.value.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      commandMenuIndex.value =
        (commandMenuIndex.value - 1 + filteredCommands.value.length) % filteredCommands.value.length
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      selectCommand(filteredCommands.value[commandMenuIndex.value])
      return
    } else if (e.key === 'Escape') {
      showCommandMenu.value = false
      return
    }
    return
  }

  // Send on Enter (without Shift)
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

/**
 * Build the system prompt for the current request.
 * - Always includes the general prompt (static instructions only).
 * - If a command is active, also appends the command-specific prompt.
 * - App context is now injected ephemerally, not in system prompt.
 */
const buildSystemPrompt = async (commandId = null) => {
  // No longer pass context to prompt - it will be injected ephemerally
  if (commandId && AI_COMMANDS[commandId]?.promptFile) {
    return loadCommandPrompt(AI_COMMANDS[commandId].promptFile)
  }

  return loadGeneralPrompt()
}

const handleSend = async () => {
  const text = userInput.value.trim()
  if (!text || isBusy.value) return

  // Parse for commands
  const { commandId, content } = parseCommand(text)

  // Ensure we have a session
  chatStore.ensureSession({
    context: {
      type: props.contextType,
      documentId: props.documentId
    },
    model: settingsStore.openRouterModel
  })

  // Determine user message text
  const cmd = commandId ? AI_COMMANDS[commandId] : null
  const displayText = cmd ? cmd.buildUserMessage(content) : text

  // Add user message immediately
  chatStore.addMessage({
    role: 'user',
    content: displayText,
    metadata: { commandId }
  })

  userInput.value = ''

  // ── Pre-send context check: summarize if nearing limit ──
  const threshold = settingsStore.contextThreshold
  const ctxLength = modelContextLength.value
  const newMsgTokens = estimateTokens(displayText)

  if (
    ctxLength > 0 &&
    messages.value.length > 4 &&
    shouldSummarize({
      currentTokens: currentTokenCount.value,
      contextLength: ctxLength,
      threshold,
      newMessageTokens: newMsgTokens
    })
  ) {
    try {
      chatStore.startSummarizing()
      const { summary, removedCount } = await summarizeOldMessages({
        messages: messages.value,
        apiKey: settingsStore.openRouterKey,
        model: settingsStore.summaryModel || 'openai/gpt-4o-mini',
        keepCount: 4
      })
      if (summary && removedCount > 0) {
        applyConversationSummary(chatStore.currentSession.messages, summary, removedCount)
        // Reset token usage since the conversation changed shape
        chatStore.updateTokenUsage(null)
      }
    } catch (err) {
      console.warn('[AiStreamingChat] Summarization failed, continuing without trim:', err)
    } finally {
      chatStore.finishSummarizing()
    }
  }

  // Start streaming
  chatStore.startStreaming()

  try {
    const apiKey = settingsStore.openRouterKey
    const sessionModel = chatStore.getCurrentSessionModel(
      settingsStore.openRouterModel,
      Array.from(availableModelIds.value)
    )
    const model =
      commandId && cmd?.commandType ? settingsStore.getModelForTask(cmd.commandType) : sessionModel

    if (!apiKey) {
      throw new Error('OpenRouter API key is not configured. Please set it in Settings.')
    }
    if (!model) {
      throw new Error('No model selected. Please configure a model in Settings.')
    }

    // Build system prompt (async — loads from markdown files)
    const systemPrompt = await buildSystemPrompt(commandId)

    // Pass ephemeral context that will be injected before last user message
    // This gives maximum attention weight and stays fresh as user navigates
    const apiMessages = chatStore.getApiMessages(systemPrompt, appContextJson.value)

    // Append :online to model name if it supports web search (OpenRouter native search)
    let finalModel = model
    if (determineWebSearchCapability(model) && !model.endsWith(':online')) {
      finalModel = `${model}:online`
    }

    // Get appropriate tools
    const tools = getToolsForCommand(commandId)

    console.log('[AiStreamingChat] Sending request:', {
      commandId,
      model: finalModel,
      webSearchEnabled: determineWebSearchCapability(model),
      toolCount: tools.length
    })

    // Stream the response with tool support
    await chatWithTools(apiKey, finalModel, apiMessages, {
      tools,
      tool_choice: 'auto',
      onContent: (chunk, accumulated) => {
        chatStore.updateStreamingContent(accumulated)
      },
      onReasoning: (chunk, accumulated) => {
        chatStore.updateStreamingReasoning(accumulated)
      },
      onToolCall: (toolCall) => {
        chatStore.addStreamingToolCall(toolCall)
        emit('tool-executed', toolCall)
      },
      onUsage: (usage) => {
        chatStore.updateTokenUsage(usage)
      },
      onToolProgress: (toolCallId, chunk, accumulated) => {
        chatStore.updateToolOutput(toolCallId, chunk, accumulated)
      },
      onRoundComplete: (roundData) => {
        // Save each assistant message separately after each round
        chatStore.finishStreaming({
          content: roundData.content,
          reasoning: roundData.reasoning,
          toolCalls: roundData.toolCalls,
          metadata: {
            model: finalModel,
            commandId,
            hasWebSearch: determineWebSearchCapability(model)
          }
        })
        // If not the last round, restart streaming for next round
        if (!roundData.isLastRound) {
          chatStore.startStreaming()
        }
      },
      executeToolCall: async (toolCall) => {
        try {
          const result = await executeToolCall(toolCall)

          // Notify parent if data was modified
          if (
            result?.success &&
            (toolCall.function.name.includes('edit') ||
              toolCall.function.name.includes('create') ||
              toolCall.function.name.includes('delete'))
          ) {
            emit('apply-changes', {
              type: toolCall.function.name,
              result
            })
          }

          return result
        } catch (error) {
          console.error('Tool execution error:', error)
          return { error: error.message }
        }
      }
    })

    // Streaming already finished via onRoundComplete callback
    // No need to call finishStreaming again
  } catch (error) {
    console.error('Chat error:', error)
    chatStore.handleStreamingError(error)
  }
}

const createNewSession = () => {
  chatStore.createSession({
    context: {
      type: props.contextType,
      documentId: props.documentId
    },
    model: settingsStore.openRouterModel
  })
  showSessionList.value = false
}

const switchSession = (sessionId) => {
  chatStore.selectSession(sessionId)
  showSessionList.value = false
}

const deleteSession = (sessionId, event) => {
  event.stopPropagation()
  chatStore.deleteSession(sessionId)
}

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
}

const toggleReasoning = (msgId) => {
  if (expandedReasoning.value.has(msgId)) {
    expandedReasoning.value.delete(msgId)
  } else {
    expandedReasoning.value.add(msgId)
  }
}

const toggleToolCall = (toolCallId) => {
  if (expandedToolCalls.value.has(toolCallId)) {
    expandedToolCalls.value.delete(toolCallId)
  } else {
    expandedToolCalls.value.add(toolCallId)
  }
}

const getToolDisplayName = (toolName) => {
  return TOOL_DISPLAY_NAMES[toolName] || toolName
}

const formatToolArguments = (args) => {
  try {
    if (typeof args === 'string') {
      return JSON.stringify(JSON.parse(args), null, 2)
    }
    return JSON.stringify(args, null, 2)
  } catch {
    return args
  }
}

const selectModel = (modelId) => {
  if (!canSwitchModel.value || !modelId) return

  if (!currentSession.value) {
    chatStore.createSession({
      context: {
        type: props.contextType,
        documentId: props.documentId
      },
      model: modelId
    })
  } else {
    chatStore.setCurrentSessionModel(modelId)
  }

  showModelDropdown.value = false
  modelSearchQuery.value = ''
}

const handleModelSearchBlur = () => {
  // Delay to allow click on dropdown items
  setTimeout(() => {
    showModelDropdown.value = false
    modelSearchQuery.value = ''
  }, 200)
}

const closeModelDropdown = () => {
  showModelDropdown.value = false
  modelSearchQuery.value = ''
}

const toggleModelDropdown = () => {
  if (!canSwitchModel.value) return
  showModelDropdown.value = !showModelDropdown.value
  if (showModelDropdown.value) {
    modelSearchQuery.value = ''
    nextTick(() => {
      const input = document.querySelector('.model-search-input')
      if (input) input.focus()
    })
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-800">
    <!-- Overlay for model dropdown -->
    <div v-if="showModelDropdown" @click="closeModelDropdown" class="fixed inset-0 z-40" />

    <!-- Unified Header -->
    <div
      v-if="showHeader"
      class="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50"
    >
      <div class="flex items-center gap-2">
        <Sparkles :size="18" class="text-purple-500" />
        <span class="font-semibold text-gray-900 dark:text-white">Lycan AI</span>
      </div>

      <div class="flex items-center gap-1">
        <!-- Session selector (Chat History) -->
        <div class="relative">
          <button
            @click="showSessionList = !showSessionList"
            class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            title="Chat History"
          >
            <MessageSquare :size="18" />
          </button>

          <!-- Session dropdown -->
          <div
            v-if="showSessionList"
            class="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-30 overflow-hidden"
          >
            <div class="p-2 border-b dark:border-gray-700 flex justify-between items-center">
              <span class="text-xs text-gray-500">Chat History</span>
              <button
                @click="createNewSession"
                class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-purple-600"
                title="New Chat"
              >
                <Plus :size="14" />
              </button>
            </div>
            <div class="max-h-64 overflow-y-auto">
              <div v-if="sessions.length === 0" class="p-4 text-center text-gray-400 text-sm">
                No chat history
              </div>
              <div
                v-for="session in sessions"
                :key="session.id"
                @click="switchSession(session.id)"
                :class="[
                  'px-3 py-2 cursor-pointer flex items-center justify-between group',
                  session.id === currentSession?.id
                    ? 'bg-purple-50 dark:bg-purple-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                ]"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-sm truncate">{{ session.title }}</div>
                  <div class="text-xs text-gray-400">{{ formatDate(session.updatedAt) }}</div>
                </div>
                <button
                  @click="deleteSession(session.id, $event)"
                  class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500"
                  title="Delete chat"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings -->
        <button
          @click="openSettingsModal()"
          class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          title="AI Settings"
        >
          <Settings :size="18" />
        </button>

        <!-- Close button (conditionally shown) -->
        <button
          v-if="showClose"
          @click="$emit('close')"
          class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          title="Close"
        >
          <X :size="18" />
        </button>
      </div>
    </div>

    <!-- Messages Area -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto chat-messages-area">
      <!-- Empty state -->
      <div v-if="messages.length === 0 && !streamingContent" class="chat-empty">
        <div class="chat-empty-icon">
          <MessageSquare :size="22" />
        </div>
        <h3 class="chat-empty-title">How can I help you?</h3>
        <p class="chat-empty-sub">
          Ask me to analyze a job posting, improve your CV, or research a company.
        </p>
        <div class="chat-empty-chips">
          <button
            v-for="cmd in availableCommands"
            :key="cmd.id"
            class="chat-chip"
            @click="selectCommand(cmd)"
          >
            /{{ cmd.id }}
          </button>
        </div>
      </div>

      <!-- Message list -->
      <div
        v-for="(msg, idx) in messages"
        :key="msg.id || idx"
        class="msg-row"
        :class="[getMessageSpacing(idx), msg.role === 'user' ? 'msg-row--user' : 'msg-row--ai']"
      >
        <!-- Sender label -->
        <div
          v-if="
            msg.role === 'user' ||
            (msg.role === 'assistant' && !msg.metadata?.isSummary && !isToolOnlyMessage(msg))
          "
          class="msg-meta"
        >
          {{ msg.role === 'user' ? 'You' : 'Lycan' }}
        </div>

        <!-- User message -->
        <div v-if="msg.role === 'user'" class="msg-bubble msg-bubble--user">
          <div
            class="prose prose-sm dark:prose-invert max-w-none"
            v-html="renderMarkdown(msg.content)"
          ></div>
          <div v-if="msg.metadata?.commandId" class="msg-cmd-tag">
            /{{ msg.metadata.commandId }}
          </div>
        </div>

        <!-- Error message -->
        <div v-else-if="msg.role === 'error'" class="msg-bubble msg-bubble--error">
          <div
            class="prose prose-sm dark:prose-invert max-w-none"
            v-html="renderMarkdown(msg.content)"
          ></div>
        </div>

        <!-- Summary message -->
        <div v-else-if="msg.metadata?.isSummary" class="msg-card msg-card--summary">
          <button class="mc-toggle" @click="toggleReasoning(msg.id)">
            <BookOpen :size="13" />
            <span>Conversation summary</span>
            <span class="mc-count">({{ msg.metadata.summarizedCount }} messages)</span>
            <ChevronRight v-if="!expandedReasoning.has(msg.id)" :size="13" class="mc-chevron" />
            <ChevronDown v-else :size="13" class="mc-chevron" />
          </button>
          <div
            v-if="expandedReasoning.has(msg.id)"
            class="mc-body prose prose-xs dark:prose-invert max-w-none"
            v-html="renderMarkdown(msg.content)"
          ></div>
        </div>

        <!-- Regular assistant message -->
        <div v-else class="msg-ai-group">
          <!-- Reasoning -->
          <div v-if="msg.reasoning" class="msg-card msg-card--reasoning">
            <button class="mc-toggle" @click="toggleReasoning(msg.id)">
              <Brain :size="13" />
              <span>Reasoning</span>
              <ChevronRight v-if="!expandedReasoning.has(msg.id)" :size="13" class="mc-chevron" />
              <ChevronDown v-else :size="13" class="mc-chevron" />
            </button>
            <div
              v-if="expandedReasoning.has(msg.id)"
              class="mc-body prose prose-xs dark:prose-invert max-w-none"
              v-html="renderMarkdown(msg.reasoning)"
            ></div>
          </div>

          <!-- Tool calls -->
          <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="msg-tool-list">
            <div
              v-for="(toolCall, tcIdx) in msg.toolCalls"
              :key="toolCall.id || tcIdx"
              class="msg-card msg-card--tool"
            >
              <button
                class="mc-toggle"
                @click="toggleToolCall(toolCall.id || `${msg.id}-${tcIdx}`)"
              >
                <Wrench :size="12" />
                <span>{{ getToolDisplayName(toolCall.function.name) }}</span>
                <ChevronRight
                  v-if="!expandedToolCalls.has(toolCall.id || `${msg.id}-${tcIdx}`)"
                  :size="13"
                  class="mc-chevron"
                />
                <ChevronDown v-else :size="13" class="mc-chevron" />
              </button>
              <div
                v-if="expandedToolCalls.has(toolCall.id || `${msg.id}-${tcIdx}`)"
                class="mc-body"
              >
                <p class="mc-label">Parameters:</p>
                <pre class="mc-pre">{{ formatToolArguments(toolCall.function.arguments) }}</pre>
              </div>
            </div>
          </div>

          <!-- Main content -->
          <div v-if="msg.content" class="msg-bubble">
            <div
              class="prose prose-sm dark:prose-invert max-w-none"
              v-html="renderMarkdown(msg.content)"
            ></div>
          </div>
        </div>
      </div>

      <!-- Streaming message -->
      <div
        v-if="isLoading"
        class="msg-row msg-row--ai"
        :class="
          messages.length > 0 && isToolOnlyMessage(messages[messages.length - 1]) ? 'mt-2' : 'mt-4'
        "
      >
        <div class="msg-meta">Lycan</div>
        <div class="msg-ai-group">
          <!-- Streaming reasoning -->
          <div v-if="streamingReasoning" class="msg-card msg-card--reasoning">
            <div class="mc-toggle mc-toggle--static">
              <Brain :size="13" />
              <span>Reasoning…</span>
              <Loader2 :size="12" class="animate-spin mc-chevron" />
            </div>
          </div>

          <!-- Streaming tool calls -->
          <div v-if="streamingToolCalls.length > 0" class="msg-tool-list">
            <div
              v-for="(toolCall, idx) in streamingToolCalls"
              :key="toolCall.id || idx"
              class="msg-card msg-card--tool"
            >
              <button class="mc-toggle" @click="toggleToolCall(toolCall.id || `streaming-${idx}`)">
                <Wrench :size="12" />
                <span>{{ getToolDisplayName(toolCall.function.name) }}</span>
                <Loader2 :size="12" class="animate-spin mc-chevron" />
              </button>
              <div v-if="expandedToolCalls.has(toolCall.id || `streaming-${idx}`)" class="mc-body">
                <div v-if="streamingToolOutputs[toolCall.id]" class="mc-tool-output">
                  <p class="mc-label">Output:</p>
                  <div
                    class="mc-pre prose prose-sm dark:prose-invert max-w-none"
                    v-html="renderMarkdown(streamingToolOutputs[toolCall.id])"
                  ></div>
                </div>
                <p class="mc-label">Parameters:</p>
                <pre class="mc-pre">{{ formatToolArguments(toolCall.function.arguments) }}</pre>
              </div>
            </div>
          </div>

          <!-- Streaming content — animated word chunks -->
          <div v-if="streamChunks.length > 0" class="msg-bubble stream-bubble">
            <span
              v-for="chunk in streamChunks"
              :key="chunk.id"
              class="sc"
              :class="{ 'sc--new': chunk.isNew }"
              >{{ chunk.text }}</span
            >
          </div>

          <!-- Thinking dots (before first token arrives) -->
          <div
            v-if="!streamChunks.length && !streamingReasoning && streamingToolCalls.length === 0"
            class="msg-thinking"
          >
            <Loader2 :size="15" class="animate-spin" />
            <span>Thinking…</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Summarization Banner -->
    <div
      v-if="isSummarizing"
      class="px-4 py-2.5 bg-purple-50 dark:bg-purple-900/30 border-t border-b border-purple-200 dark:border-purple-800 flex items-center gap-2"
    >
      <Loader2 :size="14" class="animate-spin text-purple-600 dark:text-purple-400" />
      <span class="text-sm text-purple-700 dark:text-purple-300"
        >Summarizing conversation to free up context...</span
      >
    </div>

    <!-- Input Area -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700 relative">
      <!-- Command Menu -->
      <div
        v-if="showCommandMenu && filteredCommands.length > 0"
        class="absolute bottom-full left-4 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20"
      >
        <div
          class="p-2 text-xs text-gray-500 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
        >
          Commands
        </div>
        <ul>
          <li
            v-for="(cmd, index) in filteredCommands"
            :key="cmd.id"
            @click="selectCommand(cmd)"
            :class="[
              'px-3 py-2 text-sm cursor-pointer',
              index === commandMenuIndex
                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            ]"
          >
            <div class="flex justify-between items-center">
              <span class="font-mono">/{{ cmd.id }}</span>
              <span class="text-xs text-gray-400">{{ cmd.name }}</span>
            </div>
            <div class="text-xs text-gray-400 mt-0.5">{{ cmd.description }}</div>
          </li>
        </ul>
      </div>

      <!-- Input row -->
      <div class="flex gap-2">
        <textarea
          v-model="userInput"
          @keydown="handleKeydown"
          placeholder="Type a message or / for commands..."
          :disabled="isBusy"
          rows="1"
          class="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white disabled:opacity-50 min-h-[42px] max-h-32"
          style="field-sizing: content"
        />
        <button
          @click="handleSend"
          :disabled="!userInput.trim() || isBusy"
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors self-end h-[42px]"
        >
          <Send v-if="!isBusy" :size="18" />
          <Loader2 v-else :size="18" class="animate-spin" />
        </button>
      </div>

      <!-- Footer info -->
      <div class="mt-2 flex justify-between items-center text-xs text-gray-400">
        <div class="flex items-center gap-2 relative">
          <Monitor :size="12" />
          <!-- Model selector with search -->
          <div class="relative">
            <button
              @click="toggleModelDropdown"
              :disabled="!canSwitchModel"
              :title="modelSwitchLockReason"
              class="bg-transparent text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 max-w-44 truncate disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
            >
              {{ currentModel }}
            </button>

            <!-- Dropdown -->
            <div
              v-if="showModelDropdown"
              class="absolute bottom-full left-0 mb-1 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              <!-- Search input -->
              <div class="p-2 border-b border-gray-200 dark:border-gray-700">
                <input
                  v-model="modelSearchQuery"
                  type="text"
                  placeholder="Search models..."
                  class="model-search-input w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  @blur="handleModelSearchBlur"
                  @keydown.esc="showModelDropdown = false"
                />
              </div>

              <!-- Model list -->
              <div class="max-h-64 overflow-y-auto">
                <div
                  v-if="filteredModels.length === 0"
                  class="p-3 text-sm text-gray-500 dark:text-gray-400 text-center"
                >
                  No models found
                </div>
                <div
                  v-for="model in filteredModels"
                  :key="model.id"
                  @mousedown.prevent="selectModel(model.id)"
                  :class="[
                    'px-3 py-2 cursor-pointer text-sm',
                    model.id === currentSessionModelId
                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                  ]"
                >
                  <div class="font-medium truncate">
                    {{ model.name || model.id }}
                    <span v-if="model.webSearchCompatible" class="ml-1" title="Supports web search"
                      >🌐</span
                    >
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ model.id }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <span
            v-if="modelContextLength > 0 && messages.length > 0"
            :class="contextColorClass"
            :title="`${formatTokenCount(currentTokenCount)} / ${formatTokenCount(modelContextLength)} tokens`"
            class="ml-1 font-medium cursor-default"
          >
            · {{ contextPercentage }}%
          </span>
        </div>
        <div>Press / for commands</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Messages area ─────────────────────────────────────────── */
.chat-messages-area {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 2px;
}

/* Empty state */
.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 16px;
  gap: 8px;
}
.chat-empty-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in oklch, var(--accent) 12%, transparent);
  color: var(--accent);
  margin-bottom: 4px;
}
.chat-empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--fg-0);
  margin: 0;
}
.chat-empty-sub {
  font-size: 13px;
  color: var(--fg-2);
  max-width: 240px;
  margin: 0;
  line-height: 1.5;
}
.chat-empty-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
}
.chat-chip {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklch, var(--fg-0) 12%, transparent);
  background: color-mix(in oklch, var(--fg-0) 4%, transparent);
  color: var(--fg-2);
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}
.chat-chip:hover {
  background: color-mix(in oklch, var(--accent) 12%, transparent);
  border-color: color-mix(in oklch, var(--accent) 30%, transparent);
  color: var(--accent);
}

/* ── Message row ───────────────────────────────────────────── */
.msg-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 92%;
}
.msg-row--user {
  align-self: flex-end;
}
.msg-row--ai {
  align-self: flex-start;
  margin-right: 16px;
}

/* Sender label */
.msg-meta {
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-3);
  padding: 0 2px;
}
.msg-row--user .msg-meta {
  text-align: right;
}

/* ── Bubbles ───────────────────────────────────────────────── */
.msg-bubble {
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.55;
  background: color-mix(in oklch, var(--fg-0) 5%, transparent);
  border: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
  color: var(--fg-0);
  word-break: break-words;
}
.msg-bubble--user {
  background: linear-gradient(
    135deg,
    color-mix(in oklch, var(--accent) 28%, transparent),
    color-mix(in oklch, var(--accent-2) 28%, transparent)
  );
  border-color: color-mix(in oklch, var(--accent) 38%, transparent);
}
.msg-bubble--error {
  background: color-mix(in oklch, var(--danger) 8%, transparent);
  border-color: color-mix(in oklch, var(--danger) 20%, transparent);
  color: var(--danger);
}

.msg-cmd-tag {
  margin-top: 4px;
  font-size: 11px;
  color: color-mix(in oklch, var(--fg-0) 50%, transparent);
  font-family: var(--font-mono);
}

/* ── Assistant group ───────────────────────────────────────── */
.msg-ai-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.msg-tool-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ── Expandable cards (reasoning / tool / summary) ─────────── */
.msg-card {
  border-radius: 10px;
  border: 1px solid;
  overflow: hidden;
  font-size: 12px;
}
.msg-card--reasoning {
  border-color: color-mix(in oklch, var(--accent) 22%, transparent);
  background: color-mix(in oklch, var(--accent) 6%, transparent);
}
.msg-card--tool {
  border-color: color-mix(in oklch, var(--warn) 22%, transparent);
  background: color-mix(in oklch, var(--warn) 6%, transparent);
}
.msg-card--summary {
  border-color: color-mix(in oklch, var(--fg-0) 12%, transparent);
  background: color-mix(in oklch, var(--fg-0) 4%, transparent);
}

/* Card toggle button */
.mc-toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 8px 10px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  transition: background 0.12s;
}
.mc-toggle--static {
  cursor: default;
}
.msg-card--reasoning .mc-toggle {
  color: var(--accent);
}
.msg-card--reasoning .mc-toggle:not(.mc-toggle--static):hover {
  background: color-mix(in oklch, var(--accent) 8%, transparent);
}
.msg-card--tool .mc-toggle {
  color: var(--warn);
}
.msg-card--tool .mc-toggle:not(.mc-toggle--static):hover {
  background: color-mix(in oklch, var(--warn) 8%, transparent);
}
.msg-card--summary .mc-toggle {
  color: var(--fg-2);
}
.msg-card--summary .mc-toggle:not(.mc-toggle--static):hover {
  background: color-mix(in oklch, var(--fg-0) 4%, transparent);
}
.mc-count {
  font-size: 10px;
  opacity: 0.7;
}
.mc-chevron {
  margin-left: auto;
  flex-shrink: 0;
}

/* Card body */
.mc-body {
  padding: 8px 10px;
  border-top: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
  color: var(--fg-1);
  font-size: 12px;
  line-height: 1.5;
}
.mc-label {
  font-weight: 500;
  color: inherit;
  opacity: 0.75;
  margin: 0 0 4px;
  font-size: 11px;
}
.mc-pre {
  font-family: var(--font-mono);
  font-size: 10.5px;
  line-height: 1.5;
  background: color-mix(in oklch, var(--fg-0) 5%, transparent);
  border-radius: 6px;
  padding: 8px 10px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.mc-tool-output {
  margin-bottom: 10px;
}

/* Thinking dots */
.msg-thinking {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: var(--fg-2);
  padding: 4px 2px;
}

/* ── Streaming word-chunk animation ────────────────────────────────────────── */
.stream-bubble {
  /* inherit bubble styles; font-size / line-height already set by .msg-bubble */
  line-height: 1.65;
}

/* Each word/whitespace token */
.sc {
  display: inline;
  white-space: pre-wrap;
}

/* New tokens blur+fade into view */
@keyframes sc-in {
  from {
    opacity: 0;
    filter: blur(7px);
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
}
.sc--new {
  animation: sc-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 20px;
}

/* Markdown prose customizations */
:deep(.prose) {
  /* Reduce margins for chat context */
  --tw-prose-body: inherit;
  --tw-prose-headings: inherit;
}

:deep(.prose p) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

:deep(.prose p:first-child) {
  margin-top: 0;
}

:deep(.prose p:last-child) {
  margin-bottom: 0;
}

:deep(.prose h1),
:deep(.prose h2),
:deep(.prose h3),
:deep(.prose h4),
:deep(.prose h5),
:deep(.prose h6) {
  margin-top: 1em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

:deep(.prose h1:first-child),
:deep(.prose h2:first-child),
:deep(.prose h3:first-child),
:deep(.prose h4:first-child),
:deep(.prose h5:first-child),
:deep(.prose h6:first-child) {
  margin-top: 0;
}

:deep(.prose code) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

:deep(.dark .prose code) {
  background-color: rgba(255, 255, 255, 0.1);
}

:deep(.prose pre) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 0.75rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-top: 0.75em;
  margin-bottom: 0.75em;
}

:deep(.dark .prose pre) {
  background-color: rgba(255, 255, 255, 0.05);
}

:deep(.prose pre code) {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}

:deep(.prose a) {
  color: #7c3aed;
  text-decoration: underline;
}

:deep(.dark .prose a) {
  color: #a78bfa;
}

:deep(.prose ul),
:deep(.prose ol) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  padding-left: 1.5em;
}

:deep(.prose ul) {
  list-style-type: disc;
}

:deep(.prose ol) {
  list-style-type: decimal;
}

:deep(.prose li) {
  margin-top: 0.25em;
  margin-bottom: 0.25em;
  display: list-item;
}

:deep(.prose blockquote) {
  border-left: 3px solid #d1d5db;
  padding-left: 1em;
  font-style: italic;
  margin-top: 0.75em;
  margin-bottom: 0.75em;
}

:deep(.dark .prose blockquote) {
  border-left-color: #4b5563;
}

:deep(.prose table) {
  width: 100%;
  margin-top: 0.75em;
  margin-bottom: 0.75em;
  border-collapse: collapse;
}

:deep(.prose th),
:deep(.prose td) {
  border: 1px solid #d1d5db;
  padding: 0.5rem;
  text-align: left;
}

:deep(.dark .prose th),
:deep(.dark .prose td) {
  border-color: #4b5563;
}

:deep(.prose th) {
  background-color: rgba(0, 0, 0, 0.05);
  font-weight: 600;
}

:deep(.dark .prose th) {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import {
  Loader2,
  Send,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MessageSquare,
  Monitor,
  X,
  Plus,
  Trash2,
  Settings,
  Wrench,
  Brain,
  BookOpen,
  Pencil,
  RotateCcw,
  GitBranch,
  AlertCircle
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

// Edit / retry state
const editingMessageId = ref(null)
const editingContent = ref('')
const editTextarea = ref(null)
const hoveringMessageId = ref(null)
const providerError = ref(null) // Provider-level error to show as banner

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
const currentBranches = computed(() => chatStore.currentBranches)

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
 * Classify an error as a provider-level error (auth, rate limit, network).
 * These cannot be self-corrected by the model and should stop the conversation.
 */
const isProviderError = (error) => {
  const msg = (error?.message || '').toLowerCase()
  const status = error?.status || error?.statusCode || 0
  return (
    status === 401 ||
    status === 403 ||
    status === 429 ||
    status >= 500 ||
    msg.includes('api key') ||
    msg.includes('unauthorized') ||
    msg.includes('authentication') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('invalid key')
  )
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

/**
 * Core AI execution. Expects the user message to already be in the store.
 * Used by handleSend, handleEditSave, and handleRetry.
 */
const executeAiRequest = async (commandId = null) => {
  providerError.value = null

  // ── Pre-send context check: summarize if nearing limit ──
  const threshold = settingsStore.contextThreshold
  const ctxLength = modelContextLength.value
  const lastMsg = messages.value[messages.value.length - 1]
  const newMsgTokens = lastMsg ? estimateTokens(lastMsg.content || '') : 0

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
    const cmd = commandId ? AI_COMMANDS[commandId] : null
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
    const apiMessages = chatStore.getApiMessages(systemPrompt, appContextJson.value)

    // Append :online to model name if it supports web search
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
        if (!roundData.isLastRound) {
          chatStore.startStreaming()
        }
      },
      executeToolCall: async (toolCall) => {
        try {
          const result = await executeToolCall(toolCall)

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
  } catch (error) {
    console.error('Chat error:', error)
    chatStore.clearStreaming()
    if (isProviderError(error)) {
      providerError.value = error.message
    } else {
      chatStore.handleStreamingError(error)
    }
  }
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

  await executeAiRequest(commandId)
}

/**
 * Start editing a user message inline.
 */
const handleEditStart = (msg) => {
  editingMessageId.value = msg.id
  editingContent.value = msg.content
  nextTick(() => {
    editTextarea.value?.focus()
  })
}

/**
 * Keyboard handler for the inline edit textarea.
 * Enter (without Shift) submits; Shift+Enter inserts a newline; Escape cancels.
 */
const handleEditKeydown = (e, msg) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleEditSave(msg)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    handleEditCancel()
  }
}

/**
 * Cancel the current inline edit.
 */
const handleEditCancel = () => {
  editingMessageId.value = null
  editingContent.value = ''
}

/**
 * Save the edited message, branch the current conversation, and re-send.
 */
const handleEditSave = async (msg) => {
  const newContent = editingContent.value.trim()
  if (!newContent || isBusy.value) return

  const msgIndex = messages.value.findIndex((m) => m.id === msg.id)
  if (msgIndex === -1) return

  // Save current conversation as a branch before rewriting history
  chatStore.saveBranch()

  // Truncate from this message onward (replaces it with the edited version)
  chatStore.truncateFromMessage(msg.id)

  editingMessageId.value = null
  editingContent.value = ''

  // Add the edited message
  chatStore.addMessage({
    role: 'user',
    content: newContent,
    metadata: { commandId: msg.metadata?.commandId || null }
  })

  await executeAiRequest(msg.metadata?.commandId || null)
}

/**
 * Retry an assistant response: saves a branch, removes the AI turn, and re-sends.
 */
const handleRetry = async (assistantMsg) => {
  if (isBusy.value) return

  const msgs = messages.value
  const assistantIdx = msgs.findIndex((m) => m.id === assistantMsg.id)
  if (assistantIdx === -1) return

  // Find the preceding user message
  let userMsgIdx = assistantIdx - 1
  while (userMsgIdx >= 0 && msgs[userMsgIdx].role !== 'user') {
    userMsgIdx--
  }
  if (userMsgIdx < 0) return

  const userMsg = msgs[userMsgIdx]

  // Save current conversation as a branch
  chatStore.saveBranch()

  // Remove all AI messages for this turn (everything after the user message)
  const firstAfterUser = msgs[userMsgIdx + 1]
  if (!firstAfterUser) return
  chatStore.truncateFromMessage(firstAfterUser.id)

  await executeAiRequest(userMsg.metadata?.commandId || null)
}

/**
 * Switch to a previously saved branch.
 */
const handleSwitchBranch = (branchId) => {
  if (isBusy.value) return
  chatStore.switchBranch(branchId)
  scrollToBottom()
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
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4">
      <!-- Empty state -->
      <div
        v-if="messages.length === 0 && !streamingContent"
        class="text-center text-gray-500 dark:text-gray-400 mt-10"
      >
        <div class="mb-4 flex justify-center">
          <div class="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            <MessageSquare :size="24" class="text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <h3 class="text-lg font-medium mb-2">How can I help you?</h3>
        <p class="text-sm max-w-xs mx-auto mb-6">
          Ask me to analyze a job posting, improve your CV, or research a company.
        </p>
        <!-- Quick command starters -->
        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-for="cmd in availableCommands"
            :key="cmd.id"
            @click="selectCommand(cmd)"
            class="px-3 py-1.5 text-xs rounded-full border border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 transition"
          >
            /{{ cmd.id }}
          </button>
        </div>
      </div>

      <!-- Message list -->
      <div
        v-for="(msg, idx) in messages"
        :key="msg.id || idx"
        :class="getMessageSpacing(idx)"
        @mouseenter="hoveringMessageId = msg.id"
        @mouseleave="hoveringMessageId = null"
      >
        <!-- User message -->
        <div v-if="msg.role === 'user'" class="flex flex-col items-end gap-1">
          <!-- Inline edit mode -->
          <div v-if="editingMessageId === msg.id" class="w-full max-w-[90%] ml-auto">
            <textarea
              :ref="
                (el) => {
                  if (editingMessageId === msg.id) editTextarea.value = el
                }
              "
              v-model="editingContent"
              class="edit-message-textarea w-full rounded-lg border border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none min-h-[60px] max-h-48"
              style="field-sizing: content"
              @keydown="handleEditKeydown($event, msg)"
            />
            <div class="flex gap-2 mt-1 justify-end">
              <button
                @click="handleEditCancel"
                class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                @click="handleEditSave(msg)"
                :disabled="!editingContent.trim()"
                class="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white"
              >
                Send
              </button>
            </div>
          </div>

          <!-- Normal display -->
          <div v-else class="relative group w-full flex flex-col items-end">
            <div class="p-3 rounded-lg max-w-[90%] bg-blue-100 dark:bg-blue-900/30">
              <div
                class="text-sm break-words prose prose-sm dark:prose-invert max-w-none"
                v-html="renderMarkdown(msg.content)"
              ></div>
              <div v-if="msg.metadata?.commandId" class="mt-1 text-xs text-gray-400">
                /{{ msg.metadata.commandId }}
              </div>
            </div>
            <!-- Edit button (on hover, not while busy) -->
            <button
              v-if="hoveringMessageId === msg.id && !isBusy"
              @click="handleEditStart(msg)"
              class="mt-1 flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              title="Edit message"
            >
              <Pencil :size="11" />
              Edit
            </button>
          </div>
        </div>

        <!-- Error message -->
        <div
          v-else-if="msg.role === 'error'"
          class="p-3 rounded-lg max-w-[90%] bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
        >
          <div
            class="text-sm break-words prose prose-sm dark:prose-invert max-w-none"
            v-html="renderMarkdown(msg.content)"
          ></div>
        </div>

        <!-- Assistant message -->
        <div v-else-if="msg.metadata?.isSummary" class="max-w-[90%]">
          <!-- Summary message (special styling) -->
          <div
            class="rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 overflow-hidden"
          >
            <button
              @click="toggleReasoning(msg.id)"
              class="w-full px-3 py-2 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
            >
              <BookOpen :size="14" />
              <span>Conversation summary</span>
              <span class="text-[10px] text-slate-400 ml-1"
                >({{ msg.metadata.summarizedCount }} messages)</span
              >
              <ChevronRight v-if="!expandedReasoning.has(msg.id)" :size="14" class="ml-auto" />
              <ChevronDown v-else :size="14" class="ml-auto" />
            </button>
            <div
              v-if="expandedReasoning.has(msg.id)"
              class="px-3 py-2 text-xs text-gray-600 dark:text-gray-300 border-t border-slate-300 dark:border-slate-600 prose prose-xs dark:prose-invert max-w-none"
              v-html="renderMarkdown(msg.content)"
            ></div>
          </div>
        </div>

        <!-- Regular assistant message -->
        <div v-else class="max-w-[90%] space-y-2">
          <!-- Reasoning (if present) -->
          <div
            v-if="msg.reasoning"
            class="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 overflow-hidden"
          >
            <button
              @click="toggleReasoning(msg.id)"
              class="w-full px-3 py-2 flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition"
            >
              <Brain :size="14" />
              <span>Reasoning</span>
              <ChevronRight v-if="!expandedReasoning.has(msg.id)" :size="14" class="ml-auto" />
              <ChevronDown v-else :size="14" class="ml-auto" />
            </button>
            <div
              v-if="expandedReasoning.has(msg.id)"
              class="px-3 py-2 text-xs text-gray-600 dark:text-gray-300 border-t border-purple-200 dark:border-purple-800 prose prose-xs dark:prose-invert max-w-none"
              v-html="renderMarkdown(msg.reasoning)"
            ></div>
          </div>

          <!-- Tool calls (if present) -->
          <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="space-y-1">
            <div
              v-for="(toolCall, tcIdx) in msg.toolCalls"
              :key="toolCall.id || tcIdx"
              class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 overflow-hidden"
            >
              <button
                @click="toggleToolCall(toolCall.id || `${msg.id}-${tcIdx}`)"
                class="w-full px-3 py-2 flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
              >
                <Wrench :size="12" />
                <span>{{ getToolDisplayName(toolCall.function.name) }}</span>
                <ChevronRight
                  v-if="!expandedToolCalls.has(toolCall.id || `${msg.id}-${tcIdx}`)"
                  :size="14"
                  class="ml-auto"
                />
                <ChevronDown v-else :size="14" class="ml-auto" />
              </button>
              <div
                v-if="expandedToolCalls.has(toolCall.id || `${msg.id}-${tcIdx}`)"
                class="px-3 py-2 text-xs text-gray-600 dark:text-gray-300 border-t border-amber-200 dark:border-amber-800"
              >
                <div class="font-medium mb-1 text-amber-700 dark:text-amber-300">Parameters:</div>
                <pre
                  class="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto text-[10px] leading-relaxed"
                  >{{ formatToolArguments(toolCall.function.arguments) }}</pre
                >
              </div>
            </div>
          </div>

          <!-- Main content -->
          <div v-if="msg.content" class="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
            <div
              class="text-sm break-words prose prose-sm dark:prose-invert max-w-none"
              v-html="renderMarkdown(msg.content)"
            ></div>
          </div>

          <!-- Retry button (shown on hover for last assistant message, not while busy) -->
          <button
            v-if="hoveringMessageId === msg.id && !isBusy"
            @click="handleRetry(msg)"
            class="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
            title="Retry this response"
          >
            <RotateCcw :size="11" />
            Retry
          </button>
        </div>
      </div>

      <!-- Branch navigation bar -->
      <div
        v-if="currentBranches.length > 0 && !isBusy"
        class="mt-4 flex items-center gap-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
      >
        <GitBranch :size="14" class="text-purple-600 dark:text-purple-400 shrink-0" />
        <span class="text-xs text-purple-700 dark:text-purple-300 font-medium shrink-0">
          {{ currentBranches.length }} alternative
          {{ currentBranches.length === 1 ? 'branch' : 'branches' }}
        </span>
        <div class="flex gap-1 flex-wrap">
          <button
            v-for="(branch, bIdx) in currentBranches"
            :key="branch.id"
            @click="handleSwitchBranch(branch.id)"
            class="px-2 py-0.5 text-xs rounded border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/40 transition-colors"
            :title="`Switch to branch ${bIdx + 1} (${branch.messages.length} messages)`"
          >
            <ChevronLeft :size="10" class="inline" />
            Branch {{ bIdx + 1 }}
          </button>
        </div>
      </div>

      <!-- Streaming message -->
      <div
        v-if="isLoading"
        class="max-w-[90%] space-y-2"
        :class="
          messages.length > 0 && isToolOnlyMessage(messages[messages.length - 1]) ? 'mt-2' : 'mt-4'
        "
      >
        <!-- Streaming reasoning -->
        <div
          v-if="streamingReasoning"
          class="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 overflow-hidden"
        >
          <div
            class="px-3 py-2 flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300"
          >
            <Brain :size="14" />
            <span>Reasoning...</span>
            <Loader2 :size="12" class="ml-auto animate-spin" />
          </div>
        </div>

        <!-- Streaming tool calls -->
        <div v-if="streamingToolCalls.length > 0" class="space-y-1">
          <div
            v-for="(toolCall, idx) in streamingToolCalls"
            :key="toolCall.id || idx"
            class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 overflow-hidden"
          >
            <button
              @click="toggleToolCall(toolCall.id || `streaming-${idx}`)"
              class="w-full px-3 py-2 flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
            >
              <Wrench :size="12" />
              <span>{{ getToolDisplayName(toolCall.function.name) }}</span>
              <Loader2 :size="12" class="ml-auto animate-spin" />
            </button>
            <div
              v-if="expandedToolCalls.has(toolCall.id || `streaming-${idx}`)"
              class="px-3 py-2 text-xs text-gray-600 dark:text-gray-300 border-t border-amber-200 dark:border-amber-800"
            >
              <!-- Sub-agent streaming output -->
              <div v-if="streamingToolOutputs[toolCall.id]" class="mb-2">
                <div class="font-medium mb-1 text-amber-700 dark:text-amber-300">Output:</div>
                <div
                  class="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-y-auto max-h-64 text-xs prose prose-sm dark:prose-invert max-w-none"
                  v-html="renderMarkdown(streamingToolOutputs[toolCall.id])"
                ></div>
              </div>
              <div class="font-medium mb-1 text-amber-700 dark:text-amber-300">Parameters:</div>
              <pre
                class="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto text-[10px] leading-relaxed"
                >{{ formatToolArguments(toolCall.function.arguments) }}</pre
              >
            </div>
          </div>
        </div>

        <!-- Streaming content -->
        <div v-if="streamingContent" class="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
          <div
            class="text-sm break-words prose prose-sm dark:prose-invert max-w-none"
            v-html="renderMarkdown(streamingContent)"
          ></div>
        </div>

        <!-- Loading indicator (when no other content) -->
        <div
          v-if="!streamingContent && !streamingReasoning && streamingToolCalls.length === 0"
          class="flex items-center gap-2 text-gray-500 dark:text-gray-400"
        >
          <Loader2 :size="16" class="animate-spin" />
          <span class="text-sm">Thinking...</span>
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

    <!-- Provider Error Banner -->
    <div
      v-if="providerError"
      class="px-4 py-3 bg-red-50 dark:bg-red-900/30 border-t border-b border-red-200 dark:border-red-800 flex items-start gap-2"
    >
      <AlertCircle :size="16" class="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-red-800 dark:text-red-300">Connection error</div>
        <div class="text-xs text-red-700 dark:text-red-400 mt-0.5 break-words">
          {{ providerError }}
        </div>
      </div>
      <button
        @click="providerError = null"
        class="shrink-0 p-0.5 text-red-500 hover:text-red-700 dark:hover:text-red-300"
        title="Dismiss"
      >
        <X :size="14" />
      </button>
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

:deep(.prose li) {
  margin-top: 0.25em;
  margin-bottom: 0.25em;
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

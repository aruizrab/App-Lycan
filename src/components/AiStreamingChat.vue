<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import {
    Loader2, Send, ChevronDown, ChevronRight, Check, AlertCircle,
    Globe, FileText, Sparkles, MessageSquare, Monitor, X, Plus,
    Trash2, MoreHorizontal, Settings, Wrench, Brain
} from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'
import { useSettingsStore } from '../stores/settings'
import { useSettingsModal } from '../composables/useSettingsModal'
import { useMarkdown } from '../composables/useMarkdown'
import { chatWithTools } from '../services/ai'
import { AI_COMMANDS, parseCommand, getAllCommands } from '../services/aiCommands'
import { getToolsForCommand, executeToolCall, setupToolHandlers } from '../services/aiToolkit'
import { loadGeneralPrompt, loadCommandPrompt } from '../services/promptLoader'
import { useAppContext } from '../composables/useAppContext'

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
const expandedReasoning = ref(new Set())  // Track which messages have expanded reasoning

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
const currentSession = computed(() => chatStore.currentSession)
const sessions = computed(() => chatStore.sessions)

const availableCommands = computed(() => getAllCommands())

const filteredCommands = computed(() => {
    if (!userInput.value.startsWith('/')) return []
    const query = userInput.value.slice(1).toLowerCase()
    if (!query) return availableCommands.value
    return availableCommands.value.filter(c =>
        c.id.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query)
    )
})

const currentModel = computed(() => {
    const modelId = settingsStore.openRouterModel
    return modelId?.split('/').pop() || 'Not configured'
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
    return msg.role === 'assistant' && 
           msg.toolCalls && 
           msg.toolCalls.length > 0 && 
           !msg.content && 
           !msg.reasoning
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
            commandMenuIndex.value = (commandMenuIndex.value - 1 + filteredCommands.value.length) % filteredCommands.value.length
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
 * - Always includes the general prompt (with dynamic app context).
 * - If a command is active, also appends the command-specific prompt.
 */
const buildSystemPrompt = async (commandId = null) => {
    const contextJson = appContextJson.value

    if (commandId && AI_COMMANDS[commandId]?.promptFile) {
        return loadCommandPrompt(AI_COMMANDS[commandId].promptFile, contextJson)
    }

    return loadGeneralPrompt(contextJson)
}

const handleSend = async () => {
    const text = userInput.value.trim()
    if (!text || isLoading.value) return

    // Parse for commands
    const { commandId, content } = parseCommand(text)

    // Ensure we have a session
    chatStore.ensureSession({
        type: props.contextType,
        documentId: props.documentId
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

    // Start streaming
    chatStore.startStreaming()

    try {
        const apiKey = settingsStore.openRouterKey
        const model = commandId && cmd?.commandType
            ? settingsStore.getModelForTask(cmd.commandType)
            : settingsStore.openRouterModel

        if (!apiKey) {
            throw new Error('OpenRouter API key is not configured. Please set it in Settings.')
        }
        if (!model) {
            throw new Error('No model selected. Please configure a model in Settings.')
        }

        // Build system prompt (async — loads from markdown files)
        const systemPrompt = await buildSystemPrompt(commandId)
        const apiMessages = chatStore.getApiMessages(systemPrompt)

        // Determine web search need
        const needsWebSearch = cmd
            ? (typeof cmd.requiresWebSearch === 'function' ? cmd.requiresWebSearch(content) : cmd.requiresWebSearch)
            : false

        // Get appropriate tools
        const tools = getToolsForCommand(commandId)

        console.log('[AiStreamingChat] Sending request:', {
            commandId,
            model,
            needsWebSearch,
            toolCount: tools.length
        })

        // Stream the response with tool support
        const result = await chatWithTools(apiKey, model, apiMessages, {
            enableWebSearch: needsWebSearch,
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
            onRoundComplete: (roundData) => {
                // Save each assistant message separately after each round
                chatStore.finishStreaming({
                    content: roundData.content,
                    reasoning: roundData.reasoning,
                    toolCalls: roundData.toolCalls,
                    metadata: {
                        model,
                        commandId,
                        hasWebSearch: needsWebSearch
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
                    if (result?.success && (
                        toolCall.function.name.includes('edit') ||
                        toolCall.function.name.includes('create') ||
                        toolCall.function.name.includes('delete')
                    )) {
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
        }
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
</script>

<template>
    <div class="flex flex-col h-full bg-white dark:bg-gray-800">
        <!-- Unified Header -->
        <div class="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <div class="flex items-center gap-2">
                <Sparkles :size="18" class="text-purple-500"/>
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
                    <div v-if="showSessionList"
                         class="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-30 overflow-hidden">
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
            <div v-if="messages.length === 0 && !streamingContent" class="text-center text-gray-500 dark:text-gray-400 mt-10">
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
            >
                <!-- User message -->
                <div v-if="msg.role === 'user'" class="p-3 rounded-lg max-w-[90%] bg-blue-100 dark:bg-blue-900/30 ml-auto">
                    <div class="text-sm break-words prose prose-sm dark:prose-invert max-w-none" v-html="renderMarkdown(msg.content)"></div>
                    <div v-if="msg.metadata?.commandId" class="mt-1 text-xs text-gray-400">
                        /{{ msg.metadata.commandId }}
                    </div>
                </div>

                <!-- Error message -->
                <div v-else-if="msg.role === 'error'" class="p-3 rounded-lg max-w-[90%] bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                    <div class="text-sm break-words prose prose-sm dark:prose-invert max-w-none" v-html="renderMarkdown(msg.content)"></div>
                </div>

                <!-- Assistant message -->
                <div v-else class="max-w-[90%] space-y-2">
                    <!-- Reasoning (if present) -->
                    <div v-if="msg.reasoning" class="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 overflow-hidden">
                        <button 
                            @click="toggleReasoning(msg.id)"
                            class="w-full px-3 py-2 flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition"
                        >
                            <Brain :size="14" />
                            <span>Reasoning</span>
                            <ChevronRight v-if="!expandedReasoning.has(msg.id)" :size="14" class="ml-auto" />
                            <ChevronDown v-else :size="14" class="ml-auto" />
                        </button>
                        <div v-if="expandedReasoning.has(msg.id)" class="px-3 py-2 text-xs text-gray-600 dark:text-gray-300 border-t border-purple-200 dark:border-purple-800 prose prose-xs dark:prose-invert max-w-none" v-html="renderMarkdown(msg.reasoning)">
                        </div>
                    </div>

                    <!-- Tool calls (if present) -->
                    <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="space-y-1">
                        <div 
                            v-for="(toolCall, tcIdx) in msg.toolCalls" 
                            :key="toolCall.id || tcIdx"
                            class="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs"
                        >
                            <div class="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
                                <Wrench :size="12" />
                                <span>{{ toolCall.function.name }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Main content -->
                    <div v-if="msg.content" class="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                        <div class="text-sm break-words prose prose-sm dark:prose-invert max-w-none" v-html="renderMarkdown(msg.content)"></div>
                    </div>
                </div>
            </div>

            <!-- Streaming message -->
            <div 
                v-if="isLoading" 
                class="max-w-[90%] space-y-2"
                :class="messages.length > 0 && isToolOnlyMessage(messages[messages.length - 1]) ? 'mt-2' : 'mt-4'"
            >
                <!-- Streaming reasoning -->
                <div v-if="streamingReasoning" class="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 overflow-hidden">
                    <div class="px-3 py-2 flex items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300">
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
                        class="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs"
                    >
                        <div class="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
                            <Wrench :size="12" />
                            <span>{{ toolCall.function.name }}</span>
                            <Loader2 :size="12" class="ml-auto animate-spin" />
                        </div>
                    </div>
                </div>

                <!-- Streaming content -->
                <div v-if="streamingContent" class="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                    <div class="text-sm break-words prose prose-sm dark:prose-invert max-w-none" v-html="renderMarkdown(streamingContent)"></div>
                </div>

                <!-- Loading indicator (when no other content) -->
                <div v-if="!streamingContent && !streamingReasoning && streamingToolCalls.length === 0" class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Loader2 :size="16" class="animate-spin" />
                    <span class="text-sm">Thinking...</span>
                </div>
            </div>
        </div>

        <!-- Input Area -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 relative">
            <!-- Command Menu -->
            <div v-if="showCommandMenu && filteredCommands.length > 0"
                 class="absolute bottom-full left-4 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20">
                <div class="p-2 text-xs text-gray-500 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    Commands
                </div>
                <ul>
                    <li v-for="(cmd, index) in filteredCommands"
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
                    :disabled="isLoading"
                    rows="1"
                    class="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white disabled:opacity-50 min-h-[42px] max-h-32"
                    style="field-sizing: content;"
                />
                <button
                    @click="handleSend"
                    :disabled="!userInput.trim() || isLoading"
                    class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors self-end h-[42px]"
                >
                    <Send v-if="!isLoading" :size="18" />
                    <Loader2 v-else :size="18" class="animate-spin" />
                </button>
            </div>

            <!-- Footer info -->
            <div class="mt-2 flex justify-between items-center text-xs text-gray-400">
                <div class="flex items-center gap-2">
                    <Monitor :size="12" />
                    <span>{{ currentModel }}</span>
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

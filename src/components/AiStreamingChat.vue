<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import {
    Loader2,
    Send,
    ChevronDown,
    ChevronRight,
    Check,
    AlertCircle,
    Globe,
    FileText,
    Link as LinkIcon,
    Sparkles
} from 'lucide-vue-next'
import { AI_COMMANDS, isUrl, getContextPreview } from '../services/aiCommands'

const props = defineProps({
    /** Currently active command ID */
    activeCommand: {
        type: String,
        default: null
    },
    /** Whether AI is currently processing */
    isLoading: {
        type: Boolean,
        default: false
    },
    /** Current streaming content */
    streamingContent: {
        type: String,
        default: ''
    },
    /** Error message if any */
    error: {
        type: String,
        default: null
    },
    /** Whether to show the apply button */
    showApply: {
        type: Boolean,
        default: false
    },
    /** Messages history */
    messages: {
        type: Array,
        default: () => []
    },
    /** Additional context to include */
    additionalContext: {
        type: Object,
        default: () => ({})
    }
})

const emit = defineEmits([
    'send',
    'apply',
    'selectCommand',
    'clearError'
])

// Local state
const userInput = ref('')
const showContextPreview = ref(false)
const messagesContainer = ref(null)

// Computed
const availableCommands = computed(() => Object.values(AI_COMMANDS))

const selectedCommand = computed(() => {
    if (!props.activeCommand) return null
    return Object.values(AI_COMMANDS).find(c => c.id === props.activeCommand)
})

const inputMode = computed(() => {
    if (!selectedCommand.value) return 'text'
    if (selectedCommand.value.id === 'analyze') {
        return isUrl(userInput.value) ? 'url' : 'text'
    }
    return 'text'
})

const inputPlaceholder = computed(() => {
    if (!selectedCommand.value) {
        return 'Select a command or type your request...'
    }
    switch (selectedCommand.value.id) {
        case 'analyze':
            return 'Paste job posting URL or job description text...'
        case 'match':
            return 'Any specific aspects to focus on? (optional)'
        case 'research':
            return 'Enter company name or additional context...'
        case 'cv':
            return 'Describe what changes you want to the CV...'
        case 'cover':
            return 'Any specific points to emphasize? (optional)'
        default:
            return 'Type your request...'
    }
})

const contextInfo = computed(() => {
    if (!selectedCommand.value) return null
    return getContextPreview(selectedCommand.value.id, props.additionalContext)
})

const canSend = computed(() => {
    if (props.isLoading) return false
    if (!selectedCommand.value) return false

    // Some commands require input, others don't
    const requiresInput = ['analyze', 'cv'].includes(selectedCommand.value.id)
    if (requiresInput && !userInput.value.trim()) return false

    // Check required context
    if (contextInfo.value && !contextInfo.value.isValid) return false

    return true
})

const requiresWebSearch = computed(() => {
    if (!selectedCommand.value) return false
    const cmd = selectedCommand.value
    return typeof cmd.requiresWebSearch === 'function'
        ? cmd.requiresWebSearch(userInput.value)
        : cmd.requiresWebSearch
})

// Methods
const selectCommand = (commandId) => {
    emit('selectCommand', commandId)
}

const handleSend = () => {
    if (!canSend.value) return

    emit('send', {
        command: selectedCommand.value.id,
        input: userInput.value.trim(),
        isUrl: inputMode.value === 'url'
    })

    userInput.value = ''
}

const handleApply = () => {
    emit('apply')
}

const handleKeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
    }
}

// Auto-scroll to bottom when new content arrives
watch(() => props.streamingContent, () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    })
})

watch(() => props.messages.length, () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    })
})
</script>

<template>
    <div class="flex flex-col h-full bg-white dark:bg-gray-800">
        <!-- Command Selector -->
        <div class="p-3 border-b border-gray-200 dark:border-gray-700">
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="cmd in availableCommands"
                    :key="cmd.id"
                    @click="selectCommand(cmd.id)"
                    :class="[
                        'px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-1.5',
                        activeCommand === cmd.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    ]"
                    :title="cmd.description"
                >
                    <Sparkles v-if="cmd.id === 'analyze'" :size="14" />
                    <FileText v-else-if="cmd.id === 'cv'" :size="14" />
                    <Globe v-else-if="cmd.id === 'research'" :size="14" />
                    <span>{{ cmd.name }}</span>
                </button>
            </div>

            <!-- Command description -->
            <p v-if="selectedCommand" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {{ selectedCommand.description }}
            </p>
        </div>

        <!-- Context Preview (Collapsible) -->
        <div v-if="selectedCommand && contextInfo" class="border-b border-gray-200 dark:border-gray-700">
            <button
                @click="showContextPreview = !showContextPreview"
                class="w-full px-3 py-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750"
            >
                <span class="flex items-center gap-2">
                    <component :is="showContextPreview ? ChevronDown : ChevronRight" :size="16" />
                    Context Preview
                    <span v-if="!contextInfo.isValid" class="text-red-500 text-xs">
                        (Missing: {{ contextInfo.missingRequired.join(', ') }})
                    </span>
                </span>
                <span class="text-xs">
                    {{ contextInfo.contextPreview.filter(c => c.hasContent).length }} items
                </span>
            </button>

            <div v-if="showContextPreview" class="px-3 pb-3 space-y-2 max-h-48 overflow-y-auto">
                <div
                    v-for="item in contextInfo.contextPreview"
                    :key="item.key"
                    class="text-xs p-2 rounded"
                    :class="item.hasContent
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'"
                >
                    <div class="font-medium flex items-center gap-1">
                        <Check v-if="item.hasContent" :size="12" />
                        <AlertCircle v-else :size="12" />
                        {{ item.label }}
                    </div>
                    <div v-if="item.hasContent" class="mt-1 text-gray-600 dark:text-gray-400 truncate">
                        {{ item.preview }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Messages Area -->
        <div
            ref="messagesContainer"
            class="flex-1 overflow-y-auto p-3 space-y-4"
        >
            <!-- History Messages -->
            <div
                v-for="(msg, idx) in messages"
                :key="idx"
                :class="[
                    'p-3 rounded-lg max-w-[90%]',
                    msg.role === 'user'
                        ? 'bg-blue-100 dark:bg-blue-900/30 ml-auto text-right'
                        : msg.role === 'error'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            : 'bg-gray-100 dark:bg-gray-700'
                ]"
            >
                <div
                    v-if="msg.role === 'assistant'"
                    class="prose prose-sm dark:prose-invert max-w-none"
                    v-html="msg.content"
                />
                <div v-else class="text-sm">
                    {{ msg.content }}
                </div>
            </div>

            <!-- Streaming Content -->
            <div
                v-if="isLoading || streamingContent"
                class="p-3 rounded-lg bg-gray-100 dark:bg-gray-700"
            >
                <div v-if="streamingContent" class="prose prose-sm dark:prose-invert max-w-none" v-html="streamingContent" />
                <div v-else class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Loader2 :size="16" class="animate-spin" />
                    <span>Thinking...</span>
                </div>
            </div>

            <!-- Error Display -->
            <div
                v-if="error"
                class="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
            >
                <div class="flex items-start gap-2">
                    <AlertCircle :size="16" class="mt-0.5 flex-shrink-0" />
                    <div class="text-sm">{{ error }}</div>
                </div>
            </div>

            <!-- Apply Button -->
            <div v-if="showApply && !isLoading" class="flex justify-end">
                <button
                    @click="handleApply"
                    class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Check :size="16" />
                    Apply Changes
                </button>
            </div>
        </div>

        <!-- Input Area -->
        <div class="p-3 border-t border-gray-200 dark:border-gray-700">
            <!-- Input mode indicator -->
            <div v-if="selectedCommand?.id === 'analyze' && userInput" class="mb-2 flex items-center gap-2 text-xs">
                <span
                    :class="[
                        'px-2 py-0.5 rounded-full flex items-center gap-1',
                        inputMode === 'url'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    ]"
                >
                    <LinkIcon v-if="inputMode === 'url'" :size="12" />
                    <FileText v-else :size="12" />
                    {{ inputMode === 'url' ? 'URL detected - will fetch job posting' : 'Text mode - paste job description' }}
                </span>
                <span v-if="requiresWebSearch" class="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <Globe :size="12" />
                    Web search enabled
                </span>
            </div>

            <div class="flex gap-2">
                <textarea
                    v-model="userInput"
                    @keydown="handleKeydown"
                    :placeholder="inputPlaceholder"
                    :disabled="isLoading || !selectedCommand"
                    rows="2"
                    class="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                    @click="handleSend"
                    :disabled="!canSend"
                    class="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors self-end"
                >
                    <Loader2 v-if="isLoading" :size="20" class="animate-spin" />
                    <Send v-else :size="20" />
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
@reference "tailwindcss";

.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3),
.prose :deep(h4) {
    @apply font-semibold mt-3 mb-2;
}

.prose :deep(h1) {
    @apply text-lg;
}

.prose :deep(h2) {
    @apply text-base;
}

.prose :deep(h3),
.prose :deep(h4) {
    @apply text-sm;
}

.prose :deep(ul),
.prose :deep(ol) {
    @apply pl-5 my-2;
}

.prose :deep(ul) {
    @apply list-disc;
}

.prose :deep(ol) {
    @apply list-decimal;
}

.prose :deep(li) {
    @apply my-1;
}

.prose :deep(p) {
    @apply my-2;
}

.prose :deep(strong) {
    @apply font-semibold;
}
</style>

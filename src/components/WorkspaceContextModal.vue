<script setup>
import { ref, watch, computed } from 'vue'
import { X, Save, Calendar, Trash2 } from 'lucide-vue-next'
import RichTextEditor from './RichTextEditor.vue'

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true
    },
    mode: {
        type: String, // 'view', 'edit', 'create'
        default: 'view'
    },
    contextKey: {
        type: String,
        default: ''
    },
    contextContent: {
        type: String,
        default: ''
    }
})

const emit = defineEmits(['close', 'save', 'delete'])

// Local state
const localContextKey = ref('')
const localContextContent = ref('')
const isEditing = ref(false)

// Watch for prop changes
watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        localContextKey.value = props.contextKey
        localContextContent.value = props.contextContent
        isEditing.value = props.mode === 'edit' || props.mode === 'create'
    }
}, { immediate: true })

watch(() => [props.contextKey, props.contextContent], () => {
    if (props.isOpen) {
        localContextKey.value = props.contextKey
        localContextContent.value = props.contextContent
    }
})

// Modal title
const modalTitle = computed(() => {
    if (props.mode === 'create') return 'Add Custom Context Entry'
    if (props.mode === 'edit') return `Edit ${formatContextKey(props.contextKey)}`
    return formatContextKey(props.contextKey)
})

// Format context key for display
const formatContextKey = (key) => {
    if (!key) return 'Context Entry'
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .trim()
}

// Handlers
const handleClose = () => {
    emit('close')
}

const handleSave = () => {
    if (props.mode === 'create' && !localContextKey.value.trim()) {
        alert('Please enter a name for the context entry')
        return
    }
    if (!localContextContent.value.trim()) {
        alert('Please enter some content')
        return
    }
    emit('save', {
        key: localContextKey.value.trim(),
        content: localContextContent.value
    })
    handleClose()
}

const handleEdit = () => {
    isEditing.value = true
}

const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${formatContextKey(props.contextKey)}"?`)) {
        emit('delete', props.contextKey)
        handleClose()
    }
}

// Normalize context key: convert to snake_case
const normalizeContextKey = () => {
    localContextKey.value = localContextKey.value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
}
</script>

<template>
    <Transition name="modal">
        <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <!-- Backdrop -->
            <div
                class="absolute inset-0 bg-black/50 backdrop-blur-sm"
                @click="handleClose"
            />

            <!-- Modal -->
            <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
                <!-- Header -->
                <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                        {{ modalTitle }}
                    </h2>
                    <button
                        @click="handleClose"
                        class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X :size="20" />
                    </button>
                </div>

                <!-- Content -->
                <div class="flex-1 overflow-y-auto p-6 space-y-4">
                    <!-- Context Key (only for create mode) -->
                    <div v-if="mode === 'create'" class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Entry Name <span class="text-red-500">*</span>
                        </label>
                        <input
                            v-model="localContextKey"
                            @blur="normalizeContextKey"
                            type="text"
                            placeholder="e.g., interview_notes or company_values"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            Use lowercase letters, numbers, and underscores only. Spaces will be converted to underscores.
                        </p>
                    </div>

                    <!-- Context Content -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Content <span class="text-red-500">*</span>
                            </label>
                            <!-- Modification Date (only in view/edit mode) -->
                            <div v-if="mode !== 'create' && (props.contextContent || localContextContent)" class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <Calendar :size="12" />
                                Last modified
                            </div>
                        </div>
                        
                        <!-- View Mode -->
                        <div v-if="!isEditing" class="prose prose-sm dark:prose-invert max-w-none p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 min-h-[200px]" v-html="localContextContent" />
                        
                        <!-- Edit Mode -->
                        <RichTextEditor
                            v-else
                            v-model="localContextContent"
                        />
                    </div>
                </div>

                <!-- Footer -->
                <div class="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
                    <!-- Delete Button (left side, only in view/edit mode, not create) -->
                    <button
                        v-if="mode !== 'create'"
                        @click="handleDelete"
                        class="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Trash2 :size="16" />
                        Delete
                    </button>
                    <div v-else></div>

                    <!-- Action Buttons (right side) -->
                    <div class="flex items-center gap-3">
                        <button
                            @click="handleClose"
                            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            {{ isEditing ? 'Cancel' : 'Close' }}
                        </button>
                        <button
                            v-if="!isEditing && mode !== 'create'"
                            @click="handleEdit"
                            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                            Edit
                        </button>
                        <button
                            v-if="isEditing || mode === 'create'"
                            @click="handleSave"
                            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Save :size="16" />
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
@reference "tailwindcss";

.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
    transition: transform 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
    transform: scale(0.95);
}

/* Prose styles for rich text display */
.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3),
.prose :deep(h4) {
    @apply font-semibold mt-3 mb-2;
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

.prose :deep(li) {
    @apply my-1 text-sm;
}

.prose :deep(p) {
    @apply my-2 text-sm;
}

.prose :deep(strong) {
    @apply font-semibold;
}

.prose :deep(em) {
    @apply italic;
}

.prose :deep(u) {
    @apply underline;
}
</style>

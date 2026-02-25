<script setup>
import { ref, computed, watch } from 'vue'
import { useSettingsStore, AI_COMMAND_TYPES } from '../stores/settings'
import { storeToRefs } from 'pinia'
import ModelDropdown from './ModelDropdown.vue'
import {
    Settings,
    Plus,
    Trash2,
    Globe,
    Cpu,
    Check,
    X,
    Info,
    RefreshCw
} from 'lucide-vue-next'

const settingsStore = useSettingsStore()
const {
    openRouterKey,
    openRouterModel,
    taskModels,
    customModels,
    matchReportThreshold,
    availableModels,
    isLoadingModels,
    modelsFetchError
} = storeToRefs(settingsStore)

// Watch for API key changes and fetch models
watch(openRouterKey, (newKey) => {
    if (newKey) {
        settingsStore.fetchModels()
    }
})

// Local state
const newModelId = ref('')
const newModelName = ref('')
const newModelWebSearch = ref(false)
const showAddModel = ref(false)

// Command type labels
const COMMAND_LABELS = {
    [AI_COMMAND_TYPES.JOB_ANALYSIS]: {
        name: 'Job Analysis',
        description: 'Analyze job postings from URL or text',
        icon: 'briefcase',
        requiresWebSearch: true
    },
    [AI_COMMAND_TYPES.MATCH_REPORT]: {
        name: 'Match Report',
        description: 'Compare your profile against job requirements',
        icon: 'target',
        requiresWebSearch: false
    },
    [AI_COMMAND_TYPES.COMPANY_RESEARCH]: {
        name: 'Company Research',
        description: 'Research company legitimacy and strategy',
        icon: 'building',
        requiresWebSearch: true
    },
    [AI_COMMAND_TYPES.CV_GENERATION]: {
        name: 'CV Generation',
        description: 'Create or improve CVs based on job context',
        icon: 'file-text',
        requiresWebSearch: false
    },
    [AI_COMMAND_TYPES.COVER_LETTER]: {
        name: 'Cover Letter',
        description: 'Write personalized cover letters',
        icon: 'mail',
        requiresWebSearch: false
    }
}

// Computed
const allModels = computed(() => {
    return [...availableModels.value, ...customModels.value]
})

const cacheAge = computed(() => {
    const age = settingsStore.getCacheAge()
    if (age === null) return 'Never'
    if (age === 0) return 'Just now'
    if (age < 1) return 'Less than 1 hour ago'
    if (age === 1) return '1 hour ago'
    return `${age} hours ago`
})

const handleRefreshModels = async () => {
    await settingsStore.refreshModels()
}

// Methods
const addCustomModel = () => {
    if (!newModelId.value.trim()) return

    settingsStore.addCustomModel({
        id: newModelId.value.trim(),
        name: newModelName.value.trim() || newModelId.value.trim(),
        webSearchCompatible: newModelWebSearch.value
    })

    // Reset form
    newModelId.value = ''
    newModelName.value = ''
    newModelWebSearch.value = false
    showAddModel.value = false
}

const removeCustomModel = (modelId) => {
    if (confirm('Are you sure you want to remove this custom model?')) {
        settingsStore.removeCustomModel(modelId)
    }
}

const toggleWebSearchCompatibility = (modelId) => {
    const model = customModels.value.find(m => m.id === modelId)
    if (model) {
        settingsStore.updateCustomModel(modelId, {
            webSearchCompatible: !model.webSearchCompatible
        })
    }
}
</script>

<template>
    <div class="space-y-6">
        <!-- API Key Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
            <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Settings :size="18" />
                    OpenRouter Configuration
                </h3>
                <button
                    v-if="openRouterKey"
                    @click="handleRefreshModels"
                    :disabled="isLoadingModels"
                    class="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                    :title="`Last updated: ${cacheAge}`"
                >
                    <RefreshCw :size="14" :class="{ 'animate-spin': isLoadingModels }" />
                    Refresh Models
                </button>
            </div>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        API Key
                    </label>
                    <input
                        v-model="openRouterKey"
                        type="password"
                        class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        placeholder="sk-or-..."
                    />
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Get your API key from <a href="https://openrouter.ai/keys" target="_blank" class="text-blue-600 hover:underline">openrouter.ai/keys</a>
                    </p>
                </div>

                <!-- Model fetch status -->
                <div v-if="isLoadingModels" class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                    Loading available models from OpenRouter...
                </div>
                <div v-else-if="modelsFetchError" class="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                    Failed to fetch models: {{ modelsFetchError }}
                </div>
                <div v-else-if="availableModels.length > 0" class="text-xs text-gray-500 dark:text-gray-400">
                    {{ availableModels.length }} models available • Last updated: {{ cacheAge }}
                </div>

                <div>
                    <ModelDropdown
                        v-model="openRouterModel"
                        :models="allModels"
                        label="Default Model"
                        placeholder="Search models..."
                    />
                </div>
            </div>
        </div>

        <!-- Per-Task Model Settings -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
            <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <Cpu :size="18" />
                Task-Specific Models
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Configure different models for each AI task. Tasks requiring web search only show compatible models.
            </p>

            <div class="space-y-4">
                <div v-for="(config, taskType) in COMMAND_LABELS" :key="taskType" class="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                    <div class="flex items-center justify-between mb-2">
                        <div>
                            <label class="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                {{ config.name }}
                                <span v-if="config.requiresWebSearch" class="px-1.5 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                    <Globe :size="10" />
                                    Web Search
                                </span>
                            </label>
                            <p class="text-xs text-gray-500 dark:text-gray-400">{{ config.description }}</p>
                        </div>
                    </div>

                    <ModelDropdown
                        v-model="taskModels[taskType]"
                        :models="allModels"
                        :require-web-search="config.requiresWebSearch"
                        :show-filters="true"
                        placeholder="Search models..."
                    />
                </div>
            </div>
        </div>

        <!-- Match Report Threshold -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
            <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                Match Threshold
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                AI will recommend applying to jobs when match score is at or above this threshold.
            </p>

            <div class="flex items-center gap-4">
                <input
                    v-model.number="matchReportThreshold"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    class="flex-1"
                />
                <span class="text-lg font-bold text-blue-600 dark:text-blue-400 w-16 text-center">
                    {{ matchReportThreshold }}%
                </span>
            </div>

            <div class="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>More matches</span>
                <span>Higher quality</span>
            </div>
        </div>

        <!-- Custom Models -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
            <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    Custom Models
                </h3>
                <button
                    @click="showAddModel = !showAddModel"
                    class="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    <Plus :size="16" />
                    Add Model
                </button>
            </div>

            <!-- Add Model Form -->
            <div v-if="showAddModel" class="mb-4 p-3 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-600">
                <div class="space-y-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Model ID <span class="text-red-500">*</span>
                        </label>
                        <input
                            v-model="newModelId"
                            type="text"
                            class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
                            placeholder="provider/model-name"
                        />
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Display Name
                        </label>
                        <input
                            v-model="newModelName"
                            type="text"
                            class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
                            placeholder="My Custom Model"
                        />
                    </div>

                    <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                            v-model="newModelWebSearch"
                            type="checkbox"
                            class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <Globe :size="16" />
                        Supports web search
                    </label>

                    <div class="flex items-center gap-2 pt-2">
                        <button
                            @click="addCustomModel"
                            :disabled="!newModelId.trim()"
                            class="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                        >
                            <Check :size="16" />
                            Add
                        </button>
                        <button
                            @click="showAddModel = false"
                            class="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-sm rounded transition-colors"
                        >
                            <X :size="16" />
                            Cancel
                        </button>
                    </div>
                </div>
            </div>

            <!-- Custom Models List -->
            <div v-if="customModels.length" class="space-y-2">
                <div
                    v-for="model in customModels"
                    :key="model.id"
                    class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-750 rounded"
                >
                    <div class="flex items-center gap-2 min-w-0">
                        <button
                            @click="toggleWebSearchCompatibility(model.id)"
                            :class="model.webSearchCompatible ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'"
                            class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            :title="model.webSearchCompatible ? 'Web search enabled' : 'Web search disabled'"
                        >
                            <Globe :size="16" />
                        </button>
                        <div class="min-w-0">
                            <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ model.name }}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ model.id }}</p>
                        </div>
                    </div>
                    <button
                        @click="removeCustomModel(model.id)"
                        class="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                        <Trash2 :size="16" />
                    </button>
                </div>
            </div>

            <div v-else class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No custom models added yet
            </div>

            <!-- Info about web search models -->
            <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div class="flex items-start gap-2">
                    <Info :size="16" class="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div class="text-xs text-blue-700 dark:text-blue-300">
                        <p class="font-medium mb-1">About Web Search & Custom Models</p>
                        <p class="mb-2">Models with web search capability (🌐) can fetch and analyze content from URLs in real-time. This is required for Job Analysis (URL mode) and Company Research tasks.</p>
                        <p class="text-xs">Models from Anthropic, OpenAI, Perplexity, and xAI support native web search. You can also add custom or experimental models manually if they're not yet in the main list.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useWorkspaceStore } from '../stores/workspace'
import { useSettingsStore } from '../stores/settings'
import {
    Briefcase,
    Target,
    Building,
    ChevronDown,
    ChevronRight,
    Edit,
    Trash2,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ExternalLink,
    Calendar,
    FileText,
    Plus
} from 'lucide-vue-next'
import { ref } from 'vue'

const emit = defineEmits(['edit', 'delete', 'regenerate', 'viewCustomContext', 'editCustomContext', 'deleteCustomContext', 'addCustomContext'])

const workspaceStore = useWorkspaceStore()
const settingsStore = useSettingsStore()

// Reserved keys that are not custom context
const RESERVED_WS_KEYS = new Set(['metadata', 'cvs', 'coverLetters', 'jobAnalysis', 'matchReport', 'companyResearch'])

// Expanded sections
const expandedSections = ref({
    jobAnalysis: true,
    matchReport: false,
    companyResearch: false
})

// Getters - store getters are already computed refs
const jobAnalysis = computed(() => workspaceStore.getJobAnalysis)
const matchReport = computed(() => workspaceStore.getMatchReport)
const companyResearch = computed(() => workspaceStore.getCompanyResearch)
const hasAnyContext = computed(() => workspaceStore.hasAiContext)
const matchThreshold = computed(() => settingsStore.matchReportThreshold)

// Get custom context entries
const customContextEntries = computed(() => {
    if (!workspaceStore.currentWorkspace) return []
    const ws = workspaceStore.workspaces[workspaceStore.currentWorkspace]
    if (!ws) return []
    
    return Object.keys(ws)
        .filter(key => !RESERVED_WS_KEYS.has(key) && ws[key] !== null && ws[key] !== undefined)
        .map(key => ({
            key,
            ...ws[key]
        }))
        .sort((a, b) => (b.lastModified || b.createdAt || 0) - (a.lastModified || a.createdAt || 0))
})

// Check if there's any context (including custom)
const hasAnyContextIncludingCustom = computed(() => {
    return hasAnyContext.value || customContextEntries.value.length > 0
})

// Methods
const toggleSection = (section) => {
    expandedSections.value[section] = !expandedSections.value[section]
}

const formatDate = (timestamp) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const getMatchScoreColor = (score) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
}

const getMatchScoreBg = (score) => {
    if (score >= 70) return 'bg-green-100 dark:bg-green-900/30'
    if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/30'
    return 'bg-red-100 dark:bg-red-900/30'
}

const getRecommendationIcon = (rec) => {
    switch (rec) {
        case 'apply': return CheckCircle
        case 'consider': return AlertTriangle
        case 'skip': return XCircle
        default: return AlertTriangle
    }
}

const getRecommendationColor = (rec) => {
    switch (rec) {
        case 'apply': return 'text-green-600 dark:text-green-400'
        case 'consider': return 'text-yellow-600 dark:text-yellow-400'
        case 'skip': return 'text-red-600 dark:text-red-400'
        default: return 'text-gray-600 dark:text-gray-400'
    }
}

const handleEdit = (type) => {
    emit('edit', type)
}

const handleDelete = (type) => {
    if (confirm(`Are you sure you want to delete this ${type.replace(/([A-Z])/g, ' $1').toLowerCase()}?`)) {
        emit('delete', type)
    }
}

const handleRegenerate = (type) => {
    emit('regenerate', type)
}

// Custom context handlers
const handleViewCustomContext = (contextKey) => {
    emit('viewCustomContext', contextKey)
}

const handleEditCustomContext = (contextKey) => {
    emit('editCustomContext', contextKey)
}

const handleDeleteCustomContext = (contextKey) => {
    if (confirm(`Are you sure you want to delete the context entry "${contextKey}"?`)) {
        emit('deleteCustomContext', contextKey)
    }
}

const handleAddCustomContext = () => {
    emit('addCustomContext')
}

const formatContextKey = (key) => {
    // Convert snake_case or camelCase to Title Case
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .trim()
}
</script>

<template>
    <div class="space-y-4">
        <!-- Empty State -->
        <div v-if="!hasAnyContextIncludingCustom" class="text-center py-8 text-gray-500 dark:text-gray-400">
            <Briefcase :size="48" class="mx-auto mb-3 opacity-50" />
            <p class="font-medium">No workspace context yet</p>
            <p class="text-sm mt-1">Use the AI Assistant to analyze a job posting</p>
        </div>

        <!-- Job Analysis Section -->
        <div v-if="jobAnalysis" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
                @click="toggleSection('jobAnalysis')"
                class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Briefcase :size="20" class="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div class="text-left">
                        <h3 class="font-semibold text-gray-900 dark:text-white">Job Analysis</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ jobAnalysis.jobTitle || 'Position' }}
                            <span v-if="jobAnalysis.company"> at {{ jobAnalysis.company }}</span>
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-0.5 rounded-full" :class="{
                        'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300': jobAnalysis.source === 'ai',
                        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300': jobAnalysis.source === 'url',
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300': jobAnalysis.source === 'manual'
                    }">
                        {{ jobAnalysis.source === 'url' ? 'From URL' : jobAnalysis.source === 'ai' ? 'AI Generated' : 'Manual' }}
                    </span>
                    <component :is="expandedSections.jobAnalysis ? ChevronDown : ChevronRight" :size="20" class="text-gray-400" />
                </div>
            </button>

            <div v-if="expandedSections.jobAnalysis" class="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                <!-- Source URL if available -->
                <a
                    v-if="jobAnalysis.sourceUrl"
                    :href="jobAnalysis.sourceUrl"
                    target="_blank"
                    class="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-3 mb-2"
                >
                    <ExternalLink :size="12" />
                    {{ jobAnalysis.sourceUrl }}
                </a>

                <!-- Content -->
                <div class="mt-3 prose prose-sm dark:prose-invert max-w-none max-h-64 overflow-y-auto" v-html="jobAnalysis.content" />

                <!-- Meta & Actions -->
                <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar :size="12" />
                        {{ formatDate(jobAnalysis.lastModified || jobAnalysis.createdAt) }}
                    </div>
                    <div class="flex items-center gap-1">
                        <button @click="handleEdit('jobAnalysis')" class="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit">
                            <Edit :size="16" />
                        </button>
                        <button @click="handleRegenerate('jobAnalysis')" class="p-1.5 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Regenerate">
                            <RefreshCw :size="16" />
                        </button>
                        <button @click="handleDelete('jobAnalysis')" class="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Delete">
                            <Trash2 :size="16" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Match Report Section -->
        <div v-if="matchReport" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
                @click="toggleSection('matchReport')"
                class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg" :class="getMatchScoreBg(matchReport.score)">
                        <Target :size="20" :class="getMatchScoreColor(matchReport.score)" />
                    </div>
                    <div class="text-left">
                        <h3 class="font-semibold text-gray-900 dark:text-white">Profile Match</h3>
                        <div class="flex items-center gap-2 text-xs">
                            <span class="font-bold text-lg" :class="getMatchScoreColor(matchReport.score)">
                                {{ matchReport.score }}%
                            </span>
                            <span v-if="matchReport.recommendation" class="flex items-center gap-1" :class="getRecommendationColor(matchReport.recommendation)">
                                <component :is="getRecommendationIcon(matchReport.recommendation)" :size="14" />
                                {{ matchReport.recommendation.charAt(0).toUpperCase() + matchReport.recommendation.slice(1) }}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span v-if="matchReport.score >= matchThreshold" class="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        Above threshold
                    </span>
                    <span v-else class="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                        Below threshold
                    </span>
                    <component :is="expandedSections.matchReport ? ChevronDown : ChevronRight" :size="20" class="text-gray-400" />
                </div>
            </button>

            <div v-if="expandedSections.matchReport" class="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                <!-- Quick Stats -->
                <div class="mt-3 grid grid-cols-2 gap-3">
                    <div v-if="matchReport.strengths?.length" class="p-2 rounded bg-green-50 dark:bg-green-900/20">
                        <p class="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Strengths ({{ matchReport.strengths.length }})</p>
                        <ul class="text-xs text-green-600 dark:text-green-400 space-y-0.5">
                            <li v-for="(s, i) in matchReport.strengths.slice(0, 3)" :key="i" class="truncate">• {{ s }}</li>
                        </ul>
                    </div>
                    <div v-if="matchReport.weaknesses?.length" class="p-2 rounded bg-red-50 dark:bg-red-900/20">
                        <p class="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Gaps ({{ matchReport.weaknesses.length }})</p>
                        <ul class="text-xs text-red-600 dark:text-red-400 space-y-0.5">
                            <li v-for="(w, i) in matchReport.weaknesses.slice(0, 3)" :key="i" class="truncate">• {{ w }}</li>
                        </ul>
                    </div>
                </div>

                <!-- Full Content -->
                <div class="mt-3 prose prose-sm dark:prose-invert max-w-none max-h-64 overflow-y-auto" v-html="matchReport.content" />

                <!-- Actions -->
                <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar :size="12" />
                        {{ formatDate(matchReport.lastModified || matchReport.createdAt) }}
                    </div>
                    <div class="flex items-center gap-1">
                        <button @click="handleEdit('matchReport')" class="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit">
                            <Edit :size="16" />
                        </button>
                        <button @click="handleRegenerate('matchReport')" class="p-1.5 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Regenerate">
                            <RefreshCw :size="16" />
                        </button>
                        <button @click="handleDelete('matchReport')" class="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Delete">
                            <Trash2 :size="16" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Company Research Section -->
        <div v-if="companyResearch" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
                @click="toggleSection('companyResearch')"
                class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
                <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                        <Building :size="20" class="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div class="text-left">
                        <h3 class="font-semibold text-gray-900 dark:text-white">Company Research</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ companyResearch.companyName || 'Company details' }}
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span v-if="companyResearch.legitimacyScore !== null" class="text-xs px-2 py-0.5 rounded-full" :class="{
                        'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300': companyResearch.legitimacyScore >= 70,
                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300': companyResearch.legitimacyScore >= 50 && companyResearch.legitimacyScore < 70,
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300': companyResearch.legitimacyScore < 50
                    }">
                        Legitimacy: {{ companyResearch.legitimacyScore }}%
                    </span>
                    <component :is="expandedSections.companyResearch ? ChevronDown : ChevronRight" :size="20" class="text-gray-400" />
                </div>
            </button>

            <div v-if="expandedSections.companyResearch" class="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                <!-- Red Flags Warning -->
                <div v-if="companyResearch.redFlags?.length" class="mt-3 p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p class="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2 mb-2">
                        <AlertTriangle :size="16" />
                        Red Flags Detected
                    </p>
                    <ul class="text-xs text-red-600 dark:text-red-400 space-y-1">
                        <li v-for="(flag, i) in companyResearch.redFlags" :key="i">• {{ flag }}</li>
                    </ul>
                </div>

                <!-- Content -->
                <div class="mt-3 prose prose-sm dark:prose-invert max-w-none max-h-64 overflow-y-auto" v-html="companyResearch.content" />

                <!-- Actions -->
                <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar :size="12" />
                        {{ formatDate(companyResearch.lastModified || companyResearch.createdAt) }}
                    </div>
                    <div class="flex items-center gap-1">
                        <button @click="handleEdit('companyResearch')" class="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit">
                            <Edit :size="16" />
                        </button>
                        <button @click="handleRegenerate('companyResearch')" class="p-1.5 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Regenerate">
                            <RefreshCw :size="16" />
                        </button>
                        <button @click="handleDelete('companyResearch')" class="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700" title="Delete">
                            <Trash2 :size="16" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Custom Context Entries Section -->
        <div v-if="customContextEntries.length > 0" class="space-y-3">
            <!-- Header with Add Button -->
            <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Custom Context</h4>
                <button
                    @click="handleAddCustomContext"
                    class="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="Add new context entry"
                >
                    <Plus :size="14" />
                    Add Entry
                </button>
            </div>

            <!-- Custom Context Items Grid -->
            <div class="flex flex-wrap gap-2">
                <button
                    v-for="entry in customContextEntries"
                    :key="entry.key"
                    @click="handleViewCustomContext(entry.key)"
                    class="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 transition-colors group"
                    :title="`Click to view ${formatContextKey(entry.key)}`"
                >
                    <div class="p-1.5 rounded bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                        <FileText :size="16" class="text-purple-600 dark:text-purple-400" />
                    </div>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">{{ formatContextKey(entry.key) }}</span>
                </button>
            </div>
        </div>

        <!-- Add Entry Button (when no custom entries exist yet) -->
        <div v-else-if="hasAnyContext" class="text-center py-4">
            <button
                @click="handleAddCustomContext"
                class="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
                <Plus :size="16" />
                Add Custom Context Entry
            </button>
        </div>
    </div>
</template>

<style scoped>
@reference "tailwindcss";

.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3),
.prose :deep(h4) {
    @apply font-semibold mt-2 mb-1;
}

.prose :deep(h2) {
    @apply text-sm;
}

.prose :deep(h3),
.prose :deep(h4) {
    @apply text-xs;
}

.prose :deep(ul),
.prose :deep(ol) {
    @apply pl-4 my-1;
}

.prose :deep(li) {
    @apply my-0.5 text-xs;
}

.prose :deep(p) {
    @apply my-1 text-xs;
}
</style>

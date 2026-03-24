<script setup>
import { ref, computed } from 'vue'
import { useSystemPromptsStore, PROMPT_TYPES, DEFAULT_PROMPTS } from '../stores/systemPrompts'
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Edit,
  Briefcase,
  Target,
  Building,
  Mail,
  Tag
} from 'lucide-vue-next'

const systemPromptsStore = useSystemPromptsStore()

// Predefined tab icon mapping
const PREDEFINED_ICONS = {
  [PROMPT_TYPES.JOB_ANALYSIS]: Briefcase,
  [PROMPT_TYPES.MATCH_REPORT]: Target,
  [PROMPT_TYPES.COMPANY_RESEARCH]: Building,
  [PROMPT_TYPES.CV_GENERATION]: FileText,
  [PROMPT_TYPES.COVER_LETTER]: Mail
}

// Local state
const activeTab = ref(PROMPT_TYPES.JOB_ANALYSIS)
const expandedPromptId = ref(null)
const editingPromptId = ref(null)
const editContent = ref('')
const editName = ref('')
const showNewPromptForm = ref(false)
const newPromptName = ref('')
const newPromptContent = ref('')

// Category creation state
const showNewCategoryForm = ref(false)
const newCategoryName = ref('')
const newCategoryKey = ref('')
const newCategoryDefaultPrompt = ref('')
const categoryError = ref('')

// Dynamic tab configuration computed from store
const TABS = computed(() => {
  const categories = systemPromptsStore.listCategories()
  return categories.map((cat) => ({
    id: cat.key,
    name: cat.name,
    icon: PREDEFINED_ICONS[cat.key] || Tag,
    isDefault: cat.isDefault
  }))
})

// Computed
const currentPrompts = computed(() => {
  return systemPromptsStore.getAllPrompts(activeTab.value)
})

const activePrompt = computed(() => {
  return systemPromptsStore.getActivePrompt(activeTab.value)
})

// Methods
const selectTab = (tabId) => {
  activeTab.value = tabId
  expandedPromptId.value = null
  editingPromptId.value = null
  showNewPromptForm.value = false
}

const toggleExpand = (promptId) => {
  if (expandedPromptId.value === promptId) {
    expandedPromptId.value = null
  } else {
    expandedPromptId.value = promptId
  }
}

const setActivePrompt = (promptId) => {
  systemPromptsStore.setActivePrompt(activeTab.value, promptId)
}

const startEdit = (prompt) => {
  editingPromptId.value = prompt.id
  editContent.value = prompt.content
  editName.value = prompt.name
}

const cancelEdit = () => {
  editingPromptId.value = null
  editContent.value = ''
  editName.value = ''
}

const saveEdit = () => {
  if (!editingPromptId.value || editingPromptId.value === 'default') return

  systemPromptsStore.updateCustomPrompt(activeTab.value, editingPromptId.value, {
    name: editName.value,
    content: editContent.value
  })

  cancelEdit()
}

const duplicatePrompt = (promptId) => {
  const newId = systemPromptsStore.duplicatePrompt(activeTab.value, promptId)
  if (newId) {
    expandedPromptId.value = newId
    startEdit(systemPromptsStore.getAllPrompts(activeTab.value).find((p) => p.id === newId))
  }
}

const deletePrompt = (promptId) => {
  if (promptId === 'default') return

  if (confirm('Are you sure you want to delete this prompt?')) {
    systemPromptsStore.deleteCustomPrompt(activeTab.value, promptId)
    if (expandedPromptId.value === promptId) {
      expandedPromptId.value = null
    }
  }
}

const resetToDefault = () => {
  if (
    confirm(
      'Reset to default prompt? Your selection will change but custom prompts will be preserved.'
    )
  ) {
    systemPromptsStore.resetToDefault(activeTab.value)
  }
}

const showNewForm = () => {
  showNewPromptForm.value = true
  newPromptName.value = ''
  newPromptContent.value = DEFAULT_PROMPTS[activeTab.value] || ''
}

// Category management
const autoGenerateKey = () => {
  newCategoryKey.value = newCategoryName.value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 64)
}

const showNewCategoryModal = () => {
  showNewCategoryForm.value = true
  newCategoryName.value = ''
  newCategoryKey.value = ''
  newCategoryDefaultPrompt.value = ''
  categoryError.value = ''
}

const cancelNewCategory = () => {
  showNewCategoryForm.value = false
  newCategoryName.value = ''
  newCategoryKey.value = ''
  newCategoryDefaultPrompt.value = ''
  categoryError.value = ''
}

const createCategory = () => {
  if (!newCategoryName.value.trim() || !newCategoryKey.value.trim()) {
    categoryError.value = 'Name and key are required.'
    return
  }
  if (!newCategoryDefaultPrompt.value.trim()) {
    categoryError.value = 'Default prompt content is required.'
    return
  }
  const result = systemPromptsStore.addCategory(
    newCategoryKey.value.trim(),
    newCategoryName.value.trim(),
    newCategoryDefaultPrompt.value.trim()
  )
  if (!result.success) {
    categoryError.value = result.error
    return
  }
  activeTab.value = newCategoryKey.value.trim()
  cancelNewCategory()
}

const deleteCategory = (key) => {
  if (confirm('Delete this category and all its prompts? This cannot be undone.')) {
    const result = systemPromptsStore.removeCategory(key)
    if (result.success && activeTab.value === key) {
      activeTab.value = PROMPT_TYPES.JOB_ANALYSIS
    }
  }
}

const isCustomCategory = computed(() => {
  const tab = TABS.value.find((t) => t.id === activeTab.value)
  return tab && !tab.isDefault
})

const cancelNewPrompt = () => {
  showNewPromptForm.value = false
  newPromptName.value = ''
  newPromptContent.value = ''
}

const createNewPrompt = () => {
  if (!newPromptName.value.trim()) return

  const newId = systemPromptsStore.addCustomPrompt(
    activeTab.value,
    newPromptName.value.trim(),
    newPromptContent.value
  )

  if (newId) {
    showNewPromptForm.value = false
    newPromptName.value = ''
    newPromptContent.value = ''
    expandedPromptId.value = newId
  }
}

const truncateContent = (content, maxLength = 150) => {
  if (!content) return ''
  const stripped = content.replace(/<[^>]+>/g, '').replace(/\n/g, ' ')
  if (stripped.length <= maxLength) return stripped
  return stripped.substring(0, maxLength) + '...'
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Tabs -->
    <div
      class="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
    >
      <button
        v-for="tab in TABS"
        :key="tab.id"
        @click="selectTab(tab.id)"
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors',
          activeTab === tab.id
            ? 'bg-blue-600 text-white'
            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
        ]"
      >
        <component :is="tab.icon" :size="14" />
        <span class="hidden sm:inline">{{ tab.name }}</span>
      </button>
      <button
        @click="showNewCategoryModal"
        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 border border-dashed border-gray-300 dark:border-gray-600"
        title="Add Category"
      >
        <Plus :size="14" />
        <span class="hidden sm:inline">Category</span>
      </button>
    </div>

    <!-- New Category Form -->
    <div
      v-if="showNewCategoryForm"
      class="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800"
    >
      <h4 class="font-medium text-gray-900 dark:text-white mb-3">New Category</h4>
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >Category Name</label
          >
          <input
            v-model="newCategoryName"
            @input="autoGenerateKey"
            type="text"
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            placeholder="e.g. Technical Review"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >Key (auto-generated)</label
          >
          <input
            v-model="newCategoryKey"
            type="text"
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
            placeholder="e.g. technical-review"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Lowercase, alphanumeric, hyphens only.
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >Default Prompt</label
          >
          <textarea
            v-model="newCategoryDefaultPrompt"
            rows="6"
            :class="[
              'w-full rounded-lg border bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono',
              categoryError && !newCategoryDefaultPrompt.trim()
                ? 'border-red-400 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-600'
            ]"
            placeholder="Enter the default system prompt for this category..."
          />
        </div>
        <p v-if="categoryError" class="text-xs text-red-600 dark:text-red-400">
          {{ categoryError }}
        </p>
        <div class="flex items-center gap-2">
          <button
            @click="createCategory"
            :disabled="!newCategoryName.trim() || !newCategoryKey.trim()"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Check :size="16" />
            Create
          </button>
          <button
            @click="cancelNewCategory"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
          >
            <X :size="16" />
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Active Prompt Indicator -->
      <div
        class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Check :size="16" class="text-blue-600 dark:text-blue-400" />
            <span class="text-sm text-blue-800 dark:text-blue-200">
              Active: <strong>{{ activePrompt?.name || 'Default' }}</strong>
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="activePrompt?.id !== 'default'"
              @click="resetToDefault"
              class="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw :size="12" />
              Reset to Default
            </button>
            <button
              v-if="isCustomCategory"
              @click="deleteCategory(activeTab)"
              class="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
            >
              <Trash2 :size="12" />
              Delete Category
            </button>
          </div>
        </div>
      </div>

      <!-- New Prompt Form -->
      <div
        v-if="showNewPromptForm"
        class="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <h4 class="font-medium text-gray-900 dark:text-white mb-3">Create New Prompt</h4>

        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prompt Name
            </label>
            <input
              v-model="newPromptName"
              type="text"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              placeholder="My Custom Prompt"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prompt Content
            </label>
            <textarea
              v-model="newPromptContent"
              rows="10"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
              placeholder="Enter your system prompt..."
            />
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="createNewPrompt"
              :disabled="!newPromptName.trim()"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Check :size="16" />
              Create Prompt
            </button>
            <button
              @click="cancelNewPrompt"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
            >
              <X :size="16" />
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Add New Button -->
      <button
        v-if="!showNewPromptForm"
        @click="showNewForm"
        class="w-full mb-4 flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
      >
        <Plus :size="20" />
        Create New Prompt
      </button>

      <!-- Prompts List -->
      <div class="space-y-2">
        <div
          v-for="prompt in currentPrompts"
          :key="prompt.id"
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <!-- Prompt Header -->
          <div
            class="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            @click="toggleExpand(prompt.id)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <button
                @click.stop="setActivePrompt(prompt.id)"
                :class="[
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  activePrompt?.id === prompt.id
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                ]"
              >
                <Check v-if="activePrompt?.id === prompt.id" :size="12" class="text-white" />
              </button>

              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900 dark:text-white">{{ prompt.name }}</span>
                  <span
                    v-if="prompt.isDefault"
                    class="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  >
                    Default
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {{ truncateContent(prompt.content) }}
                </p>
              </div>
            </div>

            <component
              :is="expandedPromptId === prompt.id ? ChevronDown : ChevronRight"
              :size="20"
              class="text-gray-400 flex-shrink-0"
            />
          </div>

          <!-- Expanded Content -->
          <div
            v-if="expandedPromptId === prompt.id"
            class="border-t border-gray-100 dark:border-gray-700"
          >
            <!-- Edit Mode -->
            <div v-if="editingPromptId === prompt.id && !prompt.isDefault" class="p-4 space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >Name</label
                >
                <input
                  v-model="editName"
                  type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >Content</label
                >
                <textarea
                  v-model="editContent"
                  rows="12"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
                />
              </div>

              <div class="flex items-center gap-2">
                <button
                  @click="saveEdit"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Check :size="16" />
                  Save
                </button>
                <button
                  @click="cancelEdit"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                >
                  <X :size="16" />
                  Cancel
                </button>
              </div>
            </div>

            <!-- View Mode -->
            <div v-else class="p-4">
              <pre
                class="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900 p-3 rounded max-h-64 overflow-y-auto"
                >{{ prompt.content }}</pre
              >

              <div class="flex items-center gap-2 mt-4">
                <button
                  @click="setActivePrompt(prompt.id)"
                  :disabled="activePrompt?.id === prompt.id"
                  class="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
                >
                  <Check :size="14" />
                  {{ activePrompt?.id === prompt.id ? 'Active' : 'Use This' }}
                </button>

                <button
                  @click="duplicatePrompt(prompt.id)"
                  class="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Duplicate"
                >
                  <Copy :size="16" />
                </button>

                <button
                  v-if="!prompt.isDefault"
                  @click="startEdit(prompt)"
                  class="p-2 text-gray-500 hover:text-green-600 dark:hover:text-green-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Edit"
                >
                  <Edit :size="16" />
                </button>

                <button
                  v-if="!prompt.isDefault"
                  @click="deletePrompt(prompt.id)"
                  class="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Delete"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

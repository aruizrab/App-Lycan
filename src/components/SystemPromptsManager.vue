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
  <div class="sp-root">
    <!-- ——— CATEGORY ——— -->
    <div class="label-line">Category</div>

    <div class="sp-tabs">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        class="sp-tab"
        :class="{ active: activeTab === tab.id }"
        type="button"
        @click="selectTab(tab.id)"
      >
        <component :is="tab.icon" :size="13" />
        {{ tab.name }}
      </button>
      <button
        class="sp-tab sp-tab--add"
        type="button"
        title="Add Category"
        @click="showNewCategoryModal"
      >
        <Plus :size="13" /> Category
      </button>
    </div>

    <!-- New Category Form -->
    <div v-if="showNewCategoryForm" class="sp-form-box">
      <div class="label-line">New Category</div>
      <div class="field">
        <label>Category Name</label>
        <input
          v-model="newCategoryName"
          type="text"
          class="g-input"
          placeholder="e.g. Technical Review"
          @input="autoGenerateKey"
        />
      </div>
      <div class="field">
        <label>Key (auto-generated)</label>
        <input
          v-model="newCategoryKey"
          type="text"
          class="g-input sp-mono"
          placeholder="e.g. technical-review"
        />
        <span class="sp-hint">Lowercase, alphanumeric, hyphens only.</span>
      </div>
      <div class="field">
        <label>Default Prompt</label>
        <textarea
          v-model="newCategoryDefaultPrompt"
          rows="5"
          class="g-textarea sp-mono"
          :class="{ 'sp-error-border': categoryError && !newCategoryDefaultPrompt.trim() }"
          placeholder="Enter the default system prompt for this category…"
        />
      </div>
      <p v-if="categoryError" class="sp-error-text">{{ categoryError }}</p>
      <div class="sp-btns">
        <button
          class="btn btn-primary btn-small"
          type="button"
          :disabled="!newCategoryName.trim() || !newCategoryKey.trim()"
          @click="createCategory"
        >
          <Check :size="14" /> Create
        </button>
        <button class="btn btn-ghost btn-small" type="button" @click="cancelNewCategory">
          <X :size="14" /> Cancel
        </button>
      </div>
    </div>

    <!-- ——— ACTIVE PROMPT ——— -->
    <div class="label-line">Active Prompt</div>

    <div class="sp-active-bar">
      <div class="sp-active-info">
        <Check :size="14" class="sp-check-icon" />
        <span>{{ activePrompt?.name || 'Default' }}</span>
      </div>
      <div class="sp-active-actions">
        <button
          v-if="activePrompt?.id !== 'default'"
          class="btn btn-ghost btn-xs"
          type="button"
          @click="resetToDefault"
        >
          <RotateCcw :size="12" /> Reset
        </button>
        <button
          v-if="isCustomCategory"
          class="btn btn-ghost btn-xs sp-danger"
          type="button"
          @click="deleteCategory(activeTab)"
        >
          <Trash2 :size="12" /> Delete Category
        </button>
      </div>
    </div>

    <!-- ——— PROMPTS ——— -->
    <div class="label-line">Prompts</div>

    <!-- New Prompt Form -->
    <div v-if="showNewPromptForm" class="sp-form-box">
      <div class="field">
        <label>Prompt Name</label>
        <input v-model="newPromptName" type="text" class="g-input" placeholder="My Custom Prompt" />
      </div>
      <div class="field">
        <label>Content</label>
        <textarea
          v-model="newPromptContent"
          rows="8"
          class="g-textarea sp-mono"
          placeholder="Enter your system prompt…"
        />
      </div>
      <div class="sp-btns">
        <button
          class="btn btn-primary btn-small"
          type="button"
          :disabled="!newPromptName.trim()"
          @click="createNewPrompt"
        >
          <Check :size="14" /> Create Prompt
        </button>
        <button class="btn btn-ghost btn-small" type="button" @click="cancelNewPrompt">
          <X :size="14" /> Cancel
        </button>
      </div>
    </div>

    <button v-if="!showNewPromptForm" class="sp-add-prompt-btn" type="button" @click="showNewForm">
      <Plus :size="16" /> Create New Prompt
    </button>

    <!-- Prompts list -->
    <div class="sp-prompts">
      <div
        v-for="prompt in currentPrompts"
        :key="prompt.id"
        class="sp-prompt"
        :class="{ expanded: expandedPromptId === prompt.id }"
      >
        <!-- Prompt row -->
        <div class="sp-prompt-row" @click="toggleExpand(prompt.id)">
          <button
            class="sp-radio"
            :class="{ active: activePrompt?.id === prompt.id }"
            type="button"
            @click.stop="setActivePrompt(prompt.id)"
          >
            <Check v-if="activePrompt?.id === prompt.id" :size="11" />
          </button>
          <div class="sp-prompt-meta">
            <span class="sp-prompt-name">{{ prompt.name }}</span>
            <span v-if="prompt.isDefault" class="sp-default-badge">Default</span>
            <span class="sp-prompt-preview">{{ truncateContent(prompt.content) }}</span>
          </div>
          <component
            :is="expandedPromptId === prompt.id ? ChevronDown : ChevronRight"
            :size="16"
            class="sp-chevron"
          />
        </div>

        <!-- Expanded: Edit mode -->
        <div
          v-if="
            expandedPromptId === prompt.id && editingPromptId === prompt.id && !prompt.isDefault
          "
          class="sp-expanded"
        >
          <div class="field">
            <label>Name</label>
            <input v-model="editName" type="text" class="g-input" />
          </div>
          <div class="field">
            <label>Content</label>
            <textarea v-model="editContent" rows="10" class="g-textarea sp-mono" />
          </div>
          <div class="sp-btns">
            <button class="btn btn-primary btn-small" type="button" @click="saveEdit">
              <Check :size="14" /> Save
            </button>
            <button class="btn btn-ghost btn-small" type="button" @click="cancelEdit">
              <X :size="14" /> Cancel
            </button>
          </div>
        </div>

        <!-- Expanded: View mode -->
        <div v-else-if="expandedPromptId === prompt.id" class="sp-expanded">
          <pre class="sp-pre">{{ prompt.content }}</pre>
          <div class="sp-view-actions">
            <button
              class="btn btn-primary btn-small"
              type="button"
              :disabled="activePrompt?.id === prompt.id"
              @click="setActivePrompt(prompt.id)"
            >
              <Check :size="14" />
              {{ activePrompt?.id === prompt.id ? 'Active' : 'Use This' }}
            </button>
            <button
              class="btn btn-ghost btn-small"
              type="button"
              title="Duplicate"
              @click="duplicatePrompt(prompt.id)"
            >
              <Copy :size="14" />
            </button>
            <button
              v-if="!prompt.isDefault"
              class="btn btn-ghost btn-small"
              type="button"
              title="Edit"
              @click="startEdit(prompt)"
            >
              <Edit :size="14" />
            </button>
            <button
              v-if="!prompt.isDefault"
              class="btn btn-ghost btn-small sp-danger"
              type="button"
              title="Delete"
              @click="deletePrompt(prompt.id)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sp-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
}

/* Tabs */
.sp-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.sp-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid color-mix(in oklch, var(--fg-0) 10%, transparent);
  background: color-mix(in oklch, var(--fg-0) 3%, transparent);
  color: var(--fg-2);
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}
.sp-tab:hover {
  background: color-mix(in oklch, var(--fg-0) 8%, transparent);
  color: var(--fg-0);
}
.sp-tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.sp-tab--add {
  border-style: dashed;
  color: var(--fg-3);
}

/* Category form / prompt form */
.sp-form-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  background: color-mix(in oklch, var(--fg-0) 3%, transparent);
  border: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
}
.sp-hint {
  font-size: 12px;
  color: var(--fg-3);
}
.sp-error-text {
  font-size: 12px;
  color: var(--danger);
}
.sp-error-border {
  border-color: var(--danger) !important;
}
.sp-mono {
  font-family: var(--font-mono);
  font-size: 12px;
}
.sp-btns {
  display: flex;
  gap: 8px;
}
.sp-btns .btn {
  flex: 1;
  justify-content: center;
}

/* Active prompt bar */
.sp-active-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in oklch, var(--accent) 6%, transparent);
  border: 1px solid color-mix(in oklch, var(--accent) 15%, transparent);
  font-size: 13px;
}
.sp-active-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--fg-0);
  font-weight: 500;
}
.sp-check-icon {
  color: var(--accent);
  flex-shrink: 0;
}
.sp-active-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sp-danger {
  color: var(--danger) !important;
}

/* Add prompt button */
.sp-add-prompt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px dashed color-mix(in oklch, var(--fg-0) 15%, transparent);
  background: none;
  color: var(--fg-3);
  font-size: 13px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
}
.sp-add-prompt-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in oklch, var(--accent) 5%, transparent);
}

/* Prompt list */
.sp-prompts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sp-prompt {
  border-radius: 12px;
  border: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
  background: color-mix(in oklch, var(--fg-0) 2%, transparent);
  overflow: hidden;
  transition: border-color 0.15s;
}
.sp-prompt.expanded {
  border-color: color-mix(in oklch, var(--accent) 30%, transparent);
}

.sp-prompt-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.12s;
}
.sp-prompt-row:hover {
  background: color-mix(in oklch, var(--fg-0) 4%, transparent);
}

.sp-radio {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid color-mix(in oklch, var(--fg-0) 20%, transparent);
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
  margin-top: 2px;
}
.sp-radio:hover {
  border-color: var(--accent);
}
.sp-radio.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.sp-prompt-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sp-prompt-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--fg-0);
  display: flex;
  align-items: center;
  gap: 6px;
}
.sp-default-badge {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 6px;
  background: color-mix(in oklch, var(--fg-0) 10%, transparent);
  color: var(--fg-2);
}
.sp-prompt-preview {
  font-size: 11px;
  color: var(--fg-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sp-chevron {
  color: var(--fg-3);
  flex-shrink: 0;
  margin-top: 3px;
}

/* Expanded content */
.sp-expanded {
  padding: 12px;
  border-top: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sp-pre {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-1);
  background: color-mix(in oklch, var(--fg-0) 4%, transparent);
  border: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
  border-radius: 8px;
  padding: 10px 12px;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
.sp-view-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sp-view-actions .btn:first-child {
  flex: 1;
  justify-content: center;
}
</style>

<script setup>
import { ref, computed, watch } from 'vue'
import { useSettingsStore, AI_COMMAND_TYPES } from '../stores/settings'
import { storeToRefs } from 'pinia'
import ModelDropdown from './ModelDropdown.vue'
import { Plus, Trash2, Globe, Check, X, Info, RefreshCw } from 'lucide-vue-next'

const settingsStore = useSettingsStore()
const {
  openRouterKey,
  openRouterModel,
  taskModels,
  customModels,
  matchReportThreshold,
  contextThreshold,
  summaryModel,
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
    requiresWebSearch: false
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
  const model = customModels.value.find((m) => m.id === modelId)
  if (model) {
    settingsStore.updateCustomModel(modelId, {
      webSearchCompatible: !model.webSearchCompatible
    })
  }
}
</script>

<template>
  <div class="ms-root">
    <!-- ——— OPENROUTER ——— -->
    <div class="label-line">OpenRouter</div>

    <div class="ms-section">
      <div class="field">
        <label for="ms-apikey">API Key</label>
        <div class="ms-key-row">
          <input
            id="ms-apikey"
            v-model="openRouterKey"
            type="password"
            class="g-input"
            placeholder="sk-or-..."
          />
          <button
            v-if="openRouterKey"
            class="btn btn-ghost btn-small ms-refresh"
            type="button"
            :disabled="isLoadingModels"
            :title="`Last updated: ${cacheAge}`"
            @click="handleRefreshModels"
          >
            <RefreshCw :size="14" :class="{ 'ms-spin': isLoadingModels }" />
            Refresh
          </button>
        </div>
        <span class="ms-hint">
          Get your key at
          <a href="https://openrouter.ai/keys" target="_blank" class="ms-link"
            >openrouter.ai/keys</a
          >
        </span>
      </div>

      <div v-if="isLoadingModels" class="ms-status ms-status--info">
        Loading available models from OpenRouter…
      </div>
      <div v-else-if="modelsFetchError" class="ms-status ms-status--danger">
        Failed to fetch models: {{ modelsFetchError }}
      </div>
      <div v-else-if="availableModels.length > 0" class="ms-hint">
        {{ availableModels.length }} models available · Last updated: {{ cacheAge }}
      </div>
    </div>

    <!-- ——— DEFAULT MODEL ——— -->
    <div class="label-line">Default Model</div>

    <div class="ms-section">
      <ModelDropdown v-model="openRouterModel" :models="allModels" placeholder="Search models…" />
    </div>

    <!-- ——— TASK MODELS ——— -->
    <div class="label-line">Task Models</div>

    <div class="ms-section">
      <p class="ms-hint ms-hint--top">
        Different models per task. Web-search tasks only show compatible models.
      </p>
      <div v-for="(config, taskType) in COMMAND_LABELS" :key="taskType" class="ms-task">
        <div class="ms-task-label">
          <span class="ms-task-name">{{ config.name }}</span>
          <span v-if="config.requiresWebSearch" class="ms-web-badge">
            <Globe :size="10" /> Web Search
          </span>
          <span class="ms-task-desc">{{ config.description }}</span>
        </div>
        <ModelDropdown
          v-model="taskModels[taskType]"
          :models="allModels"
          :require-web-search="config.requiresWebSearch"
          :show-filters="true"
          placeholder="Search models…"
        />
      </div>
    </div>

    <!-- ——— THRESHOLDS ——— -->
    <div class="label-line">Thresholds</div>

    <div class="ms-section">
      <div class="field">
        <label>Match Threshold</label>
        <div class="ms-slider-row">
          <input
            v-model.number="matchReportThreshold"
            type="range"
            min="0"
            max="100"
            step="5"
            class="ms-range"
          />
          <span class="ms-range-val">{{ matchReportThreshold }}%</span>
        </div>
        <div class="ms-range-labels">
          <span>More matches</span>
          <span>Higher quality</span>
        </div>
        <span class="ms-hint"
          >AI recommends applying when match score is at or above this threshold.</span
        >
      </div>

      <div class="field">
        <label>Context Summarization Threshold</label>
        <div class="ms-slider-row">
          <input
            v-model.number="contextThreshold"
            type="range"
            min="50"
            max="95"
            step="5"
            class="ms-range"
          />
          <span class="ms-range-val">{{ contextThreshold }}%</span>
        </div>
        <div class="ms-range-labels">
          <span>Summarize early</span>
          <span>Use more context</span>
        </div>
        <span class="ms-hint"
          >Older messages are summarized when the context window fills past this point.</span
        >
      </div>
    </div>

    <!-- ——— CONTEXT ——— -->
    <div class="label-line">Context</div>

    <div class="ms-section">
      <ModelDropdown
        v-model="summaryModel"
        :models="allModels"
        label="Summary Model"
        placeholder="Model used for summarization…"
      />
      <span class="ms-hint">A fast, cheap model is recommended for summarizing conversations.</span>
    </div>

    <!-- ——— CUSTOM MODELS ——— -->
    <div class="label-line">Custom Models</div>

    <div class="ms-section">
      <!-- Add model form -->
      <div v-if="showAddModel" class="ms-add-form">
        <div class="field">
          <label>Model ID <span class="ms-req">*</span></label>
          <input
            v-model="newModelId"
            type="text"
            class="g-input"
            placeholder="provider/model-name"
          />
        </div>
        <div class="field">
          <label>Display Name</label>
          <input v-model="newModelName" type="text" class="g-input" placeholder="My Custom Model" />
        </div>
        <div class="toggle-row">
          <span>Supports web search</span>
          <label class="switch">
            <input v-model="newModelWebSearch" type="checkbox" />
            <span class="track"></span>
            <span class="thumb"></span>
          </label>
        </div>
        <div class="ms-form-btns">
          <button
            class="btn btn-primary btn-small"
            type="button"
            :disabled="!newModelId.trim()"
            @click="addCustomModel"
          >
            <Check :size="14" /> Add
          </button>
          <button class="btn btn-ghost btn-small" type="button" @click="showAddModel = false">
            <X :size="14" /> Cancel
          </button>
        </div>
      </div>

      <button
        v-if="!showAddModel"
        class="btn btn-ghost btn-small ms-add-btn"
        type="button"
        @click="showAddModel = true"
      >
        <Plus :size="14" /> Add Custom Model
      </button>

      <!-- List -->
      <div v-if="customModels.length" class="ms-model-list">
        <div v-for="model in customModels" :key="model.id" class="ms-model-item">
          <button
            class="ms-globe-btn"
            type="button"
            :class="{ active: model.webSearchCompatible }"
            :title="model.webSearchCompatible ? 'Web search enabled' : 'Web search disabled'"
            @click="toggleWebSearchCompatibility(model.id)"
          >
            <Globe :size="15" />
          </button>
          <div class="ms-model-info">
            <span class="ms-model-name">{{ model.name }}</span>
            <span class="ms-model-id">{{ model.id }}</span>
          </div>
          <button
            class="ms-del-btn"
            type="button"
            title="Remove"
            @click="removeCustomModel(model.id)"
          >
            <Trash2 :size="15" />
          </button>
        </div>
      </div>
      <p v-else-if="!showAddModel" class="ms-empty">No custom models added yet</p>

      <div class="ms-info-box">
        <Info :size="14" class="ms-info-icon" />
        <p>
          Models with 🌐 can fetch URLs in real-time — required for Job Analysis (URL mode) and
          Company Research. Anthropic, OpenAI, Perplexity, and xAI support native web search.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ms-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
}

.ms-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* API key row */
.ms-key-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.ms-key-row .g-input {
  flex: 1;
}
.ms-refresh {
  flex-shrink: 0;
  white-space: nowrap;
}

/* Hint / caption text */
.ms-hint {
  font-size: 12px;
  color: var(--fg-3);
  line-height: 1.4;
}
.ms-hint--top {
  margin-bottom: -2px;
}
.ms-link {
  color: var(--accent);
  text-decoration: none;
}
.ms-link:hover {
  text-decoration: underline;
}

/* Status banners */
.ms-status {
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid;
}
.ms-status--info {
  color: var(--accent);
  background: color-mix(in oklch, var(--accent) 8%, transparent);
  border-color: color-mix(in oklch, var(--accent) 20%, transparent);
}
.ms-status--danger {
  color: var(--danger);
  background: color-mix(in oklch, var(--danger) 8%, transparent);
  border-color: color-mix(in oklch, var(--danger) 20%, transparent);
}

/* Task models */
.ms-task {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 14px;
  border-bottom: 1px solid color-mix(in oklch, var(--fg-0) 7%, transparent);
}
.ms-task:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.ms-task-label {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ms-task-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--fg-0);
}
.ms-task-desc {
  font-size: 11px;
  color: var(--fg-3);
  width: 100%;
}
.ms-web-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 500;
  background: color-mix(in oklch, var(--accent) 12%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in oklch, var(--accent) 25%, transparent);
}

/* Range sliders */
.ms-slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ms-range {
  flex: 1;
  height: 4px;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 4px;
  background: color-mix(in oklch, var(--fg-0) 12%, transparent);
  outline: none;
  cursor: pointer;
}
.ms-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}
.ms-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}
.ms-range-val {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent);
  font-family: var(--font-mono);
  width: 48px;
  text-align: right;
  flex-shrink: 0;
}
.ms-range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--fg-3);
}

/* Custom model form */
.ms-add-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  background: color-mix(in oklch, var(--fg-0) 3%, transparent);
  border: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
}
.ms-req {
  color: var(--danger);
}
.ms-form-btns {
  display: flex;
  gap: 8px;
}
.ms-form-btns .btn {
  flex: 1;
  justify-content: center;
}

.ms-add-btn {
  align-self: flex-start;
}

/* Custom model list */
.ms-model-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ms-model-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: color-mix(in oklch, var(--fg-0) 3%, transparent);
  border: 1px solid color-mix(in oklch, var(--fg-0) 7%, transparent);
}
.ms-globe-btn {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--fg-3);
  transition:
    color 0.15s,
    background 0.15s;
}
.ms-globe-btn:hover {
  background: color-mix(in oklch, var(--fg-0) 8%, transparent);
}
.ms-globe-btn.active {
  color: var(--accent);
}
.ms-model-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.ms-model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--fg-0);
}
.ms-model-id {
  font-size: 11px;
  color: var(--fg-3);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ms-del-btn {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--fg-3);
  transition:
    color 0.15s,
    background 0.15s;
  flex-shrink: 0;
}
.ms-del-btn:hover {
  color: var(--danger);
  background: color-mix(in oklch, var(--danger) 10%, transparent);
}

.ms-empty {
  font-size: 13px;
  color: var(--fg-3);
  text-align: center;
  padding: 12px 0;
}

/* Info box */
.ms-info-box {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in oklch, var(--accent) 6%, transparent);
  border: 1px solid color-mix(in oklch, var(--accent) 15%, transparent);
  font-size: 12px;
  color: var(--fg-2);
  line-height: 1.5;
}
.ms-info-icon {
  color: var(--accent);
  flex-shrink: 0;
  margin-top: 2px;
}

/* Spinner */
@keyframes ms-spin {
  to {
    transform: rotate(360deg);
  }
}
.ms-spin {
  animation: ms-spin 0.8s linear infinite;
}
</style>

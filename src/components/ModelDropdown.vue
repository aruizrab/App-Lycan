<template>
  <div class="model-dropdown">
    <label v-if="label" class="field-label">{{ label }}</label>

    <div class="md-wrap" :class="{ open: showDropdown }">
      <!-- Trigger / search input -->
      <div class="md-trigger">
        <input
          v-model="searchQuery"
          class="g-input md-input"
          :placeholder="placeholder"
          @focus="showDropdown = true"
          @blur="handleBlur"
        />
        <ChevronDown class="md-chevron" :size="14" />
      </div>

      <!-- Filters row (only when open) -->
      <div v-if="showFilters && showDropdown" class="md-filters">
        <select v-model="filterProvider" class="g-select g-select-sm">
          <option value="">All Providers</option>
          <option v-for="p in availableProviders" :key="p" :value="p">{{ p }}</option>
        </select>
        <select v-model="filterWebSearch" class="g-select g-select-sm">
          <option value="">All Models</option>
          <option value="true">Web Search Only</option>
          <option value="false">No Web Search</option>
        </select>
        <button
          v-if="filterProvider || filterWebSearch"
          class="btn btn-ghost btn-small"
          type="button"
          @mousedown.prevent="clearFilters"
        >
          Clear
        </button>
      </div>

      <!-- Dropdown list -->
      <div v-if="showDropdown && filteredModels.length > 0" class="md-list glass">
        <div
          v-for="model in filteredModels"
          :key="model.id"
          class="md-item"
          :title="model.description || model.id"
          @mousedown.prevent="selectModel(model)"
        >
          <div class="md-item-left">
            <span class="md-item-name">
              {{ model.name }}
              <span
                v-if="model.webSearchCompatible"
                class="md-web-badge"
                title="Supports web search"
                >🌐</span
              >
            </span>
            <span class="md-item-id">{{ model.id }}</span>
          </div>
          <div class="md-item-right">
            <span>{{ formatContextLength(model.contextLength) }}</span>
            <span v-if="model.pricing" class="md-price">
              ${{ (model.pricing.prompt * 1_000_000).toFixed(2) }}/${{
                (model.pricing.completion * 1_000_000).toFixed(2)
              }}
            </span>
          </div>
        </div>
      </div>

      <!-- No results -->
      <div v-if="showDropdown && filteredModels.length === 0" class="md-empty glass">
        No models found
      </div>
    </div>

    <!-- Selected display (closed state) -->
    <p v-if="selectedModel && !showDropdown" class="md-selected">
      Selected: <strong>{{ selectedModel.name }}</strong>
      <span v-if="selectedModel.webSearchCompatible">🌐</span>
    </p>

    <!-- Web search warning -->
    <p v-if="showWebSearchWarning" class="md-warn">
      ⚠ This task requires a model with web search support
    </p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: String, default: '' },
  models: { type: Array, required: true },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Search models…' },
  required: { type: Boolean, default: false },
  requireWebSearch: { type: Boolean, default: false },
  showFilters: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue'])

const searchQuery = ref('')
const showDropdown = ref(false)
const filterProvider = ref('')
const filterWebSearch = ref('')

const selectedModel = computed(() => props.models.find((m) => m.id === props.modelValue))

watch(
  () => props.modelValue,
  (val) => {
    if (val && !showDropdown.value) {
      const m = props.models.find((m) => m.id === val)
      if (m) searchQuery.value = m.name
    }
  },
  { immediate: true }
)

const availableProviders = computed(() => {
  return [...new Set(props.models.map((m) => m.provider).filter(Boolean))].sort()
})

const filteredModels = computed(() => {
  let list = props.models
  if (props.requireWebSearch) list = list.filter((m) => m.webSearchCompatible)
  if (filterProvider.value) list = list.filter((m) => m.provider === filterProvider.value)
  if (filterWebSearch.value !== '')
    list = list.filter((m) => m.webSearchCompatible === (filterWebSearch.value === 'true'))
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
  }
  return list.slice(0, 100)
})

const showWebSearchWarning = computed(
  () => props.requireWebSearch && selectedModel.value && !selectedModel.value.webSearchCompatible
)

const selectModel = (model) => {
  emit('update:modelValue', model.id)
  searchQuery.value = model.name
  showDropdown.value = false
}

const handleBlur = () => {
  setTimeout(() => {
    showDropdown.value = false
    if (selectedModel.value) searchQuery.value = selectedModel.value.name
  }, 200)
}

const clearFilters = () => {
  filterProvider.value = ''
  filterWebSearch.value = ''
}

const formatContextLength = (len) => {
  if (!len) return ''
  if (len >= 1_000_000) return `${(len / 1_000_000).toFixed(1)}M`
  if (len >= 1_000) return `${(len / 1_000).toFixed(0)}K`
  return String(len)
}
</script>

<style scoped>
.model-dropdown {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--fg-2);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.md-wrap {
  position: relative;
}

.md-trigger {
  position: relative;
}
.md-input {
  padding-right: 32px !important;
  cursor: text;
}
.md-chevron {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--fg-2);
  pointer-events: none;
  transition: transform 0.15s;
}
.md-wrap.open .md-chevron {
  transform: translateY(-50%) rotate(180deg);
}

/* Filters */
.md-filters {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.g-select-sm {
  padding: 6px 10px !important;
  font-size: 12px !important;
  border-radius: 8px !important;
  width: auto !important;
  flex: 1;
  min-width: 0;
}

/* Dropdown panel */
.md-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  border-radius: 12px;
  border: 1px solid color-mix(in oklch, var(--fg-0) 12%, transparent);
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
}
.md-empty {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  border-radius: 12px;
  border: 1px solid color-mix(in oklch, var(--fg-0) 12%, transparent);
  padding: 12px 14px;
  font-size: 13px;
  color: var(--fg-2);
}

/* Items */
.md-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
}
.md-item:hover {
  background: color-mix(in oklch, var(--fg-0) 8%, transparent);
}
.md-item-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.md-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--fg-0);
}
.md-item-id {
  font-size: 11px;
  color: var(--fg-2);
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.md-item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}
.md-item-right span {
  font-size: 11px;
  color: var(--fg-2);
  font-family: var(--font-mono);
}
.md-price {
  color: var(--fg-3);
}
.md-web-badge {
  margin-left: 4px;
}

/* Selected / warning */
.md-selected {
  font-size: 12px;
  color: var(--fg-2);
  margin: 0;
}
.md-selected strong {
  color: var(--fg-0);
  font-weight: 500;
}
.md-warn {
  font-size: 12px;
  color: var(--warn);
  margin: 0;
}
</style>

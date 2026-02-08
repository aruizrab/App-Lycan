<template>
  <div class="model-dropdown">
    <label v-if="label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    
    <div class="relative">
      <!-- Search Input -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="placeholder"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-blue-500 focus:border-blue-500"
          @focus="showDropdown = true"
          @blur="handleBlur"
        />
        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <!-- Filters Row -->
      <div v-if="showFilters" class="flex gap-2 mt-2">
        <select
          v-model="filterProvider"
          class="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Providers</option>
          <option v-for="provider in availableProviders" :key="provider" :value="provider">
            {{ provider }}
          </option>
        </select>

        <select
          v-model="filterWebSearch"
          class="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Models</option>
          <option value="true">Web Search Only</option>
          <option value="false">No Web Search</option>
        </select>

        <button
          v-if="filterProvider || filterWebSearch"
          @click="clearFilters"
          class="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          title="Clear filters"
        >
          ✕ Clear
        </button>
      </div>

      <!-- Dropdown List -->
      <div
        v-if="showDropdown && filteredModels.length > 0"
        class="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 overflow-auto"
      >
        <div
          v-for="model in filteredModels"
          :key="model.id"
          class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          :title="model.description || ''"
          @mousedown.prevent="selectModel(model)"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="font-medium text-sm text-gray-900 dark:text-white">
                {{ model.name }}
                <span v-if="model.webSearchCompatible" class="ml-1" title="Supports web search">🌐</span>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ model.id }}
              </div>
            </div>
            <div class="text-xs text-gray-400 dark:text-gray-500 ml-2">
              <div>{{ formatContextLength(model.contextLength) }}</div>
              <div v-if="model.pricing">
                ${{ (model.pricing.prompt * 1000000).toFixed(2) }}/${{ (model.pricing.completion * 1000000).toFixed(2) }} 1M
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div
        v-if="showDropdown && filteredModels.length === 0"
        class="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-3 text-sm text-gray-500 dark:text-gray-400"
      >
        No models found matching your criteria
      </div>
    </div>

    <!-- Selected Model Display -->
    <div v-if="selectedModel && !showDropdown" class="mt-2 text-sm text-gray-600 dark:text-gray-400">
      Selected: <strong>{{ selectedModel.name }}</strong>
      <span v-if="selectedModel.webSearchCompatible" class="ml-1" title="Supports web search">🌐</span>
    </div>

    <!-- Warning for incompatible selection -->
    <div v-if="showWebSearchWarning" class="mt-2 text-sm text-amber-600 dark:text-amber-400 flex items-start gap-1">
      <span>⚠️</span>
      <span>This task requires a model with web search capabilities</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  models: {
    type: Array,
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Search models...'
  },
  required: {
    type: Boolean,
    default: false
  },
  requireWebSearch: {
    type: Boolean,
    default: false
  },
  showFilters: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue'])

const searchQuery = ref('')
const showDropdown = ref(false)
const filterProvider = ref('')
const filterWebSearch = ref('')

// Get selected model object
const selectedModel = computed(() => {
  return props.models.find(m => m.id === props.modelValue)
})

// Initialize search with selected model name
watch(() => props.modelValue, (newVal) => {
  if (newVal && !showDropdown.value) {
    const model = props.models.find(m => m.id === newVal)
    if (model) {
      searchQuery.value = model.name
    }
  }
}, { immediate: true })

// Available providers for filter
const availableProviders = computed(() => {
  const providers = new Set(props.models.map(m => m.provider).filter(Boolean))
  return Array.from(providers).sort()
})

// Filtered models based on search and filters
const filteredModels = computed(() => {
  let filtered = props.models

  // Apply web search requirement
  if (props.requireWebSearch) {
    filtered = filtered.filter(m => m.webSearchCompatible)
  }

  // Apply provider filter
  if (filterProvider.value) {
    filtered = filtered.filter(m => m.provider === filterProvider.value)
  }

  // Apply web search filter
  if (filterWebSearch.value !== '') {
    const requireWebSearch = filterWebSearch.value === 'true'
    filtered = filtered.filter(m => m.webSearchCompatible === requireWebSearch)
  }

  // Apply search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(m => 
      m.name.toLowerCase().includes(query) || 
      m.id.toLowerCase().includes(query)
    )
  }

  return filtered.slice(0, 100) // Limit to 100 results for performance
})

// Warning for web search requirement
const showWebSearchWarning = computed(() => {
  return props.requireWebSearch && selectedModel.value && !selectedModel.value.webSearchCompatible
})

const selectModel = (model) => {
  emit('update:modelValue', model.id)
  searchQuery.value = model.name
  showDropdown.value = false
}

const handleBlur = () => {
  // Delay to allow click on dropdown items
  setTimeout(() => {
    showDropdown.value = false
    // Reset search to selected model name if any
    if (selectedModel.value) {
      searchQuery.value = selectedModel.value.name
    }
  }, 200)
}

const clearFilters = () => {
  filterProvider.value = ''
  filterWebSearch.value = ''
}

const formatContextLength = (length) => {
  if (!length) return 'N/A'
  if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`
  if (length >= 1000) return `${(length / 1000).toFixed(0)}K`
  return length.toString()
}
</script>

<style scoped>
/* Ensure dropdown appears above other elements */
.model-dropdown {
  position: relative;
}
</style>

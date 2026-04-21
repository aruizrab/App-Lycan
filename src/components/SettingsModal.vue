<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        >
          <!-- Header -->
          <div
            class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700"
          >
            <div class="flex items-center gap-2">
              <SettingsIcon class="w-6 h-6 text-gray-900 dark:text-white" />
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">AI Settings</h2>
            </div>
            <button
              @click="close"
              class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <XIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Tab Navigation -->
          <div class="flex gap-2 px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'px-4 py-2 font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              ]"
            >
              <component :is="tab.icon" class="w-4 h-4 inline mr-2" />
              {{ tab.label }}
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- Agents Tab -->
            <div v-if="activeTab === 'agents'">
              <AgentsManager />
            </div>

            <!-- General Settings Tab -->
            <div v-if="activeTab === 'general'" class="space-y-6">
              <!-- OpenRouter Config -->
              <div class="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <SettingsIcon class="w-4 h-4" />
                    OpenRouter Configuration
                  </h3>
                  <button
                    v-if="settingsStore.openRouterKey"
                    @click="settingsStore.refreshModels()"
                    :disabled="settingsStore.isLoadingModels"
                    class="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                  >
                    <RefreshCwIcon
                      class="w-3 h-3"
                      :class="{ 'animate-spin': settingsStore.isLoadingModels }"
                    />
                    Refresh Models
                  </button>
                </div>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      API Key
                    </label>
                    <input
                      v-model="settingsStore.openRouterKey"
                      type="password"
                      class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="sk-or-..."
                    />
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Get your API key from
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        class="text-blue-600 hover:underline"
                        >openrouter.ai/keys</a
                      >
                    </p>
                  </div>
                  <div>
                    <ModelDropdown
                      v-model="settingsStore.openRouterModel"
                      :models="allModels"
                      label="Default Model"
                      placeholder="Search models..."
                    />
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Used for general chat. Each agent can override this with its own model.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Match Threshold -->
              <div class="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
                <h3 class="font-semibold text-gray-900 dark:text-white mb-3">Match Threshold</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  AI will recommend applying to jobs when the match score is at or above this
                  threshold.
                </p>
                <div class="flex items-center gap-4">
                  <input
                    v-model.number="settingsStore.matchReportThreshold"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    class="flex-1"
                  />
                  <span class="text-lg font-bold text-blue-600 dark:text-blue-400 w-16 text-center">
                    {{ settingsStore.matchReportThreshold }}%
                  </span>
                </div>
              </div>

              <!-- Context Management -->
              <div class="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
                <h3 class="font-semibold text-gray-900 dark:text-white mb-3">Context Management</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  When a conversation approaches the model's context limit, older messages are
                  automatically summarized.
                </p>
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Summarization Threshold
                    </label>
                    <div class="flex items-center gap-4">
                      <input
                        v-model.number="settingsStore.contextThreshold"
                        type="range"
                        min="50"
                        max="95"
                        step="5"
                        class="flex-1"
                      />
                      <span
                        class="text-lg font-bold text-blue-600 dark:text-blue-400 w-16 text-center"
                      >
                        {{ settingsStore.contextThreshold }}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <ModelDropdown
                      v-model="settingsStore.summaryModel"
                      :models="allModels"
                      label="Summary Model"
                      placeholder="Model used for summarization..."
                    />
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      A fast, cheap model is recommended for summarizing conversations.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Custom Models -->
              <div class="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold text-gray-900 dark:text-white">Custom Models</h3>
                  <button
                    @click="showAddModel = !showAddModel"
                    class="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <PlusIcon class="w-4 h-4" />
                    Add Model
                  </button>
                </div>

                <div
                  v-if="showAddModel"
                  class="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3"
                >
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
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >Display Name</label
                    >
                    <input
                      v-model="newModelName"
                      type="text"
                      class="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
                      placeholder="My Custom Model"
                    />
                  </div>
                  <label
                    class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    <input
                      v-model="newModelWebSearch"
                      type="checkbox"
                      class="rounded border-gray-300 dark:border-gray-600 text-blue-600"
                    />
                    <GlobeIcon class="w-4 h-4" />
                    Supports web search
                  </label>
                  <div class="flex items-center gap-2 pt-2">
                    <button
                      @click="addCustomModel"
                      :disabled="!newModelId.trim()"
                      class="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                    >
                      <CheckIcon class="w-4 h-4" /> Add
                    </button>
                    <button
                      @click="showAddModel = false"
                      class="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-sm rounded transition-colors"
                    >
                      <XIcon class="w-4 h-4" /> Cancel
                    </button>
                  </div>
                </div>

                <div v-if="settingsStore.customModels.length" class="space-y-2">
                  <div
                    v-for="model in settingsStore.customModels"
                    :key="model.id"
                    class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-750 rounded"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <button
                        @click="toggleWebSearch(model.id)"
                        :class="
                          model.webSearchCompatible
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-gray-400'
                        "
                        class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        :title="
                          model.webSearchCompatible ? 'Web search enabled' : 'Web search disabled'
                        "
                      >
                        <GlobeIcon class="w-4 h-4" />
                      </button>
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {{ model.name }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {{ model.id }}
                        </p>
                      </div>
                    </div>
                    <button
                      @click="settingsStore.removeCustomModel(model.id)"
                      class="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <Trash2Icon class="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div v-else class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No custom models added yet
                </div>
              </div>

              <hr class="border-gray-200 dark:border-gray-700" />

              <!-- Data Management -->
              <div>
                <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                  Data Management
                </h3>
                <div class="space-y-4">
                  <div
                    class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">Export Settings</p>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        Download settings as JSON
                      </p>
                    </div>
                    <button
                      @click="exportSettings"
                      class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <DownloadIcon class="w-4 h-4" /> Export
                    </button>
                  </div>

                  <div
                    class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">Import Settings</p>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        Restore settings from a JSON file
                      </p>
                    </div>
                    <label
                      class="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors cursor-pointer"
                    >
                      <UploadIcon class="w-4 h-4" /> Import
                      <input type="file" accept=".json" @change="importSettings" class="hidden" />
                    </label>
                  </div>

                  <div
                    class="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                  >
                    <div>
                      <p class="font-medium text-red-700 dark:text-red-400">Reset All Settings</p>
                      <p class="text-sm text-red-600 dark:text-red-400">
                        Reset AI settings to defaults
                      </p>
                    </div>
                    <button
                      @click="confirmReset"
                      class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2Icon class="w-4 h-4" /> Reset
                    </button>
                  </div>
                </div>
              </div>

              <hr class="border-gray-200 dark:border-gray-700" />

              <div>
                <h3 class="text-lg font-medium mb-4 text-gray-900 dark:text-white">About</h3>
                <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>App-Lycan UI</strong> - CV & Cover Letter Builder</p>
                  <p class="pt-2">
                    All data is stored locally in your browser. No data is sent to external servers
                    except when using AI features with your OpenRouter API key.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700"
          >
            <button
              @click="close"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSettingsStore } from '../stores/settings'
import AgentsManager from './AgentsManager.vue'
import ModelDropdown from './ModelDropdown.vue'
import {
  Settings as SettingsIcon,
  X as XIcon,
  Bot,
  Sliders,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Trash2 as Trash2Icon,
  Plus as PlusIcon,
  Globe as GlobeIcon,
  Check as CheckIcon,
  RefreshCw as RefreshCwIcon
} from 'lucide-vue-next'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const settingsStore = useSettingsStore()
const activeTab = ref('agents')

const tabs = [
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'general', label: 'General', icon: Sliders }
]

// Custom model form state
const showAddModel = ref(false)
const newModelId = ref('')
const newModelName = ref('')
const newModelWebSearch = ref(false)

const allModels = computed(() => [...settingsStore.availableModels, ...settingsStore.customModels])

const close = () => {
  emit('close')
}

const addCustomModel = () => {
  if (!newModelId.value.trim()) return
  settingsStore.addCustomModel({
    id: newModelId.value.trim(),
    name: newModelName.value.trim() || newModelId.value.trim(),
    webSearchCompatible: newModelWebSearch.value
  })
  newModelId.value = ''
  newModelName.value = ''
  newModelWebSearch.value = false
  showAddModel.value = false
}

const toggleWebSearch = (modelId) => {
  const model = settingsStore.customModels.find((m) => m.id === modelId)
  if (model) {
    settingsStore.updateCustomModel(modelId, { webSearchCompatible: !model.webSearchCompatible })
  }
}

const exportSettings = () => {
  const data = {
    settings: {
      openRouterKey: settingsStore.openRouterKey,
      openRouterModel: settingsStore.openRouterModel,
      customModels: settingsStore.customModels,
      matchReportThreshold: settingsStore.matchReportThreshold,
      contextThreshold: settingsStore.contextThreshold,
      summaryModel: settingsStore.summaryModel
    }
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ai-settings-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const importSettings = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (data.settings) {
      Object.assign(settingsStore, data.settings)
    }

    alert('Settings imported successfully!')
  } catch (error) {
    alert('Failed to import settings: ' + error.message)
  }

  event.target.value = ''
}

const confirmReset = () => {
  if (
    confirm('Are you sure you want to reset all AI settings to defaults? This cannot be undone.')
  ) {
    settingsStore.resetSettings()
    alert('All settings have been reset to defaults.')
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white,
.modal-enter-active .dark\:bg-gray-800,
.modal-leave-active .dark\:bg-gray-800 {
  transition: transform 0.3s ease;
}

.modal-enter-from .bg-white,
.modal-leave-to .bg-white,
.modal-enter-from .dark\:bg-gray-800,
.modal-leave-to .dark\:bg-gray-800 {
  transform: scale(0.95);
}
</style>

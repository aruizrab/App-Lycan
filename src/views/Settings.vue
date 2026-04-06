<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
    <!-- Header -->
    <header
      class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4"
    >
      <div class="max-w-4xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="router.push('/')"
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon class="w-5 h-5" />
          </button>
          <h1 class="text-xl font-semibold flex items-center gap-2">
            <SettingsIcon class="w-6 h-6" />
            AI Settings
          </h1>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto p-4 sm:p-6">
      <!-- Tab Navigation -->
      <div class="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'px-3 sm:px-4 py-2 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          ]"
        >
          <component :is="tab.icon" class="w-4 h-4 inline mr-1 sm:mr-2" />
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <!-- Model Settings Tab -->
        <div v-if="activeTab === 'models'" class="p-6">
          <ModelSettings />
        </div>

        <!-- System Prompts Tab -->
        <div v-if="activeTab === 'prompts'" class="p-6">
          <SystemPromptsManager />
        </div>

        <!-- General Settings Tab -->
        <div v-if="activeTab === 'general'" class="p-6 space-y-6">
          <div>
            <h3 class="text-lg font-medium mb-4">Data Management</h3>

            <div class="space-y-4">
              <div
                class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <p class="font-medium">Export All Settings</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Download all AI settings as JSON
                  </p>
                </div>
                <button
                  @click="exportSettings"
                  class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <DownloadIcon class="w-4 h-4" />
                  Export
                </button>
              </div>

              <div
                class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <p class="font-medium">Import Settings</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Restore settings from a JSON file
                  </p>
                </div>
                <label
                  class="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors cursor-pointer"
                >
                  <UploadIcon class="w-4 h-4" />
                  Import
                  <input type="file" accept=".json" @change="importSettings" class="hidden" />
                </label>
              </div>

              <div
                class="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
              >
                <div>
                  <p class="font-medium text-red-700 dark:text-red-400">Reset All Settings</p>
                  <p class="text-sm text-red-600 dark:text-red-400">
                    This will reset all AI settings to defaults
                  </p>
                </div>
                <button
                  @click="confirmReset"
                  class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2Icon class="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Reset Confirmation Modal -->
    <div
      v-if="showResetConfirm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-2">Confirm Reset</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to reset all AI settings? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-2">
          <button
            @click="showResetConfirm = false"
            class="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="resetAllSettings"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useSystemPromptsStore } from '../stores/systemPrompts'
import ModelSettings from '../components/ModelSettings.vue'
import SystemPromptsManager from '../components/SystemPromptsManager.vue'
import {
  ArrowLeft as ArrowLeftIcon,
  Settings as SettingsIcon,
  Bot as BotIcon,
  MessageSquare as MessageSquareIcon,
  Sliders as SlidersIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Trash2 as Trash2Icon
} from 'lucide-vue-next'

const router = useRouter()
const settingsStore = useSettingsStore()
const systemPromptsStore = useSystemPromptsStore()

const activeTab = ref('models')
const showResetConfirm = ref(false)

const tabs = [
  { id: 'models', label: 'AI Models', icon: BotIcon },
  { id: 'prompts', label: 'System Prompts', icon: MessageSquareIcon },
  { id: 'general', label: 'General', icon: SlidersIcon }
]

// Methods
const exportSettings = () => {
  const data = {
    settings: {
      aiEnabled: settingsStore.aiEnabled,
      taskModels: settingsStore.taskModels,
      matchReportThreshold: settingsStore.matchReportThreshold,
      customModels: settingsStore.customModels
    },
    systemPrompts: {
      customPrompts: systemPromptsStore.customPrompts,
      activePromptIds: systemPromptsStore.activePromptIds
    }
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cv-maker-ai-settings-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importSettings = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)

      if (data.settings) {
        if (data.settings.taskModels) {
          Object.entries(data.settings.taskModels).forEach(([task, model]) => {
            settingsStore.setTaskModel(task, model)
          })
        }
        if (data.settings.matchReportThreshold !== undefined) {
          settingsStore.setMatchReportThreshold(data.settings.matchReportThreshold)
        }
        if (data.settings.customModels) {
          data.settings.customModels.forEach((model) => {
            settingsStore.addCustomModel(model.id, model.name, model.webSearchCompatible)
          })
        }
      }

      if (data.systemPrompts) {
        if (data.systemPrompts.customPrompts) {
          Object.values(data.systemPrompts.customPrompts).forEach((prompt) => {
            systemPromptsStore.createPrompt(prompt.type, prompt.name, prompt.content)
          })
        }
        if (data.systemPrompts.activePromptIds) {
          Object.entries(data.systemPrompts.activePromptIds).forEach(([type, id]) => {
            systemPromptsStore.setActivePrompt(type, id)
          })
        }
      }

      alert('Settings imported successfully!')
    } catch (err) {
      alert('Failed to import settings: ' + err.message)
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

const confirmReset = () => {
  showResetConfirm.value = true
}

const resetAllSettings = () => {
  // Reset settings store
  settingsStore.taskModels = {}
  settingsStore.matchReportThreshold = 70
  settingsStore.customModels = []

  // Reset system prompts
  systemPromptsStore.customPrompts = {}
  systemPromptsStore.activePromptIds = {}

  showResetConfirm.value = false
  alert('All settings have been reset to defaults.')
}
</script>

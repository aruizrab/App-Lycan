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
          <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
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
            <!-- Model Settings Tab -->
            <div v-if="activeTab === 'models'">
              <ModelSettings />
            </div>

            <!-- System Prompts Tab -->
            <div v-if="activeTab === 'prompts'">
              <SystemPromptsManager />
            </div>

            <!-- General Settings Tab -->
            <div v-if="activeTab === 'general'" class="space-y-6">
              <div>
                <h3 class="text-lg font-medium mb-4">Data Management</h3>
                
                <div class="space-y-4">
                  <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p class="font-medium">Export All Settings</p>
                      <p class="text-sm text-gray-500 dark:text-gray-400">Download all AI settings as JSON</p>
                    </div>
                    <button
                      @click="exportSettings"
                      class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <DownloadIcon class="w-4 h-4" />
                      Export
                    </button>
                  </div>

                  <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p class="font-medium">Import Settings</p>
                      <p class="text-sm text-gray-500 dark:text-gray-400">Restore settings from a JSON file</p>
                    </div>
                    <label class="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors cursor-pointer">
                      <UploadIcon class="w-4 h-4" />
                      Import
                      <input type="file" accept=".json" @change="importSettings" class="hidden" />
                    </label>
                  </div>

                  <div class="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div>
                      <p class="font-medium text-red-700 dark:text-red-400">Reset All Settings</p>
                      <p class="text-sm text-red-600 dark:text-red-400">This will reset all AI settings to defaults</p>
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

              <hr class="border-gray-200 dark:border-gray-700" />

              <div>
                <h3 class="text-lg font-medium mb-4">About</h3>
                <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>App-Lycan UI</strong> - CV & Cover Letter Builder</p>
                  <p>Version: 1.0.0</p>
                  <p class="pt-2">All data is stored locally in your browser. No data is sent to external servers except when using AI features with your OpenRouter API key.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
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
import { ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useSystemPromptsStore } from '../stores/systemPrompts'
import ModelSettings from './ModelSettings.vue'
import SystemPromptsManager from './SystemPromptsManager.vue'
import {
  Settings as SettingsIcon,
  X as XIcon,
  Cpu,
  FileText,
  Sliders,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Trash2 as Trash2Icon
} from 'lucide-vue-next'

defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const settingsStore = useSettingsStore()
const systemPromptsStore = useSystemPromptsStore()
const activeTab = ref('models')

const tabs = [
  { id: 'models', label: 'AI Models', icon: Cpu },
  { id: 'prompts', label: 'System Prompts', icon: FileText },
  { id: 'general', label: 'General', icon: Sliders }
]

const close = () => {
  emit('close')
}

const exportSettings = () => {
  const data = {
    settings: {
      openRouterKey: settingsStore.openRouterKey,
      openRouterModel: settingsStore.openRouterModel,
      taskModels: settingsStore.taskModels,
      customModels: settingsStore.customModels,
      matchReportThreshold: settingsStore.matchReportThreshold
    },
    systemPrompts: systemPromptsStore.exportAllPrompts()
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

    // Import settings
    if (data.settings) {
      Object.assign(settingsStore, data.settings)
    }

    // Import system prompts
    if (data.systemPrompts) {
      systemPromptsStore.importAllPrompts(data.systemPrompts)
    }

    alert('Settings imported successfully!')
  } catch (error) {
    alert('Failed to import settings: ' + error.message)
  }

  // Reset file input
  event.target.value = ''
}

const confirmReset = () => {
  if (confirm('Are you sure you want to reset all AI settings to defaults? This cannot be undone.')) {
    settingsStore.resetSettings()
    systemPromptsStore.resetAllToDefaults()
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

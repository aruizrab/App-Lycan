<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-backdrop" @click.self="close">
      <div class="modal lg glass sheen settings-modal" @click.stop>
        <!-- Header -->
        <div class="between">
          <h3>Settings</h3>
          <button class="icon-btn" @click="close" title="Close">
            <XIcon :size="18" />
          </button>
        </div>

        <!-- Two-column layout -->
        <div class="two-col">
          <!-- Side navigation -->
          <nav class="side-nav">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="{ active: activeTab === tab.id }"
            >
              <component :is="tab.icon" :size="16" />
              {{ tab.label }}
            </button>
          </nav>

          <!-- Content pane -->
          <div class="settings-content">
            <!-- Model Settings Tab -->
            <div v-if="activeTab === 'models'">
              <ModelSettings />
            </div>

            <!-- System Prompts Tab -->
            <div v-if="activeTab === 'prompts'">
              <SystemPromptsManager />
            </div>

            <!-- General Settings Tab -->
            <div v-if="activeTab === 'general'" class="settings-general">
              <h4>Data Management</h4>

              <div class="settings-row-group">
                <div class="toggle-row">
                  <div>
                    <p class="row-label">Export All Settings</p>
                    <p class="row-desc">Download all AI settings as JSON</p>
                  </div>
                  <button class="btn btn-ghost btn-small" @click="exportSettings">
                    <DownloadIcon :size="14" />
                    Export
                  </button>
                </div>

                <div class="toggle-row">
                  <div>
                    <p class="row-label">Import Settings</p>
                    <p class="row-desc">Restore settings from a JSON file</p>
                  </div>
                  <label class="btn btn-ghost btn-small import-label">
                    <UploadIcon :size="14" />
                    Import
                    <input
                      type="file"
                      accept=".json"
                      @change="importSettings"
                      style="display: none"
                    />
                  </label>
                </div>

                <div class="toggle-row danger-row">
                  <div>
                    <p class="row-label danger-label">Reset All Settings</p>
                    <p class="row-desc">This will reset all AI settings to defaults</p>
                  </div>
                  <button class="btn btn-ghost btn-small danger-btn" @click="confirmReset">
                    <Trash2Icon :size="14" />
                    Reset
                  </button>
                </div>
              </div>

              <div class="label-line">About</div>

              <div class="about-block">
                <p><strong>App-Lycan UI</strong> &mdash; CV &amp; Cover Letter Builder</p>
                <p>Version: 1.0.0</p>
                <p>
                  All data is stored locally in your browser. No data is sent to external servers
                  except when using AI features with your OpenRouter API key.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="close">Close</button>
          <button class="btn btn-primary" @click="close">Save</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useSystemPromptsStore } from '../stores/systemPrompts'
import ModelSettings from './ModelSettings.vue'
import SystemPromptsManager from './SystemPromptsManager.vue'
import {
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
  if (
    confirm('Are you sure you want to reset all AI settings to defaults? This cannot be undone.')
  ) {
    settingsStore.resetSettings()
    systemPromptsStore.resetAllToDefaults()
    alert('All settings have been reset to defaults.')
  }
}
</script>

<style scoped>
.settings-modal {
  max-height: 80vh;
  overflow: auto;
}
.settings-content {
  min-height: 0;
  overflow-y: auto;
}
.settings-general {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.settings-general h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fg-0);
}
.settings-row-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.row-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg-0);
  margin: 0;
}
.row-desc {
  font-size: 12px;
  color: var(--fg-2);
  margin: 0;
}
.import-label {
  cursor: pointer;
}
.danger-row {
  border-top: 1px solid color-mix(in oklch, var(--danger) 20%, transparent);
  padding-top: 12px;
  margin-top: 4px;
}
.danger-label {
  color: var(--danger);
}
.danger-btn {
  color: var(--danger);
  border-color: color-mix(in oklch, var(--danger) 30%, transparent);
}
.danger-btn:hover {
  background: color-mix(in oklch, var(--danger) 15%, transparent);
}
.about-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.about-block p {
  margin: 0;
  font-size: 13px;
  color: var(--fg-2);
  line-height: 1.5;
}
</style>

<template>
  <div class="space-y-4">
    <!-- Header row -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">AI Agents</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Agents are specialized AI assistants the main agent can summon to perform specific tasks.
        </p>
      </div>
      <button
        @click="startCreate"
        class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        <PlusIcon class="w-4 h-4" />
        New Agent
      </button>
    </div>

    <!-- Agent Editor (create / edit) -->
    <div
      v-if="editingAgent"
      class="bg-white dark:bg-gray-900 rounded-lg border border-blue-300 dark:border-blue-700 shadow-lg p-5 space-y-4"
    >
      <div class="flex items-center justify-between">
        <h4 class="font-semibold text-gray-900 dark:text-white">
          {{ isCreating ? 'New Agent' : `Edit: ${editingAgent.name}` }}
        </h4>
        <button
          @click="cancelEdit"
          class="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <XIcon class="w-5 h-5" />
        </button>
      </div>

      <div
        v-if="editError"
        class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400"
      >
        <AlertCircleIcon class="w-4 h-4 flex-shrink-0" />
        {{ editError }}
      </div>

      <!-- Name -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name <span class="text-red-500">*</span>
        </label>
        <input
          v-model="form.name"
          type="text"
          class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          placeholder="e.g. Job Analysis"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description <span class="text-red-500">*</span>
        </label>
        <textarea
          v-model="form.description"
          rows="3"
          class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-y"
          placeholder="Describe what this agent does, what input it expects, and what it produces. The main agent reads this to decide when and how to summon it."
        />
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          This description is shown to the main agent via
          <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">list_agents</code>.
          Be specific about expected input and output.
        </p>
      </div>

      <!-- System Prompt -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            System Prompt
          </label>
          <div class="flex items-center gap-2">
            <span
              v-if="editingAgent.isBuiltIn && !form.systemPrompt"
              class="text-xs text-gray-400 dark:text-gray-500"
            >
              Using file default
            </span>
            <button
              v-if="editingAgent.isBuiltIn"
              @click="resetSystemPrompt"
              :disabled="loadingPrompt"
              class="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              <RefreshCwIcon class="w-3 h-3" :class="{ 'animate-spin': loadingPrompt }" />
              {{
                editingAgent.systemPrompt === null || editingAgent.systemPrompt === ''
                  ? 'Load default'
                  : 'Reset to default'
              }}
            </button>
          </div>
        </div>
        <textarea
          v-model="form.systemPrompt"
          rows="8"
          class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-y"
          :placeholder="
            editingAgent.isBuiltIn
              ? 'Leave empty to use the built-in default prompt from file.'
              : 'The system prompt given to this agent when it is summoned.'
          "
        />
        <p v-if="!editingAgent.isBuiltIn" class="text-xs text-red-500 dark:text-red-400 mt-1">
          Required for custom agents.
        </p>
      </div>

      <!-- Model & Web Search row -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Model <span class="text-red-500">*</span>
          </label>
          <ModelDropdown v-model="form.model" :models="allModels" placeholder="Search models..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Web Search
          </label>
          <label
            class="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer h-[38px]"
          >
            <input v-model="form.webSearch" type="checkbox" class="rounded" />
            <GlobeIcon class="w-4 h-4 text-gray-500" />
            <span class="text-sm text-gray-700 dark:text-gray-300">Enable web search</span>
          </label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Appends
            <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">:online</code> to the
            model ID
          </p>
        </div>
      </div>

      <!-- Slash Command -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Slash Command <span class="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <div
            class="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500"
          >
            <span
              class="px-2 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm border-r border-gray-300 dark:border-gray-600"
              >/</span
            >
            <input
              v-model="form.slashCommand"
              type="text"
              class="flex-1 bg-white dark:bg-gray-700 px-2 py-2 text-sm focus:outline-none dark:text-white"
              placeholder="e.g. analyze"
            />
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Lowercase letters and hyphens only
          </p>
        </div>
        <div v-if="form.slashCommand">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Slash Command Injection Prompt
          </label>
          <textarea
            v-model="form.slashInjectionPrompt"
            rows="3"
            class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-y"
            placeholder="Message injected to the main agent when /command is used. Falls back to 'Use the {name} agent.'"
          />
        </div>
      </div>

      <!-- Form actions -->
      <div
        class="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700"
      >
        <button
          @click="cancelEdit"
          class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          @click="saveAgent"
          :disabled="isSaving"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <CheckIcon class="w-4 h-4" />
          {{ isCreating ? 'Create Agent' : 'Save Changes' }}
        </button>
      </div>
    </div>

    <!-- Agent List -->
    <div class="space-y-3">
      <!-- Built-in agents -->
      <div v-if="builtInAgents.length">
        <p
          class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2"
        >
          Built-in Agents
        </p>
        <div class="space-y-2">
          <div
            v-for="agent in builtInAgents"
            :key="agent.id"
            class="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium text-gray-900 dark:text-white text-sm">{{
                  agent.name
                }}</span>
                <span
                  v-if="agent.slashCommand"
                  class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full font-mono"
                >
                  <ZapIcon class="w-3 h-3" />/{{ agent.slashCommand }}
                </span>
                <span
                  v-if="agent.webSearch"
                  class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                >
                  <GlobeIcon class="w-3 h-3" />Web Search
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {{ agent.description }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{{ agent.model }}</p>
            </div>
            <div class="flex items-center gap-1 ml-3 flex-shrink-0">
              <button
                @click="startEdit(agent)"
                class="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Edit agent"
              >
                <PencilIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom agents -->
      <div v-if="customAgents.length" class="mt-4">
        <p
          class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2"
        >
          Custom Agents
        </p>
        <div class="space-y-2">
          <div
            v-for="agent in customAgents"
            :key="agent.id"
            class="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium text-gray-900 dark:text-white text-sm">{{
                  agent.name
                }}</span>
                <span
                  v-if="agent.slashCommand"
                  class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full font-mono"
                >
                  <ZapIcon class="w-3 h-3" />/{{ agent.slashCommand }}
                </span>
                <span
                  v-if="agent.webSearch"
                  class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                >
                  <GlobeIcon class="w-3 h-3" />Web Search
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {{ agent.description }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{{ agent.model }}</p>
            </div>
            <div class="flex items-center gap-1 ml-3 flex-shrink-0">
              <button
                @click="startEdit(agent)"
                class="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Edit agent"
              >
                <PencilIcon class="w-4 h-4" />
              </button>
              <button
                @click="deleteAgent(agent)"
                class="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Delete agent"
              >
                <Trash2Icon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="!builtInAgents.length && !customAgents.length"
        class="text-center py-8 text-gray-500 dark:text-gray-400 text-sm"
      >
        No agents configured. Click "New Agent" to create one.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAgentsStore } from '../stores/agents'
import { useSettingsStore } from '../stores/settings'
import { loadAgentPrompt } from '../services/promptLoader'
import ModelDropdown from './ModelDropdown.vue'
import {
  Plus as PlusIcon,
  X as XIcon,
  Check as CheckIcon,
  Globe as GlobeIcon,
  AlertCircle as AlertCircleIcon,
  RefreshCw as RefreshCwIcon,
  Pencil as PencilIcon,
  Trash2 as Trash2Icon,
  Zap as ZapIcon
} from 'lucide-vue-next'

const agentsStore = useAgentsStore()
const settingsStore = useSettingsStore()

// ── Computed ───────────────────────────────────────────
const builtInAgents = computed(() => agentsStore.getBuiltInAgents())
const customAgents = computed(() => agentsStore.getCustomAgents())

const allModels = computed(() => [...settingsStore.availableModels, ...settingsStore.customModels])

// ── Editor state ───────────────────────────────────────
const editingAgent = ref(null)
const isCreating = ref(false)
const editError = ref('')
const isSaving = ref(false)
const loadingPrompt = ref(false)

const form = ref({
  name: '',
  description: '',
  systemPrompt: '',
  model: '',
  webSearch: false,
  slashCommand: '',
  slashInjectionPrompt: ''
})

const startCreate = () => {
  editingAgent.value = {
    id: '__new__',
    isBuiltIn: false,
    systemPrompt: ''
  }
  isCreating.value = true
  editError.value = ''
  form.value = {
    name: '',
    description: '',
    systemPrompt: '',
    model: settingsStore.openRouterModel || 'openai/gpt-4o-mini',
    webSearch: false,
    slashCommand: '',
    slashInjectionPrompt: ''
  }
}

const startEdit = async (agent) => {
  editingAgent.value = agent
  isCreating.value = false
  editError.value = ''

  form.value = {
    name: agent.name,
    description: agent.description || '',
    systemPrompt: agent.systemPrompt || '',
    model: agent.model || settingsStore.openRouterModel || 'openai/gpt-4o-mini',
    webSearch: Boolean(agent.webSearch),
    slashCommand: agent.slashCommand || '',
    slashInjectionPrompt: agent.slashInjectionPrompt || ''
  }

  // If built-in agent with no custom prompt, auto-load the file default for display
  if (agent.isBuiltIn && !agent.systemPrompt) {
    await loadDefaultPrompt(agent.id)
  }
}

const loadDefaultPrompt = async (agentId) => {
  loadingPrompt.value = true
  try {
    const content = await loadAgentPrompt(`agents/${agentId}.md`)
    form.value.systemPrompt = content
  } catch {
    // File not found — leave empty
  } finally {
    loadingPrompt.value = false
  }
}

const resetSystemPrompt = async () => {
  if (!editingAgent.value?.isBuiltIn) return
  form.value.systemPrompt = ''
  await loadDefaultPrompt(editingAgent.value.id)
}

const cancelEdit = () => {
  editingAgent.value = null
  isCreating.value = false
  editError.value = ''
}

const saveAgent = async () => {
  if (isSaving.value) return
  editError.value = ''
  isSaving.value = true

  try {
    const payload = {
      name: form.value.name,
      description: form.value.description,
      systemPrompt: form.value.systemPrompt || null,
      model: form.value.model,
      webSearch: form.value.webSearch,
      slashCommand: form.value.slashCommand || null,
      slashInjectionPrompt: form.value.slashInjectionPrompt || null
    }

    let result
    if (isCreating.value) {
      if (!payload.systemPrompt) {
        editError.value = 'System prompt is required for custom agents.'
        return
      }
      result = agentsStore.createAgent({ ...payload, systemPrompt: payload.systemPrompt })
    } else {
      result = agentsStore.updateAgent(editingAgent.value.id, payload)
    }

    if (!result.success) {
      editError.value = result.error || 'An error occurred.'
      return
    }

    cancelEdit()
  } finally {
    isSaving.value = false
  }
}

const deleteAgent = (agent) => {
  if (agent.isBuiltIn) return
  if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return
  agentsStore.deleteAgent(agent.id)
}
</script>

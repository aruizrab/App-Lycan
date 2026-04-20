<script setup>
import BrandMark from '../components/BrandMark.vue'
import CvForm from '../components/CvForm.vue'
import CvPreview from '../components/CvPreview.vue'
import CoverLetterForm from '../components/CoverLetterForm.vue'
import CoverLetterPreview from '../components/CoverLetterPreview.vue'
import AiStreamingChat from '../components/AiStreamingChat.vue'
import SettingsModal from '../components/SettingsModal.vue'
import { useCvStore } from '../stores/cv'
import { useCoverLetterStore } from '../stores/coverLetter'
import { useWorkspaceStore } from '../stores/workspace'
import { useSettingsModal } from '../composables/useSettingsModal'
import {
  Printer,
  Moon,
  Sun,
  ArrowLeft,
  FileText,
  Settings,
  Sparkles,
  RotateCcw,
  RotateCw,
  Download,
  Edit,
  ChevronRight
} from 'lucide-vue-next'
import { ref, onMounted, computed, watch, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { storeToRefs } from 'pinia'

const props = defineProps({
  documentType: {
    type: String,
    required: true,
    validator: (value) => ['cv', 'cover-letter'].includes(value)
  }
})

const cvStore = useCvStore()
const clStore = useCoverLetterStore()
const workspaceStore = useWorkspaceStore()
const { isSettingsModalOpen, closeSettingsModal } = useSettingsModal()
const route = useRoute()
const router = useRouter()

const isCv = computed(() => props.documentType === 'cv')
const currentDocument = computed(() => (isCv.value ? cvStore.cv : clStore.coverLetter))

const docName = ref('')
const nameError = ref('')
const showSettings = ref(false)
const showAiPanel = ref(false)

// Theme via injected providers from App.vue
const tweaks = inject('tweaks')
const toggleTheme = inject('toggleTheme')

// Watch for AI chat open signal from navigation
watch(
  () => route.query.openAiChat,
  (shouldOpen) => {
    if (shouldOpen === 'true') {
      showAiPanel.value = true
      // Remove the query param to clean up URL
      router.replace({ query: { ...route.query, openAiChat: undefined } })
    }
  },
  { immediate: true }
)

const settingsStore = useSettingsStore()
const {
  atsMode,
  showPictureInAts,
  uppercaseName,
  uppercaseRole,
  uppercaseHeaders,
  uppercaseCoverLetterTitle,
  picturePosition
} = storeToRefs(settingsStore)
const canUndo = computed(() => (isCv.value ? cvStore.canUndo : false))
const canRedo = computed(() => (isCv.value ? cvStore.canRedo : false))

const workspaceName = computed(() => workspaceStore.currentWorkspace || 'Workspace')

const toggleAiPanel = () => {
  showAiPanel.value = !showAiPanel.value
}

// AI Handlers
const handleAiApplyChanges = ({ type, result }) => {
  if (type === 'update_cv' && result) {
    // AI tool updated the CV - it's already applied through the store
    // Just show a notification or refresh if needed
  } else if (type === 'update_cover_letter' && result) {
    // AI tool updated the cover letter
  }
}

// Form Panel Logic
const showFormPanel = ref(true)

// Initialize
onMounted(async () => {
  const name = decodeURIComponent(route.params.name)

  if (isCv.value) {
    cvStore.setCurrentCv(name)
    if (!cvStore.cv) {
      router.push('/')
      return
    }
  } else {
    clStore.setCurrentCoverLetter(name)
    if (!clStore.coverLetter) {
      router.push('/')
      return
    }
  }

  docName.value = name
})

// Handle name change
const updateName = () => {
  const oldName = decodeURIComponent(route.params.name)
  const newName = docName.value.trim()

  if (!newName) {
    docName.value = oldName
    return
  }

  if (newName === oldName) return

  try {
    if (isCv.value) {
      cvStore.updateCvName(oldName, newName)
      cvStore.setCurrentCv(newName)
      router.replace(`/edit/${encodeURIComponent(newName)}`)
    } else {
      clStore.updateCoverLetterName(oldName, newName)
      clStore.setCurrentCoverLetter(newName)
      router.replace(`/cover-letter/${encodeURIComponent(newName)}`)
    }
    nameError.value = ''
  } catch (e) {
    nameError.value = e.message
  }
}

const exportJson = () => {
  if (!currentDocument.value) return
  const dataStr = JSON.stringify({ name: docName.value, data: currentDocument.value }, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${docName.value.replace(/\s+/g, '_')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const print = () => {
  const originalTitle = document.title
  document.title = docName.value || (isCv.value ? 'CV' : 'Cover Letter')
  window.print()
  setTimeout(() => {
    document.title = originalTitle
  }, 100)
}

const goBack = () => {
  const wsName = workspaceStore.currentWorkspace
  if (wsName) {
    router.push(`/workspace/${encodeURIComponent(wsName)}`)
  } else {
    router.push('/')
  }
}

const undo = () => {
  if (isCv.value) cvStore.undo()
}

const redo = () => {
  if (isCv.value) cvStore.redo()
}
</script>

<template>
  <div class="editor-root">
    <!-- AppBar -->
    <header class="appbar glass-chrome print-hidden">
      <div class="appbar-lead">
        <button class="icon-btn" @click="goBack" title="Back">
          <ArrowLeft :size="18" />
        </button>
        <div class="brand" @click="$router.push('/')">
          <BrandMark />
          <span class="brand-name">App&#8209;Lycan <em>editor</em></span>
        </div>
        <div class="breadcrumb">
          <ChevronRight :size="14" />
          <span style="color: var(--fg-2)">{{ workspaceName }}</span>
          <ChevronRight :size="14" />
          <div class="doc-name-wrap">
            <input
              v-model="docName"
              @blur="updateName"
              @keyup.enter="updateName"
              class="doc-name-input"
              :class="{ 'doc-name-error': nameError }"
            />
            <div v-if="nameError" class="name-error">{{ nameError }}</div>
          </div>
        </div>
        <div class="seg" style="margin-left: 8px">
          <button @click="undo" :disabled="!canUndo" title="Undo"><RotateCcw :size="14" /></button>
          <button @click="redo" :disabled="!canRedo" title="Redo"><RotateCw :size="14" /></button>
        </div>
      </div>
      <div class="appbar-trail">
        <div class="seg">
          <button :class="{ active: showFormPanel }" @click="showFormPanel = !showFormPanel">
            <Edit :size="14" /> Editor
          </button>
          <button :class="{ active: showAiPanel }" @click="toggleAiPanel">
            <Sparkles :size="14" /> AI
          </button>
          <button v-if="isCv" :class="{ active: atsMode }" @click="atsMode = !atsMode">
            <FileText :size="14" /> ATS
          </button>
        </div>
        <button class="icon-btn" @click="exportJson" title="Export JSON">
          <Download :size="18" />
        </button>
        <button class="btn btn-primary" @click="print"><Printer :size="14" /> Export PDF</button>
        <button class="icon-btn" @click="toggleTheme" title="Toggle Theme">
          <Moon v-if="tweaks?.theme === 'dark'" :size="18" />
          <Sun v-else :size="18" />
        </button>
        <div style="position: relative">
          <button class="icon-btn" @click="showSettings = !showSettings" title="Settings">
            <Settings :size="18" />
          </button>
          <!-- Settings Dropdown -->
          <div v-if="showSettings" class="settings-dropdown glass">
            <h3 class="settings-title">View Settings</h3>
            <div class="settings-body">
              <label v-if="isCv" class="toggle-row">
                <span>Uppercase Name</span>
                <div class="switch">
                  <input type="checkbox" v-model="uppercaseName" role="switch" />
                  <span class="track"></span>
                  <span class="thumb"></span>
                </div>
              </label>
              <label v-if="isCv" class="toggle-row">
                <span>Uppercase Role</span>
                <div class="switch">
                  <input type="checkbox" v-model="uppercaseRole" role="switch" />
                  <span class="track"></span>
                  <span class="thumb"></span>
                </div>
              </label>
              <label v-if="isCv" class="toggle-row">
                <span>Uppercase Section Headers</span>
                <div class="switch">
                  <input type="checkbox" v-model="uppercaseHeaders" role="switch" />
                  <span class="track"></span>
                  <span class="thumb"></span>
                </div>
              </label>
              <label v-if="!isCv" class="toggle-row">
                <span>Uppercase Title</span>
                <div class="switch">
                  <input type="checkbox" v-model="uppercaseCoverLetterTitle" role="switch" />
                  <span class="track"></span>
                  <span class="thumb"></span>
                </div>
              </label>
              <label
                v-if="isCv"
                class="toggle-row"
                :style="{ opacity: atsMode ? 1 : 0.5, cursor: atsMode ? 'pointer' : 'not-allowed' }"
              >
                <span>Show Picture in ATS Mode</span>
                <div class="switch">
                  <input
                    type="checkbox"
                    v-model="showPictureInAts"
                    :disabled="!atsMode"
                    role="switch"
                  />
                  <span class="track"></span>
                  <span class="thumb"></span>
                </div>
              </label>
              <label v-if="isCv" class="toggle-row">
                <span>Picture Position</span>
                <div class="switch switch-wide">
                  <input
                    type="checkbox"
                    v-model="picturePosition"
                    true-value="right"
                    false-value="left"
                    role="switch"
                  />
                  <span class="track">
                    <span class="track-labels">
                      <span>Left</span>
                      <span>Right</span>
                    </span>
                  </span>
                  <span class="thumb thumb-wide"></span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- 3-pane editor layout -->
    <div
      v-if="currentDocument"
      class="editor-wrap"
      :class="{ 'no-form': !showFormPanel, 'no-ai': !showAiPanel }"
    >
      <!-- Form panel -->
      <div v-if="showFormPanel" class="panel glass">
        <div class="panel-head">
          <h4><span class="pip"></span>Editor</h4>
          <span class="tag">autosaved</span>
        </div>
        <CvForm v-if="isCv" />
        <CoverLetterForm v-else />
      </div>

      <!-- Preview -->
      <div class="preview-stage" style="background: transparent; border: 0; box-shadow: none">
        <CvPreview
          v-if="isCv"
          :ats-mode="atsMode"
          :show-picture-in-ats="showPictureInAts"
          :uppercase-name="uppercaseName"
          :uppercase-role="uppercaseRole"
          :uppercase-headers="uppercaseHeaders"
          :picture-position="picturePosition"
        />
        <CoverLetterPreview v-else :uppercase-title="uppercaseCoverLetterTitle" />
      </div>

      <!-- AI Panel -->
      <div v-if="showAiPanel" class="panel glass ai-panel">
        <AiStreamingChat
          :context-data="isCv ? cvStore.cv : clStore.coverLetter"
          :context-type="isCv ? 'cv' : 'cover-letter'"
          :document-id="isCv ? cvStore.currentCvId : clStore.currentCoverLetterId"
          :show-close="true"
          @close="showAiPanel = false"
          @apply-changes="handleAiApplyChanges"
        />
      </div>
    </div>

    <!-- Loading state -->
    <div v-else class="loading-state">Loading {{ isCv ? 'CV' : 'Cover Letter' }}...</div>

    <!-- Settings Modal -->
    <SettingsModal :is-open="isSettingsModalOpen" @close="closeSettingsModal" />
  </div>
</template>

<style scoped>
.editor-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--fg-0);
}

/* Doc name editable input in breadcrumb */
.doc-name-wrap {
  position: relative;
  min-width: 0;
}
.doc-name-input {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 400;
  letter-spacing: -0.025em;
  line-height: 1;
  color: var(--fg-0);
  background: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  border-radius: 0;
  outline: none;
  padding: 2px 8px;
  width: 100%;
  min-width: 60px;
  transition:
    border-color var(--dur-fast),
    background var(--dur-fast);
}
.doc-name-input:hover {
  background: color-mix(in oklch, var(--fg-0) 6%, transparent);
  border-bottom-color: color-mix(in oklch, var(--fg-0) 20%, transparent);
}
.doc-name-input:focus {
  background: color-mix(in oklch, var(--fg-0) 6%, transparent);
  border-bottom-color: var(--accent);
}
.doc-name-error {
  border-bottom-color: var(--danger) !important;
}
.name-error {
  position: absolute;
  top: 100%;
  left: 0;
  font-size: 11px;
  color: var(--danger);
  margin-top: 2px;
  white-space: nowrap;
}

/* Settings dropdown */
.settings-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  padding: 20px;
  z-index: 50;
  border-color: color-mix(in oklch, var(--accent) 30%, transparent);
}
.settings-title {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 400;
  letter-spacing: -0.02em;
  color: var(--fg-0);
  margin: 0 0 16px;
}
.settings-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
}

/* Wide switch for picture position */
.switch-wide {
  width: 76px;
}
.thumb-wide {
  width: 36px !important;
}
.switch-wide input:checked ~ .thumb-wide {
  transform: translateX(52px) !important;
}
.track-labels {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 500;
  color: var(--fg-2);
  pointer-events: none;
}

/* Loading */
.loading-state {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--fg-2);
  font-size: 15px;
}

/* Print utilities */
.print-hidden {
  /* visible by default */
}
</style>

<style>
@media print {
  body {
    overflow: visible !important;
    height: auto !important;
  }
  .print-hidden {
    display: none !important;
  }
  .editor-wrap {
    display: block !important;
    min-height: auto !important;
  }
  .panel {
    display: none !important;
  }
  .preview-stage {
    padding: 0 !important;
    overflow: visible !important;
  }
  .editor-root {
    min-height: auto !important;
  }
}
</style>

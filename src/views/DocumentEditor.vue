<script setup>
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
import { Printer, Moon, Sun, ArrowLeft, FileText, Settings, Sparkles, RotateCcw, RotateCw, X, Download, Edit } from 'lucide-vue-next'
import { ref, onMounted, computed, watch } from 'vue'
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
const { isSettingsModalOpen, openSettingsModal, closeSettingsModal } = useSettingsModal()
const route = useRoute()
const router = useRouter()

const isCv = computed(() => props.documentType === 'cv')
const store = computed(() => isCv.value ? cvStore : clStore)
const currentDocument = computed(() => isCv.value ? cvStore.cv : clStore.coverLetter)

const docName = ref('')
const nameError = ref('')
const showSettings = ref(false)
const showAiPanel = ref(false)

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
const { atsMode, showPictureInAts, uppercaseName, uppercaseRole, uppercaseHeaders, uppercaseCoverLetterTitle, picturePosition } = storeToRefs(settingsStore)
const canUndo = computed(() => isCv.value ? cvStore.canUndo : false)
const canRedo = computed(() => isCv.value ? cvStore.canRedo : false)

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

const aiPanelWidth = ref(320)
const isResizing = ref(false)

const startResize = () => {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
}

const handleResize = (e) => {
  if (!isResizing.value) return
  const newWidth = window.innerWidth - e.clientX
  if (newWidth > 250 && newWidth < 800) {
    aiPanelWidth.value = newWidth
  }
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// Form Panel Logic
const showFormPanel = ref(true)
const formPanelWidth = ref(450)
const isResizingForm = ref(false)

const startResizeForm = () => {
  isResizingForm.value = true
  document.addEventListener('mousemove', handleResizeForm)
  document.addEventListener('mouseup', stopResizeForm)
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
}

const handleResizeForm = (e) => {
  if (!isResizingForm.value) return
  const newWidth = e.clientX
  if (newWidth > 250 && newWidth < 800) {
    formPanelWidth.value = newWidth
  }
}

const stopResizeForm = () => {
  isResizingForm.value = false
  document.removeEventListener('mousemove', handleResizeForm)
  document.removeEventListener('mouseup', stopResizeForm)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

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

// Theme Logic
const isDark = ref(document.documentElement.classList.contains('dark'))

const toggleTheme = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
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
  const workspaceName = workspaceStore.currentWorkspace
  if (workspaceName) {
    router.push(`/workspace/${encodeURIComponent(workspaceName)}`)
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
  <div class="min-h-screen flex flex-col dark:bg-gray-900 dark:text-white transition-colors duration-300">
    <header class="bg-white dark:bg-gray-800 shadow p-4 flex items-center justify-between gap-4 print:hidden z-40 relative border-b dark:border-gray-700 transition-colors duration-300">
      <!-- Left: Back & Name & Undo/Redo -->
      <div class="flex items-center gap-4 min-w-0 flex-1">
        <button @click="goBack" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 flex-shrink-0">
          <ArrowLeft :size="24" />
        </button>
        <div class="relative grid max-w-full">
          <span class="text-xl font-bold px-2 py-1 invisible whitespace-pre col-start-1 row-start-1 overflow-hidden">{{ docName || ' ' }}</span>
          <input 
            v-model="docName" 
            @blur="updateName"
            @keyup.enter="updateName"
            class="text-xl font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-2 py-1 transition-colors col-start-1 row-start-1 w-full min-w-[50px]"
            :class="{'border-red-500': nameError}"
          />
          <div v-if="nameError" class="absolute top-full left-0 text-xs text-red-500 mt-1 whitespace-nowrap">
            {{ nameError }}
          </div>
        </div>

        <!-- Separator -->
        <div v-if="isCv" class="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden sm:block"></div>

        <!-- Undo/Redo (CV only) -->
        <div v-if="isCv" class="flex items-center border dark:border-gray-700 rounded-full bg-gray-50 dark:bg-gray-800/50 overflow-hidden hidden sm:flex">
           <button @click="undo" :disabled="!canUndo" class="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-r dark:border-gray-700" title="Undo">
             <RotateCcw :size="16" />
           </button>
           <button @click="redo" :disabled="!canRedo" class="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Redo">
             <RotateCw :size="16" />
           </button>
        </div>
      </div>
      
      <!-- Right: Tools & Actions -->
      <div class="flex items-center gap-3 flex-shrink-0">
        <!-- View Toggles Group -->
        <div class="flex items-center gap-2 border-r pr-3 dark:border-gray-700">
            <button 
              @click="showFormPanel = !showFormPanel" 
              class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
              :class="showFormPanel ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-800' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'"
              title="Toggle Editor"
            >
              <Edit :size="16" />
              <span class="hidden xl:inline">Editor</span>
            </button>

            <button 
              @click="toggleAiPanel" 
              class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
              :class="showAiPanel ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-800' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'"
              title="Toggle AI Assistant"
            >
              <Sparkles :size="16" />
              <span class="hidden xl:inline">AI Assistant</span>
            </button>

            <button 
              v-if="isCv"
              @click="atsMode = !atsMode" 
              class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
              :class="atsMode ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'"
              title="Toggle ATS Friendly Mode"
            >
              <FileText :size="16" />
              <span class="hidden xl:inline">ATS Mode</span>
            </button>
        </div>

        <!-- Actions Group -->
        <div class="flex items-center gap-2 border-r pr-3 dark:border-gray-700">
            <button @click="exportJson" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300" title="Export JSON">
              <Download :size="20" />
            </button>
            <button @click="print" class="bg-blue-600 text-white px-4 py-1.5 rounded-full flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm font-medium">
              <Printer :size="16" />
              <span>Export PDF</span>
            </button>
        </div>

        <!-- Settings Group -->
        <div class="flex items-center gap-1">
            <button @click="toggleTheme" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Toggle Theme">
              <Moon v-if="isDark" :size="20" />
              <Sun v-else :size="20" />
            </button>
            <div class="relative">
                <button @click="showSettings = !showSettings" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Settings">
                    <Settings :size="20" />
                </button>
                <!-- Dropdown -->
                <div v-if="showSettings" class="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 p-4 z-50">
                    <h3 class="font-bold mb-3 text-gray-900 dark:text-white">View Settings</h3>
                    <div class="space-y-3 mb-4 border-b dark:border-gray-700 pb-4">
                      <label v-if="isCv" class="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        <span>Uppercase Name</span>
                        <div class="relative inline-flex h-6 w-11 items-center">
                          <input type="checkbox" v-model="uppercaseName" class="peer sr-only" role="switch" />
                          <span class="pointer-events-none block h-6 w-11 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 dark:peer-focus-visible:ring-blue-500"></span>
                          <span class="pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5"></span>
                        </div>
                      </label>
                      <label v-if="isCv" class="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        <span>Uppercase Role</span>
                        <div class="relative inline-flex h-6 w-11 items-center">
                          <input type="checkbox" v-model="uppercaseRole" class="peer sr-only" role="switch" />
                          <span class="pointer-events-none block h-6 w-11 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 dark:peer-focus-visible:ring-blue-500"></span>
                          <span class="pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5"></span>
                        </div>
                      </label>
                      <label v-if="isCv" class="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        <span>Uppercase Section Headers</span>
                        <div class="relative inline-flex h-6 w-11 items-center">
                          <input type="checkbox" v-model="uppercaseHeaders" class="peer sr-only" role="switch" />
                          <span class="pointer-events-none block h-6 w-11 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 dark:peer-focus-visible:ring-blue-500"></span>
                          <span class="pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5"></span>
                        </div>
                      </label>
                      <label v-if="!isCv" class="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        <span>Uppercase Title</span>
                        <div class="relative inline-flex h-6 w-11 items-center">
                          <input type="checkbox" v-model="uppercaseCoverLetterTitle" class="peer sr-only" role="switch" />
                          <span class="pointer-events-none block h-6 w-11 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 dark:peer-focus-visible:ring-blue-500"></span>
                          <span class="pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5"></span>
                        </div>
                      </label>
                      <label v-if="isCv" class="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300 select-none" :class="{ 'opacity-50 cursor-not-allowed': !atsMode, 'cursor-pointer': atsMode }">
                        <span>Show Picture in ATS Mode</span>
                        <div class="relative inline-flex h-6 w-11 items-center">
                          <input type="checkbox" v-model="showPictureInAts" :disabled="!atsMode" class="peer sr-only" role="switch" />
                          <span class="pointer-events-none block h-6 w-11 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-disabled:bg-gray-200 dark:peer-disabled:bg-gray-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 dark:peer-focus-visible:ring-blue-500"></span>
                          <span class="pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5 peer-disabled:bg-gray-100"></span>
                        </div>
                      </label>
                      <label v-if="isCv" class="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                        <span>Picture Position</span>
                        <div class="relative inline-flex h-6 w-20 items-center">
                          <input type="checkbox" v-model="picturePosition" true-value="right" false-value="left" class="peer sr-only" role="switch" />
                          <span class="pointer-events-none block h-6 w-20 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 dark:peer-focus-visible:ring-blue-500 relative">
                            <span class="absolute inset-0 flex items-center justify-between px-1.5 text-[10px] font-medium">
                              <span class="text-white peer-checked:text-gray-400 transition-colors">Left</span>
                              <span class="text-gray-400 peer-checked:text-white transition-colors">Right</span>
                            </span>
                          </span>
                          <span class="pointer-events-none absolute left-0.5 top-0.5 block h-5 w-9 rounded-full bg-white shadow-sm transition peer-checked:translate-x-10"></span>
                        </div>
                      </label>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </header>
    
    <main v-if="currentDocument" class="flex-1 flex flex-col md:flex-row overflow-hidden relative print:overflow-visible print:h-auto print:block">
      <div v-if="showFormPanel" 
           class="bg-gray-50 dark:bg-gray-900 border-r dark:border-gray-700 print:hidden h-[calc(100vh-64px)] transition-colors duration-300 relative z-10 flex-shrink-0 flex"
           :style="{ width: formPanelWidth + 'px' }">
        <div class="flex-1 overflow-y-auto p-4 min-w-0">
           <CvForm v-if="isCv" />
           <CoverLetterForm v-else />
        </div>
        <!-- Resize Handle -->
        <div class="hidden md:block w-1.5 cursor-ew-resize hover:bg-blue-500/50 transition-colors z-20 flex-shrink-0"
             @mousedown.prevent="startResizeForm"></div>
      </div>
      
      <div class="flex-1 bg-gray-200 dark:bg-gray-950 p-8 overflow-y-auto h-[calc(100vh-64px)] print:h-auto print:w-full print:p-0 print:overflow-visible print:bg-white transition-colors duration-300">
        <div class="print:w-full flex justify-center">
          <CvPreview 
            v-if="isCv"
            :ats-mode="atsMode" 
            :show-picture-in-ats="showPictureInAts"
            :uppercase-name="uppercaseName"
            :uppercase-role="uppercaseRole"
            :uppercase-headers="uppercaseHeaders"
            :picture-position="picturePosition"
          />
          <CoverLetterPreview 
            v-else
            :uppercase-title="uppercaseCoverLetterTitle"
          />
        </div>
      </div>

      <!-- AI Panel (Both CV and Cover Letter) -->
      <div v-if="showAiPanel" 
           class="w-full md:w-[var(--panel-width)] bg-white dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col z-20 shadow-xl relative h-[calc(100vh-64px)]"
           :style="{ '--panel-width': aiPanelWidth + 'px' }">
          <!-- Resize Handle -->
          <div class="hidden md:block absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-ew-resize hover:bg-purple-500/50 transition-colors z-30"
               @mousedown.prevent="startResize"></div>

          <!-- Unified Chat Component -->
          <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
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
    </main>
    <div v-else class="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
      Loading {{ isCv ? 'CV' : 'Cover Letter' }}...
    </div>

    <!-- Settings Modal -->
    <SettingsModal
      :is-open="isSettingsModalOpen"
      @close="closeSettingsModal"
    />
  </div>
</template>

<style>
@media print {
  body {
    overflow: visible !important;
    height: auto !important;
  }
}
</style>

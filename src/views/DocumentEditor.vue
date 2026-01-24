<script setup>
import CvForm from '../components/CvForm.vue'
import CvPreview from '../components/CvPreview.vue'
import CoverLetterForm from '../components/CoverLetterForm.vue'
import CoverLetterPreview from '../components/CoverLetterPreview.vue'
import { useCvStore } from '../stores/cv'
import { useCoverLetterStore } from '../stores/coverLetter'
import { useWorkspaceStore } from '../stores/workspace'
import { useCvMetaStore } from '../stores/cvMeta'
import { Printer, Moon, Sun, ArrowLeft, FileText, Settings, Sparkles, Send, RotateCcw, RotateCw, X, MessageSquare, Plus, Trash2, ChevronLeft, Download, Edit, Mail } from 'lucide-vue-next'
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { storeToRefs } from 'pinia'
import { performAiAction } from '../services/ai'

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
const metaStore = useCvMetaStore()
const route = useRoute()
const router = useRouter()

const isCv = computed(() => props.documentType === 'cv')
const store = computed(() => isCv.value ? cvStore : clStore)
const currentDocument = computed(() => isCv.value ? cvStore.cv : clStore.coverLetter)
const currentName = computed(() => isCv.value ? route.params.name : route.params.name)

const docName = ref('')
const nameError = ref('')
const showSettings = ref(false)
const showAiPanel = ref(false)
const aiPrompt = ref('')
const isAiLoading = ref(false)
const systemInstructions = ref('')
const chatContainer = ref(null)
const aiPanelView = ref('chat')

const settingsStore = useSettingsStore()
const { atsMode, showPictureInAts, uppercaseName, uppercaseRole, uppercaseHeaders, uppercaseCoverLetterTitle, openRouterKey, openRouterModel, customModels } = storeToRefs(settingsStore)
const canUndo = computed(() => isCv.value ? cvStore.canUndo : false)
const canRedo = computed(() => isCv.value ? cvStore.canRedo : false)

const defaultModels = [
  'openai/gpt-3.5-turbo',
  'openai/gpt-4o',
  'anthropic/claude-3-5-sonnet',
  'anthropic/claude-3-haiku',
  'google/gemini-flash-1.5',
  'meta-llama/llama-3-70b-instruct'
]

const availableModels = computed(() => {
  return [...defaultModels, ...customModels.value]
})

const newModelId = ref('')

const addCustomModel = () => {
  if (newModelId.value && !availableModels.value.includes(newModelId.value)) {
    customModels.value.push(newModelId.value)
    openRouterModel.value = newModelId.value
    newModelId.value = ''
  }
}

// AI Chat Logic (only for CV)
const currentChatId = ref(null)

const chats = computed(() => {
  if (!isCv.value || !cvStore.currentCvId) return []
  return metaStore.getChats(cvStore.currentCvId)
})

const currentChat = computed(() => {
  if (!currentChatId.value) return null
  return chats.value.find(c => c.id === currentChatId.value)
})

const aiMessages = computed(() => {
  return currentChat.value ? currentChat.value.messages : []
})

const createNewChat = () => {
  if (!isCv.value || !cvStore.currentCvId) return
  const chat = metaStore.createChat(cvStore.currentCvId, `Chat ${chats.value.length + 1}`)
  currentChatId.value = chat.id
  aiPanelView.value = 'chat'
}

const selectChat = (chatId) => {
  currentChatId.value = chatId
  aiPanelView.value = 'chat'
}

const deleteChat = (chatId) => {
  if (!isCv.value || !cvStore.currentCvId) return
  metaStore.deleteChat(cvStore.currentCvId, chatId)
  if (currentChatId.value === chatId) {
    currentChatId.value = null
    if (chats.value.length > 0) {
      currentChatId.value = chats.value[0].id
    } else {
      createNewChat()
    }
  }
}

const toggleAiPanel = () => {
  if (!isCv.value) return
  showAiPanel.value = !showAiPanel.value
  if (showAiPanel.value && !currentChatId.value) {
    if (chats.value.length > 0) {
      currentChatId.value = chats.value[0].id
    } else {
      createNewChat()
    }
  }
}

const handleAiSubmit = async () => {
    if (!isCv.value || !aiPrompt.value.trim() || isAiLoading.value || !currentChatId.value) return
    
    const prompt = aiPrompt.value
    metaStore.addMessage(cvStore.currentCvId, currentChatId.value, { role: 'user', content: prompt })
    aiPrompt.value = ''
    isAiLoading.value = true

    try {
        const result = await performAiAction(
            openRouterKey.value,
            openRouterModel.value,
            cvStore.cv,
            prompt,
            systemInstructions.value
        )
        
        cvStore.applyAiChanges(result.cvData)
        metaStore.addMessage(cvStore.currentCvId, currentChatId.value, { role: 'assistant', content: result.message })
    } catch (e) {
        metaStore.addMessage(cvStore.currentCvId, currentChatId.value, { role: 'error', content: e.message })
    } finally {
        isAiLoading.value = false
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

  if (isCv.value) {
    try {
      const res = await fetch('/ai-instructions.md')
      systemInstructions.value = await res.text()
    } catch (e) {
      console.error('Failed to load AI instructions', e)
    }
  }
})

// Scroll to bottom of chat
watch(aiMessages, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}, { deep: true })

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
              v-if="isCv"
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
          />
          <CoverLetterPreview 
            v-else
            :uppercase-title="uppercaseCoverLetterTitle"
          />
        </div>
      </div>

      <!-- AI Panel (CV only) -->
      <div v-if="isCv && showAiPanel" 
           class="w-full md:w-[var(--panel-width)] bg-white dark:bg-gray-800 border-l dark:border-gray-700 flex flex-col z-20 shadow-xl relative"
           :style="{ '--panel-width': aiPanelWidth + 'px' }">
          <!-- Resize Handle -->
          <div class="hidden md:block absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-ew-resize hover:bg-purple-500/50 transition-colors z-30"
               @mousedown.prevent="startResize"></div>
          
          <!-- Header -->
          <div class="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <div class="flex items-center gap-2">
                  <h3 class="font-bold flex items-center gap-2 text-gray-900 dark:text-white"><Sparkles class="text-purple-500" :size="20"/> AI Assistant</h3>
              </div>
              <div class="flex items-center gap-1">
                  <button v-if="aiPanelView === 'chat'" @click="aiPanelView = 'settings'" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="AI Settings">
                      <Settings :size="18" />
                  </button>
                  <button v-if="aiPanelView === 'chat'" @click="aiPanelView = 'list'" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="Chat History">
                      <MessageSquare :size="18" />
                  </button>
                  <button v-if="aiPanelView !== 'chat'" @click="aiPanelView = 'chat'" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400" title="Back to Chat">
                      <ChevronLeft :size="18" />
                  </button>
                  <button @click="showAiPanel = false" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><X :size="20"/></button>
              </div>
          </div>

          <!-- Settings View -->
          <div v-if="aiPanelView === 'settings'" class="flex-1 overflow-y-auto p-4 space-y-4">
              <h4 class="font-bold text-gray-900 dark:text-white">AI Configuration</h4>
              
              <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">OpenRouter API Key</label>
                  <input v-model="openRouterKey" type="password" class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2 text-sm dark:bg-gray-700 dark:text-white" placeholder="sk-or-..." />
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Key is stored locally in your browser.</p>
              </div>

              <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
                  <select v-model="openRouterModel" class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2 text-sm dark:bg-gray-700 dark:text-white mb-2">
                      <option v-for="model in availableModels" :key="model" :value="model">{{ model }}</option>
                  </select>
                  
                  <div class="flex gap-2">
                      <input v-model="newModelId" type="text" class="flex-1 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2 text-sm dark:bg-gray-700 dark:text-white" placeholder="Add custom model ID..." />
                      <button @click="addCustomModel" :disabled="!newModelId" class="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors">
                          <Plus :size="16" />
                      </button>
                  </div>
              </div>
          </div>

          <!-- Chat List View -->
          <div v-else-if="aiPanelView === 'list'" class="flex-1 overflow-y-auto p-4 space-y-2">
              <button @click="createNewChat" class="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-purple-500 hover:text-purple-500 transition-colors mb-4">
                  <Plus :size="20" /> New Chat
              </button>
              
              <div v-if="chats.length === 0" class="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                  No chats yet. Start a new one!
              </div>

              <div v-for="chat in chats" :key="chat.id" 
                   class="group flex items-center justify-between p-3 rounded-lg border dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 cursor-pointer transition-colors"
                   :class="{'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800': currentChatId === chat.id, 'bg-white dark:bg-gray-800': currentChatId !== chat.id}"
                   @click="selectChat(chat.id)">
                  <div class="flex-1 min-w-0">
                      <h4 class="font-medium text-sm truncate text-gray-900 dark:text-white">{{ chat.title }}</h4>
                      <p class="text-xs text-gray-500 dark:text-gray-400">{{ new Date(chat.createdAt).toLocaleDateString() }}</p>
                  </div>
                  <button @click.stop="deleteChat(chat.id)" class="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 :size="16" />
                  </button>
              </div>
          </div>

          <!-- Chat Area -->
          <div v-else class="flex-1 flex flex-col min-h-0">
            <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
                <div v-if="aiMessages.length === 0" class="text-center text-gray-500 dark:text-gray-400 text-sm mt-10">
                    <Sparkles class="mx-auto mb-2 text-purple-300" :size="48" />
                    <p>Ask me to improve your CV!</p>
                    <p class="text-xs mt-2">"Fix typos", "Make it professional", "Translate to Spanish"</p>
                </div>
                <div v-for="(msg, idx) in aiMessages" :key="idx" 
                    class="p-3 rounded-lg text-sm"
                    :class="{
                        'bg-blue-100 text-blue-900 ml-4 dark:bg-blue-900 dark:text-blue-100': msg.role === 'user',
                        'bg-purple-50 text-purple-900 mr-4 dark:bg-purple-900/50 dark:text-purple-100': msg.role === 'assistant',
                        'bg-red-100 text-red-900 mr-4 dark:bg-red-900/50 dark:text-red-100': msg.role === 'error'
                    }">
                    <p class="font-semibold text-xs mb-1 opacity-75">{{ msg.role === 'user' ? 'You' : 'AI' }}</p>
                    {{ msg.content }}
                </div>
                <div v-if="isAiLoading" class="flex justify-center p-4">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                </div>
            </div>
            <!-- Input Area -->
            <div class="p-4 border-t dark:border-gray-700">
                <div class="relative">
                    <textarea 
                        v-model="aiPrompt" 
                        @keydown.enter.prevent="handleAiSubmit"
                        placeholder="Ask AI to modify your CV..." 
                        class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 border p-2 pr-10 dark:bg-gray-700 dark:text-white resize-none h-24 text-sm"
                    ></textarea>
                    <button 
                        @click="handleAiSubmit" 
                        :disabled="isAiLoading || !aiPrompt.trim()"
                        class="absolute bottom-2 right-2 p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send :size="16" />
                    </button>
                </div>
            </div>
          </div>
      </div>
    </main>
    <div v-else class="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
      Loading {{ isCv ? 'CV' : 'Cover Letter' }}...
    </div>
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

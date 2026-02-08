<script setup>
import { useCvStore } from '../stores/cv'
import { useCoverLetterStore } from '../stores/coverLetter'
import { useWorkspaceStore } from '../stores/workspace'
import { useRouter, useRoute } from 'vue-router'
import { ref, computed, watch } from 'vue'
import { useSettingsModal } from '../composables/useSettingsModal'
import DocumentGrid from '../components/DocumentGrid.vue'
import DocumentList from '../components/DocumentList.vue'
import ActionMenu from '../components/ActionMenu.vue'
import CreateImportModal from '../components/CreateImportModal.vue'
import WorkspaceContextPanel from '../components/WorkspaceContextPanel.vue'
import WorkspaceContextModal from '../components/WorkspaceContextModal.vue'
import SettingsModal from '../components/SettingsModal.vue'
import FloatingAiChat from '../components/FloatingAiChat.vue'
import AiAssistantButton from '../components/AiAssistantButton.vue'
import { 
  Plus, 
  Upload, 
  FileText, 
  Mail,
  Copy, 
  Trash2, 
  Download, 
  Grid, 
  List,
  Edit,
  Moon,
  Sun,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Briefcase,
  User
} from 'lucide-vue-next'

const store = useCvStore()
const clStore = useCoverLetterStore()
const workspaceStore = useWorkspaceStore()
const router = useRouter()
const route = useRoute()
const { isSettingsModalOpen, openSettingsModal, closeSettingsModal } = useSettingsModal()

const viewMode = ref('grid') // 'grid' or 'list'
const activeTab = ref('cv') // 'cv' or 'cover-letter'
const showWorkspaceContext = ref(true) // Show AI context panel
const showAiPanel = ref(false) // AI Chat panel

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

// Modal State
const showModal = ref(false)
const modalMode = ref('create') // 'create' or 'import'
const suggestedName = ref('')

// Workspace name editing
const isEditingWorkspaceName = ref(false)
const editedWorkspaceName = ref('')
const workspaceNameInput = ref(null)

// Drag and drop
const isDragging = ref(false)

// Workspace context modal
const showContextModal = ref(false)
const contextModalMode = ref('view') // 'view', 'edit', 'create'
const selectedContextKey = ref('')
const selectedContextContent = ref('')

// Set current workspace from route
watch(
  () => route.params.workspaceName,
  (workspaceName) => {
    if (workspaceName) {
      try {
        workspaceStore.setCurrentWorkspace(decodeURIComponent(workspaceName))
      } catch (error) {
        router.push('/')
      }
    }
  },
  { immediate: true }
)

// Computed
const cvs = computed(() => {
  const cvsObj = store.cvs
  return Object.keys(cvsObj).map(name => ({
    name,
    id: cvsObj[name].id,
    lastModified: cvsObj[name].lastModified,
    data: cvsObj[name].data,
    icon: FileText
  }))
})

const coverLetters = computed(() => {
  const clsObj = clStore.coverLetters
  return Object.keys(clsObj).map(name => ({
    name,
    id: clsObj[name].id,
    lastModified: clsObj[name].lastModified,
    data: clsObj[name].data,
    icon: Mail
  }))
})

const items = computed(() => activeTab.value === 'cv' ? cvs.value : coverLetters.value)

const existingNames = computed(() => {
  return items.value.map(item => item.name)
})

const modalTitle = computed(() => {
  if (modalMode.value === 'create') {
    return `Create New ${activeTab.value === 'cv' ? 'CV' : 'Cover Letter'}`
  } else {
    return `Import ${activeTab.value === 'cv' ? 'CV' : 'Cover Letter'}`
  }
})

const documentActions = [
  { id: 'edit', label: 'Edit', icon: Edit },
  { id: 'duplicate', label: 'Duplicate', icon: Copy },
  { id: 'export', label: 'Export JSON', icon: Download },
  { id: 'delete', label: 'Delete', icon: Trash2 }
]

// Actions
const goBackToWorkspaces = () => {
  router.push('/')
}

const startEditingWorkspaceName = () => {
  editedWorkspaceName.value = workspaceStore.currentWorkspace
  isEditingWorkspaceName.value = true
  setTimeout(() => {
    workspaceNameInput.value?.focus()
    workspaceNameInput.value?.select()
  }, 0)
}

const saveWorkspaceName = () => {
  const newName = editedWorkspaceName.value.trim()
  if (!newName || newName === workspaceStore.currentWorkspace) {
    isEditingWorkspaceName.value = false
    return
  }

  try {
    const renamedName = workspaceStore.renameWorkspace(workspaceStore.currentWorkspace, newName)
    isEditingWorkspaceName.value = false
    // Update URL
    router.replace(`/workspace/${encodeURIComponent(renamedName)}`)
  } catch (error) {
    alert(error.message)
    editedWorkspaceName.value = workspaceStore.currentWorkspace
  }
}

const cancelEditingWorkspaceName = () => {
  isEditingWorkspaceName.value = false
  editedWorkspaceName.value = ''
}

const openCreateModal = () => {
  modalMode.value = 'create'
  suggestedName.value = ''
  showModal.value = true
}

const openImportModal = () => {
  modalMode.value = 'import'
  suggestedName.value = ''
  showModal.value = true
}

const handleModalSubmit = (name, fileContent) => {
  try {
    if (modalMode.value === 'create') {
      if (activeTab.value === 'cv') {
        store.createCv(name)
        openCv(name)
      } else {
        clStore.createCoverLetter(name)
        openCoverLetter(name)
      }
    } else if (modalMode.value === 'import') {
      if (activeTab.value === 'cv') {
        store.importCv(fileContent, name)
        openCv(name)
      } else {
        clStore.importCoverLetter(fileContent, name)
        openCoverLetter(name)
      }
    }
    showModal.value = false
  } catch (e) {
    alert(e.message)
  }
}

const openCv = (name) => {
  const ws = encodeURIComponent(workspaceStore.currentWorkspace)
  router.push(`/workspace/${ws}/edit/${encodeURIComponent(name)}`)
}

const openCoverLetter = (name) => {
  const ws = encodeURIComponent(workspaceStore.currentWorkspace)
  router.push(`/workspace/${ws}/cover-letter/${encodeURIComponent(name)}`)
}

const editItem = (name) => {
  if (activeTab.value === 'cv') {
    openCv(name)
  } else {
    openCoverLetter(name)
  }
}

const handleAction = (itemName, action) => {
  switch (action) {
    case 'edit':
      editItem(itemName)
      break
    case 'duplicate':
      duplicateItem(itemName)
      break
    case 'export':
      exportItem(itemName)
      break
    case 'delete':
      deleteItem(itemName)
      break
  }
}

const duplicateItem = (name) => {
  if (activeTab.value === 'cv') {
    store.duplicateCv(name)
  } else {
    clStore.duplicateCoverLetter(name)
  }
}

const deleteItem = (name) => {
  const itemType = activeTab.value === 'cv' ? 'CV' : 'Cover Letter'
  if (confirm(`Are you sure you want to delete this ${itemType}?`)) {
    if (activeTab.value === 'cv') {
      store.deleteCv(name)
    } else {
      clStore.deleteCoverLetter(name)
    }
  }
}

const exportItem = (name) => {
  let exported
  if (activeTab.value === 'cv') {
    exported = store.exportCv(name)
  } else {
    exported = clStore.exportCoverLetter(name)
  }
  
  if (!exported) return
  
  const dataStr = JSON.stringify(exported, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/\s+/g, '_')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Drag and drop handlers
const handleDragOver = (event) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (event) => {
  event.preventDefault()
  isDragging.value = false
}

const handleDrop = async (event) => {
  event.preventDefault()
  isDragging.value = false

  const files = event.dataTransfer.files
  if (files.length === 0) return

  const file = files[0]
  if (!file.name.endsWith('.json')) {
    alert('Please drop a JSON file')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target.result
      const parsed = JSON.parse(content)
      
      // Determine if it's a CV or Cover Letter
      const isCv = parsed.personalInfo && parsed.sections
      const isCoverLetter = parsed.applicantAddress !== undefined || parsed.companyAddress !== undefined
      
      // Extract suggested name
      let suggestedNameValue = ''
      if (parsed.name) {
        suggestedNameValue = parsed.name
      } else if (isCv && parsed.personalInfo?.name) {
        suggestedNameValue = parsed.personalInfo.name
      } else {
        suggestedNameValue = file.name.replace('.json', '')
      }
      
      // Set active tab based on type
      if (isCv) {
        activeTab.value = 'cv'
      } else if (isCoverLetter) {
        activeTab.value = 'cover-letter'
      } else {
        // Default to current active tab if can't determine
        console.warn('Could not determine document type, using active tab')
      }
      
      // Open import modal with pre-filled data
      suggestedName.value = suggestedNameValue
      modalMode.value = 'import'
      showModal.value = true
      
      // Store the content for later import
      setTimeout(() => {
        const modal = document.querySelector('input[type="file"]')
        if (modal) {
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(file)
          modal.files = dataTransfer.files
          modal.dispatchEvent(new Event('change', { bubbles: true }))
        }
      }, 100)
      
    } catch (error) {
      alert('Invalid JSON file: ' + error.message)
    }
  }
  reader.readAsText(file)
}

// Workspace context handlers
const handleContextEdit = (type) => {
  // Could open a modal for editing, for now just log
  console.log('Edit context:', type)
}

const handleContextDelete = (type) => {
  switch (type) {
    case 'jobAnalysis':
      workspaceStore.deleteJobAnalysis()
      break
    case 'matchReport':
      workspaceStore.deleteMatchReport()
      break
    case 'companyResearch':
      workspaceStore.deleteCompanyResearch()
      break
  }
}

const handleContextRegenerate = (type) => {
  // Open AI assistant to regenerate
  console.log('Regenerate context:', type)
}

// Custom context handlers
const handleViewCustomContext = (contextKey) => {
  const ws = workspaceStore.workspaces[workspaceStore.currentWorkspace]
  if (!ws || !ws[contextKey]) return
  
  selectedContextKey.value = contextKey
  selectedContextContent.value = ws[contextKey].content || ''
  contextModalMode.value = 'view'
  showContextModal.value = true
}

const handleEditCustomContext = (contextKey) => {
  const ws = workspaceStore.workspaces[workspaceStore.currentWorkspace]
  if (!ws || !ws[contextKey]) return
  
  selectedContextKey.value = contextKey
  selectedContextContent.value = ws[contextKey].content || ''
  contextModalMode.value = 'edit'
  showContextModal.value = true
}

const handleDeleteCustomContext = (contextKey) => {
  const ws = workspaceStore.workspaces[workspaceStore.currentWorkspace]
  if (!ws || !ws[contextKey]) return
  
  // Delete the custom context entry
  ws[contextKey] = null
  ws.metadata.lastModified = Date.now()
  workspaceStore.save()
}

const handleAddCustomContext = () => {
  selectedContextKey.value = ''
  selectedContextContent.value = ''
  contextModalMode.value = 'create'
  showContextModal.value = true
}

const handleSaveCustomContext = ({ key, content }) => {
  const ws = workspaceStore.workspaces[workspaceStore.currentWorkspace]
  if (!ws) return
  
  // Create or update the context entry
  const existing = ws[key]
  ws[key] = {
    content: content,
    createdAt: existing?.createdAt || Date.now(),
    lastModified: Date.now()
  }
  ws.metadata.lastModified = Date.now()
  workspaceStore.save()
}
</script>

<template>
  <div 
    class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8 transition-colors duration-300"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- Drag overlay -->
    <div 
      v-if="isDragging"
      class="fixed inset-0 bg-blue-500 bg-opacity-20 border-4 border-dashed border-blue-500 dark:border-blue-400 flex items-center justify-center z-50 pointer-events-none"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-2xl">
        <Upload class="w-16 h-16 text-blue-500 dark:text-blue-400 mx-auto mb-4" />
        <p class="text-xl font-semibold text-gray-900 dark:text-white">Drop JSON file to import</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">CV or Cover Letter will be auto-detected</p>
      </div>
    </div>
    
    <div class="max-w-6xl mx-auto">
      <header class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div class="flex items-center gap-4 min-w-0 flex-1">
          <button
            @click="goBackToWorkspaces"
            class="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          
          <!-- Editable workspace name -->
          <div class="flex items-center gap-2 min-w-0 max-w-md">
            <input
              v-if="isEditingWorkspaceName"
              ref="workspaceNameInput"
              v-model="editedWorkspaceName"
              type="text"
              class="text-3xl font-bold bg-transparent border-b-2 border-blue-500 dark:border-blue-400 focus:outline-none px-1 min-w-0 flex-1"
              @blur="saveWorkspaceName"
              @keyup.enter="saveWorkspaceName"
              @keyup.esc="cancelEditingWorkspaceName"
            />
            <h1 
              v-else
              @click="startEditingWorkspaceName"
              class="text-3xl font-bold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
              :title="workspaceStore.currentWorkspace"
            >
              {{ workspaceStore.currentWorkspace }}
            </h1>
          </div>
          
          <div class="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 flex-shrink-0">
            <button 
              @click="activeTab = 'cv'"
              class="px-4 py-1 rounded-md text-sm font-medium transition-colors"
              :class="activeTab === 'cv' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'"
            >
              CVs
            </button>
            <button 
              @click="activeTab = 'cover-letter'"
              class="px-4 py-1 rounded-md text-sm font-medium transition-colors"
              :class="activeTab === 'cover-letter' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'"
            >
              Cover Letters
            </button>
          </div>
        </div>

        <div class="flex gap-4">
          <!-- User Profile -->
          <button 
            @click="router.push('/profile')" 
            class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="User Profile"
          >
            <User :size="20" />
          </button>
          
          <!-- AI Assistant Toggle -->
          <AiAssistantButton 
            :active="showAiPanel"
            @click="showAiPanel = !showAiPanel"
          />
          
          <!-- Theme Toggle -->
          <button @click="toggleTheme" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Moon v-if="isDark" :size="20" />
            <Sun v-else :size="20" />
          </button>

          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-1 flex">
            <button 
              @click="viewMode = 'grid'"
              class="p-2 rounded transition-colors"
              :class="viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'"
            >
              <Grid :size="20" />
            </button>
            <button 
              @click="viewMode = 'list'"
              class="p-2 rounded transition-colors"
              :class="viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'"
            >
              <List :size="20" />
            </button>
          </div>
          
          <button 
            @click="openImportModal" 
            class="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
          >
            <Upload :size="20" /> Import
          </button>
          <button 
            @click="openCreateModal" 
            class="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus :size="20" /> New {{ activeTab === 'cv' ? 'CV' : 'Cover Letter' }}
          </button>
        </div>
      </header>

      <!-- Workspace AI Context Section -->
      <div class="mb-6">
        <button
          @click="showWorkspaceContext = !showWorkspaceContext"
          class="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-3"
        >
          <component :is="showWorkspaceContext ? ChevronDown : ChevronRight" :size="16" />
          <Briefcase :size="16" />
          Job Application Context
          <span v-if="workspaceStore.hasAiContext" class="ml-2 w-2 h-2 rounded-full bg-green-500"></span>
        </button>

        <div v-if="showWorkspaceContext" class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <WorkspaceContextPanel
            @edit="handleContextEdit"
            @delete="handleContextDelete"
            @regenerate="handleContextRegenerate"
            @viewCustomContext="handleViewCustomContext"
            @editCustomContext="handleEditCustomContext"
            @deleteCustomContext="handleDeleteCustomContext"
            @addCustomContext="handleAddCustomContext"
          />
        </div>
      </div>

      <!-- Grid View -->
      <DocumentGrid
        v-if="viewMode === 'grid'"
        :items="items"
        :empty-message="`No ${activeTab === 'cv' ? 'CVs' : 'cover letters'} in this workspace. Create one to get started!`"
        @click:item="editItem"
      >
        <template #action-menu="{ item }">
          <div class="absolute top-4 right-4" @click.stop>
            <ActionMenu 
              :actions="documentActions"
              @action="(action) => handleAction(item.name, action)"
            />
          </div>
        </template>
      </DocumentGrid>

      <!-- List View -->
      <DocumentList
        v-else
        :items="items"
        :empty-message="`No ${activeTab === 'cv' ? 'CVs' : 'cover letters'} in this workspace. Create one to get started!`"
        @click:item="editItem"
      >
        <template #action-menu="{ item }">
          <ActionMenu 
            :actions="documentActions"
            @action="(action) => handleAction(item.name, action)"
          />
        </template>
      </DocumentList>

      <!-- Create/Import Modal -->
      <CreateImportModal
        :is-open="showModal"
        :mode="modalMode"
        :title="modalTitle"
        :existing-names="existingNames"
        :suggested-name="suggestedName"
        @close="showModal = false"
        @submit="handleModalSubmit"
      />

      <!-- Settings Modal -->
      <SettingsModal
        :is-open="isSettingsModalOpen"
        @close="closeSettingsModal"
      />

      <!-- Workspace Context Modal -->
      <WorkspaceContextModal
        :is-open="showContextModal"
        :mode="contextModalMode"
        :context-key="selectedContextKey"
        :context-content="selectedContextContent"
        @close="showContextModal = false"
        @save="handleSaveCustomContext"
        @delete="handleDeleteCustomContext"
      />
    </div>

    <!-- Floating AI Chat Panel -->
    <FloatingAiChat
      v-if="showAiPanel"
      @close="showAiPanel = false"
    />
  </div>
</template>

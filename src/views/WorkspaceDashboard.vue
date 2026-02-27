<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <header class="flex justify-between items-center mb-8">
        <div class="flex items-center gap-4">
          <h1 class="text-3xl font-bold">My Workspaces</h1>
        </div>
        
        <div class="flex gap-2">
          <!-- User Profile -->
          <button
            @click="openUserProfileModal"
            class="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="User Profile"
          >
            <UserIcon class="w-5 h-5" />
          </button>
          
          <!-- AI Assistant button -->
          <AiAssistantButton 
            :active="showAiPanel"
            @click="showAiPanel = !showAiPanel"
          />
          
          <!-- Theme toggle -->
          <button
            @click="toggleTheme"
            class="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <SunIcon v-if="isDark" class="w-5 h-5" />
            <MoonIcon v-else class="w-5 h-5" />
          </button>
          
          <!-- View mode toggle -->
          <div class="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button 
              @click="viewMode = 'grid'" 
              :class="viewModeButtonClass('grid')"
              class="px-3 py-2 rounded transition-colors"
            >
              <LayoutGridIcon class="w-4 h-4" />
            </button>
            <button 
              @click="viewMode = 'list'" 
              :class="viewModeButtonClass('list')"
              class="px-3 py-2 rounded transition-colors"
            >
              <ListIcon class="w-4 h-4" />
            </button>
          </div>
          
          <!-- Import button -->
          <button 
            @click="openImportModal" 
            class="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <UploadIcon class="w-4 h-4" />
            Import
          </button>
          
          <!-- Create button -->
          <button 
            @click="openCreateModal" 
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <PlusIcon class="w-4 h-4" />
            New Workspace
          </button>
        </div>
      </header>
      
      <!-- Grid/List View -->
      <DocumentGrid
        v-if="viewMode === 'grid'"
        :items="workspaceItems"
        empty-message="No workspaces. Create one to get started!"
        @click:item="openWorkspace"
      >
        <template #action-menu="{ item }">
          <div class="absolute top-4 right-4" @click.stop>
            <ActionMenu 
              :actions="workspaceActions"
              @action="(action) => handleAction(item.name, action)"
            />
          </div>
        </template>
      </DocumentGrid>
      
      <DocumentList
        v-else
        :items="workspaceItems"
        empty-message="No workspaces. Create one to get started!"
        @click:item="openWorkspace"
      >
        <template #action-menu="{ item }">
          <ActionMenu 
            :actions="workspaceActions"
            @action="(action) => handleAction(item.name, action)"
          />
        </template>
      </DocumentList>
      
      <!-- Create/Import Modal -->
      <CreateImportModal
        :is-open="isModalOpen"
        :mode="modalMode"
        :title="modalTitle"
        :existing-names="existingWorkspaceNames"
        :suggested-name="suggestedName"
        @close="closeModal"
        @submit="handleModalSubmit"
      />

      <!-- Settings Modal -->
      <SettingsModal
        :is-open="isSettingsModalOpen"
        @close="closeSettingsModal"
      />

      <!-- User Profile Modal -->
      <UserProfileModal
        :is-open="isUserProfileModalOpen"
        @close="closeUserProfileModal"
      />
    </div>

    <!-- Floating AI Chat Panel -->
    <FloatingAiChat
      v-if="showAiPanel"
      @close="showAiPanel = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWorkspaceStore } from '../stores/workspace'
import { useSettingsModal } from '../composables/useSettingsModal'
import { useUserProfileModal } from '../composables/useUserProfileModal'
import DocumentGrid from '../components/DocumentGrid.vue'
import DocumentList from '../components/DocumentList.vue'
import ActionMenu from '../components/ActionMenu.vue'
import CreateImportModal from '../components/CreateImportModal.vue'
import SettingsModal from '../components/SettingsModal.vue'
import UserProfileModal from '../components/UserProfileModal.vue'
import FloatingAiChat from '../components/FloatingAiChat.vue'
import AiAssistantButton from '../components/AiAssistantButton.vue'
import { 
  LayoutGrid as LayoutGridIcon, 
  List as ListIcon, 
  Upload as UploadIcon, 
  Plus as PlusIcon, 
  Briefcase as BriefcaseIcon,
  Edit,
  Copy,
  Download,
  Trash2,
  Moon as MoonIcon,
  Sun as SunIcon,
  User as UserIcon
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { isSettingsModalOpen, closeSettingsModal } = useSettingsModal()
const { isUserProfileModalOpen, openUserProfileModal, closeUserProfileModal } = useUserProfileModal()

const viewMode = ref('grid')
const showAiPanel = ref(false)
const isModalOpen = ref(false)
const modalMode = ref('create')
const suggestedName = ref('')

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

// Theme
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

// Computed
const workspaceItems = computed(() => {
  return workspaceStore.getWorkspaceList().map(ws => ({
    name: ws.name,
    lastModified: ws.lastModified,
    icon: BriefcaseIcon,
    subtitle: `${ws.cvCount} CV${ws.cvCount !== 1 ? 's' : ''}, ${ws.coverLetterCount} Cover Letter${ws.coverLetterCount !== 1 ? 's' : ''}`
  }))
})

const existingWorkspaceNames = computed(() => {
  return workspaceStore.getWorkspaceList().map(ws => ws.name)
})

const modalTitle = computed(() => {
  return modalMode.value === 'create' ? 'Create New Workspace' : 'Import Workspace'
})

const workspaceActions = [
  { id: 'rename', label: 'Rename', icon: Edit },
  { id: 'duplicate', label: 'Duplicate', icon: Copy },
  { id: 'export', label: 'Export JSON', icon: Download },
  { id: 'delete', label: 'Delete', icon: Trash2 }
]

// Actions
const openWorkspace = (name) => {
  workspaceStore.setCurrentWorkspace(name)
  router.push(`/workspace/${encodeURIComponent(name)}`)
}

const openCreateModal = () => {
  modalMode.value = 'create'
  suggestedName.value = ''
  isModalOpen.value = true
}

const openImportModal = () => {
  modalMode.value = 'import'
  suggestedName.value = ''
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  suggestedName.value = ''
}

const handleModalSubmit = (name, fileContent) => {
  try {
    if (modalMode.value === 'create') {
      workspaceStore.createWorkspace(name)
      openWorkspace(name)
    } else {
      const importedName = workspaceStore.importWorkspace(fileContent, name)
      openWorkspace(importedName)
    }
    closeModal()
  } catch (error) {
    alert(error.message)
  }
}

const handleAction = (workspaceName, action) => {
  switch (action) {
    case 'rename':
      renameWorkspace(workspaceName)
      break
    case 'duplicate':
      duplicateWorkspace(workspaceName)
      break
    case 'export':
      exportWorkspace(workspaceName)
      break
    case 'delete':
      deleteWorkspace(workspaceName)
      break
  }
}

const renameWorkspace = (oldName) => {
  const newName = prompt('Enter new workspace name:', oldName)
  if (!newName || newName === oldName) return
  
  try {
    const renamedName = workspaceStore.renameWorkspace(oldName, newName)
    
    // If we're currently in this workspace, update the URL
    if (workspaceStore.currentWorkspace === renamedName) {
      router.replace(`/workspace/${encodeURIComponent(renamedName)}`)
    }
  } catch (error) {
    alert(error.message)
  }
}

const duplicateWorkspace = (name) => {
  try {
    workspaceStore.duplicateWorkspace(name)
  } catch (error) {
    alert(error.message)
  }
}

const exportWorkspace = (name) => {
  const exported = workspaceStore.exportWorkspace(name)
  if (!exported) return
  
  const dataStr = JSON.stringify(exported, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/\s+/g, '_')}_workspace.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const deleteWorkspace = (name) => {
  const ws = workspaceStore.workspaces[name]
  const cvCount = Object.keys(ws.cvs).length
  const clCount = Object.keys(ws.coverLetters).length
  const totalDocs = cvCount + clCount
  
  const message = totalDocs > 0
    ? `Delete workspace "${name}" and all ${totalDocs} document${totalDocs !== 1 ? 's' : ''} inside? This cannot be undone.`
    : `Delete workspace "${name}"?`
  
  if (confirm(message)) {
    workspaceStore.deleteWorkspace(name)
  }
}

const viewModeButtonClass = (mode) => {
  return viewMode.value === mode
    ? 'bg-white dark:bg-gray-600'
    : 'hover:bg-gray-300 dark:hover:bg-gray-600'
}
</script>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>

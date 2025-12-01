<script setup>
import { useCvStore } from '../stores/cv'
import { useRouter } from 'vue-router'
import { ref, computed } from 'vue'
import { 
  Plus, 
  Upload, 
  MoreVertical, 
  FileText, 
  Copy, 
  Trash2, 
  Download, 
  Grid, 
  List,
  Edit,
  X,
  Moon,
  Sun
} from 'lucide-vue-next'

const store = useCvStore()
const router = useRouter()
const fileInput = ref(null)
const viewMode = ref('grid') // 'grid' or 'list'
const activeMenu = ref(null)

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
const newCvName = ref('')
const importFileContent = ref(null)
const nameError = ref('')

const cvs = computed(() => store.cvs)

const openCreateModal = () => {
  modalMode.value = 'create'
  newCvName.value = ''
  nameError.value = ''
  showModal.value = true
}

const handleModalSubmit = () => {
  nameError.value = ''
  const name = newCvName.value.trim()
  
  if (!name) {
    nameError.value = 'Name is required'
    return
  }

  if (store.isNameTaken(name)) {
    nameError.value = 'A CV with this name already exists'
    return
  }

  try {
    if (modalMode.value === 'create') {
      store.createCv(name)
      router.push(`/edit/${encodeURIComponent(name)}`)
    } else if (modalMode.value === 'import') {
      store.importCv(importFileContent.value, name)
      router.push(`/edit/${encodeURIComponent(name)}`)
    }
    showModal.value = false
  } catch (e) {
    nameError.value = e.message
  }
}

const editCv = (name) => {
  router.push(`/edit/${encodeURIComponent(name)}`)
}

const duplicateCv = (name) => {
  store.duplicateCv(name)
  activeMenu.value = null
}

const deleteCv = (name) => {
  if (confirm('Are you sure you want to delete this CV?')) {
    store.deleteCv(name)
  }
  activeMenu.value = null
}

const exportJson = (cv) => {
  const dataStr = JSON.stringify({ name: cv.name, data: cv.data }, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${cv.name.replace(/\s+/g, '_')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  activeMenu.value = null
}

const triggerImport = () => {
  fileInput.value.click()
}

const handleImportFile = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    importFileContent.value = e.target.result
    // Try to guess name from file
    try {
      const parsed = JSON.parse(e.target.result)
      if (parsed.name) {
        newCvName.value = parsed.name
      } else if (parsed.personalInfo && parsed.personalInfo.name) {
        newCvName.value = parsed.personalInfo.name
      } else {
        newCvName.value = file.name.replace('.json', '')
      }
    } catch (err) {
      newCvName.value = file.name.replace('.json', '')
    }
    
    modalMode.value = 'import'
    nameError.value = ''
    showModal.value = true
  }
  reader.readAsText(file)
  event.target.value = ''
}

const toggleMenu = (name) => {
  if (activeMenu.value === name) {
    activeMenu.value = null
  } else {
    activeMenu.value = name
  }
}

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8 transition-colors duration-300">
    <div class="max-w-6xl mx-auto">
      <header class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">My CVs</h1>
        <div class="flex gap-4">
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
          
          <button @click="triggerImport" class="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors">
            <Upload :size="20" /> Import
          </button>
          <button @click="openCreateModal" class="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center gap-2 transition-colors">
            <Plus :size="20" /> New CV
          </button>
        </div>
      </header>

      <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleImportFile" />

      <!-- Grid View -->
      <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Removed overflow-hidden to allow menu to pop out -->
        <div v-for="cv in cvs" :key="cv.id" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow border dark:border-gray-700 group relative">
          <div @click="editCv(cv.name)" class="h-48 bg-gray-100 dark:bg-gray-700 rounded-t-xl flex items-center justify-center cursor-pointer overflow-hidden">
            <FileText :size="48" class="text-gray-400 dark:text-gray-500" />
          </div>
          <div class="p-4">
            <div class="flex justify-between items-start">
              <div @click="editCv(cv.name)" class="cursor-pointer flex-1 min-w-0">
                <h3 class="font-semibold text-lg truncate pr-2">{{ cv.name }}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Edited {{ formatDate(cv.lastModified) }}</p>
              </div>
              <div class="relative ml-2">
                <button @click.stop="toggleMenu(cv.name)" class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                  <MoreVertical :size="20" />
                </button>
                
                <div v-if="activeMenu === cv.name" class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border dark:border-gray-700 z-20">
                  <button @click="editCv(cv.name)" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                    <Edit :size="16" /> Edit
                  </button>
                  <button @click="duplicateCv(cv.name)" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                    <Copy :size="16" /> Duplicate
                  </button>
                  <button @click="exportJson(cv)" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                    <Download :size="16" /> Export JSON
                  </button>
                  <div class="border-t dark:border-gray-700 my-1"></div>
                  <button @click="deleteCv(cv.name)" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                    <Trash2 :size="16" /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-visible">
        <div v-for="cv in cvs" :key="cv.id" class="border-b dark:border-gray-700 last:border-0 p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
          <div class="flex items-center gap-4 cursor-pointer flex-1" @click="editCv(cv.name)">
            <div class="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <FileText :size="24" />
            </div>
            <div>
              <h3 class="font-semibold text-lg">{{ cv.name }}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">Edited {{ formatDate(cv.lastModified) }}</p>
            </div>
          </div>
          
          <div class="relative">
            <button @click.stop="toggleMenu(cv.name)" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              <MoreVertical :size="20" />
            </button>
            
            <div v-if="activeMenu === cv.name" class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border dark:border-gray-700 z-20">
              <button @click="editCv(cv.name)" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                <Edit :size="16" /> Edit
              </button>
              <button @click="duplicateCv(cv.name)" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                <Copy :size="16" /> Duplicate
              </button>
              <button @click="exportJson(cv)" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                <Download :size="16" /> Export JSON
              </button>
              <div class="border-t dark:border-gray-700 my-1"></div>
              <button @click="deleteCv(cv.name)" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                <Trash2 :size="16" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Overlay to close menus -->
      <div v-if="activeMenu" @click="activeMenu = null" class="fixed inset-0 z-10"></div>

      <!-- Create/Import Modal -->
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border dark:border-gray-700">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">{{ modalMode === 'create' ? 'Create New CV' : 'Import CV' }}</h2>
            <button @click="showModal = false" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <X :size="24" />
            </button>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CV Name</label>
            <input 
              v-model="newCvName" 
              type="text" 
              class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Software Engineer CV"
              @keyup.enter="handleModalSubmit"
              autoFocus
            />
            <p v-if="nameError" class="text-red-500 text-sm mt-1">{{ nameError }}</p>
          </div>

          <div class="flex justify-end gap-3">
            <button @click="showModal = false" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              Cancel
            </button>
            <button @click="handleModalSubmit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {{ modalMode === 'create' ? 'Create' : 'Import' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

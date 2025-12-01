<script setup>
import CvForm from '../components/CvForm.vue'
import CvPreview from '../components/CvPreview.vue'
import { useCvStore } from '../stores/cv'
import { Printer, Moon, Sun, ArrowLeft, Save, FileText, Settings } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { storeToRefs } from 'pinia'

const store = useCvStore()
const route = useRoute()
const router = useRouter()

const cvName = ref('')
const nameError = ref('')
const showSettings = ref(false)

const settingsStore = useSettingsStore()
const { atsMode, showPictureInAts, uppercaseName, uppercaseRole, uppercaseHeaders } = storeToRefs(settingsStore)

// Initialize
onMounted(() => {
  const name = decodeURIComponent(route.params.name)
  store.setCurrentCv(name)
  
  // Verify it exists
  if (!store.cv) {
    router.push('/')
    return
  }
  cvName.value = name
})

// Handle name change
const updateName = () => {
  const oldName = decodeURIComponent(route.params.name)
  const newName = cvName.value.trim()
  
  if (!newName) {
    cvName.value = oldName
    return
  }

  if (newName === oldName) return

  try {
    store.updateCvName(oldName, newName)
    store.setCurrentCv(newName)
    router.replace(`/edit/${encodeURIComponent(newName)}`)
    nameError.value = ''
  } catch (e) {
    nameError.value = e.message
    // Revert name after a delay or keep it to let user fix?
    // Let's keep it but show error
  }
}

// Theme Logic (duplicated from App.vue for now, ideally use a composable)
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

const print = () => {
  const originalTitle = document.title
  document.title = cvName.value || 'CV'
  window.print()
  document.title = originalTitle
}

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex flex-col dark:bg-gray-900 dark:text-white transition-colors duration-300">
    <header class="bg-white dark:bg-gray-800 shadow p-4 flex justify-between items-center print:hidden z-10 relative border-b dark:border-gray-700 transition-colors duration-300">
      <div class="flex items-center gap-4 flex-1 min-w-0 mr-4">
        <button @click="goBack" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 flex-shrink-0">
          <ArrowLeft :size="24" />
        </button>
        <div class="relative grid max-w-full">
          <span class="text-xl font-bold px-2 py-1 invisible whitespace-pre col-start-1 row-start-1 overflow-hidden">{{ cvName || ' ' }}</span>
          <input 
            v-model="cvName" 
            @blur="updateName"
            @keyup.enter="updateName"
            class="text-xl font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-2 py-1 transition-colors col-start-1 row-start-1 w-full min-w-[50px]"
            :class="{'border-red-500': nameError}"
          />
          <div v-if="nameError" class="absolute top-full left-0 text-xs text-red-500 mt-1 whitespace-nowrap">
            {{ nameError }}
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-4 flex-shrink-0">
        <button @click="toggleTheme" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Moon v-if="isDark" :size="20" />
          <Sun v-else :size="20" />
        </button>

        <div class="relative">
            <button @click="showSettings = !showSettings" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Settings">
                <Settings :size="20" />
            </button>
            <!-- Dropdown -->
            <div v-if="showSettings" class="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 p-4 z-50">
                <h3 class="font-bold mb-3 text-gray-900 dark:text-white">View Settings</h3>
                <div class="space-y-3">
                  <label class="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                    <span>Uppercase Name</span>
                    <div class="relative inline-flex h-6 w-11 items-center">
                      <input type="checkbox" v-model="uppercaseName" class="peer sr-only" role="switch" />
                      <span class="pointer-events-none block h-6 w-11 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 dark:peer-focus-visible:ring-blue-500"></span>
                      <span class="pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5"></span>
                    </div>
                  </label>
                  <label class="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                    <span>Uppercase Role</span>
                    <div class="relative inline-flex h-6 w-11 items-center">
                      <input type="checkbox" v-model="uppercaseRole" class="peer sr-only" role="switch" />
                      <span class="pointer-events-none block h-6 w-11 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 dark:peer-focus-visible:ring-blue-500"></span>
                      <span class="pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5"></span>
                    </div>
                  </label>
                  <label class="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                    <span>Uppercase Section Headers</span>
                    <div class="relative inline-flex h-6 w-11 items-center">
                      <input type="checkbox" v-model="uppercaseHeaders" class="peer sr-only" role="switch" />
                      <span class="pointer-events-none block h-6 w-11 rounded-full bg-gray-300 dark:bg-gray-700 transition-colors peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 dark:peer-focus-visible:ring-blue-500"></span>
                      <span class="pointer-events-none absolute left-0.5 top-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5"></span>
                    </div>
                  </label>
                  <label class="flex items-center justify-between gap-4 text-sm text-gray-700 dark:text-gray-300 select-none" :class="{ 'opacity-50 cursor-not-allowed': !atsMode, 'cursor-pointer': atsMode }">
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

        <button 
          @click="atsMode = !atsMode" 
          class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
          :class="atsMode ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'"
          title="Toggle ATS Friendly Mode"
        >
          <FileText :size="16" />
          <span>ATS Mode</span>
        </button>

        <button @click="print" class="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition-colors">
          <Printer :size="20" />
          Export to PDF
        </button>
      </div>
    </header>
    
    <main v-if="store.cv" class="flex-1 flex flex-col md:flex-row overflow-hidden">
      <div class="w-full md:w-1/2 lg:w-1/3 bg-gray-50 dark:bg-gray-900 border-r dark:border-gray-700 overflow-y-auto p-4 print:hidden h-[calc(100vh-64px)] transition-colors duration-300">
        <CvForm />
      </div>
      <div class="w-full md:w-1/2 lg:w-2/3 bg-gray-200 dark:bg-gray-950 p-8 overflow-y-auto h-[calc(100vh-64px)] print:h-auto print:w-full print:p-0 print:overflow-visible print:bg-white transition-colors duration-300">
        <div class="print:w-full flex justify-center">
          <CvPreview 
            :ats-mode="atsMode" 
            :show-picture-in-ats="showPictureInAts"
            :uppercase-name="uppercaseName"
            :uppercase-role="uppercaseRole"
            :uppercase-headers="uppercaseHeaders"
          />
        </div>
      </div>
    </main>
    <div v-else class="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
      Loading CV...
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

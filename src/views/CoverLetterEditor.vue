<script setup>
import CoverLetterForm from '../components/CoverLetterForm.vue'
import CoverLetterPreview from '../components/CoverLetterPreview.vue'
import { useCoverLetterStore } from '../stores/coverLetter'
import { Printer, Moon, Sun, ArrowLeft, Save, FileText } from 'lucide-vue-next'
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useCoverLetterStore()
const route = useRoute()
const router = useRouter()

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

onMounted(() => {
  const name = route.params.name
  if (name) {
    store.setCurrentCoverLetter(name)
  }
})

const print = () => {
  window.print()
}

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col h-screen overflow-hidden">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm z-10 flex-shrink-0">
      <div class="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="goBack" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Back to Dashboard">
            <ArrowLeft class="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div class="flex items-center gap-2">
            <FileText class="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 class="text-xl font-bold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
              {{ store.currentCoverLetterName }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button @click="toggleTheme" class="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <component :is="isDark ? Sun : Moon" class="w-5 h-5" />
          </button>
          <button @click="print" class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm">
            <Printer class="w-4 h-4" />
            <span class="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex overflow-hidden" v-if="store.coverLetter">
      <!-- Editor Panel -->
      <div class="w-1/2 lg:w-[45%] xl:w-[40%] border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-y-auto custom-scrollbar">
        <div class="p-6 max-w-3xl mx-auto">
          <CoverLetterForm />
        </div>
      </div>

      <!-- Preview Panel -->
      <div class="flex-1 bg-gray-200 dark:bg-gray-800 overflow-y-auto custom-scrollbar p-8 flex justify-center">
        <div class="w-full max-w-[21cm]">
           <CoverLetterPreview />
        </div>
      </div>
    </main>
    <div v-else class="flex-1 flex items-center justify-center">
      <p class="text-gray-500">Loading...</p>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.8);
}

@media print {
  header, .w-1\/2 {
    display: none !important;
  }
  
  main {
    display: block;
    overflow: visible;
  }

  .flex-1 {
    background: white;
    padding: 0;
    overflow: visible;
  }
}
</style>

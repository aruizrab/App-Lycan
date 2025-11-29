<script setup>
import CvForm from './components/CvForm.vue'
import CvPreview from './components/CvPreview.vue'
import { Printer } from 'lucide-vue-next'

const print = () => {
  window.print()
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-white shadow p-4 flex justify-between items-center print:hidden z-10 relative">
      <h1 class="text-xl font-bold">CV Maker</h1>
      <button @click="print" class="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700">
        <Printer :size="20" />
        Export to PDF
      </button>
    </header>
    
    <main class="flex-1 flex flex-col md:flex-row overflow-hidden">
      <div class="w-full md:w-1/2 lg:w-1/3 bg-gray-50 border-r overflow-y-auto p-4 print:hidden h-[calc(100vh-64px)]">
        <CvForm />
      </div>
      <div class="w-full md:w-1/2 lg:w-2/3 bg-gray-200 p-8 overflow-y-auto h-[calc(100vh-64px)] print:h-auto print:w-full print:p-0 print:overflow-visible print:bg-white">
        <div class="print:w-full flex justify-center">
          <CvPreview />
        </div>
      </div>
    </main>
  </div>
</template>

<style>
/* Global print styles override */
@media print {
  body {
    overflow: visible !important;
    height: auto !important;
  }
}
</style>

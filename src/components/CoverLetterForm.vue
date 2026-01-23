<script setup>
import { useCoverLetterStore } from '../stores/coverLetter'
import RichTextEditor from './RichTextEditor.vue'
import { Upload, X } from 'lucide-vue-next'

const store = useCoverLetterStore()

const handleImageUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    store.coverLetter.signatureImage = e.target.result
  }
  reader.readAsDataURL(file)
}

const removeImage = () => {
  store.coverLetter.signatureImage = ''
}
</script>

<template>
  <div class="space-y-6 pb-20" v-if="store.coverLetter">
    <section class="bg-white dark:bg-gray-800 p-4 rounded shadow transition-colors duration-300">
      <h2 class="text-lg font-semibold mb-4 dark:text-white">Cover Letter Details</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Applicant Address</label>
          <textarea v-model="store.coverLetter.applicantAddress" rows="3" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:text-white"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Address</label>
          <textarea v-model="store.coverLetter.companyAddress" rows="3" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:text-white"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
          <input v-model="store.coverLetter.date" type="date" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:text-white" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title (Vacancy Name)</label>
          <input v-model="store.coverLetter.title" type="text" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:text-white" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Subtitle (Reference Number)</label>
          <input v-model="store.coverLetter.subtitle" type="text" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:text-white" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Body</label>
          <RichTextEditor v-model="store.coverLetter.body" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Signature Image</label>
          
          <div v-if="store.coverLetter.signatureImage" class="relative inline-block group">
            <img :src="store.coverLetter.signatureImage" alt="Signature" class="h-20 object-contain border rounded bg-white" />
            <button @click="removeImage" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition-colors" title="Remove signature">
              <X :size="14" />
            </button>
          </div>

          <div v-else>
            <label class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              <Upload :size="16" />
              <span>Upload Signature</span>
              <input type="file" accept="image/*" class="hidden" @change="handleImageUpload" />
            </label>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Recommended: Transparent PNG</p>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Signature Name</label>
          <input v-model="store.coverLetter.signatureName" type="text" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:text-white" />
        </div>
      </div>
    </section>
  </div>
</template>

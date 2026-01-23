<script setup>
import { useCoverLetterStore } from '../stores/coverLetter'
import { computed } from 'vue'

const props = defineProps({
  uppercaseTitle: {
    type: Boolean,
    default: true
  }
})

const store = useCoverLetterStore()
const cl = computed(() => store.coverLetter)

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <div class="bg-white px-[25mm] py-[25mm] shadow-lg min-h-[29.7cm] w-[21cm] mx-auto text-gray-800 text-sm leading-relaxed" id="cv-preview">
    <div class="flex flex-col" v-if="cl">
      <div>
        <!-- Applicant Address -->
        <div v-if="cl.applicantAddress" class="mb-4 whitespace-pre-line text-right">
          {{ cl.applicantAddress }}
        </div>

        <!-- Company Address -->
        <div v-if="cl.companyAddress" class="mb-4 whitespace-pre-line">
          {{ cl.companyAddress }}
        </div>

        <!-- Date -->
        <div v-if="cl.date" class="mb-4">
          {{ formatDate(cl.date) }}
        </div>

        <!-- Title -->
        <div v-if="cl.title" class="mb-2 font-bold text-lg" :class="{ 'uppercase': uppercaseTitle }">
          {{ cl.title }}
        </div>

        <!-- Subtitle -->
        <div v-if="cl.subtitle" class="mb-4 font-semibold">
          {{ cl.subtitle }}
        </div>

        <!-- Body -->
        <div v-if="cl.body" class="rich-text" v-html="cl.body"></div>
      </div>

      <!-- Signature -->
      <div v-if="cl.signatureImage || cl.signatureName" class="mt-4">
        <div v-if="cl.signatureImage" class="mb-2">
          <img :src="cl.signatureImage" alt="Signature" class="h-16 object-contain" />
        </div>
        <div v-if="cl.signatureName" class="font-semibold">
          {{ cl.signatureName }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  #cv-preview {
    box-shadow: none;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
  }
}

/* Rich Text Styles */
:deep(.rich-text ul) {
  list-style-type: disc;
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}
:deep(.rich-text ol) {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}
:deep(.rich-text p) {
  margin-bottom: 0.5em;
  min-height: 1em; /* Ensure empty paragraphs take up space */
}
:deep(.rich-text p:last-child) {
  margin-bottom: 0;
}
</style>

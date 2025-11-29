<script setup>
import { useCvStore } from '../stores/cv'
import { Mail, Phone, Globe, MapPin, Calendar } from 'lucide-vue-next'
import { computed } from 'vue'

const store = useCvStore()
const cv = computed(() => store.cv)

const getFavicon = (url) => {
  try {
    if (!url) return ''
    // Ensure url has protocol
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`
  } catch (e) {
    return ''
  }
}

const getIcon = (contact) => {
  if (contact.type === 'email') return Mail
  if (contact.type === 'phone') return Phone
  return null // For URL we use favicon img
}

const formatSkills = (content) => {
  if (!content) return []
  return content.split(',').map(s => s.trim()).filter(s => s)
}
</script>

<template>
  <div class="a4-page bg-white shadow-lg mx-auto text-gray-800 text-sm leading-relaxed">
    <!-- Header -->
    <header class="flex gap-6 items-start border-b-2 border-gray-800 pb-6 mb-6">
      <img v-if="cv.personalInfo.picture" :src="cv.personalInfo.picture" class="w-32 h-32 object-cover rounded-full border-2 border-gray-200" />
      <div class="flex-1">
        <h1 class="text-4xl font-bold text-gray-900 uppercase tracking-wide">{{ cv.personalInfo.name }}</h1>
        <p class="text-xl text-gray-600 mt-1 font-medium">{{ cv.personalInfo.role }}</p>
        
        <div class="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
          <div v-for="contact in cv.personalInfo.contact" :key="contact.id" class="flex items-center gap-1.5">
            <component :is="getIcon(contact)" v-if="getIcon(contact)" :size="16" />
            <img v-else-if="contact.value" :src="getFavicon(contact.value)" class="w-4 h-4" />
            
            <a v-if="contact.type === 'email'" :href="`mailto:${contact.value}`" class="hover:underline">{{ contact.value }}</a>
            <a v-else-if="contact.type === 'url'" :href="contact.value" target="_blank" class="hover:underline">{{ contact.value.replace(/^https?:\/\//, '') }}</a>
            <span v-else>{{ contact.value }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- About Me -->
    <section v-if="cv.personalInfo.aboutMe" class="mb-6">
      <h2 class="text-lg font-bold uppercase border-b border-gray-300 mb-3 pb-1">About Me</h2>
      <p class="whitespace-pre-line text-gray-700">{{ cv.personalInfo.aboutMe }}</p>
    </section>

    <!-- Dynamic Sections -->
    <div v-for="section in cv.sections" :key="section.id">
      <section v-if="section.visible && (section.items.length > 0 || section.content)" class="mb-6">
        <h2 class="text-lg font-bold uppercase border-b border-gray-300 mb-3 pb-1">{{ section.title }}</h2>
        
        <!-- Skills -->
        <div v-if="section.type === 'skills'" class="flex flex-wrap gap-2">
          <span v-for="skill in formatSkills(section.content)" :key="skill" class="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs font-semibold">
            {{ skill }}
          </span>
        </div>

        <!-- List Items -->
        <div v-else class="space-y-4">
          <div v-for="item in section.items" :key="item.id">
            <div class="flex justify-between items-baseline">
              <h3 class="font-bold text-base">{{ item.title }}</h3>
              <div class="text-xs text-gray-500 font-medium whitespace-nowrap flex items-center gap-1">
                <Calendar v-if="item.dateRange" :size="12" />
                {{ item.dateRange }} <span v-if="item.isCurrent">(Current)</span>
              </div>
            </div>
            
            <div v-if="item.subtitle || item.location" class="flex justify-between text-gray-600 text-xs mb-1 italic">
              <span>{{ item.subtitle }}</span>
              <span v-if="item.location" class="flex items-center gap-1"><MapPin :size="12" /> {{ item.location }}</span>
            </div>
            
            <p v-if="item.description" class="whitespace-pre-line text-gray-700 mt-1">{{ item.description }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.a4-page {
  width: 210mm;
  min-height: 297mm;
  padding: 20mm;
  background: white;
  box-sizing: border-box;
}

@media print {
  .a4-page {
    margin: 0;
    box-shadow: none;
    width: 100%;
    min-height: auto;
    padding: 0;
  }
}
</style>
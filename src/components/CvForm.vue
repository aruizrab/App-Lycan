<script setup>
import { useCvStore } from '../stores/cv'
import draggable from 'vuedraggable'
import { Plus, Trash2, GripVertical } from 'lucide-vue-next'
import RichTextEditor from './RichTextEditor.vue'
import { ref, onMounted, onUnmounted } from 'vue'

const store = useCvStore()

const addContact = store.addContactField
const removeContact = store.removeContactField
const addSectionItem = store.addSectionItem
const removeSectionItem = store.removeSectionItem

const containerRef = ref(null)
const isNarrow = ref(false)
let resizeObserver = null

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        isNarrow.value = entry.contentRect.width < 400
      }
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<template>
  <div ref="containerRef" class="space-y-6 pb-20">
    <!-- Personal Info -->
    <section class="bg-white dark:bg-gray-800 p-4 rounded shadow transition-colors duration-300">
      <h2 class="text-lg font-semibold mb-4 dark:text-white">Personal Information</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
          <input v-model="store.cv.personalInfo.name" type="text" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:text-white" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Role / Title</label>
          <input v-model="store.cv.personalInfo.role" type="text" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:text-white" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Picture URL</label>
          <input v-model="store.cv.personalInfo.picture" type="text" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:text-white" placeholder="https://..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">About Me</label>
          <input v-model="store.cv.personalInfo.aboutMeTitle" type="text" class="mt-1 mb-2 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:text-white" placeholder="Section Title (e.g. About Me)" />
          <RichTextEditor v-model="store.cv.personalInfo.aboutMe" />
        </div>
        
        <!-- Contact Info -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Information</label>
          <draggable 
            v-model="store.cv.personalInfo.contact" 
            item-key="id"
            handle=".contact-handle"
            group="contact-items"
          >
            <template #item="{ element: contact, index }">
              <div class="flex gap-2 mb-2 items-center flex-wrap">
                <GripVertical class="contact-handle cursor-move text-gray-400 hover:text-gray-600 flex-shrink-0" :size="20" />
                <select v-model="contact.type" class="rounded-md border-gray-300 dark:border-gray-600 border p-2 w-24 dark:bg-gray-700 dark:text-white flex-shrink-0">
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="url">Link</option>
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                </select>
                <input v-model="contact.label" type="text" class="w-32 rounded-md border-gray-300 dark:border-gray-600 border p-2 dark:bg-gray-700 dark:text-white flex-shrink-0" placeholder="Label" />
                <input v-model="contact.value" type="text" class="flex-1 min-w-[150px] rounded-md border-gray-300 dark:border-gray-600 border p-2 dark:bg-gray-700 dark:text-white" placeholder="Value" />
                <button @click="removeContact(index)" class="text-red-500 hover:text-red-700 flex-shrink-0"><Trash2 :size="18" /></button>
              </div>
            </template>
          </draggable>
          <button @click="addContact" class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 mt-2">
            <Plus :size="16" /> Add Contact Field
          </button>
        </div>
      </div>
    </section>

    <!-- Sections -->
    <draggable 
      v-model="store.cv.sections" 
      item-key="id"
      handle=".handle"
      class="space-y-6"
    >
      <template #item="{ element: section }">
        <section class="bg-white dark:bg-gray-800 p-4 rounded shadow transition-colors duration-300">
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-2">
              <GripVertical class="handle cursor-move text-gray-400" />
              <input v-model="section.title" class="font-semibold text-lg border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent dark:text-white dark:hover:border-gray-600" />
            </div>
            <div class="flex items-center gap-2">
               <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 select-none cursor-pointer">
                 <input type="checkbox" v-model="section.visible" /> Visible
               </label>
            </div>
          </div>

          <div v-if="section.visible" class="space-y-4">
            <!-- Skills Special Case -->
            <div v-if="section.type === 'skills'">
              <draggable 
                v-model="section.items" 
                item-key="id"
                handle=".skill-handle"
                group="skill-items"
              >
                <template #item="{ element: item, index }">
                   <div class="border dark:border-gray-700 p-3 rounded mb-3 relative group bg-gray-50 dark:bg-gray-700/50 pl-8">
                     <div class="absolute top-3 left-2 cursor-move skill-handle text-gray-400 hover:text-gray-600 z-10">
                        <GripVertical :size="16" />
                     </div>
                     <button @click="removeSectionItem(section.id, index)" class="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 :size="16" /></button>
                     <div class="space-y-2">
                       <input v-model="item.title" placeholder="Subsection Title (optional)" class="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700 dark:text-white" />
                       <textarea v-model="item.content" rows="3" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 dark:bg-gray-700 dark:text-white" placeholder="Java, Python, Vue.js..."></textarea>
                     </div>
                   </div>
                </template>
              </draggable>
               <button @click="addSectionItem(section.id)" class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
                <Plus :size="16" /> Add Subsection
              </button>
            </div>

            <!-- Languages Special Case -->
            <div v-else-if="section.type === 'languages'">
               <div v-for="(item, index) in section.items" :key="item.id" class="border dark:border-gray-700 p-3 rounded mb-3 relative group bg-gray-50 dark:bg-gray-700/50">
                 <button @click="removeSectionItem(section.id, index)" class="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 :size="16" /></button>
                 <div class="grid gap-3" :class="isNarrow ? 'grid-cols-1' : 'grid-cols-2'">
                   <input v-model="item.language" placeholder="Language (e.g. English)" class="border dark:border-gray-600 p-2 rounded dark:bg-gray-700 dark:text-white" />
                   <select v-model="item.level" class="border dark:border-gray-600 p-2 rounded dark:bg-gray-700 dark:text-white">
                     <option value="" disabled>Select Level</option>
                     <option value="Native">Native</option>
                     <option value="A1">A1</option>
                     <option value="A2">A2</option>
                     <option value="B1">B1</option>
                     <option value="B2">B2</option>
                     <option value="C1">C1</option>
                     <option value="C2">C2</option>
                   </select>
                 </div>
               </div>
               <button @click="addSectionItem(section.id)" class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
                <Plus :size="16" /> Add Language
              </button>
            </div>

            <!-- List Items (Experience, Education, Projects, Certifications) -->
            <div v-else>
              <draggable 
                v-model="section.items" 
                item-key="id"
                handle=".item-handle"
                group="section-items"
              >
                <template #item="{ element: item, index }">
                  <div class="border dark:border-gray-700 p-3 rounded mb-3 relative group bg-gray-50 dark:bg-gray-700/50">
                    <div class="absolute top-3 left-2 cursor-move item-handle text-gray-400 hover:text-gray-600 z-10">
                        <GripVertical :size="16" />
                    </div>
                    <button @click="removeSectionItem(section.id, index)" class="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 :size="16" /></button>
                    
                    <div class="grid grid-cols-1 gap-3 pl-6">
                      <input v-model="item.title" placeholder="Title (e.g. Job Title, Project Name)" class="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700 dark:text-white" />
                      
                      <div class="grid gap-2" :class="isNarrow ? 'grid-cols-1' : 'grid-cols-2'">
                        <input v-model="item.subtitle" placeholder="Organization / Company" class="border dark:border-gray-600 p-2 rounded dark:bg-gray-700 dark:text-white" :class="{'col-span-2': section.type === 'certifications' && !isNarrow}" />
                        <input v-if="section.type !== 'certifications'" v-model="item.location" placeholder="Location" class="border dark:border-gray-600 p-2 rounded dark:bg-gray-700 dark:text-white" />
                      </div>

                      <div v-if="section.type === 'projects'" class="space-y-2">
                         <input v-model="item.link" placeholder="Project Link (URL)" class="w-full border dark:border-gray-600 p-2 rounded dark:bg-gray-700 dark:text-white" />
                         <div class="flex gap-2" :class="{'flex-col': isNarrow}">
                            <input v-model="item.skillsLabel" placeholder="Label (e.g. Tech Stack)" class="border dark:border-gray-600 p-2 rounded dark:bg-gray-700 dark:text-white" :class="isNarrow ? 'w-full' : 'w-1/3'" />
                            <input v-model="item.skills" placeholder="Skills (comma separated)" class="border dark:border-gray-600 p-2 rounded dark:bg-gray-700 dark:text-white" :class="isNarrow ? 'w-full' : 'w-2/3'" />
                         </div>
                      </div>
                      
                      <div class="grid gap-2" :class="isNarrow ? 'grid-cols-1' : 'grid-cols-2'">
                        <div class="flex flex-col">
                          <label class="text-xs text-gray-500 dark:text-gray-400">Start Date</label>
                          <input v-model="item.startDate" type="month" class="border dark:border-gray-600 p-2 rounded w-full dark:bg-gray-700 dark:text-white" />
                        </div>
                        <div class="flex flex-col">
                          <label class="text-xs text-gray-500 dark:text-gray-400">End Date</label>
                          <div class="flex gap-2 items-center">
                             <input v-if="!item.isCurrent" v-model="item.endDate" type="month" class="border dark:border-gray-600 p-2 rounded w-full dark:bg-gray-700 dark:text-white" />
                             <span v-else class="text-sm font-medium text-gray-600 dark:text-gray-300 p-2">Present</span>
                          </div>
                          <label class="flex items-center gap-2 text-xs select-none cursor-pointer mt-1 dark:text-gray-300">
                            <input type="checkbox" v-model="item.isCurrent" /> Current
                          </label>
                        </div>
                      </div>

                      <RichTextEditor v-model="item.description" />
                    </div>
                  </div>
                </template>
              </draggable>
              <button @click="addSectionItem(section.id)" class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
                <Plus :size="16" /> Add Item
              </button>
            </div>
          </div>
        </section>
      </template>
    </draggable>
  </div>
</template>
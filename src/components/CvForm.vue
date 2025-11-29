<script setup>
import { useCvStore } from '../stores/cv'
import draggable from 'vuedraggable'
import { Plus, Trash2, GripVertical } from 'lucide-vue-next'

const store = useCvStore()

const addContact = store.addContactField
const removeContact = store.removeContactField
const addSectionItem = store.addSectionItem
const removeSectionItem = store.removeSectionItem

</script>

<template>
  <div class="space-y-6 pb-20">
    <!-- Personal Info -->
    <section class="bg-white p-4 rounded shadow">
      <h2 class="text-lg font-semibold mb-4">Personal Information</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Full Name</label>
          <input v-model="store.cv.personalInfo.name" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Role / Title</label>
          <input v-model="store.cv.personalInfo.role" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Picture URL</label>
          <input v-model="store.cv.personalInfo.picture" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" placeholder="https://..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">About Me</label>
          <textarea v-model="store.cv.personalInfo.aboutMe" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"></textarea>
        </div>
        
        <!-- Contact Info -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Contact Information</label>
          <div v-for="(contact, index) in store.cv.personalInfo.contact" :key="contact.id" class="flex gap-2 mb-2">
            <select v-model="contact.type" class="rounded-md border-gray-300 border p-2 w-24">
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="url">Link</option>
            </select>
            <input v-model="contact.value" type="text" class="flex-1 rounded-md border-gray-300 border p-2" placeholder="Value" />
            <button @click="removeContact(index)" class="text-red-500 hover:text-red-700"><Trash2 :size="18" /></button>
          </div>
          <button @click="addContact" class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
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
        <section class="bg-white p-4 rounded shadow">
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-2">
              <GripVertical class="handle cursor-move text-gray-400" />
              <input v-model="section.title" class="font-semibold text-lg border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent" />
            </div>
            <div class="flex items-center gap-2">
               <label class="flex items-center gap-2 text-sm text-gray-600 select-none cursor-pointer">
                 <input type="checkbox" v-model="section.visible" /> Visible
               </label>
            </div>
          </div>

          <div v-if="section.visible" class="space-y-4">
            <!-- Skills Special Case -->
            <div v-if="section.type === 'skills'">
               <label class="block text-sm font-medium text-gray-700">Skills (comma separated)</label>
               <textarea v-model="section.content" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" placeholder="Java, Python, Vue.js..."></textarea>
            </div>

            <!-- List Items (Experience, Education, Projects, Certifications) -->
            <div v-else>
              <div v-for="(item, index) in section.items" :key="item.id" class="border p-3 rounded mb-3 relative group bg-gray-50">
                <button @click="removeSectionItem(section.id, index)" class="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 :size="16" /></button>
                
                <div class="grid grid-cols-1 gap-3">
                  <input v-model="item.title" placeholder="Title (e.g. Job Title, Project Name)" class="w-full border p-2 rounded" />
                  
                  <div v-if="section.type !== 'certifications'" class="grid grid-cols-2 gap-2">
                    <input v-model="item.subtitle" placeholder="Organization / Company" class="border p-2 rounded" />
                    <input v-model="item.location" placeholder="Location" class="border p-2 rounded" />
                  </div>
                  
                  <div v-if="section.type !== 'certifications'" class="grid grid-cols-2 gap-2">
                    <input v-model="item.dateRange" placeholder="Time Range" class="border p-2 rounded" />
                    <label class="flex items-center gap-2 text-sm select-none cursor-pointer">
                      <input type="checkbox" v-model="item.isCurrent" /> Current
                    </label>
                  </div>

                  <textarea v-model="item.description" placeholder="Description" rows="3" class="w-full border p-2 rounded"></textarea>
                </div>
              </div>
              <button @click="addSectionItem(section.id)" class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Plus :size="16" /> Add Item
              </button>
            </div>
          </div>
        </section>
      </template>
    </draggable>
  </div>
</template>
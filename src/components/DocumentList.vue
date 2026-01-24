<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
    <table class="w-full">
      <thead class="bg-gray-50 dark:bg-gray-700">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Name
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Last Modified
          </th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
        <tr v-if="items.length === 0">
          <td colspan="3" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            {{ emptyMessage }}
          </td>
        </tr>
        <tr 
          v-for="item in items" 
          :key="item.name"
          class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
          @click="$emit('click:item', item.name)"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <component 
                :is="item.icon || FileTextIcon" 
                class="w-5 h-5 text-blue-500 dark:text-blue-400 mr-3 flex-shrink-0" 
              />
              <div>
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ item.name }}
                </div>
                <div v-if="item.subtitle" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ item.subtitle }}
                </div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(item.lastModified) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <slot name="action-menu" :item="item"></slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { FileText as FileTextIcon } from 'lucide-vue-next'

defineProps({
  items: {
    type: Array,
    required: true
  },
  emptyMessage: {
    type: String,
    default: 'No items found'
  }
})

defineEmits(['click:item'])

const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown date'
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

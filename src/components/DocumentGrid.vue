<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div v-if="items.length === 0" class="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
      {{ emptyMessage }}
    </div>
    
    <div
      v-for="item in items"
      :key="item.name"
      class="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer relative group"
      @click="$emit('click:item', item.name)"
    >
      <div class="p-6">
        <component 
          :is="item.icon || FileTextIcon" 
          class="w-12 h-12 text-blue-500 dark:text-blue-400 mb-4" 
        />
        <h3 class="font-semibold text-lg mb-2 text-gray-900 dark:text-white truncate">
          {{ item.name }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ formatDate(item.lastModified) }}
        </p>
        <p v-if="item.subtitle" class="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {{ item.subtitle }}
        </p>
      </div>
      
      <slot name="action-menu" :item="item"></slot>
    </div>
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
    day: 'numeric' 
  })
}
</script>

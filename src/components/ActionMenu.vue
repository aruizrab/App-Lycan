<template>
  <div class="relative inline-block" ref="menuContainer">
    <button
      @click.stop="toggleMenu"
      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      :class="{ 'bg-gray-100 dark:bg-gray-700': isOpen }"
    >
      <MoreVerticalIcon class="w-5 h-5 text-gray-600 dark:text-gray-300" />
    </button>

    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50"
      >
        <div class="py-1">
          <button
            v-for="action in actions"
            :key="action.id"
            @click.stop="handleAction(action.id)"
            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :class="{ 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20': action.id === 'delete' }"
          >
            <component 
              :is="action.icon" 
              class="w-4 h-4 mr-3" 
              :class="{ 'text-red-600 dark:text-red-400': action.id === 'delete' }"
            />
            {{ action.label }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { MoreVertical as MoreVerticalIcon, Copy, Trash2, Download, Edit } from 'lucide-vue-next'

defineProps({
  actions: {
    type: Array,
    default: () => [
      { id: 'edit', label: 'Edit', icon: Edit },
      { id: 'duplicate', label: 'Duplicate', icon: Copy },
      { id: 'export', label: 'Export JSON', icon: Download },
      { id: 'delete', label: 'Delete', icon: Trash2 }
    ]
  }
})

const emit = defineEmits(['action'])

const isOpen = ref(false)
const menuContainer = ref(null)

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const handleAction = (actionId) => {
  emit('action', actionId)
  isOpen.value = false
}

const handleClickOutside = (event) => {
  if (menuContainer.value && !menuContainer.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

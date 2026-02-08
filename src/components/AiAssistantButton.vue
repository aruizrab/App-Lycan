<script setup>
import { Sparkles } from 'lucide-vue-next'

defineProps({
  active: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])
</script>

<template>
  <button
    @click="$emit('click')"
    class="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
    :class="active ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' : ''"
    title="AI Assistant"
  >
    <Sparkles class="w-5 h-5" />
  </button>
</template>

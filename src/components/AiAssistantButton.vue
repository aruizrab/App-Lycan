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
  <button class="icon-btn" :class="{ active: active }" @click="$emit('click')" title="AI Assistant">
    <Sparkles :size="18" />
  </button>
</template>

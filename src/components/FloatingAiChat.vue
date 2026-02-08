<script setup>
import { ref } from 'vue'
import AiStreamingChat from './AiStreamingChat.vue'

defineProps({
  contextData: {
    type: Object,
    default: () => ({})
  },
  contextType: {
    type: String,
    default: null
  },
  documentId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close'])

// Resizing state
const chatWidth = ref(400)
const chatHeight = ref(600)
const isResizing = ref(false)
const resizeHandle = ref(null)

const startResize = (e, handle) => {
  e.preventDefault()
  isResizing.value = true
  resizeHandle.value = handle
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = handle === 'width' ? 'ew-resize' : 'ns-resize'
  document.body.style.userSelect = 'none'
}

const handleResize = (e) => {
  if (!isResizing.value) return

  if (resizeHandle.value === 'width') {
    const newWidth = window.innerWidth - e.clientX - 16 // 16px for right margin
    if (newWidth >= 320 && newWidth <= 800) {
      chatWidth.value = newWidth
    }
  } else if (resizeHandle.value === 'height') {
    const newHeight = window.innerHeight - e.clientY - 16 // 16px for bottom margin
    if (newHeight >= 400 && newHeight <= window.innerHeight - 100) {
      chatHeight.value = newHeight
    }
  }
}

const stopResize = () => {
  isResizing.value = false
  resizeHandle.value = null
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div
    class="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden z-50 resize"
    :style="{ width: chatWidth + 'px', height: chatHeight + 'px' }"
  >
    <!-- Resize handles -->
    <div
      class="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-purple-500/30 transition-colors"
      @mousedown="(e) => startResize(e, 'width')"
    ></div>
    <div
      class="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-purple-500/30 transition-colors"
      @mousedown="(e) => startResize(e, 'height')"
    ></div>

    <!-- AI Chat Component -->
    <AiStreamingChat
      class="flex-1"
      :context-data="contextData"
      :context-type="contextType"
      :document-id="documentId"
      :show-close="true"
      @close="handleClose"
    />
  </div>
</template>

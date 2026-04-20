<script setup>
import { ref } from 'vue'
import AiStreamingChat from './AiStreamingChat.vue'

defineProps({
  contextData: { type: Object, default: () => ({}) },
  contextType: { type: String, default: null },
  documentId: { type: String, default: null }
})

const emit = defineEmits(['close'])

const chatWidth = ref(380)
const chatHeight = ref(560)
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
    const w = window.innerWidth - e.clientX - 22
    if (w >= 320 && w <= 800) chatWidth.value = w
  } else {
    const h = window.innerHeight - e.clientY - 80
    if (h >= 360 && h <= window.innerHeight - 100) chatHeight.value = h
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
</script>

<template>
  <div class="float-ai glass sheen" :style="{ width: chatWidth + 'px', height: chatHeight + 'px' }">
    <!-- Resize handles -->
    <div class="rh rh-left" @mousedown="(e) => startResize(e, 'width')"></div>
    <div class="rh rh-top" @mousedown="(e) => startResize(e, 'height')"></div>

    <AiStreamingChat
      class="float-chat-inner"
      :context-data="contextData"
      :context-type="contextType"
      :document-id="documentId"
      :show-close="true"
      :show-header="true"
      @close="emit('close')"
    />
  </div>
</template>

<style scoped>
.rh {
  position: absolute;
  z-index: 3;
}
.rh-left {
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
}
.rh-top {
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}

.float-chat-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ── Override AiStreamingChat Tailwind styles for glass context ──────────── */
/* Bubble/message styles are now native CSS in AiStreamingChat — no overrides needed there. */

/* Root container — transparent so glass bg shows */
:deep(.flex.flex-col.h-full) {
  background: transparent !important;
  color: var(--fg-0) !important;
  height: 100% !important;
}

/* ── Header ───────────────────────────────────────────────────────────────── */
:deep(.p-3.border-b) {
  background: color-mix(in oklch, var(--fg-0) 5%, transparent) !important;
  border-bottom: 1px solid color-mix(in oklch, var(--fg-0) 10%, transparent) !important;
  padding: 10px 14px !important;
}
:deep(.text-purple-500) {
  color: var(--accent) !important;
}
:deep(.font-semibold.text-gray-900),
:deep(.font-semibold.dark\:text-white) {
  color: var(--fg-0) !important;
}

/* Header icon buttons */
:deep(.p-1\.5.rounded) {
  color: var(--fg-1) !important;
  border-radius: 8px !important;
  transition: background 0.15s !important;
}
:deep(.p-1\.5.rounded:hover) {
  background: color-mix(in oklch, var(--fg-0) 12%, transparent) !important;
  color: var(--fg-0) !important;
}

/* Session dropdown */
:deep(.absolute.right-0.top-full.w-64) {
  background: color-mix(in oklch, var(--bg-0) 95%, transparent) !important;
  border: 1px solid color-mix(in oklch, var(--fg-0) 12%, transparent) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
}
:deep(.absolute.right-0.top-full.w-64 .p-2.border-b) {
  border-color: color-mix(in oklch, var(--fg-0) 10%, transparent) !important;
  color: var(--fg-2) !important;
}
:deep(.px-3.py-2.cursor-pointer) {
  color: var(--fg-0) !important;
}
:deep(.px-3.py-2.cursor-pointer:hover) {
  background: color-mix(in oklch, var(--fg-0) 8%, transparent) !important;
}
:deep(.text-xs.text-gray-400) {
  color: var(--fg-2) !important;
}

/* ── Messages area background ─────────────────────────────────────────────── */
:deep(.chat-messages-area) {
  background: transparent !important;
}

/* ── Summarization banner (still Tailwind) ────────────────────────────────── */
:deep(.bg-purple-50.dark\:bg-purple-900\/30) {
  background: color-mix(in oklch, var(--accent) 10%, transparent) !important;
  border-color: color-mix(in oklch, var(--accent) 20%, transparent) !important;
}
:deep(.text-purple-700),
:deep(.dark\:text-purple-300) {
  color: var(--accent) !important;
}

/* ── Input area ───────────────────────────────────────────────────────────── */
:deep(.p-4.border-t) {
  background: color-mix(in oklch, var(--fg-0) 3%, transparent) !important;
  border-top: 1px solid color-mix(in oklch, var(--fg-0) 10%, transparent) !important;
  padding: 10px 12px !important;
}
:deep(textarea.resize-none) {
  background: color-mix(in oklch, var(--fg-0) 6%, transparent) !important;
  border: 1px solid color-mix(in oklch, var(--fg-0) 12%, transparent) !important;
  color: var(--fg-0) !important;
  border-radius: 12px !important;
}
:deep(textarea.resize-none::placeholder) {
  color: color-mix(in oklch, var(--fg-0) 35%, transparent) !important;
}
:deep(textarea.resize-none:focus) {
  outline: none !important;
  border-color: color-mix(in oklch, var(--accent) 50%, transparent) !important;
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--accent) 15%, transparent) !important;
}

/* Send button */
:deep(.bg-purple-600) {
  background: var(--accent) !important;
  border-radius: 10px !important;
  width: 40px !important;
  height: 40px !important;
  padding: 0 !important;
  display: grid !important;
  place-items: center !important;
  align-self: flex-end !important;
}
:deep(.bg-purple-600:hover) {
  background: color-mix(in oklch, var(--accent) 80%, white) !important;
}
:deep(.disabled\:bg-gray-300),
:deep(.dark\:disabled\:bg-gray-600) {
  background: color-mix(in oklch, var(--fg-0) 10%, transparent) !important;
}

/* Footer info bar */
:deep(.mt-2.flex.justify-between) {
  color: var(--fg-2) !important;
}
:deep(.border.border-gray-200) {
  background: transparent !important;
  border-color: color-mix(in oklch, var(--fg-0) 12%, transparent) !important;
  color: var(--fg-2) !important;
  border-radius: 6px !important;
}

/* Command menu popup */
:deep(.absolute.bottom-full.left-4) {
  background: color-mix(in oklch, var(--bg-0) 95%, transparent) !important;
  border: 1px solid color-mix(in oklch, var(--fg-0) 12%, transparent) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
}
:deep(.absolute.bottom-full.left-4 .p-2.text-xs) {
  background: color-mix(in oklch, var(--fg-0) 4%, transparent) !important;
  color: var(--fg-2) !important;
}
:deep(.absolute.bottom-full.left-4 li) {
  color: var(--fg-0) !important;
}
:deep(.absolute.bottom-full.left-4 li:hover) {
  background: color-mix(in oklch, var(--fg-0) 6%, transparent) !important;
}
:deep(.font-mono) {
  font-family: var(--font-mono) !important;
  color: var(--accent) !important;
}
</style>

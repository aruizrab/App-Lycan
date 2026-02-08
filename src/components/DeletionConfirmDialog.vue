<script setup>
import { ref, watch, computed } from 'vue'
import { AlertTriangleIcon, XIcon } from 'lucide-vue-next'
import { getPendingDeletion, confirmDeletion, rejectDeletion } from '../services/dataAccess'

const pendingDeletion = ref(null)

// Poll for pending deletions
const checkPendingDeletion = () => {
  pendingDeletion.value = getPendingDeletion()
}

// Check every 100ms when dialog is closed
let pollInterval = null
watch(
  () => pendingDeletion.value,
  (val) => {
    if (val) {
      // Stop polling when dialog is shown
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
      }
    } else {
      // Start polling when dialog is closed
      if (!pollInterval) {
        pollInterval = setInterval(checkPendingDeletion, 100)
      }
    }
  },
  { immediate: true }
)

// Cleanup on unmount
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})

const isOpen = computed(() => !!pendingDeletion.value)

const getMessage = computed(() => {
  if (!pendingDeletion.value) return { title: '', message: '' }

  const { type, details } = pendingDeletion.value

  switch (type) {
    case 'workspace':
      return {
        title: 'Delete Workspace',
        message: `Are you sure you want to delete the workspace "${details.workspaceName}"? This will permanently delete all CVs, cover letters, and context data in this workspace.`,
        confirmText: 'Delete Workspace',
        itemName: details.workspaceName
      }

    case 'cv':
      return {
        title: 'Delete CV',
        message: `Are you sure you want to delete the CV "${details.cvName}" from workspace "${details.workspaceName}"?`,
        confirmText: 'Delete CV',
        itemName: details.cvName
      }

    case 'cover_letter':
      return {
        title: 'Delete Cover Letter',
        message: `Are you sure you want to delete the cover letter "${details.coverLetterName}" from workspace "${details.workspaceName}"?`,
        confirmText: 'Delete Cover Letter',
        itemName: details.coverLetterName
      }

    case 'workspace_context':
      return {
        title: 'Delete Context Data',
        message: `Are you sure you want to delete the "${details.contextKey}" context data from workspace "${details.workspaceName}"?`,
        confirmText: 'Delete Context',
        itemName: details.contextKey
      }

    default:
      return {
        title: 'Delete Item',
        message: 'Are you sure you want to delete this item?',
        confirmText: 'Delete',
        itemName: 'item'
      }
  }
})

const handleConfirm = () => {
  confirmDeletion()
  pendingDeletion.value = null
}

const handleCancel = () => {
  rejectDeletion()
  pendingDeletion.value = null
}

// Handle ESC key
const handleKeydown = (e) => {
  if (e.key === 'Escape' && isOpen.value) {
    handleCancel()
  }
}

import { onMounted } from 'vue'
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
        @click.self="handleCancel"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg"
          @click.stop
          role="alertdialog"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-description"
        >
          <!-- Header -->
          <div class="flex items-start gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
            <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangleIcon class="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div class="flex-1 min-w-0">
              <h2
                id="dialog-title"
                class="text-lg font-semibold text-gray-900 dark:text-white mb-2"
              >
                {{ getMessage.title }}
              </h2>
              <p
                id="dialog-description"
                class="text-sm text-gray-600 dark:text-gray-300"
              >
                {{ getMessage.message }}
              </p>
            </div>
            <button
              @click="handleCancel"
              class="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Close"
              aria-label="Close dialog"
            >
              <XIcon class="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 p-6 bg-gray-50 dark:bg-gray-900/50">
            <button
              @click="handleCancel"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="handleConfirm"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              {{ getMessage.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}
</style>

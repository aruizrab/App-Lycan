<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="close"
    >
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isOpen"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        >
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ title }}
            </h2>
            <button
              @click="close"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XIcon class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="handleSubmit">
            <!-- File Upload (Import Mode) -->
            <div v-if="mode === 'import'" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select File
              </label>
              <input
                ref="fileInputRef"
                type="file"
                accept=".json"
                @change="handleFileChange"
                class="block w-full text-sm text-gray-900 dark:text-gray-100 
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-700
                       dark:file:bg-blue-900 dark:file:text-blue-200
                       hover:file:bg-blue-100 dark:hover:file:bg-blue-800
                       file:cursor-pointer cursor-pointer"
              />
              <p v-if="fileName" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Selected: {{ fileName }}
              </p>
            </div>

            <!-- Name Input -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ mode === 'import' ? 'Name for imported item' : 'Name' }}
              </label>
              <input
                ref="nameInputRef"
                v-model="nameValue"
                type="text"
                placeholder="Enter name..."
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500"
                :class="{ 'border-red-500 dark:border-red-500': errorMessage }"
              />
              <p v-if="errorMessage" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ errorMessage }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-2">
              <button
                type="button"
                @click="close"
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                       bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                       rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!canSubmit"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 
                       hover:bg-blue-700 rounded-lg transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ mode === 'create' ? 'Create' : 'Import' }}
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { X as XIcon } from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  mode: {
    type: String,
    default: 'create',
    validator: (value) => ['create', 'import'].includes(value)
  },
  title: {
    type: String,
    required: true
  },
  existingNames: {
    type: Array,
    default: () => []
  },
  suggestedName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'submit'])

const nameValue = ref('')
const fileName = ref('')
const fileContent = ref(null)
const errorMessage = ref('')
const nameInputRef = ref(null)
const fileInputRef = ref(null)

const canSubmit = computed(() => {
  if (props.mode === 'import' && !fileContent.value) return false
  return nameValue.value.trim().length > 0 && !errorMessage.value
})

const handleFileChange = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  fileName.value = file.name
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target.result
      JSON.parse(content) // Validate JSON
      fileContent.value = content
      errorMessage.value = ''
      
      // Try to extract name from file
      const parsed = JSON.parse(content)
      if (parsed.workspaceName || parsed.name) {
        nameValue.value = parsed.workspaceName || parsed.name
      }
    } catch {
      errorMessage.value = 'Invalid JSON file'
      fileContent.value = null
    }
  }
  reader.readAsText(file)
}

const validateName = () => {
  const name = nameValue.value.trim()
  if (!name) {
    errorMessage.value = ''
    return
  }
  
  if (props.existingNames.some(n => n.toLowerCase() === name.toLowerCase())) {
    errorMessage.value = 'This name already exists'
  } else {
    errorMessage.value = ''
  }
}

const handleSubmit = () => {
  validateName()
  if (!canSubmit.value) return

  emit('submit', nameValue.value.trim(), fileContent.value)
}

const close = () => {
  emit('close')
}

// Watch for name changes to validate
watch(nameValue, validateName)

// Watch for modal open to focus input and set suggested name
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    nameValue.value = props.suggestedName || ''
    fileName.value = ''
    fileContent.value = null
    errorMessage.value = ''
    
    await nextTick()
    if (props.mode === 'create') {
      nameInputRef.value?.focus()
    }
  }
})

// Watch for suggested name changes
watch(() => props.suggestedName, (newName) => {
  if (newName && props.isOpen) {
    nameValue.value = newName
  }
})
</script>

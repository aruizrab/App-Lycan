<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="close">
    <div class="modal glass sheen" @click.stop>
      <!-- Header -->
      <div class="between">
        <h3>New workspace</h3>
        <button class="icon-btn" @click="close">
          <XIcon :size="18" />
        </button>
      </div>

      <p>One workspace per application.</p>

      <form @submit.prevent="handleSubmit">
        <!-- Name Input -->
        <div class="field">
          <label>{{ mode === 'import' ? 'Name for imported item' : 'Name' }}</label>
          <input
            ref="nameInputRef"
            v-model="nameValue"
            type="text"
            placeholder="Enter name..."
            class="g-input"
          />
          <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        </div>

        <!-- Import divider + drop zone -->
        <div v-if="mode === 'import'">
          <div class="label-line">or import existing</div>
          <div class="doc-card doc-new drop-zone" @click="$refs.fileInputRef.click()">
            <div class="plus">
              <UploadIcon :size="22" />
            </div>
            <p>{{ fileName || 'Choose a .json file' }}</p>
            <span v-if="fileName">Selected: {{ fileName }}</span>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            @change="handleFileChange"
            style="display: none"
          />
        </div>

        <div v-if="mode === 'create'">
          <div class="label-line">or import existing</div>
          <div class="doc-card doc-new drop-zone" @click="switchToImport">
            <div class="plus">
              <UploadIcon :size="22" />
            </div>
            <p>Import from file</p>
            <span>Drop or click to browse</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="close">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="!canSubmit">
            {{ mode === 'create' ? 'Create workspace' : 'Import' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { X as XIcon, Upload as UploadIcon } from 'lucide-vue-next'

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

  if (props.existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
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

const switchToImport = () => {
  // This is a visual hint only; the parent controls the mode prop.
  // If there's a file input ref available, trigger it.
  // Otherwise the parent should handle the mode switch.
}

// Watch for name changes to validate
watch(nameValue, validateName)

// Watch for modal open to focus input and set suggested name
watch(
  () => props.isOpen,
  async (isOpen) => {
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
  }
)

// Watch for suggested name changes
watch(
  () => props.suggestedName,
  (newName) => {
    if (newName && props.isOpen) {
      nameValue.value = newName
    }
  }
)
</script>

<style scoped>
.error-text {
  font-size: 13px;
  color: var(--danger);
  margin-top: 4px;
}
.drop-zone {
  margin-top: 8px;
  text-align: center;
}
.modal form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>

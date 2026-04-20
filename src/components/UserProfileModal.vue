<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-backdrop" @click.self="handleBackdropClick">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        class="modal lg glass sheen modal-profile"
        @click.stop
      >
        <!-- Header -->
        <div class="between">
          <div class="row" style="gap: 12px">
            <div class="avatar-lg">
              <UserIcon :size="26" />
            </div>
            <div>
              <h3 id="profile-modal-title" class="serif">
                {{ formData.fullName || 'Your Profile' }}
              </h3>
              <p class="modal-subtitle">AI context</p>
            </div>
          </div>
          <div class="row" style="gap: 4px">
            <button class="icon-btn" title="Import profile" @click="triggerImport">
              <UploadIcon :size="16" />
            </button>
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              style="display: none"
              @change="handleImport"
            />
            <button class="icon-btn" title="Export profile" @click="exportProfile">
              <DownloadIcon :size="16" />
            </button>
            <button class="icon-btn" @click="handleClose" title="Close">
              <XIcon :size="18" />
            </button>
          </div>
        </div>

        <!-- Name field -->
        <div class="name-field">
          <label class="field-label" for="profile-name">Your name</label>
          <input
            id="profile-name"
            v-model="formData.fullName"
            type="text"
            class="g-input"
            placeholder="e.g. Mira Vale"
            autocomplete="name"
          />
        </div>

        <!-- Editor label row -->
        <div class="between editor-label-row">
          <span class="editor-section-label">Everything Lycan should know about you</span>
          <div style="position: relative">
            <button
              class="icon-btn icon-btn-sm"
              :class="{ active: showHelp }"
              type="button"
              title="Writing tips"
              @click.stop="showHelp = !showHelp"
            >
              <HelpCircleIcon :size="14" />
            </button>
            <!-- Help popover -->
            <div v-if="showHelp" class="help-popover glass sheen" @click.stop>
              <p class="help-title">What to include</p>
              <ul>
                <li>Roles you've held — titles, scope, dates</li>
                <li>Metrics you're proud of</li>
                <li>Tools, stacks &amp; methods</li>
                <li>Vocabulary you use vs. avoid</li>
                <li>Soft context — work style, what you're avoiding next</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Rich-text markdown editor -->
        <ProfileEditor v-model="formData.professionalExperience" :last-modified="lastModified" />

        <!-- Save message -->
        <div v-if="saveMessage" class="save-msg" :class="saveMessage.type">
          <CheckCircleIcon v-if="saveMessage.type === 'success'" :size="14" />
          <AlertCircleIcon v-else :size="14" />
          {{ saveMessage.text }}
        </div>

        <!-- Footer -->
        <div class="between">
          <span v-if="hasUnsavedChanges" class="pill warn">
            <span class="dot"></span>Unsaved changes
          </span>
          <div v-else></div>
          <div class="modal-actions">
            <button class="btn btn-ghost" @click="handleClose">Close</button>
            <button
              class="btn btn-primary"
              :disabled="!hasUnsavedChanges || isSaving"
              @click="saveProfile"
            >
              <SaveIcon :size="14" />
              {{ isSaving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserProfileStore } from '../stores/userProfile'
import ProfileEditor from './ProfileEditor.vue'
import {
  User as UserIcon,
  X as XIcon,
  HelpCircle as HelpCircleIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  AlertCircle as AlertCircleIcon
} from 'lucide-vue-next'

const props = defineProps({
  isOpen: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

const userProfileStore = useUserProfileStore()
const { professionalExperience, fullName, lastModified } = storeToRefs(userProfileStore)

const isSaving = ref(false)
const saveMessage = ref(null)
const showHelp = ref(false)
const fileInput = ref(null)

const formData = ref({
  fullName: '',
  professionalExperience: ''
})

// Sync form when modal opens
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      formData.value = {
        fullName: fullName.value || '',
        professionalExperience: professionalExperience.value || ''
      }
      saveMessage.value = null
      showHelp.value = false
    }
  },
  { immediate: true }
)

const hasUnsavedChanges = computed(() => {
  return (
    (formData.value.fullName || '') !== (fullName.value || '') ||
    (formData.value.professionalExperience || '') !== (professionalExperience.value || '')
  )
})

const saveProfile = () => {
  isSaving.value = true
  try {
    userProfileStore.updateContactInfo({ fullName: formData.value.fullName })
    userProfileStore.updateProfessionalExperience(formData.value.professionalExperience)
    saveMessage.value = { type: 'success', text: 'Profile saved!' }
    setTimeout(() => {
      saveMessage.value = null
    }, 2500)
  } catch (e) {
    saveMessage.value = { type: 'error', text: e.message }
  } finally {
    isSaving.value = false
  }
}

// ── Import / Export ───────────────────────────────────────────────────────────
const exportProfile = () => {
  const dataStr = userProfileStore.exportProfile()
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'user-profile.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const triggerImport = () => fileInput.value?.click()

const handleImport = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const success = userProfileStore.importProfile(e.target.result)
    if (success) {
      formData.value = {
        fullName: fullName.value || '',
        professionalExperience: professionalExperience.value || ''
      }
      saveMessage.value = { type: 'success', text: 'Profile imported!' }
    } else {
      saveMessage.value = { type: 'error', text: 'Invalid profile file.' }
    }
    setTimeout(() => {
      saveMessage.value = null
    }, 2500)
  }
  reader.onerror = () => {
    saveMessage.value = { type: 'error', text: 'Failed to read file.' }
    setTimeout(() => {
      saveMessage.value = null
    }, 2500)
  }
  reader.readAsText(file)
  event.target.value = ''
}

// Close handlers
const handleClose = () => {
  if (hasUnsavedChanges.value) {
    if (!confirm('You have unsaved changes. Close anyway?')) return
  }
  emit('close')
}

const handleBackdropClick = () => {
  if (!hasUnsavedChanges.value) emit('close')
}

const handleKeyDown = (e) => {
  if (e.key === 'Escape' && props.isOpen) handleClose()
  if (e.key === 'Escape' && showHelp.value) showHelp.value = false
}

const handleDocClick = () => {
  showHelp.value = false
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('click', handleDocClick)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', handleDocClick)
})
</script>

<style scoped>
.modal-profile {
  max-width: 720px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
}
.modal-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--fg-2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Name field */
.name-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--fg-2);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Editor label row */
.editor-label-row {
  margin-bottom: -6px;
}
.editor-section-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--fg-2);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Help popover */
.help-popover {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 240px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in oklch, var(--fg-0) 10%, transparent);
  z-index: 200;
}
.help-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--fg-1);
  margin: 0 0 8px;
}
.help-popover ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.help-popover li {
  font-size: 12px;
  color: var(--fg-2);
  line-height: 1.5;
  padding-left: 12px;
  position: relative;
}
.help-popover li::before {
  content: '·';
  position: absolute;
  left: 0;
  color: var(--accent);
}

/* Save message */
.save-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
}
.save-msg.success {
  background: color-mix(in oklch, var(--ok) 12%, transparent);
  border: 1px solid color-mix(in oklch, var(--ok) 30%, transparent);
  color: var(--ok);
}
.save-msg.error {
  background: color-mix(in oklch, var(--danger) 12%, transparent);
  border: 1px solid color-mix(in oklch, var(--danger) 30%, transparent);
  color: var(--danger);
}

.icon-btn-sm {
  width: 26px;
  height: 26px;
  min-width: 26px;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
</style>

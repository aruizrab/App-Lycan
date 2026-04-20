<script setup>
import { ref, watch, computed } from 'vue'
import { X, Save, Calendar, Trash2 } from 'lucide-vue-next'
import ProfileEditor from './ProfileEditor.vue'
import { useMarkdown } from '../composables/useMarkdown'

const { renderMarkdown } = useMarkdown()

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  mode: {
    type: String, // 'view', 'edit', 'create'
    default: 'view'
  },
  contextKey: {
    type: String,
    default: ''
  },
  contextContent: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'save', 'delete'])

const localContextKey = ref('')
const localContextContent = ref('')
const isEditing = ref(false)

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      localContextKey.value = props.contextKey
      localContextContent.value = props.contextContent
      isEditing.value = props.mode === 'edit' || props.mode === 'create'
    }
  },
  { immediate: true }
)

watch(
  () => [props.contextKey, props.contextContent],
  () => {
    if (props.isOpen) {
      localContextKey.value = props.contextKey
      localContextContent.value = props.contextContent
    }
  }
)

const modalTitle = computed(() => {
  if (props.mode === 'create') return 'Add context entry'
  if (props.mode === 'edit') return `Edit — ${formatContextKey(props.contextKey)}`
  return formatContextKey(props.contextKey)
})

const formatContextKey = (key) => {
  if (!key) return 'Context Entry'
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim()
}

const handleClose = () => emit('close')

const handleSave = () => {
  if (props.mode === 'create' && !localContextKey.value.trim()) {
    alert('Please enter a name for the context entry')
    return
  }
  if (!localContextContent.value.trim()) {
    alert('Please enter some content')
    return
  }
  emit('save', {
    key: localContextKey.value.trim(),
    content: localContextContent.value
  })
  handleClose()
}

const handleEdit = () => {
  isEditing.value = true
}

const handleDelete = () => {
  if (confirm(`Delete "${formatContextKey(props.contextKey)}"?`)) {
    emit('delete', props.contextKey)
    handleClose()
  }
}

const normalizeContextKey = () => {
  localContextKey.value = localContextKey.value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}
</script>

<template>
  <Transition name="ctx-modal">
    <div v-if="isOpen" class="modal-backdrop" @click.self="handleClose">
      <div class="modal lg glass ctx-modal-box">
        <!-- Header -->
        <div class="ctx-modal-head">
          <h3>{{ modalTitle }}</h3>
          <button class="icon-btn" @click="handleClose" title="Close">
            <X :size="18" />
          </button>
        </div>

        <!-- Content -->
        <div class="ctx-modal-body">
          <!-- Entry name (create only) -->
          <div v-if="mode === 'create'" class="field">
            <label>Entry name <span class="req">*</span></label>
            <input
              v-model="localContextKey"
              @blur="normalizeContextKey"
              type="text"
              class="g-input"
              placeholder="e.g., interview_notes or company_values"
            />
            <span class="field-hint"
              >Lowercase, numbers and underscores only. Spaces → underscores.</span
            >
          </div>

          <!-- Content label row -->
          <div class="field">
            <div class="between">
              <label>Content <span class="req">*</span></label>
              <div v-if="mode !== 'create' && localContextContent" class="ctx-meta-date">
                <Calendar :size="12" />
                Last modified
              </div>
            </div>

            <!-- View mode -->
            <div
              v-if="!isEditing"
              class="ctx-view-box"
              v-html="renderMarkdown(localContextContent)"
            />

            <!-- Edit / create mode -->
            <ProfileEditor v-else v-model="localContextContent" caption="" />
          </div>
        </div>

        <!-- Footer -->
        <div class="ctx-modal-foot">
          <button v-if="mode !== 'create'" class="btn btn-danger" @click="handleDelete">
            <Trash2 :size="15" />
            Delete
          </button>
          <div v-else></div>

          <div class="row" style="gap: 10px">
            <button class="btn btn-ghost" @click="handleClose">
              {{ isEditing ? 'Cancel' : 'Close' }}
            </button>
            <button
              v-if="!isEditing && mode !== 'create'"
              class="btn btn-primary"
              @click="handleEdit"
            >
              Edit
            </button>
            <button
              v-if="isEditing || mode === 'create'"
              class="btn btn-primary"
              @click="handleSave"
            >
              <Save :size="15" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Transition ─────────────────────────────────────────────── */
.ctx-modal-enter-active {
  transition: opacity 0.18s ease;
}
.ctx-modal-leave-active {
  transition: opacity 0.14s ease;
}
.ctx-modal-enter-from,
.ctx-modal-leave-to {
  opacity: 0;
}
.ctx-modal-enter-active .ctx-modal-box,
.ctx-modal-leave-active .ctx-modal-box {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}
.ctx-modal-enter-from .ctx-modal-box,
.ctx-modal-leave-to .ctx-modal-box {
  transform: scale(0.97) translateY(8px);
  opacity: 0;
}

/* ── Modal sizing override ──────────────────────────────────── */
.ctx-modal-box {
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 0;
}

/* ── Header ─────────────────────────────────────────────────── */
.ctx-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 26px 18px;
  border-bottom: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
  flex-shrink: 0;
}
.ctx-modal-head h3 {
  /* override .modal h3 serif — context entry names look better sans */
  font-family: var(--font-sans);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--fg-0);
}

/* ── Body ───────────────────────────────────────────────────── */
.ctx-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 22px 26px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ── Field overrides ────────────────────────────────────────── */
.req {
  color: var(--danger);
  font-weight: 600;
}
.field-hint {
  font-size: 11.5px;
  color: var(--fg-3);
  line-height: 1.4;
}

/* ── Date meta ──────────────────────────────────────────────── */
.ctx-meta-date {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--fg-3);
  font-family: var(--font-mono);
}

/* ── View box (read-only content) ───────────────────────────── */
.ctx-view-box {
  min-height: 180px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
  background: color-mix(in oklch, var(--fg-0) 3%, transparent);
  color: var(--fg-1);
  font-size: 14px;
  line-height: 1.6;
  overflow-y: auto;
}
/* Prose styles for rich text display */
.ctx-view-box :deep(h1),
.ctx-view-box :deep(h2),
.ctx-view-box :deep(h3),
.ctx-view-box :deep(h4) {
  font-weight: 600;
  margin: 0.75em 0 0.4em;
  color: var(--fg-0);
}
.ctx-view-box :deep(h2) {
  font-size: 15px;
}
.ctx-view-box :deep(h3),
.ctx-view-box :deep(h4) {
  font-size: 13.5px;
}
.ctx-view-box :deep(ul),
.ctx-view-box :deep(ol) {
  padding-left: 1.4em;
  margin: 0.5em 0;
}
.ctx-view-box :deep(ul) {
  list-style-type: disc;
}
.ctx-view-box :deep(ol) {
  list-style-type: decimal;
}
.ctx-view-box :deep(li) {
  margin: 0.25em 0;
  display: list-item;
}
.ctx-view-box :deep(p) {
  margin: 0.5em 0;
}
.ctx-view-box :deep(p:first-child) {
  margin-top: 0;
}
.ctx-view-box :deep(strong) {
  font-weight: 600;
  color: var(--fg-0);
}
.ctx-view-box :deep(em) {
  font-style: italic;
}

/* ── Footer ─────────────────────────────────────────────────── */
.ctx-modal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 26px 22px;
  border-top: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
  flex-shrink: 0;
}

/* ── Danger button ──────────────────────────────────────────── */
.btn-danger {
  background: color-mix(in oklch, var(--danger) 10%, transparent);
  border-color: color-mix(in oklch, var(--danger) 25%, transparent);
  color: var(--danger);
}
.btn-danger:hover {
  background: color-mix(in oklch, var(--danger) 18%, transparent);
  border-color: color-mix(in oklch, var(--danger) 40%, transparent);
}
</style>

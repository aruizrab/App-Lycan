<script setup>
import { useCvStore } from '../stores/cv'
import { useCoverLetterStore } from '../stores/coverLetter'
import { useWorkspaceStore } from '../stores/workspace'
import { useRouter, useRoute } from 'vue-router'
import { ref, computed, watch, inject } from 'vue'
import BrandMark from '../components/BrandMark.vue'
import ActionMenu from '../components/ActionMenu.vue'
import CreateImportModal from '../components/CreateImportModal.vue'
import WorkspaceContextModal from '../components/WorkspaceContextModal.vue'
import {
  Plus,
  Upload,
  FileText,
  Mail,
  Copy,
  Trash2,
  Download,
  Grid,
  List,
  Edit,
  Moon,
  Sun,
  ArrowLeft,
  ChevronRight,
  Briefcase,
  Target,
  Building,
  Clock
} from 'lucide-vue-next'

const store = useCvStore()
const clStore = useCoverLetterStore()
const workspaceStore = useWorkspaceStore()
const router = useRouter()
const route = useRoute()

const toggleTheme = inject('toggleTheme')
const tweaks = inject('tweaks')
const showFloatAi = inject('showFloatAi')

const viewMode = ref('grid') // 'grid' or 'list'
const activeTab = ref('cv') // 'cv' or 'cover-letter'
const showWorkspaceContext = ref(true) // Show AI context panel

// Watch for AI chat open signal from navigation
watch(
  () => route.query.openAiChat,
  (shouldOpen) => {
    if (shouldOpen === 'true') {
      showFloatAi.value = true
      // Remove the query param to clean up URL
      router.replace({ query: { ...route.query, openAiChat: undefined } })
    }
  },
  { immediate: true }
)

// Modal State
const showModal = ref(false)
const modalMode = ref('create') // 'create' or 'import'
const suggestedName = ref('')

// Workspace name editing
const isEditingWorkspaceName = ref(false)
const editedWorkspaceName = ref('')
const workspaceNameInput = ref(null)

// Drag and drop
const isDragging = ref(false)

// Workspace context modal
const showContextModal = ref(false)
const contextModalMode = ref('view') // 'view', 'edit', 'create'
const selectedContextKey = ref('')
const selectedContextContent = ref('')

// Set current workspace from route
watch(
  () => route.params.workspaceName,
  (workspaceName) => {
    if (workspaceName) {
      try {
        workspaceStore.setCurrentWorkspace(decodeURIComponent(workspaceName))
      } catch {
        router.push('/')
      }
    }
  },
  { immediate: true }
)

// Computed
const cvs = computed(() => {
  const cvsObj = store.cvs
  return Object.keys(cvsObj).map((name) => ({
    name,
    id: cvsObj[name].id,
    lastModified: cvsObj[name].lastModified,
    data: cvsObj[name].data,
    icon: FileText
  }))
})

const coverLetters = computed(() => {
  const clsObj = clStore.coverLetters
  return Object.keys(clsObj).map((name) => ({
    name,
    id: clsObj[name].id,
    lastModified: clsObj[name].lastModified,
    data: clsObj[name].data,
    icon: Mail
  }))
})

const items = computed(() => (activeTab.value === 'cv' ? cvs.value : coverLetters.value))

const existingNames = computed(() => {
  return items.value.map((item) => item.name)
})

const modalTitle = computed(() => {
  if (modalMode.value === 'create') {
    return `Create New ${activeTab.value === 'cv' ? 'CV' : 'Cover Letter'}`
  } else {
    return `Import ${activeTab.value === 'cv' ? 'CV' : 'Cover Letter'}`
  }
})

const documentActions = [
  { id: 'edit', label: 'Edit', icon: Edit },
  { id: 'duplicate', label: 'Duplicate', icon: Copy },
  { id: 'export', label: 'Export JSON', icon: Download },
  { id: 'delete', label: 'Delete', icon: Trash2 }
]

// Context data
const jobAnalysis = computed(() => workspaceStore.getJobAnalysis)
const matchReport = computed(() => workspaceStore.getMatchReport)
const companyResearch = computed(() => workspaceStore.getCompanyResearch)

const contextCardDescription = (type) => {
  if (type === 'jobAnalysis') {
    const ja = jobAnalysis.value
    if (!ja) return 'Not yet analyzed'
    return ja.jobTitle
      ? `${ja.jobTitle}${ja.company ? ' at ' + ja.company : ''}`
      : 'Job analysis available'
  }
  if (type === 'matchReport') {
    const mr = matchReport.value
    if (!mr) return 'No match data'
    return mr.score != null ? `${mr.score}% match score` : 'Match report available'
  }
  if (type === 'companyResearch') {
    const cr = companyResearch.value
    if (!cr) return 'No research yet'
    return cr.companyName || 'Company research available'
  }
  return ''
}

const contextCardTimestamp = (type) => {
  let data
  if (type === 'jobAnalysis') data = jobAnalysis.value
  else if (type === 'matchReport') data = matchReport.value
  else if (type === 'companyResearch') data = companyResearch.value
  if (!data) return ''
  return formatRelativeTime(data.lastModified || data.createdAt)
}

// Custom context entries
const RESERVED_WS_KEYS = new Set([
  'metadata',
  'cvs',
  'coverLetters',
  'jobAnalysis',
  'matchReport',
  'companyResearch'
])

const customContextEntries = computed(() => {
  if (!workspaceStore.currentWorkspace) return []
  const ws = workspaceStore.workspaces[workspaceStore.currentWorkspace]
  if (!ws) return []
  return Object.keys(ws)
    .filter((key) => !RESERVED_WS_KEYS.has(key) && ws[key] !== null && ws[key] !== undefined)
    .map((key) => ({
      key,
      ...ws[key]
    }))
    .sort((a, b) => (b.lastModified || b.createdAt || 0) - (a.lastModified || a.createdAt || 0))
})

const formatContextKey = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim()
}

// Actions
const goBackToWorkspaces = () => {
  router.push('/')
}

const startEditingWorkspaceName = () => {
  editedWorkspaceName.value = workspaceStore.currentWorkspace
  isEditingWorkspaceName.value = true
  setTimeout(() => {
    workspaceNameInput.value?.focus()
    workspaceNameInput.value?.select()
  }, 0)
}

const saveWorkspaceName = () => {
  const newName = editedWorkspaceName.value.trim()
  if (!newName || newName === workspaceStore.currentWorkspace) {
    isEditingWorkspaceName.value = false
    return
  }

  try {
    const renamedName = workspaceStore.renameWorkspace(workspaceStore.currentWorkspace, newName)
    isEditingWorkspaceName.value = false
    // Update URL
    router.replace(`/workspace/${encodeURIComponent(renamedName)}`)
  } catch (error) {
    alert(error.message)
    editedWorkspaceName.value = workspaceStore.currentWorkspace
  }
}

const cancelEditingWorkspaceName = () => {
  isEditingWorkspaceName.value = false
  editedWorkspaceName.value = ''
}

const openCreateModal = () => {
  modalMode.value = 'create'
  suggestedName.value = ''
  showModal.value = true
}

const openImportModal = () => {
  modalMode.value = 'import'
  suggestedName.value = ''
  showModal.value = true
}

const handleModalSubmit = (name, fileContent) => {
  try {
    if (modalMode.value === 'create') {
      if (activeTab.value === 'cv') {
        store.createCv(name)
        openCv(name)
      } else {
        clStore.createCoverLetter(name)
        openCoverLetter(name)
      }
    } else if (modalMode.value === 'import') {
      if (activeTab.value === 'cv') {
        store.importCv(fileContent, name)
        openCv(name)
      } else {
        clStore.importCoverLetter(fileContent, name)
        openCoverLetter(name)
      }
    }
    showModal.value = false
  } catch (e) {
    alert(e.message)
  }
}

const openCv = (name) => {
  const ws = encodeURIComponent(workspaceStore.currentWorkspace)
  router.push(`/workspace/${ws}/edit/${encodeURIComponent(name)}`)
}

const openCoverLetter = (name) => {
  const ws = encodeURIComponent(workspaceStore.currentWorkspace)
  router.push(`/workspace/${ws}/cover-letter/${encodeURIComponent(name)}`)
}

const editItem = (name) => {
  if (activeTab.value === 'cv') {
    openCv(name)
  } else {
    openCoverLetter(name)
  }
}

const handleAction = (itemName, action) => {
  switch (action) {
    case 'edit':
      editItem(itemName)
      break
    case 'duplicate':
      duplicateItem(itemName)
      break
    case 'export':
      exportItem(itemName)
      break
    case 'delete':
      deleteItem(itemName)
      break
  }
}

const duplicateItem = (name) => {
  if (activeTab.value === 'cv') {
    store.duplicateCv(name)
  } else {
    clStore.duplicateCoverLetter(name)
  }
}

const deleteItem = (name) => {
  const itemType = activeTab.value === 'cv' ? 'CV' : 'Cover Letter'
  if (confirm(`Are you sure you want to delete this ${itemType}?`)) {
    if (activeTab.value === 'cv') {
      store.deleteCv(name)
    } else {
      clStore.deleteCoverLetter(name)
    }
  }
}

const exportItem = (name) => {
  let exported
  if (activeTab.value === 'cv') {
    exported = store.exportCv(name)
  } else {
    exported = clStore.exportCoverLetter(name)
  }

  if (!exported) return

  const dataStr = JSON.stringify(exported, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/\s+/g, '_')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Drag and drop handlers
const handleDragOver = (event) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (event) => {
  event.preventDefault()
  isDragging.value = false
}

const handleDrop = async (event) => {
  event.preventDefault()
  isDragging.value = false

  const files = event.dataTransfer.files
  if (files.length === 0) return

  const file = files[0]
  if (!file.name.endsWith('.json')) {
    alert('Please drop a JSON file')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target.result
      const parsed = JSON.parse(content)

      // Determine if it's a CV or Cover Letter
      const isCv = parsed.personalInfo && parsed.sections
      const isCoverLetter =
        parsed.applicantAddress !== undefined || parsed.companyAddress !== undefined

      // Extract suggested name
      let suggestedNameValue = ''
      if (parsed.name) {
        suggestedNameValue = parsed.name
      } else if (isCv && parsed.personalInfo?.name) {
        suggestedNameValue = parsed.personalInfo.name
      } else {
        suggestedNameValue = file.name.replace('.json', '')
      }

      // Set active tab based on type
      if (isCv) {
        activeTab.value = 'cv'
      } else if (isCoverLetter) {
        activeTab.value = 'cover-letter'
      } else {
        // Default to current active tab if can't determine
        console.warn('Could not determine document type, using active tab')
      }

      // Open import modal with pre-filled data
      suggestedName.value = suggestedNameValue
      modalMode.value = 'import'
      showModal.value = true

      // Store the content for later import
      setTimeout(() => {
        const modal = document.querySelector('input[type="file"]')
        if (modal) {
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(file)
          modal.files = dataTransfer.files
          modal.dispatchEvent(new Event('change', { bubbles: true }))
        }
      }, 100)
    } catch (error) {
      alert('Invalid JSON file: ' + error.message)
    }
  }
  reader.readAsText(file)
}

// Workspace context handlers
const handleContextEdit = (type) => {
  // Could open a modal for editing, for now just log
  console.log('Edit context:', type)
}

const _handleContextDelete = (type) => {
  switch (type) {
    case 'jobAnalysis':
      workspaceStore.deleteJobAnalysis()
      break
    case 'matchReport':
      workspaceStore.deleteMatchReport()
      break
    case 'companyResearch':
      workspaceStore.deleteCompanyResearch()
      break
  }
}

const _handleContextRegenerate = (type) => {
  // Open AI assistant to regenerate
  console.log('Regenerate context:', type)
}

// Custom context handlers
const handleViewCustomContext = (contextKey) => {
  const ws = workspaceStore.workspaces[workspaceStore.currentWorkspace]
  if (!ws || !ws[contextKey]) return

  selectedContextKey.value = contextKey
  selectedContextContent.value = ws[contextKey].content || ''
  contextModalMode.value = 'view'
  showContextModal.value = true
}

const handleEditCustomContext = (contextKey) => {
  const ws = workspaceStore.workspaces[workspaceStore.currentWorkspace]
  if (!ws || !ws[contextKey]) return

  selectedContextKey.value = contextKey
  selectedContextContent.value = ws[contextKey].content || ''
  contextModalMode.value = 'edit'
  showContextModal.value = true
}

const handleDeleteCustomContext = (contextKey) => {
  const ws = workspaceStore.workspaces[workspaceStore.currentWorkspace]
  if (!ws || !ws[contextKey]) return

  // Delete the custom context entry
  ws[contextKey] = null
  ws.metadata.lastModified = Date.now()
  workspaceStore.save()
}

const handleAddCustomContext = () => {
  selectedContextKey.value = ''
  selectedContextContent.value = ''
  contextModalMode.value = 'create'
  showContextModal.value = true
}

const handleSaveCustomContext = ({ key, content }) => {
  const ws = workspaceStore.workspaces[workspaceStore.currentWorkspace]
  if (!ws) return

  // Create or update the context entry
  const existing = ws[key]
  ws[key] = {
    content: content,
    createdAt: existing?.createdAt || Date.now(),
    lastModified: Date.now()
  }
  ws.metadata.lastModified = Date.now()
  workspaceStore.save()
}

// Date formatting
const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown date'
  const date = new Date(timestamp)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
</script>

<template>
  <div @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop">
    <!-- Drag overlay -->
    <div v-if="isDragging" class="drag-overlay">
      <div class="drag-overlay-card glass">
        <Upload :size="48" class="drag-overlay-icon" />
        <p class="drag-overlay-title">Drop JSON file to import</p>
        <span class="drag-overlay-sub">CV or Cover Letter will be auto-detected</span>
      </div>
    </div>

    <!-- AppBar -->
    <header class="appbar glass-chrome">
      <div class="appbar-lead">
        <button class="icon-btn" @click="goBackToWorkspaces" title="Back">
          <ArrowLeft :size="18" />
        </button>

        <div class="brand" @click="$router.push('/')">
          <BrandMark />
          <span class="brand-name">App&#x2011;Lycan <em>workspace</em></span>
        </div>

        <div class="breadcrumb">
          <ChevronRight :size="14" />
          <input
            v-if="isEditingWorkspaceName"
            ref="workspaceNameInput"
            v-model="editedWorkspaceName"
            type="text"
            class="ws-name-input"
            @blur="saveWorkspaceName"
            @keyup.enter="saveWorkspaceName"
            @keyup.esc="cancelEditingWorkspaceName"
          />
          <span
            v-else
            class="ws-name"
            @click="startEditingWorkspaceName"
            :title="workspaceStore.currentWorkspace"
            >{{ workspaceStore.currentWorkspace }}</span
          >
        </div>

        <div class="seg" style="margin-left: 12px">
          <button :class="{ active: activeTab === 'cv' }" @click="activeTab = 'cv'">
            <FileText :size="14" /> CVs &middot; {{ cvs.length }}
          </button>
          <button
            :class="{ active: activeTab === 'cover-letter' }"
            @click="activeTab = 'cover-letter'"
          >
            <Mail :size="14" /> Letters &middot; {{ coverLetters.length }}
          </button>
        </div>
      </div>

      <div class="appbar-trail">
        <!-- Theme Toggle -->
        <button class="icon-btn" @click="toggleTheme" title="Toggle theme">
          <Moon v-if="tweaks.theme === 'dark'" :size="18" />
          <Sun v-else :size="18" />
        </button>

        <!-- View mode seg -->
        <div class="seg">
          <button
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="Grid view"
          >
            <Grid :size="14" />
          </button>
          <button
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="List view"
          >
            <List :size="14" />
          </button>
        </div>

        <button class="btn btn-ghost btn-small" @click="openImportModal">
          <Upload :size="14" /> Import
        </button>
        <button class="btn btn-primary btn-small" @click="openCreateModal">
          <Plus :size="14" /> New {{ activeTab === 'cv' ? 'CV' : 'Letter' }}
        </button>
      </div>
    </header>

    <!-- Context Panel -->
    <section v-if="showWorkspaceContext" class="context-panel glass sheen">
      <div class="context-head">
        <h3>
          <span class="icon"><Briefcase :size="14" /></span>
          Application context
          <span v-if="workspaceStore.hasAiContext" class="tag">auto-synced</span>
        </h3>
        <div class="row" style="gap: 8px">
          <button class="btn btn-xs btn-ghost" @click="showWorkspaceContext = false">hide</button>
        </div>
      </div>

      <div class="context-grid">
        <!-- Role brief card -->
        <div class="ctx-card" :class="{ 'ctx-card--empty': !jobAnalysis }">
          <div class="ctx-title">
            <div class="lead">
              <span
                class="dot"
                :style="{ background: jobAnalysis ? 'var(--ok)' : 'var(--fg-3)' }"
              ></span>
              <Briefcase :size="14" /> Role brief
            </div>
            <button
              v-if="jobAnalysis"
              class="btn btn-xs btn-ghost"
              @click="handleContextEdit('jobAnalysis')"
            >
              open
            </button>
          </div>
          <p>{{ contextCardDescription('jobAnalysis') }}</p>
          <div class="score" v-if="jobAnalysis">{{ contextCardTimestamp('jobAnalysis') }}</div>
        </div>

        <!-- Match report card -->
        <div class="ctx-card" :class="{ 'ctx-card--empty': !matchReport }">
          <div class="ctx-title">
            <div class="lead">
              <span
                class="dot"
                :style="{ background: matchReport ? 'var(--ok)' : 'var(--fg-3)' }"
              ></span>
              <Target :size="14" /> Match report
            </div>
            <button
              v-if="matchReport"
              class="btn btn-xs btn-ghost"
              @click="handleContextEdit('matchReport')"
            >
              open
            </button>
          </div>
          <p>{{ contextCardDescription('matchReport') }}</p>
          <div v-if="matchReport && matchReport.score != null" class="ctx-score-row">
            <div class="score-bar"><span :style="{ width: matchReport.score + '%' }"></span></div>
            <span class="score">{{ matchReport.score }}%</span>
          </div>
          <div class="score" v-else-if="matchReport">{{ contextCardTimestamp('matchReport') }}</div>
        </div>

        <!-- Company research card -->
        <div class="ctx-card" :class="{ 'ctx-card--empty': !companyResearch }">
          <div class="ctx-title">
            <div class="lead">
              <span
                class="dot"
                :style="{ background: companyResearch ? 'var(--ok)' : 'var(--fg-3)' }"
              ></span>
              <Building :size="14" /> Company research
            </div>
            <button
              v-if="companyResearch"
              class="btn btn-xs btn-ghost"
              @click="handleContextEdit('companyResearch')"
            >
              open
            </button>
          </div>
          <p>{{ contextCardDescription('companyResearch') }}</p>
          <div class="score" v-if="companyResearch">
            {{ contextCardTimestamp('companyResearch') }}
          </div>
        </div>

        <!-- Custom context entries as cards -->
        <div
          v-for="entry in customContextEntries"
          :key="entry.key"
          class="ctx-card"
          @click="handleViewCustomContext(entry.key)"
          style="cursor: pointer"
        >
          <div class="ctx-title">
            <div class="lead">
              <span class="dot"></span>
              <FileText :size="14" /> {{ formatContextKey(entry.key) }}
            </div>
            <button class="btn btn-xs btn-ghost" @click.stop="handleEditCustomContext(entry.key)">
              edit
            </button>
          </div>
          <p>
            {{
              entry.content
                ? entry.content.substring(0, 80) + (entry.content.length > 80 ? '...' : '')
                : 'Custom context'
            }}
          </p>
          <div class="score">{{ formatRelativeTime(entry.lastModified || entry.createdAt) }}</div>
        </div>

        <!-- Add context card -->
        <div class="ctx-card add" @click="handleAddCustomContext">
          <Plus :size="20" />
          <p>Add context</p>
        </div>
      </div>
    </section>

    <!-- Collapsed context toggle -->
    <button
      v-if="!showWorkspaceContext"
      class="btn btn-ghost btn-small context-toggle"
      @click="showWorkspaceContext = true"
    >
      <Briefcase :size="14" />
      Show application context
      <span v-if="workspaceStore.hasAiContext" class="dot-indicator"></span>
    </button>

    <!-- Grid toolbar -->
    <div class="grid-toolbar">
      <h2>
        {{ activeTab === 'cv' ? 'Curriculum Vitae' : 'Cover Letters' }}
        <span class="subtle">{{ items.length }}</span>
      </h2>
    </div>

    <!-- Grid View -->
    <div v-if="viewMode === 'grid'" class="doc-grid">
      <!-- Empty state -->
      <div v-if="items.length === 0" class="doc-card doc-new" @click="openCreateModal">
        <div class="plus"><Plus :size="22" /></div>
        <p>Create your first {{ activeTab === 'cv' ? 'CV' : 'cover letter' }}</p>
        <span>Click to get started</span>
      </div>

      <div
        v-for="item in items"
        :key="item.name"
        class="doc-card glass"
        @click="editItem(item.name)"
      >
        <div class="icon-wrap">
          <component :is="item.icon" :size="22" />
        </div>
        <h3>{{ item.name }}</h3>
        <div class="card-meta">
          <span class="timestamp"><Clock :size="10" /> {{ formatDate(item.lastModified) }}</span>
          <span class="pill">
            <span class="dot"></span>
            {{ activeTab === 'cv' ? 'CV' : 'Letter' }}
          </span>
        </div>
        <div class="card-menu" @click.stop>
          <ActionMenu
            :actions="documentActions"
            @action="(action) => handleAction(item.name, action)"
          />
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else class="doc-list glass">
      <div class="doc-list-header">
        <span class="doc-list-col doc-list-col--name">Name</span>
        <span class="doc-list-col doc-list-col--type">Type</span>
        <span class="doc-list-col doc-list-col--date">Last modified</span>
        <span class="doc-list-col doc-list-col--actions"></span>
      </div>
      <div v-if="items.length === 0" class="doc-list-empty">
        No {{ activeTab === 'cv' ? 'CVs' : 'cover letters' }} in this workspace. Create one to get
        started!
      </div>
      <div v-for="item in items" :key="item.name" class="doc-list-row" @click="editItem(item.name)">
        <span class="doc-list-col doc-list-col--name">
          <span class="doc-list-icon">
            <component :is="item.icon" :size="16" />
          </span>
          {{ item.name }}
        </span>
        <span class="doc-list-col doc-list-col--type">
          <span class="pill">
            <span class="dot"></span>
            {{ activeTab === 'cv' ? 'CV' : 'Letter' }}
          </span>
        </span>
        <span class="doc-list-col doc-list-col--date timestamp">
          {{ formatDate(item.lastModified) }}
        </span>
        <span class="doc-list-col doc-list-col--actions" @click.stop>
          <ActionMenu
            :actions="documentActions"
            @action="(action) => handleAction(item.name, action)"
          />
        </span>
      </div>
    </div>

    <!-- Create/Import Modal -->
    <CreateImportModal
      :is-open="showModal"
      :mode="modalMode"
      :title="modalTitle"
      :existing-names="existingNames"
      :suggested-name="suggestedName"
      @close="showModal = false"
      @submit="handleModalSubmit"
    />

    <!-- Workspace Context Modal -->
    <WorkspaceContextModal
      :is-open="showContextModal"
      :mode="contextModalMode"
      :context-key="selectedContextKey"
      :context-content="selectedContextContent"
      @close="showContextModal = false"
      @save="handleSaveCustomContext"
      @delete="handleDeleteCustomContext"
    />
  </div>
</template>

<style scoped>
/* Drag overlay */
.drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  pointer-events: none;
  background: color-mix(in oklch, var(--accent) 12%, transparent);
  border: 3px dashed var(--accent);
  border-radius: var(--radius-card);
}
.drag-overlay-card {
  padding: 40px 48px;
  text-align: center;
  pointer-events: none;
}
.drag-overlay-icon {
  color: var(--accent);
  margin: 0 auto 16px;
}
.drag-overlay-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--fg-0);
  margin: 0 0 6px;
}
.drag-overlay-sub {
  font-size: 13px;
  color: var(--fg-2);
}

/* Workspace name input */
.ws-name-input {
  font-family: var(--font-serif);
  font-size: 34px;
  font-weight: 400;
  letter-spacing: -0.025em;
  line-height: 1;
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--accent);
  color: var(--fg-0);
  outline: none;
  padding: 2px 8px;
  min-width: 120px;
  max-width: 320px;
}

/* Context toggle (collapsed) */
.context-toggle {
  margin-bottom: 18px;
  position: relative;
}
.dot-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ok);
  box-shadow: 0 0 10px var(--ok);
  display: inline-block;
}

/* Context card empty state */
.ctx-card--empty {
  opacity: 0.6;
}

/* Score row in context card */
.ctx-score-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
}
.ctx-score-row .score-bar {
  flex: 1;
}
.ctx-score-row .score {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
}

/* Doc list (glass styled) */
.doc-list {
  border-radius: var(--radius-card);
  overflow: hidden;
}
.doc-list-header {
  display: grid;
  grid-template-columns: 1fr 100px 160px 60px;
  gap: 12px;
  padding: 12px 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-3);
  border-bottom: 1px solid color-mix(in oklch, var(--fg-0) 8%, transparent);
}
.doc-list-empty {
  padding: 48px 20px;
  text-align: center;
  color: var(--fg-2);
  font-size: 14px;
}
.doc-list-row {
  display: grid;
  grid-template-columns: 1fr 100px 160px 60px;
  gap: 12px;
  padding: 14px 20px;
  align-items: center;
  cursor: pointer;
  transition: background var(--dur-fast);
  border-bottom: 1px solid color-mix(in oklch, var(--fg-0) 5%, transparent);
}
.doc-list-row:hover {
  background: color-mix(in oklch, var(--fg-0) 6%, transparent);
}
.doc-list-row:last-child {
  border-bottom: none;
}
.doc-list-col {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.doc-list-col--name {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg-0);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.doc-list-col--type {
  font-size: 12px;
}
.doc-list-col--date {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--fg-2);
}
.doc-list-col--actions {
  justify-content: flex-end;
}
.doc-list-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent);
  flex-shrink: 0;
}

/* Card menu override — ActionMenu is positioned inside doc-card */
.doc-card .card-menu {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  opacity: 0;
  transform: translateY(-4px);
  transition: all var(--dur-fast);
}
.doc-card:hover .card-menu {
  opacity: 1;
  transform: translateY(0);
}
</style>

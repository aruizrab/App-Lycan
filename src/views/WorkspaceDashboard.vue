<template>
  <!-- No min-h-screen wrapper — bg comes from BackgroundStage in App.vue -->

  <!-- AppBar -->
  <header class="appbar glass-chrome">
    <div class="appbar-lead">
      <router-link to="/" class="brand">
        <BrandMark />
        <span class="brand-name">App&#x2011;Lycan <em>cv atelier</em></span>
      </router-link>
    </div>

    <div class="appbar-trail">
      <!-- Profile -->
      <button class="icon-btn" title="User Profile" @click="openUserProfileModal">
        <UserIcon :size="18" />
      </button>

      <!-- AI toggle -->
      <button
        class="icon-btn"
        :class="{ active: showFloatAi }"
        title="AI Assistant"
        @click="showFloatAi = !showFloatAi"
      >
        <Sparkles :size="18" />
      </button>

      <!-- Theme toggle -->
      <button class="icon-btn" title="Toggle theme" @click="toggleTheme">
        <Moon v-if="tweaks.theme === 'dark'" :size="18" />
        <Sun v-else :size="18" />
      </button>

      <!-- Grid / List segmented control -->
      <div class="seg">
        <button :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">
          <LayoutGrid :size="15" />
        </button>
        <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
          <List :size="15" />
        </button>
      </div>

      <!-- Import -->
      <button class="btn btn-ghost" @click="openImportModal"><Upload :size="15" /> Import</button>

      <!-- New workspace -->
      <button class="btn btn-primary" @click="openCreateModal">
        <Plus :size="15" /> New workspace
      </button>
    </div>
  </header>

  <!-- Hero -->
  <section class="hero glass sheen">
    <div>
      <h1>
        {{ greeting }}, {{ displayName }}.<br /><em
          >{{ workspaceCountWord }} workspace{{ totalWorkspaces !== 1 ? 's' : '' }}</em
        >
        waiting.
      </h1>
      <p>
        Each workspace is one job hunt — a company, a role, your tailored CVs and cover letters in
        one place. Keep everything focused and organised.
      </p>
      <div class="hero-stats">
        <span class="pill ok"
          ><span class="dot"></span>{{ totalCvs }} CV{{ totalCvs !== 1 ? 's' : '' }}</span
        >
        <span class="pill"
          ><span class="dot"></span>{{ totalCoverLetters }} cover letter{{
            totalCoverLetters !== 1 ? 's' : ''
          }}</span
        >
        <span class="pill"
          ><span class="dot"></span>{{ totalWorkspaces }} workspace{{
            totalWorkspaces !== 1 ? 's' : ''
          }}</span
        >
      </div>
    </div>
    <div class="hero-aside">
      <div
        v-if="latestWorkspace"
        class="hero-mini glass-chip"
        style="border-radius: 18px"
        @click="openWorkspace(latestWorkspace.name)"
      >
        <div class="icon"><Briefcase :size="18" /></div>
        <div class="meta">
          <strong>{{ latestWorkspace.name }}</strong>
          <span>Latest workspace</span>
        </div>
      </div>
      <div
        v-if="readiestWorkspace && readiestWorkspace.name !== latestWorkspace?.name"
        class="hero-mini glass-chip"
        style="border-radius: 18px"
        @click="openWorkspace(readiestWorkspace.name)"
      >
        <div class="icon"><Briefcase :size="18" /></div>
        <div class="meta">
          <strong>{{ readiestWorkspace.name }}</strong>
          <span>Most documents</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Grid toolbar -->
  <div class="grid-toolbar">
    <h2>
      Workspaces <span class="subtle">{{ totalWorkspaces }}</span>
    </h2>
    <!-- TODO: sort & filter controls — placeholder, not yet functional -->
    <div class="row" style="gap: 8px; visibility: hidden">
      <span class="pill mono">sorted by &middot; recent</span>
      <span class="pill mono">filter &middot; all</span>
    </div>
  </div>

  <!-- Workspace grid -->
  <div v-if="viewMode === 'grid'" class="doc-grid">
    <!-- Workspace cards -->
    <article
      v-for="ws in workspaceItems"
      :key="ws.name"
      class="doc-card glass"
      @click="openWorkspace(ws.name)"
    >
      <div class="card-menu" @click.stop>
        <ActionMenu
          :actions="workspaceActions"
          @action="(action) => handleAction(ws.name, action)"
        />
      </div>
      <div class="icon-wrap"><Briefcase :size="22" /></div>
      <h3>{{ ws.name }}</h3>
      <p class="subtitle">
        {{ ws.cvCount }} CV{{ ws.cvCount !== 1 ? 's' : '' }} &middot;
        {{ ws.coverLetterCount }} letter{{ ws.coverLetterCount !== 1 ? 's' : '' }}
      </p>
      <div v-if="ws.matchScore" class="row" style="gap: 10px; margin-top: 4px">
        <span class="mono" style="font-size: 11px; color: var(--fg-2)">{{ ws.matchScore }}%</span>
        <div class="grow">
          <div class="score-bar"><span :style="{ width: ws.matchScore + '%' }"></span></div>
        </div>
      </div>
      <div class="card-meta">
        <span class="timestamp">{{ formatDate(ws.lastModified) }}</span>
        <span v-if="ws.hasTuned" class="pill ok"><span class="dot"></span>tuned</span>
      </div>
    </article>

    <!-- New workspace action card -->
    <article class="doc-card doc-new glass" @click="openCreateModal">
      <div class="plus"><Plus :size="24" /></div>
      <p>New workspace</p>
      <span>Start a new job application</span>
    </article>
  </div>

  <!-- List view fallback -->
  <div v-else>
    <DocumentList
      :items="workspaceListItems"
      empty-message="No workspaces. Create one to get started!"
      @click:item="openWorkspace"
    >
      <template #action-menu="{ item }">
        <ActionMenu
          :actions="workspaceActions"
          @action="(action) => handleAction(item.name, action)"
        />
      </template>
    </DocumentList>
  </div>

  <!-- Create/Import Modal -->
  <CreateImportModal
    :is-open="isModalOpen"
    :mode="modalMode"
    :title="modalTitle"
    :existing-names="existingWorkspaceNames"
    :suggested-name="suggestedName"
    @close="closeModal"
    @submit="handleModalSubmit"
  />
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '../stores/workspace'
import { useUserProfileStore } from '../stores/userProfile'
import { useUserProfileModal } from '../composables/useUserProfileModal'
import BrandMark from '../components/BrandMark.vue'
import DocumentList from '../components/DocumentList.vue'
import ActionMenu from '../components/ActionMenu.vue'
import CreateImportModal from '../components/CreateImportModal.vue'
import {
  LayoutGrid,
  List,
  Upload,
  Plus,
  Briefcase,
  Edit,
  Copy,
  Download,
  Trash2,
  Moon,
  Sun,
  User as UserIcon,
  Sparkles
} from 'lucide-vue-next'

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const userProfileStore = useUserProfileStore()
const { openUserProfileModal } = useUserProfileModal()

// Injected from App.vue
const toggleTheme = inject('toggleTheme')
const tweaks = inject('tweaks')
const showFloatAi = inject('showFloatAi')

const viewMode = ref('grid')
const isModalOpen = ref(false)
const modalMode = ref('create')
const suggestedName = ref('')

// Greeting based on time of day
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

// User display name
const displayName = computed(() => {
  const name = userProfileStore.fullName?.trim()
  return name ? name.split(/\s+/)[0] : 'there'
})

// Workspace data
const workspaceList = computed(() => workspaceStore.getWorkspaceList())

const totalWorkspaces = computed(() => workspaceList.value.length)

const totalCvs = computed(() => workspaceList.value.reduce((sum, ws) => sum + ws.cvCount, 0))

const totalCoverLetters = computed(() =>
  workspaceList.value.reduce((sum, ws) => sum + ws.coverLetterCount, 0)
)

// Number word for hero
const numberWords = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve'
]
const workspaceCountWord = computed(() => {
  const n = totalWorkspaces.value
  return n < numberWords.length ? numberWords[n] : String(n)
})

// Workspace items for grid cards
const workspaceItems = computed(() => {
  return workspaceList.value
    .slice()
    .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))
    .map((ws) => {
      const workspace = workspaceStore.workspaces[ws.name]
      const matchScore = workspace?.matchReport?.score || null
      const hasTuned = !!(
        workspace?.jobAnalysis ||
        workspace?.matchReport ||
        workspace?.companyResearch
      )
      return {
        name: ws.name,
        lastModified: ws.lastModified,
        cvCount: ws.cvCount,
        coverLetterCount: ws.coverLetterCount,
        matchScore,
        hasTuned
      }
    })
})

// Items formatted for the DocumentList component (list view)
const workspaceListItems = computed(() => {
  return workspaceItems.value.map((ws) => ({
    name: ws.name,
    lastModified: ws.lastModified,
    icon: Briefcase,
    subtitle: `${ws.cvCount} CV${ws.cvCount !== 1 ? 's' : ''}, ${ws.coverLetterCount} Cover Letter${ws.coverLetterCount !== 1 ? 's' : ''}`
  }))
})

// Hero mini cards
const latestWorkspace = computed(() => {
  if (workspaceItems.value.length === 0) return null
  return workspaceItems.value[0]
})

const readiestWorkspace = computed(() => {
  if (workspaceItems.value.length < 2) return null
  return workspaceItems.value.slice().sort((a, b) => {
    const aTotal = a.cvCount + a.coverLetterCount
    const bTotal = b.cvCount + b.coverLetterCount
    return bTotal - aTotal
  })[0]
})

const existingWorkspaceNames = computed(() => {
  return workspaceList.value.map((ws) => ws.name)
})

const modalTitle = computed(() => {
  return modalMode.value === 'create' ? 'Create New Workspace' : 'Import Workspace'
})

const workspaceActions = [
  { id: 'rename', label: 'Rename', icon: Edit },
  { id: 'duplicate', label: 'Duplicate', icon: Copy },
  { id: 'export', label: 'Export JSON', icon: Download },
  { id: 'delete', label: 'Delete', icon: Trash2 }
]

// Date formatting
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Actions
const openWorkspace = (name) => {
  workspaceStore.setCurrentWorkspace(name)
  router.push(`/workspace/${encodeURIComponent(name)}`)
}

const openCreateModal = () => {
  modalMode.value = 'create'
  suggestedName.value = ''
  isModalOpen.value = true
}

const openImportModal = () => {
  modalMode.value = 'import'
  suggestedName.value = ''
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  suggestedName.value = ''
}

const handleModalSubmit = (name, fileContent) => {
  try {
    if (modalMode.value === 'create') {
      workspaceStore.createWorkspace(name)
      openWorkspace(name)
    } else {
      const importedName = workspaceStore.importWorkspace(fileContent, name)
      openWorkspace(importedName)
    }
    closeModal()
  } catch (error) {
    alert(error.message)
  }
}

const handleAction = (workspaceName, action) => {
  switch (action) {
    case 'rename':
      renameWorkspace(workspaceName)
      break
    case 'duplicate':
      duplicateWorkspace(workspaceName)
      break
    case 'export':
      exportWorkspace(workspaceName)
      break
    case 'delete':
      deleteWorkspace(workspaceName)
      break
  }
}

const renameWorkspace = (oldName) => {
  const newName = prompt('Enter new workspace name:', oldName)
  if (!newName || newName === oldName) return

  try {
    const renamedName = workspaceStore.renameWorkspace(oldName, newName)

    if (workspaceStore.currentWorkspace === renamedName) {
      router.replace(`/workspace/${encodeURIComponent(renamedName)}`)
    }
  } catch (error) {
    alert(error.message)
  }
}

const duplicateWorkspace = (name) => {
  try {
    workspaceStore.duplicateWorkspace(name)
  } catch (error) {
    alert(error.message)
  }
}

const exportWorkspace = (name) => {
  const exported = workspaceStore.exportWorkspace(name)
  if (!exported) return

  const dataStr = JSON.stringify(exported, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/\s+/g, '_')}_workspace.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const deleteWorkspace = (name) => {
  const ws = workspaceStore.workspaces[name]
  const cvCount = Object.keys(ws.cvs).length
  const clCount = Object.keys(ws.coverLetters).length
  const totalDocs = cvCount + clCount

  const message =
    totalDocs > 0
      ? `Delete workspace "${name}" and all ${totalDocs} document${totalDocs !== 1 ? 's' : ''} inside? This cannot be undone.`
      : `Delete workspace "${name}"?`

  if (confirm(message)) {
    workspaceStore.deleteWorkspace(name)
  }
}
</script>

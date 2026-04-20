<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Briefcase, FileText, Edit, Plus, Settings, User, Sparkles } from 'lucide-vue-next'

const props = defineProps({
  floatAiActive: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-float-ai', 'open-new-modal', 'open-settings', 'open-profile'])

const route = useRoute()
const router = useRouter()

const currentScreen = computed(() => {
  if (route.path === '/' || route.name === 'WorkspaceDashboard') return 'workspaces'
  if (route.name === 'Dashboard') return 'dashboard'
  if (route.name === 'CvEditor' || route.name === 'CoverLetterEditor') return 'editor'
  return 'workspaces'
})

const items = [
  { id: 'workspaces', label: 'Workspaces', icon: Briefcase },
  { id: 'dashboard', label: 'Workspace', icon: FileText },
  { id: 'editor', label: 'Editor', icon: Edit },
  { id: '__new', label: 'New', icon: Plus },
  { id: '__settings', label: 'Settings', icon: Settings },
  { id: '__profile', label: 'Profile', icon: User },
  { id: '__float_ai', label: 'AI', icon: Sparkles }
]

const handleClick = (id) => {
  if (id === '__new') {
    emit('open-new-modal')
  } else if (id === '__settings') {
    emit('open-settings')
  } else if (id === '__profile') {
    emit('open-profile')
  } else if (id === '__float_ai') {
    emit('toggle-float-ai')
  } else if (id === 'workspaces') {
    router.push('/')
  }
  // dashboard and editor navigate via their current context — clicking just highlights
}

const isActive = (id) => {
  if (id === '__float_ai') return props.floatAiActive
  if (id.startsWith('__')) return false
  return currentScreen.value === id
}
</script>

<template>
  <nav class="nav-dock glass-chrome print:hidden" role="navigation" aria-label="Main navigation">
    <button
      v-for="item in items"
      :key="item.id"
      :class="{ active: isActive(item.id) }"
      @click="handleClick(item.id)"
      :title="item.label"
    >
      <component :is="item.icon" :size="12" />
      {{ item.label }}
    </button>
  </nav>
</template>

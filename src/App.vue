<script setup>
import { ref, watch, onMounted, provide, computed } from 'vue'
import { useRoute } from 'vue-router'
import { initTooltips } from './services/tooltip'
import BackgroundStage from './components/BackgroundStage.vue'
import DeletionConfirmDialog from './components/DeletionConfirmDialog.vue'
import FloatingAiChat from './components/FloatingAiChat.vue'
import SettingsModal from './components/SettingsModal.vue'
import UserProfileModal from './components/UserProfileModal.vue'
import { useSettingsModal } from './composables/useSettingsModal'
import { useUserProfileModal } from './composables/useUserProfileModal'

const route = useRoute()
const { isSettingsModalOpen, closeSettingsModal } = useSettingsModal()
const { isUserProfileModalOpen, closeUserProfileModal } = useUserProfileModal()

// Float AI state
const showFloatAi = ref(false)

// Hide float AI on editor (editor has its own AI rail)
const isEditorScreen = computed(
  () => route.name === 'CvEditor' || route.name === 'CoverLetterEditor'
)

// Tweak defaults
const TWEAK_DEFAULTS = {
  theme: 'dark',
  palette: 'moonlit',
  glass: 'heavy',
  orbs: 'on',
  radius: 'lg'
}

const loadTweaks = () => {
  try {
    return JSON.parse(localStorage.getItem('lycan.tweaks') || 'null') || TWEAK_DEFAULTS
  } catch {
    return TWEAK_DEFAULTS
  }
}

const tweaks = ref(loadTweaks())

const applyTweaks = (t) => {
  const el = document.documentElement
  el.dataset.theme = t.theme
  el.dataset.palette = t.palette
  el.dataset.glass = t.glass
  el.dataset.orbs = t.orbs
  el.dataset.radius = t.radius
  // Sync Tailwind dark-mode class with our theme token
  el.classList.toggle('dark', t.theme === 'dark')
}

onMounted(() => {
  applyTweaks(tweaks.value)
  initTooltips()
})

watch(
  tweaks,
  (val) => {
    applyTweaks(val)
    localStorage.setItem('lycan.tweaks', JSON.stringify(val))
  },
  { deep: true }
)

provide('tweaks', tweaks)
provide('showFloatAi', showFloatAi)

const toggleTheme = () => {
  tweaks.value.theme = tweaks.value.theme === 'dark' ? 'light' : 'dark'
}
provide('toggleTheme', toggleTheme)
</script>

<template>
  <BackgroundStage />

  <div class="app-shell">
    <router-view />
  </div>

  <!-- TODO: bottom navigation dock — placeholder, not yet fully functional -->
  <!-- <NavDock
    :float-ai-active="showFloatAi"
    @toggle-float-ai="showFloatAi = !showFloatAi"
    @open-new-modal="$router.currentRoute.value.meta?.onNewModal?.()"
    @open-settings="openSettingsModal()"
    @open-profile="openUserProfileModal()"
  /> -->

  <!-- Float AI — visible on non-editor screens -->
  <FloatingAiChat v-if="showFloatAi && !isEditorScreen" @close="showFloatAi = false" />

  <!-- Shared modals -->
  <SettingsModal :is-open="isSettingsModalOpen" @close="closeSettingsModal" />
  <UserProfileModal :is-open="isUserProfileModalOpen" @close="closeUserProfileModal" />
  <DeletionConfirmDialog />
</template>

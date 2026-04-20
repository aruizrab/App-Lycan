<template>
  <div class="am-wrap" ref="menuContainer">
    <button
      ref="triggerBtn"
      class="am-trigger"
      :class="{ active: isOpen }"
      type="button"
      @click.stop="toggleMenu"
    >
      <MoreVertical :size="16" />
    </button>

    <Teleport to="body">
      <Transition name="am-fade">
        <div v-if="isOpen" class="am-panel glass" :style="panelStyle">
          <button
            v-for="action in actions"
            :key="action.id"
            class="am-item"
            :class="{ 'am-item--danger': action.id === 'delete' }"
            type="button"
            @click.stop="handleAction(action.id)"
          >
            <component :is="action.icon" :size="14" />
            {{ action.label }}
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { MoreVertical, Copy, Trash2, Download, Edit } from 'lucide-vue-next'

defineProps({
  actions: {
    type: Array,
    default: () => [
      { id: 'edit', label: 'Edit', icon: Edit },
      { id: 'duplicate', label: 'Duplicate', icon: Copy },
      { id: 'export', label: 'Export JSON', icon: Download },
      { id: 'delete', label: 'Delete', icon: Trash2 }
    ]
  }
})

const emit = defineEmits(['action'])

const isOpen = ref(false)
const menuContainer = ref(null)
const triggerBtn = ref(null)
const panelStyle = ref({})

const PANEL_WIDTH = 176 // px, matches min-width below

const computePosition = () => {
  if (!triggerBtn.value) return
  const r = triggerBtn.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - r.bottom
  const top = spaceBelow >= 180 ? r.bottom + 6 : r.top - 6

  // Anchor right edge of panel to right edge of trigger
  let right = window.innerWidth - r.right
  // Clamp so panel never goes off left edge
  const leftEdge = window.innerWidth - right - PANEL_WIDTH
  if (leftEdge < 8) right = window.innerWidth - PANEL_WIDTH - 8

  panelStyle.value = {
    position: 'fixed',
    top: (spaceBelow >= 180 ? r.bottom + 6 : top - 180) + 'px',
    right: right + 'px',
    zIndex: 9999
  }
}

const toggleMenu = () => {
  if (!isOpen.value) computePosition()
  isOpen.value = !isOpen.value
}

const handleAction = (actionId) => {
  emit('action', actionId)
  isOpen.value = false
}

const handleClickOutside = (e) => {
  if (menuContainer.value && !menuContainer.value.contains(e.target)) {
    isOpen.value = false
  }
}

const handleScroll = () => {
  isOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('scroll', handleScroll, true)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
  document.removeEventListener('scroll', handleScroll, true)
})
</script>

<style scoped>
.am-wrap {
  position: relative;
  display: inline-flex;
}

/* Trigger button */
.am-trigger {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--fg-2);
  cursor: pointer;
  transition:
    background var(--dur-fast),
    color var(--dur-fast);
}
.am-trigger:hover,
.am-trigger.active {
  background: color-mix(in oklch, var(--fg-0) 10%, transparent);
  color: var(--fg-0);
}

/* Dropdown panel */
.am-panel {
  min-width: 176px;
  border-radius: 12px;
  border: 1px solid color-mix(in oklch, var(--fg-0) 12%, transparent);
  padding: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
}

/* Items */
.am-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--fg-1);
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition:
    background var(--dur-fast),
    color var(--dur-fast);
}
.am-item:hover {
  background: color-mix(in oklch, var(--fg-0) 8%, transparent);
  color: var(--fg-0);
}
.am-item--danger {
  color: var(--danger);
}
.am-item--danger:hover {
  background: color-mix(in oklch, var(--danger) 10%, transparent);
  color: var(--danger);
}

/* Transition */
.am-fade-enter-active {
  transition:
    opacity 0.1s ease,
    transform 0.1s ease;
}
.am-fade-leave-active {
  transition:
    opacity 0.08s ease,
    transform 0.08s ease;
}
.am-fade-enter-from,
.am-fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>

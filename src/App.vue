<script setup>
import { ref, watch } from 'vue'
import DeletionConfirmDialog from './components/DeletionConfirmDialog.vue'

// Initialize state from localStorage or system preference
const getInitialTheme = () => {
  const saved = localStorage.getItem('theme')
  if (saved) {
    return saved === 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const isDark = ref(getInitialTheme())

// Apply theme immediately
if (isDark.value) {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

watch(isDark, (val) => {
  localStorage.setItem('theme', val ? 'dark' : 'light')
  if (val) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})
</script>

<template>
  <router-view></router-view>
  <DeletionConfirmDialog />
</template>


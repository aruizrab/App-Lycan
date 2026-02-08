import { ref } from 'vue'

const isSettingsModalOpen = ref(false)

export function useSettingsModal() {
    const openSettingsModal = () => {
        isSettingsModalOpen.value = true
    }

    const closeSettingsModal = () => {
        isSettingsModalOpen.value = false
    }

    return {
        isSettingsModalOpen,
        openSettingsModal,
        closeSettingsModal
    }
}

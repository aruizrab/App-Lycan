import { ref } from 'vue'

const isUserProfileModalOpen = ref(false)

export function useUserProfileModal() {
    const openUserProfileModal = () => {
        isUserProfileModalOpen.value = true
    }

    const closeUserProfileModal = () => {
        isUserProfileModalOpen.value = false
    }

    return {
        isUserProfileModalOpen,
        openUserProfileModal,
        closeUserProfileModal
    }
}

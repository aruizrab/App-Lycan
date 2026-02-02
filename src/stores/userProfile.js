import { defineStore } from 'pinia'
import { reactive, watch, toRefs, computed } from 'vue'

const STORAGE_KEY = 'app-lycan-user-profile'

/**
 * Default user profile structure
 */
const defaultProfile = () => ({
    // Rich text professional experience/summary
    professionalExperience: '',

    // Basic contact info for cover letters
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    portfolio: '',

    // Metadata
    lastModified: null,
    createdAt: null
})

/**
 * User Profile Store
 * Stores user's professional details globally (persisted across workspaces)
 * Used as context for AI-powered CV and cover letter generation
 */
export const useUserProfileStore = defineStore('userProfile', () => {
    const state = reactive(defaultProfile())

    /**
     * Load profile from localStorage
     */
    const loadFromStorage = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                Object.assign(state, { ...defaultProfile(), ...parsed })
            }
        } catch (e) {
            console.warn('Failed to load user profile, using defaults', e)
        }
    }

    /**
     * Persist profile to localStorage
     */
    const persist = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        } catch (e) {
            console.warn('Failed to persist user profile', e)
        }
    }

    // Load on initialization
    loadFromStorage()

    // Auto-save on changes
    watch(state, persist, { deep: true })

    /**
     * Update professional experience (rich text)
     */
    const updateProfessionalExperience = (content) => {
        state.professionalExperience = content
        state.lastModified = Date.now()
        if (!state.createdAt) {
            state.createdAt = Date.now()
        }
    }

    /**
     * Update contact info
     */
    const updateContactInfo = (info) => {
        const allowedFields = ['fullName', 'email', 'phone', 'location', 'linkedIn', 'portfolio']
        allowedFields.forEach(field => {
            if (info.hasOwnProperty(field)) {
                state[field] = info[field]
            }
        })
        state.lastModified = Date.now()
        if (!state.createdAt) {
            state.createdAt = Date.now()
        }
    }

    /**
     * Reset profile to defaults
     */
    const resetProfile = () => {
        Object.assign(state, defaultProfile())
    }

    /**
     * Check if profile has meaningful content
     */
    const hasContent = computed(() => {
        return !!(
            state.professionalExperience?.trim() ||
            state.fullName?.trim()
        )
    })

    /**
     * Get profile summary for AI context
     */
    const getProfileSummary = computed(() => {
        const parts = []

        if (state.fullName) {
            parts.push(`Name: ${state.fullName}`)
        }
        if (state.email) {
            parts.push(`Email: ${state.email}`)
        }
        if (state.phone) {
            parts.push(`Phone: ${state.phone}`)
        }
        if (state.location) {
            parts.push(`Location: ${state.location}`)
        }
        if (state.linkedIn) {
            parts.push(`LinkedIn: ${state.linkedIn}`)
        }
        if (state.portfolio) {
            parts.push(`Portfolio: ${state.portfolio}`)
        }

        if (state.professionalExperience) {
            parts.push(`\nProfessional Experience:\n${state.professionalExperience}`)
        }

        return parts.join('\n')
    })

    /**
     * Export profile as JSON
     */
    const exportProfile = () => {
        return JSON.stringify(state, null, 2)
    }

    /**
     * Import profile from JSON
     */
    const importProfile = (jsonContent) => {
        try {
            const parsed = JSON.parse(jsonContent)
            Object.assign(state, { ...defaultProfile(), ...parsed })
            state.lastModified = Date.now()
            return true
        } catch (e) {
            console.error('Failed to import profile', e)
            return false
        }
    }

    return {
        ...toRefs(state),
        updateProfessionalExperience,
        updateContactInfo,
        resetProfile,
        hasContent,
        getProfileSummary,
        exportProfile,
        importProfile
    }
})

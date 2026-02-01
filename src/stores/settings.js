import { defineStore } from 'pinia'
import { reactive, watch, toRefs } from 'vue'

const STORAGE_KEY = 'app-lycan-ui-settings'

const defaultSettings = () => ({
    atsMode: false,
    showPictureInAts: false,
    uppercaseName: true,
    uppercaseRole: true,
    uppercaseHeaders: true,
    uppercaseCoverLetterTitle: true,
    picturePosition: 'left',
    openRouterKey: '',
    openRouterModel: 'openai/gpt-3.5-turbo',
    customModels: []
})

export const useSettingsStore = defineStore('settings', () => {
    const state = reactive(defaultSettings())

    const loadFromStorage = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                Object.assign(state, { ...defaultSettings(), ...parsed })
            }
        } catch (e) {
            console.warn('Failed to load settings, using defaults', e)
        }
    }

    const persist = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        } catch (e) {
            console.warn('Failed to persist settings', e)
        }
    }

    loadFromStorage()

    watch(state, persist, { deep: true })

    const resetSettings = () => {
        Object.assign(state, defaultSettings())
    }

    return {
        ...toRefs(state),
        resetSettings
    }
})

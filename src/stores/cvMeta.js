import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'

const STORAGE_KEY = 'cv-maker-meta-data'

export const useCvMetaStore = defineStore('cvMeta', () => {
    const state = reactive({})

    // Load from storage
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            Object.assign(state, JSON.parse(saved))
        }
    } catch (e) {
        console.warn('Failed to load meta data', e)
    }

    // Persist to storage
    watch(state, () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        } catch (e) {
            console.warn('Failed to persist meta data', e)
        }
    }, { deep: true })

    const initCvMeta = (cvId) => {
        if (!state[cvId]) {
            state[cvId] = {
                chats: [],
                history: {
                    past: [],
                    future: []
                }
            }
        }
        return state[cvId]
    }

    // Chat Actions
    const createChat = (cvId, title = 'New Chat') => {
        const meta = initCvMeta(cvId)
        const newChat = {
            id: crypto.randomUUID(),
            title,
            createdAt: Date.now(),
            messages: []
        }
        meta.chats.push(newChat)
        return newChat
    }

    const deleteChat = (cvId, chatId) => {
        if (state[cvId]) {
            const index = state[cvId].chats.findIndex(c => c.id === chatId)
            if (index !== -1) {
                state[cvId].chats.splice(index, 1)
            }
        }
    }

    const addMessage = (cvId, chatId, message) => {
        const meta = initCvMeta(cvId)
        const chat = meta.chats.find(c => c.id === chatId)
        if (chat) {
            chat.messages.push(message)
        }
    }

    const getChats = (cvId) => {
        return state[cvId]?.chats || []
    }

    // History Actions
    const saveSnapshot = (cvId, cvData) => {
        const meta = initCvMeta(cvId)
        // Limit history size if needed, e.g., 50 items
        if (meta.history.past.length >= 50) {
            meta.history.past.shift()
        }
        meta.history.past.push(JSON.parse(JSON.stringify(cvData)))
        meta.history.future = [] // Clear redo stack
    }

    const getUndoState = (cvId) => {
        const meta = state[cvId]
        if (meta && meta.history.past.length > 0) {
            return meta.history.past.pop()
        }
        return null
    }

    const pushToFuture = (cvId, cvData) => {
        const meta = initCvMeta(cvId)
        meta.history.future.push(JSON.parse(JSON.stringify(cvData)))
    }

    const getRedoState = (cvId) => {
        const meta = state[cvId]
        if (meta && meta.history.future.length > 0) {
            return meta.history.future.pop()
        }
        return null
    }

    const pushToPast = (cvId, cvData) => {
        const meta = initCvMeta(cvId)
        meta.history.past.push(JSON.parse(JSON.stringify(cvData)))
    }

    const hasUndo = (cvId) => {
        return state[cvId]?.history.past.length > 0
    }

    const hasRedo = (cvId) => {
        return state[cvId]?.history.future.length > 0
    }

    const deleteMeta = (cvId) => {
        if (state[cvId]) {
            delete state[cvId]
        }
    }

    return {
        state,
        createChat,
        deleteChat,
        addMessage,
        getChats,
        saveSnapshot,
        getUndoState,
        pushToFuture,
        getRedoState,
        pushToPast,
        hasUndo,
        hasRedo,
        deleteMeta
    }
})

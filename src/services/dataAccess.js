/**
 * Centralized Data Access Layer
 * 
 * Single point of entry for reading and modifying app data.
 * Used by AI tools, composables, and components to interact with stores.
 * Ensures consistent error handling and validation across the app.
 */

import { useWorkspaceStore } from '../stores/workspace'
import { useCvStore } from '../stores/cv'
import { useCoverLetterStore } from '../stores/coverLetter'
import { useUserProfileStore } from '../stores/userProfile'
import { useSettingsStore } from '../stores/settings'
import { useSystemPromptsStore } from '../stores/systemPrompts'
import { useChatStore } from '../stores/chat'
import { toRaw } from 'vue'

// =========================================================
// Store accessors (lazy, always returns current store instance)
// =========================================================

const getStores = () => ({
    workspace: useWorkspaceStore(),
    cv: useCvStore(),
    coverLetter: useCoverLetterStore(),
    userProfile: useUserProfileStore(),
    settings: useSettingsStore(),
    systemPrompts: useSystemPromptsStore(),
    chat: useChatStore()
})

// =========================================================
// NAVIGATION
// =========================================================

/**
 * Navigate to a specific view using the Vue Router instance.
 * Must be called after router is installed.
 * @param {import('vue-router').Router} router
 * @param {Object} params
 * @param {string} params.view - 'general_dashboard' | 'workspace_dashboard' | 'cv_editor' | 'cover_letter_editor'
 * @param {string} [params.workspaceName]
 * @param {string} [params.cvName]
 * @param {string} [params.coverLetterName]
 */
export const navigateTo = (router, { view, workspaceName, cvName, coverLetterName }) => {
    const { workspace } = getStores()

    switch (view) {
        case 'general_dashboard':
            router.push({ path: '/', query: { openAiChat: 'true' } })
            return { success: true, message: 'Navigated to general dashboard. AI chat will open.' }

        case 'workspace_dashboard':
            if (!workspaceName) return { error: 'workspace_name is required for workspace_dashboard' }
            if (!workspace.workspaces[workspaceName]) return { error: `Workspace "${workspaceName}" not found` }
            workspace.setCurrentWorkspace(workspaceName)
            router.push({ path: `/workspace/${encodeURIComponent(workspaceName)}`, query: { openAiChat: 'true' } })
            return { success: true, message: 'Navigated to workspace dashboard. AI chat will open.' }

        case 'cv_editor':
            if (!workspaceName) return { error: 'workspace_name is required for cv_editor' }
            if (!cvName) return { error: 'cv_name is required for cv_editor' }
            if (!workspace.workspaces[workspaceName]) return { error: `Workspace "${workspaceName}" not found` }
            if (!workspace.workspaces[workspaceName].cvs[cvName]) return { error: `CV "${cvName}" not found in workspace "${workspaceName}"` }
            workspace.setCurrentWorkspace(workspaceName)
            router.push({ path: `/workspace/${encodeURIComponent(workspaceName)}/edit/${encodeURIComponent(cvName)}`, query: { openAiChat: 'true' } })
            return { success: true, message: 'Navigated to CV editor. AI chat will open.' }

        case 'cover_letter_editor':
            if (!workspaceName) return { error: 'workspace_name is required for cover_letter_editor' }
            if (!coverLetterName) return { error: 'cover_letter_name is required for cover_letter_editor' }
            if (!workspace.workspaces[workspaceName]) return { error: `Workspace "${workspaceName}" not found` }
            if (!workspace.workspaces[workspaceName].coverLetters[coverLetterName]) return { error: `Cover Letter "${coverLetterName}" not found in workspace "${workspaceName}"` }
            workspace.setCurrentWorkspace(workspaceName)
            router.push({ path: `/workspace/${encodeURIComponent(workspaceName)}/cover-letter/${encodeURIComponent(coverLetterName)}`, query: { openAiChat: 'true' } })
            return { success: true, message: 'Navigated to cover letter editor. AI chat will open.' }

        default:
            return { error: `Unknown view: ${view}. Valid views: general_dashboard, workspace_dashboard, cv_editor, cover_letter_editor` }
    }
}

// =========================================================
// READING — App Context
// =========================================================

/**
 * Detect which view the user is currently on based on the route.
 * @param {import('vue-router').RouteLocationNormalized} route
 */
export const getCurrentView = (route) => {
    const name = route.name
    switch (name) {
        case 'WorkspaceDashboard': return 'general_dashboard'
        case 'Dashboard': return 'workspace_dashboard'
        case 'CvEditor': return 'cv_editor'
        case 'CoverLetterEditor': return 'cover_letter_editor'
        default: return 'general_dashboard'
    }
}

/**
 * Build the full APP CONTEXT JSON used in system prompts.
 * @param {import('vue-router').RouteLocationNormalized} route
 */
export const buildAppContext = (route) => {
    const { workspace, cv, coverLetter } = getStores()
    const currentView = getCurrentView(route)
    const allViews = ['general_dashboard', 'workspace_dashboard', 'cv_editor', 'cover_letter_editor']

    const base = { all_views: allViews, current_view: currentView }

    const buildWorkspaceTree = (wsName) => {
        const ws = workspace.workspaces[wsName]
        if (!ws) return null
        return {
            name: wsName,
            cvs: Object.keys(ws.cvs || {}),
            cover_letters: Object.keys(ws.coverLetters || {})
        }
    }

    if (currentView === 'general_dashboard') {
        return {
            ...base,
            workspaces: Object.keys(workspace.workspaces).map(buildWorkspaceTree)
        }
    }

    const wsName = workspace.currentWorkspace
    const wsTree = buildWorkspaceTree(wsName)

    if (currentView === 'workspace_dashboard') {
        return { ...base, workspace: wsTree }
    }

    if (currentView === 'cv_editor') {
        return { ...base, workspace: wsTree, current_cv: cv.currentCvName }
    }

    if (currentView === 'cover_letter_editor') {
        return { ...base, workspace: wsTree, current_cover_letter: coverLetter.currentCoverLetterName }
    }

    return base
}

// =========================================================
// READING — Workspaces
// =========================================================

/**
 * Get list of all workspaces with names and document lists.
 */
export const getAllWorkspaces = () => {
    const { workspace } = getStores()
    return Object.keys(workspace.workspaces).map(wsName => {
        const ws = workspace.workspaces[wsName]
        return {
            name: wsName,
            cvs: Object.keys(ws.cvs || {}),
            cover_letters: Object.keys(ws.coverLetters || {})
        }
    })
}

/**
 * Get a single workspace by name.
 */
export const getWorkspace = (workspaceName) => {
    const { workspace } = getStores()
    const ws = workspace.workspaces[workspaceName]
    if (!ws) return { error: `Workspace "${workspaceName}" not found` }
    return {
        name: workspaceName,
        cvs: Object.keys(ws.cvs || {}),
        cover_letters: Object.keys(ws.coverLetters || {})
    }
}

// =========================================================
// READING — CVs & Cover Letters
// =========================================================

/**
 * Get full CV data by workspace + cv name.
 */
export const getCv = (workspaceName, cvName) => {
    const { workspace } = getStores()
    const ws = workspace.workspaces[workspaceName]
    if (!ws) return { error: `Workspace "${workspaceName}" not found` }
    const cvDoc = ws.cvs[cvName]
    if (!cvDoc) return { error: `CV "${cvName}" not found in workspace "${workspaceName}"` }
    return { name: cvName, data: toRaw(cvDoc.data) }
}

/**
 * Get full Cover Letter data by workspace + cover letter name.
 */
export const getCoverLetter = (workspaceName, coverLetterName) => {
    const { workspace } = getStores()
    const ws = workspace.workspaces[workspaceName]
    if (!ws) return { error: `Workspace "${workspaceName}" not found` }
    const clDoc = ws.coverLetters[coverLetterName]
    if (!clDoc) return { error: `Cover Letter "${coverLetterName}" not found in workspace "${workspaceName}"` }
    return { name: coverLetterName, data: toRaw(clDoc.data) }
}

// =========================================================
// READING — Workspace Context
// =========================================================

/**
 * Get workspace context field, or list all context keys.
 * Context keys are any keys on the workspace object that are NOT metadata, cvs, coverLetters,
 * jobAnalysis, matchReport, or companyResearch (the special AI context fields).
 */
const RESERVED_WS_KEYS = new Set(['metadata', 'cvs', 'coverLetters', 'jobAnalysis', 'matchReport', 'companyResearch'])

export const getWorkspaceContextKeys = (workspaceName) => {
    const { workspace } = getStores()
    const ws = workspace.workspaces[workspaceName]
    if (!ws) return { error: `Workspace "${workspaceName}" not found` }
    const keys = Object.keys(ws).filter(k => !RESERVED_WS_KEYS.has(k) && ws[k] !== null && ws[k] !== undefined)
    return { context_keys: keys }
}

export const getWorkspaceContext = (workspaceName, contextKey) => {
    const { workspace } = getStores()
    const ws = workspace.workspaces[workspaceName]
    if (!ws) return { error: `Workspace "${workspaceName}" not found` }

    if (!contextKey) {
        return getWorkspaceContextKeys(workspaceName)
    }

    if (RESERVED_WS_KEYS.has(contextKey)) {
        return { error: `"${contextKey}" is a reserved key and not a context field` }
    }

    const value = ws[contextKey]
    if (value === null || value === undefined) {
        return { error: `Context key "${contextKey}" not found in workspace "${workspaceName}"` }
    }

    return { key: contextKey, content: toRaw(value) }
}

// =========================================================
// READING — User Profile
// =========================================================

export const getUserProfile = () => {
    const { userProfile } = getStores()
    return {
        fullName: userProfile.fullName,
        email: userProfile.email,
        phone: userProfile.phone,
        location: userProfile.location,
        linkedIn: userProfile.linkedIn,
        portfolio: userProfile.portfolio,
        professionalExperience: userProfile.professionalExperience,
        summary: userProfile.getProfileSummary
    }
}

// =========================================================
// CREATION
// =========================================================

export const createWorkspace = (name) => {
    const { workspace } = getStores()
    try {
        if (!name) return { error: 'Workspace name is required' }
        if (workspace.workspaces[name]) return { error: `Workspace "${name}" already exists` }
        workspace.createWorkspace(name)
        return { success: true, name }
    } catch (e) {
        return { error: e.message }
    }
}

export const createCv = (workspaceName, cvName, cvData) => {
    const { workspace, cv } = getStores()
    try {
        if (!workspaceName) return { error: 'workspace_name is required' }
        if (!cvName) return { error: 'cv_name is required' }
        if (!workspace.workspaces[workspaceName]) return { error: `Workspace "${workspaceName}" not found` }

        // Ensure workspace is set as current before creating
        workspace.setCurrentWorkspace(workspaceName)

        if (cv.isNameTaken(cvName)) return { error: `CV "${cvName}" already exists in workspace "${workspaceName}"` }

        cv.createCv(cvName)

        // If CV data provided, apply it
        if (cvData && typeof cvData === 'object') {
            const ws = workspace.workspaces[workspaceName]
            const cvDoc = ws.cvs[cvName]
            if (cvDoc) {
                // Unwrap 'data' property if provided (schema format)
                const dataToMerge = cvData.data ? cvData.data : cvData
                // Deep merge to preserve template structure
                cvDoc.data = deepMerge(cvDoc.data, dataToMerge)
                cvDoc.lastModified = Date.now()
                workspace.save()
            }
        }

        return { success: true, workspace_name: workspaceName, cv_name: cvName }
    } catch (e) {
        return { error: e.message }
    }
}

export const createCoverLetter = (workspaceName, clName, clData) => {
    const { workspace, coverLetter } = getStores()
    try {
        if (!workspaceName) return { error: 'workspace_name is required' }
        if (!clName) return { error: 'cover_letter_name is required' }
        if (!workspace.workspaces[workspaceName]) return { error: `Workspace "${workspaceName}" not found` }

        workspace.setCurrentWorkspace(workspaceName)

        if (coverLetter.isNameTaken(clName)) return { error: `Cover Letter "${clName}" already exists in workspace "${workspaceName}"` }

        coverLetter.createCoverLetter(clName)

        if (clData && typeof clData === 'object') {
            const ws = workspace.workspaces[workspaceName]
            const clDoc = ws.coverLetters[clName]
            if (clDoc) {
                // Unwrap 'data' property if provided (schema format)
                const dataToMerge = clData.data ? clData.data : clData
                // Deep merge to preserve template structure
                clDoc.data = deepMerge(clDoc.data, dataToMerge)
                clDoc.lastModified = Date.now()
                workspace.save()
            }
        }

        return { success: true, workspace_name: workspaceName, cover_letter_name: clName }
    } catch (e) {
        return { error: e.message }
    }
}

export const addWorkspaceContext = (workspaceName, contextKey, contextContent) => {
    const { workspace } = getStores()
    try {
        if (!workspaceName) return { error: 'workspace_name is required' }
        if (!contextKey) return { error: 'context_key is required' }
        if (!contextContent) return { error: 'context_content is required' }
        if (RESERVED_WS_KEYS.has(contextKey)) return { error: `"${contextKey}" is a reserved key` }

        const ws = workspace.workspaces[workspaceName]
        if (!ws) return { error: `Workspace "${workspaceName}" not found` }

        if (ws[contextKey] !== null && ws[contextKey] !== undefined) {
            return { error: `Context key "${contextKey}" already exists in workspace "${workspaceName}". Use edit_workspace_context to update it.` }
        }

        ws[contextKey] = {
            content: contextContent,
            createdAt: Date.now(),
            lastModified: Date.now()
        }
        ws.metadata.lastModified = Date.now()
        workspace.save()

        return { success: true, workspace_name: workspaceName, context_key: contextKey }
    } catch (e) {
        return { error: e.message }
    }
}

// =========================================================
// EDITING
// =========================================================

export const editWorkspace = (currentName, newName) => {
    const { workspace } = getStores()
    try {
        if (!currentName) return { error: 'current_workspace_name is required' }
        if (!newName) return { error: 'new_workspace_name is required' }
        if (!workspace.workspaces[currentName]) return { error: `Workspace "${currentName}" not found` }
        if (workspace.workspaces[newName]) return { error: `Workspace "${newName}" already exists` }

        workspace.renameWorkspace(currentName, newName)
        return { success: true, old_name: currentName, new_name: newName }
    } catch (e) {
        return { error: e.message }
    }
}

export const editCv = (workspaceName, currentCvName, { newCvName, newCvData, dataEditingMode = 'merge' } = {}) => {
    const { workspace, cv } = getStores()
    try {
        if (!workspaceName) return { error: 'workspace_name is required' }
        if (!currentCvName) return { error: 'current_cv_name is required' }

        // At least one edit operation must be provided
        if (!newCvName && !newCvData) {
            return { error: 'At least one of newCvName or newCvData must be provided' }
        }

        const ws = workspace.workspaces[workspaceName]
        if (!ws) return { error: `Workspace "${workspaceName}" not found` }
        if (!ws.cvs[currentCvName]) return { error: `CV "${currentCvName}" not found in workspace "${workspaceName}"` }

        workspace.setCurrentWorkspace(workspaceName)

        // Rename if needed
        if (newCvName && newCvName !== currentCvName) {
            if (ws.cvs[newCvName]) return { error: `CV "${newCvName}" already exists in workspace "${workspaceName}"` }
            cv.setCurrentCv(currentCvName)
            cv.updateCvName(currentCvName, newCvName)
            currentCvName = newCvName
        }

        // Update data if provided
        if (newCvData && typeof newCvData === 'object') {
            const cvDoc = ws.cvs[currentCvName]
            if (cvDoc) {
                // Unwrap 'data' property if provided (schema format)
                const dataToMerge = newCvData.data ? newCvData.data : newCvData
                if (dataEditingMode === 'replace') {
                    cvDoc.data = dataToMerge
                } else {
                    // Deep merge
                    cvDoc.data = deepMerge(cvDoc.data, dataToMerge)
                }
                cvDoc.lastModified = Date.now()
                workspace.save()
            }
        }

        return { success: true, workspace_name: workspaceName, cv_name: currentCvName }
    } catch (e) {
        return { error: e.message }
    }
}

export const editCoverLetter = (workspaceName, currentClName, { newClName, newClData, dataEditingMode = 'merge' } = {}) => {
    const { workspace, coverLetter } = getStores()
    try {
        if (!workspaceName) return { error: 'workspace_name is required' }
        if (!currentClName) return { error: 'current_cover_letter_name is required' }

        // At least one edit operation must be provided
        if (!newClName && !newClData) {
            return { error: 'At least one of newClName or newClData must be provided' }
        }

        const ws = workspace.workspaces[workspaceName]
        if (!ws) return { error: `Workspace "${workspaceName}" not found` }
        if (!ws.coverLetters[currentClName]) return { error: `Cover Letter "${currentClName}" not found in workspace "${workspaceName}"` }

        workspace.setCurrentWorkspace(workspaceName)

        if (newClName && newClName !== currentClName) {
            if (ws.coverLetters[newClName]) return { error: `Cover Letter "${newClName}" already exists in workspace "${workspaceName}"` }
            coverLetter.setCurrentCoverLetter(currentClName)
            coverLetter.updateCoverLetterName(currentClName, newClName)
            currentClName = newClName
        }

        if (newClData && typeof newClData === 'object') {
            const clDoc = ws.coverLetters[currentClName]
            if (clDoc) {
                // Unwrap 'data' property if provided (schema format)
                const dataToMerge = newClData.data ? newClData.data : newClData
                if (dataEditingMode === 'replace') {
                    clDoc.data = dataToMerge
                } else {
                    clDoc.data = deepMerge(clDoc.data, dataToMerge)
                }
                clDoc.lastModified = Date.now()
                workspace.save()
            }
        }

        return { success: true, workspace_name: workspaceName, cover_letter_name: currentClName }
    } catch (e) {
        return { error: e.message }
    }
}

export const editWorkspaceContext = (workspaceName, contextKey, newContent) => {
    const { workspace } = getStores()
    try {
        if (!workspaceName) return { error: 'workspace_name is required' }
        if (!contextKey) return { error: 'context_key is required' }
        if (!newContent) return { error: 'new_context_content is required' }
        if (RESERVED_WS_KEYS.has(contextKey)) return { error: `"${contextKey}" is a reserved key` }

        const ws = workspace.workspaces[workspaceName]
        if (!ws) return { error: `Workspace "${workspaceName}" not found` }

        if (ws[contextKey] === null || ws[contextKey] === undefined) {
            return { error: `Context key "${contextKey}" not found in workspace "${workspaceName}"` }
        }

        const existing = ws[contextKey]
        ws[contextKey] = {
            ...(typeof existing === 'object' ? existing : {}),
            content: newContent,
            lastModified: Date.now()
        }
        ws.metadata.lastModified = Date.now()
        workspace.save()

        return { success: true, workspace_name: workspaceName, context_key: contextKey }
    } catch (e) {
        return { error: e.message }
    }
}

// =========================================================
// DELETION (with confirmation support)
// =========================================================

/**
 * Pending deletion store – components can watch this to show confirm dialogs.
 */
let pendingDeletion = null
let deletionResolve = null

export const getPendingDeletion = () => pendingDeletion

/**
 * Request deletion with user confirmation.
 * Returns a promise that resolves when user confirms/rejects.
 */
const requestDeletionConfirmation = (type, details) => {
    return new Promise((resolve) => {
        pendingDeletion = { type, details, resolve }
        deletionResolve = resolve
    })
}

export const confirmDeletion = () => {
    if (deletionResolve) {
        deletionResolve(true)
        pendingDeletion = null
        deletionResolve = null
    }
}

export const rejectDeletion = () => {
    if (deletionResolve) {
        deletionResolve(false)
        pendingDeletion = null
        deletionResolve = null
    }
}

export const deleteWorkspaceWithConfirm = async (workspaceName) => {
    const { workspace } = getStores()
    if (!workspaceName) return { error: 'workspace_name is required' }
    if (!workspace.workspaces[workspaceName]) return { error: `Workspace "${workspaceName}" not found` }

    const confirmed = await requestDeletionConfirmation('workspace', { workspaceName })
    if (!confirmed) return { error: 'User did not confirm the deletion' }

    try {
        workspace.deleteWorkspace(workspaceName)
        return { success: true, deleted: workspaceName }
    } catch (e) {
        return { error: e.message }
    }
}

export const deleteCvWithConfirm = async (workspaceName, cvName) => {
    const { workspace, cv } = getStores()
    if (!workspaceName) return { error: 'workspace_name is required' }
    if (!cvName) return { error: 'cv_name is required' }
    const ws = workspace.workspaces[workspaceName]
    if (!ws) return { error: `Workspace "${workspaceName}" not found` }
    if (!ws.cvs[cvName]) return { error: `CV "${cvName}" not found in workspace "${workspaceName}"` }

    const confirmed = await requestDeletionConfirmation('cv', { workspaceName, cvName })
    if (!confirmed) return { error: 'User did not confirm the deletion' }

    try {
        workspace.setCurrentWorkspace(workspaceName)
        cv.deleteCv(cvName)
        return { success: true, deleted: cvName }
    } catch (e) {
        return { error: e.message }
    }
}

export const deleteCoverLetterWithConfirm = async (workspaceName, clName) => {
    const { workspace, coverLetter } = getStores()
    if (!workspaceName) return { error: 'workspace_name is required' }
    if (!clName) return { error: 'cover_letter_name is required' }
    const ws = workspace.workspaces[workspaceName]
    if (!ws) return { error: `Workspace "${workspaceName}" not found` }
    if (!ws.coverLetters[clName]) return { error: `Cover Letter "${clName}" not found in workspace "${workspaceName}"` }

    const confirmed = await requestDeletionConfirmation('cover_letter', { workspaceName, coverLetterName: clName })
    if (!confirmed) return { error: 'User did not confirm the deletion' }

    try {
        workspace.setCurrentWorkspace(workspaceName)
        coverLetter.deleteCoverLetter(clName)
        return { success: true, deleted: clName }
    } catch (e) {
        return { error: e.message }
    }
}

export const deleteWorkspaceContextWithConfirm = async (workspaceName, contextKey) => {
    const { workspace } = getStores()
    if (!workspaceName) return { error: 'workspace_name is required' }
    if (!contextKey) return { error: 'context_key is required' }
    if (RESERVED_WS_KEYS.has(contextKey)) return { error: `"${contextKey}" is a reserved key` }

    const ws = workspace.workspaces[workspaceName]
    if (!ws) return { error: `Workspace "${workspaceName}" not found` }
    if (ws[contextKey] === null || ws[contextKey] === undefined) {
        return { error: `Context key "${contextKey}" not found in workspace "${workspaceName}"` }
    }

    const confirmed = await requestDeletionConfirmation('workspace_context', { workspaceName, contextKey })
    if (!confirmed) return { error: 'User did not confirm the deletion' }

    try {
        ws[contextKey] = null
        ws.metadata.lastModified = Date.now()
        workspace.save()
        return { success: true, workspace_name: workspaceName, deleted_key: contextKey }
    } catch (e) {
        return { error: e.message }
    }
}

// =========================================================
// UTILITIES
// =========================================================

/**
 * Simple deep merge (target wins for non-object values)
 */
function deepMerge(target, source) {
    const output = { ...target }
    for (const key of Object.keys(source)) {
        if (
            source[key] &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key]) &&
            target[key] &&
            typeof target[key] === 'object' &&
            !Array.isArray(target[key])
        ) {
            output[key] = deepMerge(target[key], source[key])
        } else {
            output[key] = source[key]
        }
    }
    return output
}

import { ref, watch, computed } from 'vue'
import { defineStore } from 'pinia'
import { useCvMetaStore } from './cvMeta'

const STORAGE_KEY = 'workspaces'
const DEFAULT_WORKSPACE_NAME = 'My Workspace'

/**
 * Default workspace context structure for AI-powered features
 */
const defaultWorkspaceContext = () => ({
    // Job analysis from AI or manual entry
    jobAnalysis: null,
    // Structure when set:
    // {
    //     content: string (rich text),
    //     source: 'ai' | 'manual' | 'url',
    //     sourceUrl: string | null,
    //     jobTitle: string | null,
    //     company: string | null,
    //     createdAt: timestamp,
    //     lastModified: timestamp
    // }

    // Profile match report
    matchReport: null,
    // Structure when set:
    // {
    //     content: string (rich text),
    //     score: number (0-100),
    //     strengths: string[],
    //     weaknesses: string[],
    //     recommendation: 'apply' | 'consider' | 'skip',
    //     createdAt: timestamp,
    //     lastModified: timestamp
    // }

    // Company research from AI
    companyResearch: null
    // Structure when set:
    // {
    //     content: string (rich text),
    //     companyName: string,
    //     legitimacyScore: number | null,
    //     redFlags: string[],
    //     strategicInfo: {
    //         businessModel: string,
    //         achievements: string[],
    //         goals: string[]
    //     } | null,
    //     createdAt: timestamp,
    //     lastModified: timestamp
    // }
})

export const useWorkspaceStore = defineStore('workspace', () => {
    const workspaces = ref({})
    const currentWorkspace = ref(null)

    /**
     * Migrate existing CV data to new workspace structure
     */
    const migrateCv = (cvData) => {
        // Migration: Add label to contacts if missing
        if (cvData.personalInfo && cvData.personalInfo.contact) {
            cvData.personalInfo.contact.forEach(c => {
                if (!c.label) {
                    if (c.type === 'email') c.label = 'Email'
                    else if (c.type === 'phone') c.label = 'Phone'
                    else if (c.type === 'url') c.label = 'Link'
                    else c.label = c.type.charAt(0).toUpperCase() + c.type.slice(1)
                }
            })
        }

        // Migration: Add aboutMeTitle if missing
        if (cvData.personalInfo && !cvData.personalInfo.aboutMeTitle) {
            cvData.personalInfo.aboutMeTitle = 'About Me'
        }

        // Migration: Add languages section if missing
        if (!cvData.sections.find(s => s.type === 'languages')) {
            cvData.sections.splice(4, 0, {
                id: 'languages',
                title: 'Languages',
                type: 'languages',
                items: [],
                visible: true
            })
        }

        // Migration for skills: content -> items
        const skillsSection = cvData.sections.find(s => s.type === 'skills')
        if (skillsSection) {
            if (!skillsSection.items) skillsSection.items = []

            // If there is legacy content string, move it to first item
            if (typeof skillsSection.content === 'string') {
                if (skillsSection.content.trim()) {
                    skillsSection.items.unshift({
                        id: Date.now().toString(),
                        title: '',
                        content: skillsSection.content
                    })
                }
                delete skillsSection.content
            }

            // Ensure at least one item exists for better UX
            if (skillsSection.items.length === 0) {
                skillsSection.items.push({
                    id: Date.now().toString(),
                    title: '',
                    content: ''
                })
            }
        }
        return cvData
    }

    /**
     * Migrate flat localStorage structure to nested workspace structure
     */
    const migrateToWorkspaceStructure = () => {
        // Check if already migrated
        const existingWorkspaces = localStorage.getItem(STORAGE_KEY)
        if (existingWorkspaces) {
            return JSON.parse(existingWorkspaces)
        }

        // Get old flat structure
        const oldCvs = JSON.parse(localStorage.getItem('cvs-collection') || '[]')
        const oldCoverLetters = JSON.parse(localStorage.getItem('cover-letters-collection') || '[]')

        // Handle legacy single CV (from v1)
        const legacyCv = localStorage.getItem('cv-data')
        if (legacyCv && oldCvs.length === 0) {
            try {
                const cvData = JSON.parse(legacyCv)
                oldCvs.push({
                    id: crypto.randomUUID(),
                    name: cvData.personalInfo?.name || 'My CV',
                    lastModified: Date.now(),
                    data: cvData
                })
            } catch (e) {
                console.warn('Failed to migrate legacy CV', e)
            }
        }

        // Create default workspace structure
        const defaultWorkspace = {
            metadata: {
                id: crypto.randomUUID(),
                lastModified: Date.now()
            },
            cvs: {},
            coverLetters: {}
        }

        // Migrate CVs to nested structure
        oldCvs.forEach(cv => {
            const cvName = cv.name || 'Untitled CV'
            defaultWorkspace.cvs[cvName] = {
                id: cv.id || crypto.randomUUID(),
                lastModified: cv.lastModified || Date.now(),
                data: migrateCv(cv.data)
            }
        })

        // Migrate cover letters to nested structure
        oldCoverLetters.forEach(cl => {
            const clName = cl.name || 'Untitled Cover Letter'
            defaultWorkspace.coverLetters[clName] = {
                id: cl.id || crypto.randomUUID(),
                lastModified: cl.lastModified || Date.now(),
                data: cl.data
            }
        })

        // Create new workspaces structure
        const workspaces = {
            [DEFAULT_WORKSPACE_NAME]: defaultWorkspace
        }

        // Persist new structure
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces))

        // Keep old keys for potential rollback (will be cleaned in future version)
        // localStorage.removeItem('cvs-collection')
        // localStorage.removeItem('cover-letters-collection')
        // localStorage.removeItem('cv-data')

        return workspaces
    }

    /**
     * Initialize store with migration
     */
    const init = () => {
        workspaces.value = migrateToWorkspaceStructure()

        // Set default workspace if none selected
        if (!currentWorkspace.value) {
            const wsNames = Object.keys(workspaces.value)
            if (wsNames.length > 0) {
                currentWorkspace.value = wsNames[0]
            } else {
                // Create default workspace if none exist
                createWorkspace(DEFAULT_WORKSPACE_NAME)
                currentWorkspace.value = DEFAULT_WORKSPACE_NAME
            }
        }
    }

    /**
     * Persist workspaces to localStorage
     */
    const save = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces.value))
    }

    // Auto-save on changes
    watch(workspaces, save, { deep: true })

    /**
     * Create a new workspace
     */
    const createWorkspace = (name) => {
        if (workspaces.value[name]) {
            throw new Error('Workspace name already exists')
        }

        workspaces.value[name] = {
            metadata: {
                id: crypto.randomUUID(),
                lastModified: Date.now()
            },
            cvs: {},
            coverLetters: {},
            // AI context fields
            ...defaultWorkspaceContext()
        }

        return name
    }

    /**
     * Rename a workspace
     */
    const renameWorkspace = (oldName, newName) => {
        if (!workspaces.value[oldName]) {
            throw new Error('Workspace not found')
        }

        if (workspaces.value[newName]) {
            throw new Error('Workspace name already exists')
        }

        // Copy to new key
        workspaces.value[newName] = workspaces.value[oldName]
        workspaces.value[newName].metadata.lastModified = Date.now()

        // Delete old key
        delete workspaces.value[oldName]

        // Update current workspace if it was renamed
        if (currentWorkspace.value === oldName) {
            currentWorkspace.value = newName
        }

        return newName
    }

    /**
     * Duplicate a workspace
     */
    const duplicateWorkspace = (name) => {
        const original = workspaces.value[name]
        if (!original) {
            throw new Error('Workspace not found')
        }

        // Generate unique name
        let newName = `${name} (Copy)`
        let counter = 1
        while (workspaces.value[newName]) {
            counter++
            newName = `${name} (Copy ${counter})`
        }

        // Deep clone entire workspace
        const copy = JSON.parse(JSON.stringify(original))

        // Generate new IDs for workspace and all documents
        copy.metadata.id = crypto.randomUUID()
        copy.metadata.lastModified = Date.now()

        // Generate new IDs for all CVs (important for cvMeta independence)
        Object.keys(copy.cvs).forEach(cvName => {
            copy.cvs[cvName].id = crypto.randomUUID()
            copy.cvs[cvName].lastModified = Date.now()
        })

        // Generate new IDs for all cover letters
        Object.keys(copy.coverLetters).forEach(clName => {
            copy.coverLetters[clName].id = crypto.randomUUID()
            copy.coverLetters[clName].lastModified = Date.now()
        })

        workspaces.value[newName] = copy
        return newName
    }

    /**
     * Delete a workspace (cascade deletes all documents)
     */
    const deleteWorkspace = (name) => {
        const workspace = workspaces.value[name]
        if (!workspace) return

        // CASCADE DELETE: Clean up all CV metadata
        const cvMetaStore = useCvMetaStore()

        Object.values(workspace.cvs).forEach(cv => {
            cvMetaStore.deleteMeta(cv.id)
        })

        // Delete workspace
        delete workspaces.value[name]

        // If deleted current workspace, switch to first available
        if (currentWorkspace.value === name) {
            const wsNames = Object.keys(workspaces.value)
            currentWorkspace.value = wsNames.length > 0 ? wsNames[0] : null

            // If no workspaces left, create default
            if (!currentWorkspace.value) {
                createWorkspace(DEFAULT_WORKSPACE_NAME)
                currentWorkspace.value = DEFAULT_WORKSPACE_NAME
            }
        }
    }

    /**
     * Export workspace as JSON
     */
    const exportWorkspace = (name) => {
        const ws = workspaces.value[name]
        if (!ws) return null

        return {
            workspaceName: name,
            workspace: ws
        }
    }

    /**
     * Import workspace from JSON
     */
    const importWorkspace = (jsonContent, nameOverride = null) => {
        const parsed = JSON.parse(jsonContent)

        // Validate structure
        if (!parsed.workspace || !parsed.workspace.metadata) {
            throw new Error('Invalid workspace format')
        }

        let workspaceName = nameOverride || parsed.workspaceName || 'Imported Workspace'

        // Handle name collision
        if (workspaces.value[workspaceName]) {
            let counter = 1
            let newName = `${workspaceName} (${counter})`
            while (workspaces.value[newName]) {
                counter++
                newName = `${workspaceName} (${counter})`
            }
            workspaceName = newName
        }

        // Import workspace
        workspaces.value[workspaceName] = parsed.workspace
        workspaces.value[workspaceName].metadata.lastModified = Date.now()

        return workspaceName
    }

    /**
     * Set current workspace
     */
    const setCurrentWorkspace = (name) => {
        if (!workspaces.value[name]) {
            throw new Error('Workspace not found')
        }
        currentWorkspace.value = name
    }

    /**
     * Get list of all workspaces with metadata
     */
    const getWorkspaceList = () => {
        return Object.keys(workspaces.value).map(name => ({
            name,
            id: workspaces.value[name].metadata.id,
            lastModified: workspaces.value[name].metadata.lastModified,
            cvCount: Object.keys(workspaces.value[name].cvs).length,
            coverLetterCount: Object.keys(workspaces.value[name].coverLetters).length
        }))
    }

    /**
     * Get current workspace's CVs
     */
    const getCurrentCvs = computed(() => {
        if (!currentWorkspace.value || !workspaces.value[currentWorkspace.value]) {
            return {}
        }
        return workspaces.value[currentWorkspace.value].cvs || {}
    })

    /**
     * Get current workspace's cover letters
     */
    const getCurrentCoverLetters = computed(() => {
        if (!currentWorkspace.value || !workspaces.value[currentWorkspace.value]) {
            return {}
        }
        return workspaces.value[currentWorkspace.value].coverLetters || {}
    })

    // ========================================
    // AI Context Methods
    // ========================================

    /**
     * Get job analysis for current workspace
     */
    const getJobAnalysis = computed(() => {
        if (!currentWorkspace.value || !workspaces.value[currentWorkspace.value]) {
            return null
        }
        return workspaces.value[currentWorkspace.value].jobAnalysis || null
    })

    /**
     * Set job analysis for current workspace
     */
    const setJobAnalysis = (analysis) => {
        if (!currentWorkspace.value) return

        workspaces.value[currentWorkspace.value].jobAnalysis = {
            ...analysis,
            lastModified: Date.now(),
            createdAt: analysis.createdAt || Date.now()
        }
        workspaces.value[currentWorkspace.value].metadata.lastModified = Date.now()
    }

    /**
     * Update job analysis content
     */
    const updateJobAnalysis = (updates) => {
        if (!currentWorkspace.value) return

        const current = workspaces.value[currentWorkspace.value].jobAnalysis
        if (current) {
            workspaces.value[currentWorkspace.value].jobAnalysis = {
                ...current,
                ...updates,
                lastModified: Date.now()
            }
            workspaces.value[currentWorkspace.value].metadata.lastModified = Date.now()
        }
    }

    /**
     * Delete job analysis from current workspace
     */
    const deleteJobAnalysis = () => {
        if (!currentWorkspace.value) return
        workspaces.value[currentWorkspace.value].jobAnalysis = null
        workspaces.value[currentWorkspace.value].metadata.lastModified = Date.now()
    }

    /**
     * Get match report for current workspace
     */
    const getMatchReport = computed(() => {
        if (!currentWorkspace.value || !workspaces.value[currentWorkspace.value]) {
            return null
        }
        return workspaces.value[currentWorkspace.value].matchReport || null
    })

    /**
     * Set match report for current workspace
     */
    const setMatchReport = (report) => {
        if (!currentWorkspace.value) return

        workspaces.value[currentWorkspace.value].matchReport = {
            ...report,
            lastModified: Date.now(),
            createdAt: report.createdAt || Date.now()
        }
        workspaces.value[currentWorkspace.value].metadata.lastModified = Date.now()
    }

    /**
     * Update match report content
     */
    const updateMatchReport = (updates) => {
        if (!currentWorkspace.value) return

        const current = workspaces.value[currentWorkspace.value].matchReport
        if (current) {
            workspaces.value[currentWorkspace.value].matchReport = {
                ...current,
                ...updates,
                lastModified: Date.now()
            }
            workspaces.value[currentWorkspace.value].metadata.lastModified = Date.now()
        }
    }

    /**
     * Delete match report from current workspace
     */
    const deleteMatchReport = () => {
        if (!currentWorkspace.value) return
        workspaces.value[currentWorkspace.value].matchReport = null
        workspaces.value[currentWorkspace.value].metadata.lastModified = Date.now()
    }

    /**
     * Get company research for current workspace
     */
    const getCompanyResearch = computed(() => {
        if (!currentWorkspace.value || !workspaces.value[currentWorkspace.value]) {
            return null
        }
        return workspaces.value[currentWorkspace.value].companyResearch || null
    })

    /**
     * Set company research for current workspace
     */
    const setCompanyResearch = (research) => {
        if (!currentWorkspace.value) return

        workspaces.value[currentWorkspace.value].companyResearch = {
            ...research,
            lastModified: Date.now(),
            createdAt: research.createdAt || Date.now()
        }
        workspaces.value[currentWorkspace.value].metadata.lastModified = Date.now()
    }

    /**
     * Update company research content
     */
    const updateCompanyResearch = (updates) => {
        if (!currentWorkspace.value) return

        const current = workspaces.value[currentWorkspace.value].companyResearch
        if (current) {
            workspaces.value[currentWorkspace.value].companyResearch = {
                ...current,
                ...updates,
                lastModified: Date.now()
            }
            workspaces.value[currentWorkspace.value].metadata.lastModified = Date.now()
        }
    }

    /**
     * Delete company research from current workspace
     */
    const deleteCompanyResearch = () => {
        if (!currentWorkspace.value) return
        workspaces.value[currentWorkspace.value].companyResearch = null
        workspaces.value[currentWorkspace.value].metadata.lastModified = Date.now()
    }

    /**
     * Check if workspace has AI context (any of the three)
     */
    const hasAiContext = computed(() => {
        if (!currentWorkspace.value || !workspaces.value[currentWorkspace.value]) {
            return false
        }
        const ws = workspaces.value[currentWorkspace.value]
        return !!(ws.jobAnalysis || ws.matchReport || ws.companyResearch)
    })

    /**
     * Get all AI context for current workspace (for AI command assembly)
     */
    const getAiContext = computed(() => {
        if (!currentWorkspace.value || !workspaces.value[currentWorkspace.value]) {
            return { jobAnalysis: null, matchReport: null, companyResearch: null }
        }
        const ws = workspaces.value[currentWorkspace.value]
        return {
            jobAnalysis: ws.jobAnalysis || null,
            matchReport: ws.matchReport || null,
            companyResearch: ws.companyResearch || null
        }
    })

    // Initialize on store creation
    init()

    return {
        workspaces,
        currentWorkspace,
        createWorkspace,
        renameWorkspace,
        duplicateWorkspace,
        deleteWorkspace,
        exportWorkspace,
        importWorkspace,
        setCurrentWorkspace,
        getWorkspaceList,
        getCurrentCvs,
        getCurrentCoverLetters,
        // AI Context methods
        getJobAnalysis,
        setJobAnalysis,
        updateJobAnalysis,
        deleteJobAnalysis,
        getMatchReport,
        setMatchReport,
        updateMatchReport,
        deleteMatchReport,
        getCompanyResearch,
        setCompanyResearch,
        updateCompanyResearch,
        deleteCompanyResearch,
        hasAiContext,
        getAiContext,
        save
    }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWorkspaceStore } from './workspace'

export const useCoverLetterStore = defineStore('coverLetter', () => {
    const workspaceStore = useWorkspaceStore()

    const getNewCoverLetterTemplate = () => ({
        applicantAddress: '',
        companyAddress: '',
        date: new Date().toISOString().split('T')[0],
        title: '',
        subtitle: '',
        body: '',
        signatureImage: '',
        signatureName: ''
    })

    const currentCoverLetterName = ref(null)

    // Computed to get current workspace's cover letters
    const coverLetters = computed(() => {
        return workspaceStore.getCurrentCoverLetters
    })

    // Computed current Cover Letter data
    const coverLetter = computed(() => {
        if (!currentCoverLetterName.value) return null
        const clDoc = coverLetters.value[currentCoverLetterName.value]
        return clDoc ? clDoc.data : null
    })

    const isNameTaken = (name) => {
        return name in coverLetters.value
    }

    const createCoverLetter = (name) => {
        const currentWs = workspaceStore.currentWorkspace
        if (!currentWs) {
            throw new Error('No workspace selected')
        }

        if (isNameTaken(name)) {
            throw new Error('Name already exists')
        }

        const newCl = {
            id: crypto.randomUUID(),
            lastModified: Date.now(),
            data: getNewCoverLetterTemplate()
        }

        workspaceStore.workspaces[currentWs].coverLetters[name] = newCl
        workspaceStore.workspaces[currentWs].metadata.lastModified = Date.now()
        workspaceStore.save()
        currentCoverLetterName.value = name
    }

    const deleteCoverLetter = (name) => {
        const currentWs = workspaceStore.currentWorkspace
        if (!currentWs || !workspaceStore.workspaces[currentWs]) return

        if (workspaceStore.workspaces[currentWs].coverLetters[name]) {
            delete workspaceStore.workspaces[currentWs].coverLetters[name]
            workspaceStore.workspaces[currentWs].metadata.lastModified = Date.now()
            workspaceStore.save()

            if (currentCoverLetterName.value === name) {
                currentCoverLetterName.value = null
            }
        }
    }

    const duplicateCoverLetter = (name) => {
        const currentWs = workspaceStore.currentWorkspace
        if (!currentWs) return

        const original = coverLetters.value[name]
        if (original) {
            let newName = `${name} (Copy)`
            let counter = 1
            while (isNameTaken(newName)) {
                counter++
                newName = `${name} (Copy ${counter})`
            }

            const newId = crypto.randomUUID()
            const copy = JSON.parse(JSON.stringify(original))
            copy.id = newId
            copy.lastModified = Date.now()

            workspaceStore.workspaces[currentWs].coverLetters[newName] = copy
            workspaceStore.workspaces[currentWs].metadata.lastModified = Date.now()
            workspaceStore.save()
        }
    }

    const setCurrentCoverLetter = (name) => {
        currentCoverLetterName.value = name
    }

    const updateCoverLetterName = (oldName, newName) => {
        const currentWs = workspaceStore.currentWorkspace
        if (!currentWs || !workspaceStore.workspaces[currentWs]) return

        if (oldName === newName) return
        if (isNameTaken(newName)) {
            throw new Error('Cover Letter name already exists')
        }

        const clDoc = workspaceStore.workspaces[currentWs].coverLetters[oldName]
        if (clDoc) {
            // Copy to new key
            workspaceStore.workspaces[currentWs].coverLetters[newName] = clDoc
            clDoc.lastModified = Date.now()

            // Delete old key
            delete workspaceStore.workspaces[currentWs].coverLetters[oldName]

            workspaceStore.workspaces[currentWs].metadata.lastModified = Date.now()
            workspaceStore.save()

            // Also update current if we are editing it
            if (currentCoverLetterName.value === oldName) {
                currentCoverLetterName.value = newName
            }
        }
    }

    const importCoverLetter = (jsonContent, name) => {
        const currentWs = workspaceStore.currentWorkspace
        if (!currentWs) {
            throw new Error('No workspace selected')
        }

        if (isNameTaken(name)) {
            throw new Error('Name already exists')
        }

        try {
            const parsed = JSON.parse(jsonContent)
            // Handle both full export (with name/data wrapper) and raw data
            let dataToImport = parsed
            if (parsed.data) {
                dataToImport = parsed.data
            }

            // Validate essential fields or just fallback to default structure
            const template = getNewCoverLetterTemplate()
            // simple merge, deeper merge might be better but this should suffice for structure
            const mergedData = { ...template, ...dataToImport }

            const newCl = {
                id: crypto.randomUUID(),
                lastModified: Date.now(),
                data: mergedData
            }

            workspaceStore.workspaces[currentWs].coverLetters[name] = newCl
            workspaceStore.workspaces[currentWs].metadata.lastModified = Date.now()
            workspaceStore.save()
            currentCoverLetterName.value = name
        } catch (e) {
            console.error(e)
            throw new Error('Invalid JSON file')
        }
    }

    const exportCoverLetter = (name) => {
        const clDoc = coverLetters.value[name]
        if (!clDoc) return null

        // Export only name + data (NOT id, lastModified, or workspace info)
        return { name, data: clDoc.data }
    }

    return {
        coverLetters,
        currentCoverLetterName,
        coverLetter,
        createCoverLetter,
        deleteCoverLetter,
        duplicateCoverLetter,
        setCurrentCoverLetter,
        updateCoverLetterName,
        isNameTaken,
        importCoverLetter,
        exportCoverLetter
    }
})

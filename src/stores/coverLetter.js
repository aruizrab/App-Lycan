import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useCoverLetterStore = defineStore('coverLetter', () => {

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

    // Initialize State
    const savedCoverLetters = localStorage.getItem('cover-letters-collection')
    let initialCoverLetters = []

    if (savedCoverLetters) {
        initialCoverLetters = JSON.parse(savedCoverLetters)
    }

    const coverLetters = ref(initialCoverLetters)
    const currentCoverLetterName = ref(null)

    // Computed current Cover Letter data
    const coverLetter = computed(() => {
        if (!currentCoverLetterName.value) return null
        const found = coverLetters.value.find(c => c.name === currentCoverLetterName.value)
        return found ? found.data : null
    })

    // Persistence
    watch(coverLetters, (newVal) => {
        localStorage.setItem('cover-letters-collection', JSON.stringify(newVal))
    }, { deep: true })

    const isNameTaken = (name) => {
        return coverLetters.value.some(c => c.name === name)
    }

    const createCoverLetter = (name) => {
        if (isNameTaken(name)) {
            throw new Error('Name already exists')
        }
        coverLetters.value.push({
            id: crypto.randomUUID(),
            name,
            lastModified: Date.now(),
            data: getNewCoverLetterTemplate()
        })
        currentCoverLetterName.value = name
    }

    const deleteCoverLetter = (name) => {
        const index = coverLetters.value.findIndex(c => c.name === name)
        if (index !== -1) {
            coverLetters.value.splice(index, 1)
            if (currentCoverLetterName.value === name) {
                currentCoverLetterName.value = null
            }
        }
    }

    const duplicateCoverLetter = (name) => {
        const original = coverLetters.value.find(c => c.name === name)
        if (original) {
            let newName = `${original.name} (Copy)`
            let counter = 1
            while (isNameTaken(newName)) {
                counter++
                newName = `${original.name} (Copy ${counter})`
            }

            const newId = crypto.randomUUID()
            const copy = JSON.parse(JSON.stringify(original))
            copy.id = newId
            copy.name = newName
            copy.lastModified = Date.now()
            coverLetters.value.push(copy)
        }
    }

    const setCurrentCoverLetter = (name) => {
        currentCoverLetterName.value = name
    }

    const updateCoverLetterName = (oldName, newName) => {
        if (oldName === newName) return
        if (isNameTaken(newName)) {
            throw new Error('Cover Letter name already exists')
        }

        const found = coverLetters.value.find(c => c.name === oldName)
        if (found) {
            found.name = newName
            found.lastModified = Date.now()
            // Also update current if we are editing it
            if (currentCoverLetterName.value === oldName) {
                currentCoverLetterName.value = newName
            }
        }
    }

    const importCoverLetter = (jsonContent, name) => {
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

            coverLetters.value.push({
                id: crypto.randomUUID(),
                name,
                lastModified: Date.now(),
                data: mergedData
            })
            currentCoverLetterName.value = name
        } catch (e) {
            console.error(e)
            throw new Error('Invalid JSON file')
        }
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
        importCoverLetter
    }
})

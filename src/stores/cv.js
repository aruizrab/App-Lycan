import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useCvMetaStore } from './cvMeta'

export const useCvStore = defineStore('cv', () => {
  const metaStore = useCvMetaStore()

  const getNewCvTemplate = () => ({
    personalInfo: {
      name: '',
      role: '',
      picture: '',
      aboutMe: '',
      aboutMeTitle: 'About Me',
      contact: [
        { id: 'email', type: 'email', value: '', label: 'Email', icon: 'mail' },
        { id: 'phone', type: 'phone', value: '', label: 'Phone', icon: 'phone' }
      ]
    },
    sections: [
      { id: 'experience', title: 'Experience', type: 'experience', items: [], visible: true },
      { id: 'projects', title: 'Projects', type: 'projects', items: [], visible: true },
      { id: 'education', title: 'Education', type: 'education', items: [], visible: true },
      { id: 'skills', title: 'Skills', type: 'skills', items: [], visible: true },
      { id: 'languages', title: 'Languages', type: 'languages', items: [], visible: true },
      { id: 'certifications', title: 'Certifications', type: 'certifications', items: [], visible: true }
    ]
  })

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

  // Initialize State
  const savedCvs = localStorage.getItem('cvs-collection')
  const savedOldCv = localStorage.getItem('cv-data')

  let initialCvs = []

  if (savedCvs) {
    initialCvs = JSON.parse(savedCvs)
  } else if (savedOldCv) {
    // Migration from single CV mode
    const oldCv = JSON.parse(savedOldCv)
    const migrated = migrateCv(oldCv)
    initialCvs = [{
      id: crypto.randomUUID(),
      name: migrated.personalInfo.name || 'My CV',
      lastModified: Date.now(),
      data: migrated
    }]
  }

  const cvs = ref(initialCvs)
  const currentCvName = ref(null)

  // Computed current CV data
  const cv = computed(() => {
    if (!currentCvName.value) return null
    const found = cvs.value.find(c => c.name === currentCvName.value)
    return found ? found.data : null
  })

  const currentCvId = computed(() => {
    if (!currentCvName.value) return null
    const found = cvs.value.find(c => c.name === currentCvName.value)
    return found ? found.id : null
  })

  // Undo/Redo History
  const saveSnapshot = () => {
    if (cv.value && currentCvId.value) {
      metaStore.saveSnapshot(currentCvId.value, cv.value)
    }
  }

  const undo = () => {
    if (!currentCvId.value) return
    const previous = metaStore.getUndoState(currentCvId.value)
    if (previous) {
      metaStore.pushToFuture(currentCvId.value, cv.value)

      // Apply previous state
      const found = cvs.value.find(c => c.name === currentCvName.value)
      if (found) {
        found.data = previous
      }
    }
  }

  const redo = () => {
    if (!currentCvId.value) return
    const next = metaStore.getRedoState(currentCvId.value)
    if (next) {
      metaStore.pushToPast(currentCvId.value, cv.value)

      // Apply next state
      const found = cvs.value.find(c => c.name === currentCvName.value)
      if (found) {
        found.data = next
      }
    }
  }

  const applyAiChanges = (newCvData) => {
    saveSnapshot()
    const found = cvs.value.find(c => c.name === currentCvName.value)
    if (found) {
      found.data = newCvData
    }
  }

  const canUndo = computed(() => {
    if (!currentCvId.value) return false
    return metaStore.hasUndo(currentCvId.value)
  })

  const canRedo = computed(() => {
    if (!currentCvId.value) return false
    return metaStore.hasRedo(currentCvId.value)
  })

  // Persistence
  watch(cvs, (newVal) => {
    localStorage.setItem('cvs-collection', JSON.stringify(newVal))
  }, { deep: true })

  const isNameTaken = (name) => {
    return cvs.value.some(c => c.name.toLowerCase() === name.toLowerCase())
  }

  // Actions
  const createCv = (name) => {
    if (isNameTaken(name)) {
      throw new Error('CV name already exists')
    }
    const newId = crypto.randomUUID()
    const newCv = {
      id: newId,
      name: name,
      lastModified: Date.now(),
      data: getNewCvTemplate()
    }
    // Set the name in the personal info as well
    newCv.data.personalInfo.name = name

    cvs.value.push(newCv)
    return name
  }

  const deleteCv = (name) => {
    const index = cvs.value.findIndex(c => c.name === name)
    if (index !== -1) {
      const id = cvs.value[index].id
      metaStore.deleteMeta(id)
      cvs.value.splice(index, 1)
    }
  }

  const duplicateCv = (name) => {
    const original = cvs.value.find(c => c.name === name)
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
      cvs.value.push(copy)
    }
  }

  const importCv = (fileContent, name) => {
    if (isNameTaken(name)) {
      throw new Error('CV name already exists')
    }

    try {
      const parsed = JSON.parse(fileContent)
      // Check if it's a full CV object (with meta) or just data
      let newCvData = parsed

      // If imported file is just the data part (from previous export)
      if (parsed.personalInfo && parsed.sections) {
        newCvData = migrateCv(parsed)
      } else if (parsed.data && parsed.name) {
        // If it's the new format
        newCvData = migrateCv(parsed.data)
      }

      const newId = crypto.randomUUID()
      cvs.value.push({
        id: newId,
        name: name,
        lastModified: Date.now(),
        data: newCvData
      })
    } catch (e) {
      console.error('Import failed', e)
      throw e
    }
  }

  const setCurrentCv = (name) => {
    currentCvName.value = name
  }

  const updateCvName = (oldName, newName) => {
    if (oldName === newName) return
    if (isNameTaken(newName)) {
      throw new Error('CV name already exists')
    }

    const found = cvs.value.find(c => c.name === oldName)
    if (found) {
      found.name = newName
      found.lastModified = Date.now()
      // Also update current if we are editing it
      if (currentCvName.value === oldName) {
        currentCvName.value = newName
      }
    }
  }

  // Helper methods for the form (operating on current CV)
  const addContactField = () => {
    if (cv.value) {
      saveSnapshot()
      cv.value.personalInfo.contact.push({
        id: Date.now().toString(),
        type: 'url',
        value: '',
        label: 'Link',
        icon: 'globe'
      })
    }
  }

  const removeContactField = (index) => {
    if (cv.value) {
      saveSnapshot()
      cv.value.personalInfo.contact.splice(index, 1)
    }
  }

  const addSectionItem = (sectionId) => {
    if (!cv.value) return
    saveSnapshot()
    const section = cv.value.sections.find(s => s.id === sectionId)
    if (section) {
      if (section.type === 'skills') {
        section.items.push({
          id: Date.now().toString(),
          title: '',
          content: ''
        })
      } else if (section.type === 'languages') {
        section.items.push({
          id: Date.now().toString(),
          language: '',
          level: ''
        })
      } else {
        section.items.push({
          id: Date.now().toString(),
          title: '',
          subtitle: '',
          location: '',
          startDate: '',
          endDate: '',
          isCurrent: false,
          description: '',
          link: '',
          skills: '',
          skillsLabel: 'Technologies'
        })
      }
    }
  }

  const removeSectionItem = (sectionId, index) => {
    if (!cv.value) return
    saveSnapshot()
    const section = cv.value.sections.find(s => s.id === sectionId)
    if (section) {
      section.items.splice(index, 1)
    }
  }

  return {
    cvs,
    currentCvName,
    cv,
    isNameTaken,
    createCv,
    deleteCv,
    duplicateCv,
    importCv,
    setCurrentCv,
    updateCvName,
    addContactField,
    removeContactField,
    addSectionItem,
    removeSectionItem,
    undo,
    redo,
    applyAiChanges,
    currentCvId,
    canUndo,
    canRedo
  }
})

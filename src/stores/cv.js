import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCvMetaStore } from './cvMeta'
import { useWorkspaceStore } from './workspace'

export const useCvStore = defineStore('cv', () => {
  const metaStore = useCvMetaStore()
  const workspaceStore = useWorkspaceStore()

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

  const currentCvName = ref(null)

  // Computed to get current workspace's CVs
  const cvs = computed(() => {
    return workspaceStore.getCurrentCvs
  })

  // Computed current CV data
  const cv = computed(() => {
    if (!currentCvName.value) return null
    const currentCvs = cvs.value
    const cvDoc = currentCvs[currentCvName.value]
    return cvDoc ? cvDoc.data : null
  })

  const currentCvId = computed(() => {
    if (!currentCvName.value) return null
    const currentCvs = cvs.value
    const cvDoc = currentCvs[currentCvName.value]
    return cvDoc ? cvDoc.id : null
  })

  // Undo/Redo History
  const saveSnapshot = () => {
    if (cv.value && currentCvId.value) {
      metaStore.saveSnapshot(currentCvId.value, cv.value)
    }
  }

  const undo = () => {
    if (!currentCvId.value || !currentCvName.value) return
    const previous = metaStore.getUndoState(currentCvId.value)
    if (previous) {
      metaStore.pushToFuture(currentCvId.value, cv.value)

      // Apply previous state
      const currentWs = workspaceStore.currentWorkspace
      if (currentWs && workspaceStore.workspaces[currentWs]) {
        workspaceStore.workspaces[currentWs].cvs[currentCvName.value].data = previous
        workspaceStore.workspaces[currentWs].cvs[currentCvName.value].lastModified = Date.now()
      }
    }
  }

  const redo = () => {
    if (!currentCvId.value || !currentCvName.value) return
    const next = metaStore.getRedoState(currentCvId.value)
    if (next) {
      metaStore.pushToPast(currentCvId.value, cv.value)

      // Apply next state
      const currentWs = workspaceStore.currentWorkspace
      if (currentWs && workspaceStore.workspaces[currentWs]) {
        workspaceStore.workspaces[currentWs].cvs[currentCvName.value].data = next
        workspaceStore.workspaces[currentWs].cvs[currentCvName.value].lastModified = Date.now()
      }
    }
  }

  const applyAiChanges = (newCvData) => {
    if (!currentCvName.value) return
    saveSnapshot()
    const currentWs = workspaceStore.currentWorkspace
    if (currentWs && workspaceStore.workspaces[currentWs]) {
      workspaceStore.workspaces[currentWs].cvs[currentCvName.value].data = newCvData
      workspaceStore.workspaces[currentWs].cvs[currentCvName.value].lastModified = Date.now()
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

  const isNameTaken = (name) => {
    return name in cvs.value
  }

  // Actions
  const createCv = (name) => {
    const currentWs = workspaceStore.currentWorkspace
    if (!currentWs) {
      throw new Error('No workspace selected')
    }

    if (isNameTaken(name)) {
      throw new Error('CV name already exists')
    }

    const newId = crypto.randomUUID()
    const newCvData = getNewCvTemplate()
    newCvData.personalInfo.name = name

    const newCv = {
      id: newId,
      lastModified: Date.now(),
      data: newCvData
    }

    // Update nested structure
    workspaceStore.workspaces[currentWs].cvs[name] = newCv
    workspaceStore.workspaces[currentWs].metadata.lastModified = Date.now()
    workspaceStore.save()

    return name
  }

  const deleteCv = (name) => {
    const currentWs = workspaceStore.currentWorkspace
    if (!currentWs || !workspaceStore.workspaces[currentWs]) return

    const cvDoc = workspaceStore.workspaces[currentWs].cvs[name]
    if (cvDoc) {
      // Delete metadata
      metaStore.deleteMeta(cvDoc.id)
      // Delete from workspace
      delete workspaceStore.workspaces[currentWs].cvs[name]
      workspaceStore.workspaces[currentWs].metadata.lastModified = Date.now()
      workspaceStore.save()
    }
  }

  const duplicateCv = (name) => {
    const currentWs = workspaceStore.currentWorkspace
    if (!currentWs) return

    const original = cvs.value[name]
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

      workspaceStore.workspaces[currentWs].cvs[newName] = copy
      workspaceStore.workspaces[currentWs].metadata.lastModified = Date.now()
      workspaceStore.save()
    }
  }

  const importCv = (fileContent, name) => {
    const currentWs = workspaceStore.currentWorkspace
    if (!currentWs) {
      throw new Error('No workspace selected')
    }

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
      const newCv = {
        id: newId,
        lastModified: Date.now(),
        data: newCvData
      }

      workspaceStore.workspaces[currentWs].cvs[name] = newCv
      workspaceStore.workspaces[currentWs].metadata.lastModified = Date.now()
      workspaceStore.save()
    } catch (e) {
      console.error('Import failed', e)
      throw e
    }
  }

  const setCurrentCv = (name) => {
    currentCvName.value = name
  }

  const updateCvName = (oldName, newName) => {
    const currentWs = workspaceStore.currentWorkspace
    if (!currentWs || !workspaceStore.workspaces[currentWs]) return

    if (oldName === newName) return
    if (isNameTaken(newName)) {
      throw new Error('CV name already exists')
    }

    const cvDoc = workspaceStore.workspaces[currentWs].cvs[oldName]
    if (cvDoc) {
      // Copy to new key
      workspaceStore.workspaces[currentWs].cvs[newName] = cvDoc
      cvDoc.lastModified = Date.now()

      // Delete old key
      delete workspaceStore.workspaces[currentWs].cvs[oldName]

      workspaceStore.workspaces[currentWs].metadata.lastModified = Date.now()
      workspaceStore.save()

      // Update current if we are editing it
      if (currentCvName.value === oldName) {
        currentCvName.value = newName
      }
    }
  }

  const exportCv = (name) => {
    const cvDoc = cvs.value[name]
    if (!cvDoc) return null

    // Export only name + data (NOT id, lastModified, or workspace info)
    return { name, data: cvDoc.data }
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
    exportCv,
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

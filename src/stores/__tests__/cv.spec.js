import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCvStore } from '../cv'
import { useWorkspaceStore } from '../workspace'
import { useCvMetaStore } from '../cvMeta'
import { createCvDocument, createCvData } from '../../test/factories'

describe('cv store', () => {
  let cvStore
  let workspaceStore
  let metaStore

  beforeEach(() => {
    // workspace store must be initialized first (creates default workspace)
    workspaceStore = useWorkspaceStore()
    metaStore = useCvMetaStore()
    cvStore = useCvStore()
  })

  describe('initial state', () => {
    it('has no current CV selected', () => {
      expect(cvStore.currentCvName).toBeNull()
      expect(cvStore.cv).toBeNull()
    })

    it('returns empty CVs for default workspace', () => {
      expect(Object.keys(cvStore.cvs)).toHaveLength(0)
    })
  })

  describe('createCv', () => {
    it('creates a new CV in current workspace', () => {
      cvStore.createCv('My CV')
      expect(cvStore.cvs['My CV']).toBeDefined()
      expect(cvStore.cvs['My CV'].data.personalInfo.name).toBe('My CV')
    })

    it('returns the CV name', () => {
      const name = cvStore.createCv('Test CV')
      expect(name).toBe('Test CV')
    })

    it('creates CV with correct template structure', () => {
      cvStore.createCv('Template CV')
      const cv = cvStore.cvs['Template CV'].data

      expect(cv.personalInfo).toBeDefined()
      expect(cv.personalInfo.aboutMeTitle).toBe('About Me')
      expect(cv.sections).toHaveLength(6)
      expect(cv.sections.map(s => s.type)).toEqual([
        'experience', 'projects', 'education', 'skills', 'languages', 'certifications'
      ])
    })

    it('assigns a unique ID', () => {
      cvStore.createCv('CV 1')
      cvStore.createCv('CV 2')
      expect(cvStore.cvs['CV 1'].id).not.toBe(cvStore.cvs['CV 2'].id)
    })

    it('throws when name already exists', () => {
      cvStore.createCv('Duplicate')
      expect(() => cvStore.createCv('Duplicate')).toThrow('CV name already exists')
    })

    it('throws when no workspace selected', () => {
      workspaceStore.currentWorkspace = null
      expect(() => cvStore.createCv('Test')).toThrow('No workspace selected')
    })

    it('updates workspace lastModified', () => {
      const before = workspaceStore.workspaces['My Workspace'].metadata.lastModified
      cvStore.createCv('New CV')
      expect(workspaceStore.workspaces['My Workspace'].metadata.lastModified).toBeGreaterThanOrEqual(before)
    })
  })

  describe('setCurrentCv', () => {
    it('sets the current CV', () => {
      cvStore.createCv('Active CV')
      cvStore.setCurrentCv('Active CV')
      expect(cvStore.currentCvName).toBe('Active CV')
      expect(cvStore.cv).not.toBeNull()
    })

    it('cv computed returns null for non-existent CV name', () => {
      cvStore.setCurrentCv('NonExistent')
      expect(cvStore.cv).toBeNull()
    })
  })

  describe('currentCvId', () => {
    it('returns null when no CV selected', () => {
      expect(cvStore.currentCvId).toBeNull()
    })

    it('returns the CV id when selected', () => {
      cvStore.createCv('Test CV')
      cvStore.setCurrentCv('Test CV')
      expect(cvStore.currentCvId).toBeDefined()
      expect(cvStore.currentCvId).toBe(cvStore.cvs['Test CV'].id)
    })
  })

  describe('deleteCv', () => {
    it('deletes a CV from the workspace', () => {
      cvStore.createCv('To Delete')
      cvStore.deleteCv('To Delete')
      expect(cvStore.cvs['To Delete']).toBeUndefined()
    })

    it('cleans up CV metadata on delete', () => {
      cvStore.createCv('Meta CV')
      const cvId = cvStore.cvs['Meta CV'].id
      metaStore.createChat(cvId, 'Chat')

      cvStore.deleteCv('Meta CV')
      expect(metaStore.getChats(cvId)).toEqual([])
    })

    it('does nothing for non-existent CV', () => {
      cvStore.createCv('Existing')
      cvStore.deleteCv('NonExistent')
      expect(cvStore.cvs['Existing']).toBeDefined()
    })
  })

  describe('duplicateCv', () => {
    it('creates a copy with " (Copy)" suffix', () => {
      cvStore.createCv('Original')
      cvStore.duplicateCv('Original')
      expect(cvStore.cvs['Original (Copy)']).toBeDefined()
    })

    it('increments copy number on repeated duplicate', () => {
      cvStore.createCv('Original')
      cvStore.duplicateCv('Original')
      cvStore.duplicateCv('Original')
      expect(cvStore.cvs['Original (Copy 2)']).toBeDefined()
    })

    it('generates a new ID for the copy', () => {
      cvStore.createCv('Original')
      cvStore.duplicateCv('Original')
      expect(cvStore.cvs['Original'].id).not.toBe(cvStore.cvs['Original (Copy)'].id)
    })
  })

  describe('updateCvName', () => {
    it('renames a CV', () => {
      cvStore.createCv('Old Name')
      cvStore.updateCvName('Old Name', 'New Name')
      expect(cvStore.cvs['Old Name']).toBeUndefined()
      expect(cvStore.cvs['New Name']).toBeDefined()
    })

    it('updates currentCvName if renamed CV is current', () => {
      cvStore.createCv('Current')
      cvStore.setCurrentCv('Current')
      cvStore.updateCvName('Current', 'Renamed')
      expect(cvStore.currentCvName).toBe('Renamed')
    })

    it('does nothing when old and new name are the same', () => {
      cvStore.createCv('Same')
      cvStore.updateCvName('Same', 'Same')
      expect(cvStore.cvs['Same']).toBeDefined()
    })

    it('throws when new name already taken', () => {
      cvStore.createCv('Name1')
      cvStore.createCv('Name2')
      expect(() => cvStore.updateCvName('Name1', 'Name2')).toThrow('CV name already exists')
    })
  })

  describe('isNameTaken', () => {
    it('returns true for existing name', () => {
      cvStore.createCv('Taken')
      expect(cvStore.isNameTaken('Taken')).toBe(true)
    })

    it('returns false for non-existing name', () => {
      expect(cvStore.isNameTaken('Available')).toBe(false)
    })
  })

  describe('importCv', () => {
    it('imports CV from JSON (data-only format)', () => {
      const cvData = createCvData({ personalInfo: { name: 'Imported' } })
      cvStore.importCv(JSON.stringify(cvData), 'Imported CV')
      expect(cvStore.cvs['Imported CV']).toBeDefined()
    })

    it('imports CV from JSON (wrapped format with name/data)', () => {
      const wrapped = { name: 'Exported', data: createCvData() }
      cvStore.importCv(JSON.stringify(wrapped), 'Wrapped Import')
      expect(cvStore.cvs['Wrapped Import']).toBeDefined()
    })

    it('throws when name already exists', () => {
      cvStore.createCv('Existing')
      const cvData = createCvData()
      expect(() => cvStore.importCv(JSON.stringify(cvData), 'Existing'))
        .toThrow('CV name already exists')
    })

    it('throws when no workspace selected', () => {
      workspaceStore.currentWorkspace = null
      expect(() => cvStore.importCv('{}', 'Test'))
        .toThrow('No workspace selected')
    })

    it('throws on invalid JSON', () => {
      expect(() => cvStore.importCv('not json', 'Test')).toThrow()
    })
  })

  describe('exportCv', () => {
    it('exports CV data', () => {
      cvStore.createCv('To Export')
      const exported = cvStore.exportCv('To Export')
      expect(exported).not.toBeNull()
      expect(exported.name).toBe('To Export')
      expect(exported.data).toBeDefined()
    })

    it('returns null for non-existent CV', () => {
      expect(cvStore.exportCv('NonExistent')).toBeNull()
    })
  })

  describe('section item management', () => {
    beforeEach(() => {
      cvStore.createCv('Edit CV')
      cvStore.setCurrentCv('Edit CV')
    })

    it('adds a contact field', () => {
      const before = cvStore.cv.personalInfo.contact.length
      cvStore.addContactField()
      expect(cvStore.cv.personalInfo.contact).toHaveLength(before + 1)
      expect(cvStore.cv.personalInfo.contact.at(-1).type).toBe('url')
    })

    it('removes a contact field', () => {
      cvStore.removeContactField(0)
      expect(cvStore.cv.personalInfo.contact).toHaveLength(1) // started with 2
    })

    it('adds an experience item', () => {
      cvStore.addSectionItem('experience')
      const section = cvStore.cv.sections.find(s => s.id === 'experience')
      expect(section.items).toHaveLength(1)
      expect(section.items[0].title).toBe('')
      expect(section.items[0].startDate).toBe('')
    })

    it('adds a skills item', () => {
      cvStore.addSectionItem('skills')
      const section = cvStore.cv.sections.find(s => s.id === 'skills')
      expect(section.items).toHaveLength(1)
      expect(section.items[0]).toHaveProperty('content')
    })

    it('adds a languages item', () => {
      cvStore.addSectionItem('languages')
      const section = cvStore.cv.sections.find(s => s.id === 'languages')
      expect(section.items).toHaveLength(1)
      expect(section.items[0]).toHaveProperty('language')
      expect(section.items[0]).toHaveProperty('level')
    })

    it('removes a section item', () => {
      cvStore.addSectionItem('experience')
      cvStore.addSectionItem('experience')
      cvStore.removeSectionItem('experience', 0)
      const section = cvStore.cv.sections.find(s => s.id === 'experience')
      expect(section.items).toHaveLength(1)
    })

    it('does nothing when no CV is selected', () => {
      cvStore.setCurrentCv(null)
      cvStore.addContactField() // should not throw
      cvStore.removeContactField(0) // should not throw
      cvStore.addSectionItem('experience') // should not throw
      cvStore.removeSectionItem('experience', 0) // should not throw
    })
  })

  describe('undo/redo', () => {
    beforeEach(() => {
      cvStore.createCv('Undo CV')
      cvStore.setCurrentCv('Undo CV')
    })

    it('canUndo is false initially', () => {
      expect(cvStore.canUndo).toBe(false)
    })

    it('canRedo is false initially', () => {
      expect(cvStore.canRedo).toBe(false)
    })

    it('saves snapshot before section operations', () => {
      cvStore.addContactField()
      expect(cvStore.canUndo).toBe(true)
    })

    it('undo restores previous state', () => {
      const originalName = cvStore.cv.personalInfo.name
      cvStore.addContactField() // saves snapshot before adding
      const contactsAfterAdd = cvStore.cv.personalInfo.contact.length

      cvStore.undo()
      expect(cvStore.cv.personalInfo.contact.length).toBe(contactsAfterAdd - 1)
    })

    it('redo restores undone state', () => {
      cvStore.addContactField()
      const contactsAfterAdd = cvStore.cv.personalInfo.contact.length

      cvStore.undo()
      cvStore.redo()
      expect(cvStore.cv.personalInfo.contact.length).toBe(contactsAfterAdd)
    })
  })

  describe('applyAiChanges', () => {
    it('replaces CV data with new data', () => {
      cvStore.createCv('AI CV')
      cvStore.setCurrentCv('AI CV')

      const newData = createCvData({ personalInfo: { name: 'AI Generated' } })
      cvStore.applyAiChanges(newData)

      expect(cvStore.cv.personalInfo.name).toBe('AI Generated')
    })

    it('saves snapshot before applying changes', () => {
      cvStore.createCv('AI CV')
      cvStore.setCurrentCv('AI CV')

      const newData = createCvData({ personalInfo: { name: 'AI Generated' } })
      cvStore.applyAiChanges(newData)

      expect(cvStore.canUndo).toBe(true)
    })

    it('does nothing when no CV selected', () => {
      cvStore.applyAiChanges(createCvData())
      // Should not throw
    })
  })
})

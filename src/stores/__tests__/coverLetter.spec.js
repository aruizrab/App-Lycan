import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCoverLetterStore } from '../coverLetter'
import { useWorkspaceStore } from '../workspace'
import { createCoverLetterData, createCoverLetterDocument } from '../../test/factories'

describe('coverLetter store', () => {
  let clStore
  let workspaceStore

  beforeEach(() => {
    workspaceStore = useWorkspaceStore()
    clStore = useCoverLetterStore()
  })

  describe('initial state', () => {
    it('has no current cover letter selected', () => {
      expect(clStore.currentCoverLetterName).toBeNull()
      expect(clStore.coverLetter).toBeNull()
    })

    it('returns empty cover letters for default workspace', () => {
      expect(Object.keys(clStore.coverLetters)).toHaveLength(0)
    })
  })

  describe('createCoverLetter', () => {
    it('creates a new cover letter in current workspace', () => {
      clStore.createCoverLetter('My CL')
      expect(clStore.coverLetters['My CL']).toBeDefined()
    })

    it('sets the created cover letter as current', () => {
      clStore.createCoverLetter('Auto Selected')
      expect(clStore.currentCoverLetterName).toBe('Auto Selected')
    })

    it('creates with default template structure', () => {
      clStore.createCoverLetter('Template CL')
      const cl = clStore.coverLetters['Template CL'].data

      expect(cl.applicantAddress).toBe('')
      expect(cl.companyAddress).toBe('')
      expect(cl.title).toBe('')
      expect(cl.body).toBe('')
      expect(cl.signatureName).toBe('')
      expect(cl.date).toBeDefined() // ISO date string
    })

    it('throws when name already exists', () => {
      clStore.createCoverLetter('Duplicate')
      expect(() => clStore.createCoverLetter('Duplicate')).toThrow('Name already exists')
    })

    it('throws when no workspace selected', () => {
      workspaceStore.currentWorkspace = null
      expect(() => clStore.createCoverLetter('Test')).toThrow('No workspace selected')
    })

    it('updates workspace lastModified', () => {
      const before = workspaceStore.workspaces['My Workspace'].metadata.lastModified
      clStore.createCoverLetter('New CL')
      expect(workspaceStore.workspaces['My Workspace'].metadata.lastModified).toBeGreaterThanOrEqual(before)
    })
  })

  describe('setCurrentCoverLetter', () => {
    it('sets the current cover letter', () => {
      clStore.createCoverLetter('Selected')
      clStore.setCurrentCoverLetter('Selected')
      expect(clStore.currentCoverLetterName).toBe('Selected')
      expect(clStore.coverLetter).not.toBeNull()
    })

    it('coverLetter computed returns null for non-existent name', () => {
      clStore.setCurrentCoverLetter('NonExistent')
      expect(clStore.coverLetter).toBeNull()
    })
  })

  describe('deleteCoverLetter', () => {
    it('deletes a cover letter from the workspace', () => {
      clStore.createCoverLetter('To Delete')
      clStore.deleteCoverLetter('To Delete')
      expect(clStore.coverLetters['To Delete']).toBeUndefined()
    })

    it('clears currentCoverLetterName if deleted cover letter was current', () => {
      clStore.createCoverLetter('Current')
      clStore.setCurrentCoverLetter('Current')
      clStore.deleteCoverLetter('Current')
      expect(clStore.currentCoverLetterName).toBeNull()
    })

    it('does not affect currentCoverLetterName if different one deleted', () => {
      clStore.createCoverLetter('Keep')
      clStore.createCoverLetter('Delete')
      clStore.setCurrentCoverLetter('Keep')
      clStore.deleteCoverLetter('Delete')
      expect(clStore.currentCoverLetterName).toBe('Keep')
    })

    it('does nothing for non-existent cover letter', () => {
      clStore.createCoverLetter('Existing')
      clStore.deleteCoverLetter('NonExistent')
      expect(clStore.coverLetters['Existing']).toBeDefined()
    })
  })

  describe('duplicateCoverLetter', () => {
    it('creates a copy with " (Copy)" suffix', () => {
      clStore.createCoverLetter('Original')
      clStore.duplicateCoverLetter('Original')
      expect(clStore.coverLetters['Original (Copy)']).toBeDefined()
    })

    it('increments copy number on repeated duplicate', () => {
      clStore.createCoverLetter('Original')
      clStore.duplicateCoverLetter('Original')
      clStore.duplicateCoverLetter('Original')
      expect(clStore.coverLetters['Original (Copy 2)']).toBeDefined()
    })

    it('generates a new ID for the copy', () => {
      clStore.createCoverLetter('Original')
      clStore.duplicateCoverLetter('Original')
      expect(clStore.coverLetters['Original'].id).not.toBe(clStore.coverLetters['Original (Copy)'].id)
    })

    it('does nothing for non-existent cover letter', () => {
      const count = Object.keys(clStore.coverLetters).length
      clStore.duplicateCoverLetter('NonExistent')
      expect(Object.keys(clStore.coverLetters)).toHaveLength(count)
    })
  })

  describe('updateCoverLetterName', () => {
    it('renames a cover letter', () => {
      clStore.createCoverLetter('Old Name')
      clStore.updateCoverLetterName('Old Name', 'New Name')
      expect(clStore.coverLetters['Old Name']).toBeUndefined()
      expect(clStore.coverLetters['New Name']).toBeDefined()
    })

    it('updates currentCoverLetterName if renamed is current', () => {
      clStore.createCoverLetter('Current')
      clStore.setCurrentCoverLetter('Current')
      clStore.updateCoverLetterName('Current', 'Renamed')
      expect(clStore.currentCoverLetterName).toBe('Renamed')
    })

    it('does nothing when old and new name are the same', () => {
      clStore.createCoverLetter('Same')
      clStore.updateCoverLetterName('Same', 'Same')
      expect(clStore.coverLetters['Same']).toBeDefined()
    })

    it('throws when new name already taken', () => {
      clStore.createCoverLetter('Name1')
      clStore.createCoverLetter('Name2')
      expect(() => clStore.updateCoverLetterName('Name1', 'Name2'))
        .toThrow('Cover Letter name already exists')
    })
  })

  describe('isNameTaken', () => {
    it('returns true for existing name', () => {
      clStore.createCoverLetter('Taken')
      expect(clStore.isNameTaken('Taken')).toBe(true)
    })

    it('returns false for non-existing name', () => {
      expect(clStore.isNameTaken('Available')).toBe(false)
    })
  })

  describe('importCoverLetter', () => {
    it('imports cover letter from JSON (raw data)', () => {
      const clData = createCoverLetterData({ title: 'Imported Title' })
      clStore.importCoverLetter(JSON.stringify(clData), 'Imported CL')
      expect(clStore.coverLetters['Imported CL']).toBeDefined()
      expect(clStore.coverLetters['Imported CL'].data.title).toBe('Imported Title')
    })

    it('imports cover letter from wrapped format', () => {
      const wrapped = { data: createCoverLetterData({ title: 'Wrapped' }) }
      clStore.importCoverLetter(JSON.stringify(wrapped), 'Wrapped CL')
      expect(clStore.coverLetters['Wrapped CL']).toBeDefined()
      expect(clStore.coverLetters['Wrapped CL'].data.title).toBe('Wrapped')
    })

    it('sets imported as current cover letter', () => {
      const clData = createCoverLetterData()
      clStore.importCoverLetter(JSON.stringify(clData), 'Imported')
      expect(clStore.currentCoverLetterName).toBe('Imported')
    })

    it('merges with template defaults for missing fields', () => {
      const partial = { title: 'Partial Import', body: '<p>Content</p>' }
      clStore.importCoverLetter(JSON.stringify(partial), 'Partial')
      const cl = clStore.coverLetters['Partial'].data
      expect(cl.title).toBe('Partial Import')
      expect(cl.applicantAddress).toBeDefined() // from template defaults
    })

    it('throws when name already exists', () => {
      clStore.createCoverLetter('Existing')
      const clData = createCoverLetterData()
      expect(() => clStore.importCoverLetter(JSON.stringify(clData), 'Existing'))
        .toThrow('Name already exists')
    })

    it('throws when no workspace selected', () => {
      workspaceStore.currentWorkspace = null
      expect(() => clStore.importCoverLetter('{}', 'Test'))
        .toThrow('No workspace selected')
    })

    it('throws on invalid JSON', () => {
      expect(() => clStore.importCoverLetter('not json', 'Test'))
        .toThrow('Invalid JSON file')
    })
  })

  describe('exportCoverLetter', () => {
    it('exports cover letter data', () => {
      clStore.createCoverLetter('To Export')
      const exported = clStore.exportCoverLetter('To Export')
      expect(exported).not.toBeNull()
      expect(exported.name).toBe('To Export')
      expect(exported.data).toBeDefined()
    })

    it('returns null for non-existent cover letter', () => {
      expect(clStore.exportCoverLetter('NonExistent')).toBeNull()
    })
  })

  describe('persistence', () => {
    it('calls workspace save on creation', () => {
      clStore.createCoverLetter('Persisted')
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'workspaces',
        expect.any(String)
      )
    })
  })
})

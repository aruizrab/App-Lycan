import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkspaceStore } from '../../stores/workspace'
import { useCvStore } from '../../stores/cv'
import { useCoverLetterStore } from '../../stores/coverLetter'
import { useUserProfileStore } from '../../stores/userProfile'
import {
  createWorkspace as createWorkspaceFactory,
  createCvDocument,
  createCoverLetterDocument
} from '../../test/factories'

import {
  navigateTo,
  getCurrentView,
  buildAppContext,
  getAllWorkspaces,
  getWorkspace,
  getCv,
  getCoverLetter,
  getWorkspaceContext,
  getWorkspaceContextKeys,
  getUserProfile,
  createWorkspace,
  createCv,
  createCoverLetter,
  addWorkspaceContext,
  editWorkspace,
  editCv,
  editCoverLetter,
  editWorkspaceContext,
  editUserProfile,
  deleteWorkspaceWithConfirm,
  deleteCvWithConfirm,
  deleteCoverLetterWithConfirm,
  deleteWorkspaceContextWithConfirm,
  confirmDeletion,
  rejectDeletion,
  getPendingDeletion
} from '../dataAccess'

// Helper: set up a workspace with optional CVs and cover letters in the store
function seedWorkspace(name, options = {}) {
  const ws = useWorkspaceStore()
  ws.workspaces[name] = {
    metadata: { id: 'ws-id', lastModified: Date.now() },
    cvs: options.cvs || {},
    coverLetters: options.coverLetters || {},
    jobAnalysis: options.jobAnalysis || null,
    matchReport: options.matchReport || null,
    companyResearch: options.companyResearch || null,
    ...(options.extra || {})
  }
  if (!ws.currentWorkspace) {
    ws.currentWorkspace = name
  }
  return ws
}

describe('dataAccess', () => {
  beforeEach(() => {
    // Reset auto-created "My Workspace" so tests start with a clean store
    const ws = useWorkspaceStore()
    ws.workspaces = {}
    ws.currentWorkspace = null
  })

  // ─── NAVIGATION ──────────────────────────────────────
  describe('navigateTo', () => {
    let mockRouter

    beforeEach(() => {
      mockRouter = { push: vi.fn() }
    })

    it('navigates to general_dashboard', () => {
      const result = navigateTo(mockRouter, { view: 'general_dashboard' })
      expect(result.success).toBe(true)
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/' })
      )
    })

    it('navigates to workspace_dashboard with valid workspace', () => {
      seedWorkspace('TestWS')
      const result = navigateTo(mockRouter, {
        view: 'workspace_dashboard',
        workspaceName: 'TestWS'
      })
      expect(result.success).toBe(true)
      expect(mockRouter.push).toHaveBeenCalled()
    })

    it('returns error for workspace_dashboard without workspace name', () => {
      const result = navigateTo(mockRouter, { view: 'workspace_dashboard' })
      expect(result.error).toBeDefined()
    })

    it('returns error for workspace_dashboard with nonexistent workspace', () => {
      const result = navigateTo(mockRouter, {
        view: 'workspace_dashboard',
        workspaceName: 'NoSuchWS'
      })
      expect(result.error).toContain('not found')
    })

    it('navigates to cv_editor with valid workspace and CV', () => {
      seedWorkspace('WS1', { cvs: { 'My CV': createCvDocument() } })
      const result = navigateTo(mockRouter, {
        view: 'cv_editor',
        workspaceName: 'WS1',
        cvName: 'My CV'
      })
      expect(result.success).toBe(true)
    })

    it('returns error for cv_editor without cv_name', () => {
      seedWorkspace('WS1')
      const result = navigateTo(mockRouter, {
        view: 'cv_editor',
        workspaceName: 'WS1'
      })
      expect(result.error).toBeDefined()
    })

    it('returns error for cv_editor with nonexistent CV', () => {
      seedWorkspace('WS1')
      const result = navigateTo(mockRouter, {
        view: 'cv_editor',
        workspaceName: 'WS1',
        cvName: 'NoCV'
      })
      expect(result.error).toContain('not found')
    })

    it('navigates to cover_letter_editor with valid workspace and cover letter', () => {
      seedWorkspace('WS1', {
        coverLetters: { 'My CL': createCoverLetterDocument() }
      })
      const result = navigateTo(mockRouter, {
        view: 'cover_letter_editor',
        workspaceName: 'WS1',
        coverLetterName: 'My CL'
      })
      expect(result.success).toBe(true)
    })

    it('returns error for unknown view', () => {
      const result = navigateTo(mockRouter, { view: 'unknown_view' })
      expect(result.error).toContain('Unknown view')
    })

    it('returns error for cover_letter_editor without cover_letter_name', () => {
      seedWorkspace('WS1')
      const result = navigateTo(mockRouter, {
        view: 'cover_letter_editor',
        workspaceName: 'WS1'
      })
      expect(result.error).toBeDefined()
    })

    it('returns error for cover_letter_editor with nonexistent cover letter', () => {
      seedWorkspace('WS1')
      const result = navigateTo(mockRouter, {
        view: 'cover_letter_editor',
        workspaceName: 'WS1',
        coverLetterName: 'NoCL'
      })
      expect(result.error).toContain('not found')
    })
  })

  // ─── getCurrentView ──────────────────────────────────
  describe('getCurrentView', () => {
    it('returns general_dashboard for WorkspaceDashboard route', () => {
      expect(getCurrentView({ name: 'WorkspaceDashboard' })).toBe('general_dashboard')
    })

    it('returns workspace_dashboard for Dashboard route', () => {
      expect(getCurrentView({ name: 'Dashboard' })).toBe('workspace_dashboard')
    })

    it('returns cv_editor for CvEditor route', () => {
      expect(getCurrentView({ name: 'CvEditor' })).toBe('cv_editor')
    })

    it('returns cover_letter_editor for CoverLetterEditor route', () => {
      expect(getCurrentView({ name: 'CoverLetterEditor' })).toBe('cover_letter_editor')
    })

    it('defaults to general_dashboard for unknown route names', () => {
      expect(getCurrentView({ name: 'SomethingElse' })).toBe('general_dashboard')
    })
  })

  // ─── buildAppContext ─────────────────────────────────
  describe('buildAppContext', () => {
    it('includes all_views and current_view', () => {
      const ctx = buildAppContext({ name: 'WorkspaceDashboard' })
      expect(ctx.all_views).toContain('general_dashboard')
      expect(ctx.current_view).toBe('general_dashboard')
    })

    it('includes all workspace names in all_workspaces', () => {
      seedWorkspace('Alpha')
      seedWorkspace('Beta')
      const ctx = buildAppContext({ name: 'WorkspaceDashboard' })
      expect(ctx.all_workspaces).toContain('Alpha')
      expect(ctx.all_workspaces).toContain('Beta')
    })

    it('includes workspaces detail array for general_dashboard', () => {
      seedWorkspace('WS1', { cvs: { 'CV1': createCvDocument() } })
      const ctx = buildAppContext({ name: 'WorkspaceDashboard' })
      expect(ctx.workspaces).toBeDefined()
      expect(ctx.workspaces[0].name).toBe('WS1')
      expect(ctx.workspaces[0].cvs).toContain('CV1')
    })

    it('includes current_workspace for workspace_dashboard', () => {
      seedWorkspace('WS1')
      const ws = useWorkspaceStore()
      ws.currentWorkspace = 'WS1'
      const ctx = buildAppContext({ name: 'Dashboard' })
      expect(ctx.current_workspace).toBeDefined()
      expect(ctx.current_workspace.name).toBe('WS1')
      expect(ctx.workspaces).toBeUndefined()
    })

    it('includes current_cv for cv_editor view', () => {
      seedWorkspace('WS1')
      const ws = useWorkspaceStore()
      ws.currentWorkspace = 'WS1'
      const cvStore = useCvStore()
      cvStore.createCv('MyCv')
      cvStore.setCurrentCv('MyCv')
      const ctx = buildAppContext({ name: 'CvEditor' })
      expect(ctx.current_cv).toBe('MyCv')
    })
  })

  // ─── READING — Workspaces ───────────────────────────
  describe('getAllWorkspaces', () => {
    it('returns empty array when no workspaces', () => {
      expect(getAllWorkspaces()).toEqual([])
    })

    it('returns workspace summaries', () => {
      seedWorkspace('WS1', { cvs: { 'CV1': createCvDocument() } })
      seedWorkspace('WS2', {
        coverLetters: { 'CL1': createCoverLetterDocument() }
      })
      const result = getAllWorkspaces()
      expect(result).toHaveLength(2)
      expect(result[0].cvs).toContain('CV1')
      expect(result[1].cover_letters).toContain('CL1')
    })
  })

  describe('getWorkspace', () => {
    it('returns workspace data for existing workspace', () => {
      seedWorkspace('TestWS', { cvs: { 'CV1': createCvDocument() } })
      const result = getWorkspace('TestWS')
      expect(result.name).toBe('TestWS')
      expect(result.cvs).toContain('CV1')
    })

    it('returns error for nonexistent workspace', () => {
      const result = getWorkspace('NoSuchWS')
      expect(result.error).toContain('not found')
    })
  })

  // ─── READING — CVs & Cover Letters ──────────────────
  describe('getCv', () => {
    it('returns CV data for existing CV', () => {
      seedWorkspace('WS1', { cvs: { 'MyCv': createCvDocument() } })
      const result = getCv('WS1', 'MyCv')
      expect(result.name).toBe('MyCv')
      expect(result.data).toBeDefined()
      expect(result.data.personalInfo).toBeDefined()
    })

    it('returns error for nonexistent workspace', () => {
      const result = getCv('NoWS', 'MyCv')
      expect(result.error).toContain('not found')
    })

    it('returns error for nonexistent CV', () => {
      seedWorkspace('WS1')
      const result = getCv('WS1', 'NoCv')
      expect(result.error).toContain('not found')
    })
  })

  describe('getCoverLetter', () => {
    it('returns cover letter data for existing cover letter', () => {
      seedWorkspace('WS1', {
        coverLetters: { 'MyCL': createCoverLetterDocument() }
      })
      const result = getCoverLetter('WS1', 'MyCL')
      expect(result.name).toBe('MyCL')
      expect(result.data).toBeDefined()
    })

    it('returns error for nonexistent cover letter', () => {
      seedWorkspace('WS1')
      const result = getCoverLetter('WS1', 'NoCL')
      expect(result.error).toContain('not found')
    })
  })

  // ─── READING — Workspace Context ────────────────────
  describe('getWorkspaceContext', () => {
    it('returns context value for existing key', () => {
      seedWorkspace('WS1', {
        extra: { customKey: { content: 'test data', createdAt: Date.now() } }
      })
      const result = getWorkspaceContext('WS1', 'customKey')
      expect(result.key).toBe('customKey')
      expect(result.content).toBeDefined()
    })

    it('returns error for reserved keys', () => {
      seedWorkspace('WS1')
      const result = getWorkspaceContext('WS1', 'metadata')
      expect(result.error).toContain('reserved')
    })

    it('lists context keys when no key specified', () => {
      seedWorkspace('WS1', {
        extra: { myContext: { content: 'data' } }
      })
      const result = getWorkspaceContext('WS1')
      expect(result.context_keys).toBeDefined()
      expect(result.context_keys).toContain('myContext')
    })

    it('returns error for nonexistent workspace', () => {
      const result = getWorkspaceContext('NoWS', 'key')
      expect(result.error).toContain('not found')
    })

    it('returns error for nonexistent context key', () => {
      seedWorkspace('WS1')
      const result = getWorkspaceContext('WS1', 'nokey')
      expect(result.error).toContain('not found')
    })
  })

  describe('getWorkspaceContextKeys', () => {
    it('filters out reserved keys and null values', () => {
      seedWorkspace('WS1', {
        extra: {
          myField: { content: 'data' },
          anotherField: 'also data'
        }
      })
      const result = getWorkspaceContextKeys('WS1')
      expect(result.context_keys).toContain('myField')
      expect(result.context_keys).toContain('anotherField')
      expect(result.context_keys).not.toContain('metadata')
      expect(result.context_keys).not.toContain('cvs')
    })
  })

  // ─── READING — User Profile ─────────────────────────
  describe('getUserProfile', () => {
    it('returns empty string when no profile set', () => {
      expect(getUserProfile()).toBe('')
    })

    it('returns professional experience when set', () => {
      const profile = useUserProfileStore()
      profile.updateProfessionalExperience('10 years of JavaScript')
      expect(getUserProfile()).toBe('10 years of JavaScript')
    })
  })

  // ─── CREATION ───────────────────────────────────────
  describe('createWorkspace', () => {
    it('creates a workspace successfully', () => {
      const result = createWorkspace('NewWS')
      expect(result.success).toBe(true)
      expect(result.name).toBe('NewWS')

      const ws = useWorkspaceStore()
      expect(ws.workspaces['NewWS']).toBeDefined()
    })

    it('returns error if name is empty', () => {
      const result = createWorkspace('')
      expect(result.error).toBeDefined()
    })

    it('returns error if workspace already exists', () => {
      seedWorkspace('Existing')
      const result = createWorkspace('Existing')
      expect(result.error).toContain('already exists')
    })
  })

  describe('createCv', () => {
    it('creates a CV in an existing workspace', () => {
      seedWorkspace('WS1')
      const result = createCv('WS1', 'NewCV')
      expect(result.success).toBe(true)
      expect(result.cv_name).toBe('NewCV')
    })

    it('creates a CV with initial data', () => {
      seedWorkspace('WS1')
      const result = createCv('WS1', 'NewCV', {
        personalInfo: { name: 'Test User' }
      })
      expect(result.success).toBe(true)
      const ws = useWorkspaceStore()
      expect(ws.workspaces['WS1'].cvs['NewCV']).toBeDefined()
    })

    it('returns error for missing workspace name', () => {
      const result = createCv('', 'CV1')
      expect(result.error).toBeDefined()
    })

    it('returns error for missing cv name', () => {
      seedWorkspace('WS1')
      const result = createCv('WS1', '')
      expect(result.error).toBeDefined()
    })

    it('returns error for nonexistent workspace', () => {
      const result = createCv('NoWS', 'CV1')
      expect(result.error).toContain('not found')
    })

    it('returns error when CV name already exists', () => {
      seedWorkspace('WS1', { cvs: { 'ExistingCV': createCvDocument() } })
      const result = createCv('WS1', 'ExistingCV')
      expect(result.error).toContain('already exists')
    })
  })

  describe('createCoverLetter', () => {
    it('creates a cover letter in an existing workspace', () => {
      seedWorkspace('WS1')
      const result = createCoverLetter('WS1', 'NewCL')
      expect(result.success).toBe(true)
      expect(result.cover_letter_name).toBe('NewCL')
    })

    it('returns error for nonexistent workspace', () => {
      const result = createCoverLetter('NoWS', 'CL1')
      expect(result.error).toContain('not found')
    })

    it('returns error for missing workspace name', () => {
      const result = createCoverLetter('', 'CL1')
      expect(result.error).toBeDefined()
    })

    it('returns error for missing cover letter name', () => {
      seedWorkspace('WS1')
      const result = createCoverLetter('WS1', '')
      expect(result.error).toBeDefined()
    })

    it('returns error when cover letter name already exists', () => {
      seedWorkspace('WS1', { coverLetters: { 'ExistingCL': createCoverLetterDocument() } })
      const result = createCoverLetter('WS1', 'ExistingCL')
      expect(result.error).toContain('already exists')
    })
  })

  describe('addWorkspaceContext', () => {
    it('adds context to workspace', () => {
      seedWorkspace('WS1')
      const result = addWorkspaceContext('WS1', 'notes', 'Some notes')
      expect(result.success).toBe(true)

      const ws = useWorkspaceStore()
      expect(ws.workspaces['WS1'].notes).toBeDefined()
      expect(ws.workspaces['WS1'].notes.content).toBe('Some notes')
    })

    it('returns error for reserved keys', () => {
      seedWorkspace('WS1')
      const result = addWorkspaceContext('WS1', 'metadata', 'data')
      expect(result.error).toContain('reserved')
    })

    it('returns error if key already exists', () => {
      seedWorkspace('WS1', {
        extra: { existingKey: { content: 'old data', createdAt: Date.now(), lastModified: Date.now() } }
      })
      const result = addWorkspaceContext('WS1', 'existingKey', 'new data')
      expect(result.error).toContain('already exists')
    })

    it('returns error for missing params', () => {
      expect(addWorkspaceContext('', 'key', 'val').error).toBeDefined()
      seedWorkspace('WS1')
      expect(addWorkspaceContext('WS1', '', 'val').error).toBeDefined()
      expect(addWorkspaceContext('WS1', 'key', '').error).toBeDefined()
    })
  })

  // ─── EDITING ────────────────────────────────────────
  describe('editWorkspace', () => {
    it('renames a workspace', () => {
      seedWorkspace('OldName')
      const result = editWorkspace('OldName', 'NewName')
      expect(result.success).toBe(true)
      expect(result.old_name).toBe('OldName')
      expect(result.new_name).toBe('NewName')

      const ws = useWorkspaceStore()
      expect(ws.workspaces['NewName']).toBeDefined()
      expect(ws.workspaces['OldName']).toBeUndefined()
    })

    it('returns error if source workspace not found', () => {
      const result = editWorkspace('NoWS', 'NewName')
      expect(result.error).toContain('not found')
    })

    it('returns error if target name already exists', () => {
      seedWorkspace('WS1')
      seedWorkspace('WS2')
      const result = editWorkspace('WS1', 'WS2')
      expect(result.error).toContain('already exists')
    })
  })

  describe('editCv', () => {
    it('renames a CV', () => {
      seedWorkspace('WS1', { cvs: { 'OldCV': createCvDocument() } })
      const result = editCv('WS1', 'OldCV', { newCvName: 'NewCV' })
      expect(result.success).toBe(true)
      const ws = useWorkspaceStore()
      expect(ws.workspaces['WS1'].cvs['NewCV']).toBeDefined()
    })

    it('updates CV data with merge mode', () => {
      seedWorkspace('WS1', { cvs: { 'MyCv': createCvDocument() } })
      const result = editCv('WS1', 'MyCv', {
        newCvData: { personalInfo: { name: 'Updated Name' } }
      })
      expect(result.success).toBe(true)
      const ws = useWorkspaceStore()
      expect(ws.workspaces['WS1'].cvs['MyCv'].data.personalInfo.name).toBe('Updated Name')
    })

    it('replaces CV data entirely in replace mode', () => {
      seedWorkspace('WS1', { cvs: { 'MyCv': createCvDocument() } })
      const result = editCv('WS1', 'MyCv', {
        newCvData: { personalInfo: { name: 'Replaced' } },
        dataEditingMode: 'replace'
      })
      expect(result.success).toBe(true)
      const ws = useWorkspaceStore()
      expect(ws.workspaces['WS1'].cvs['MyCv'].data.personalInfo.name).toBe('Replaced')
    })

    it('returns error when no edit operation provided', () => {
      seedWorkspace('WS1', { cvs: { 'MyCv': createCvDocument() } })
      const result = editCv('WS1', 'MyCv', {})
      expect(result.error).toContain('At least one')
    })

    it('returns error for nonexistent CV', () => {
      seedWorkspace('WS1')
      const result = editCv('WS1', 'NoCv', { newCvName: 'New' })
      expect(result.error).toContain('not found')
    })

    it('returns error when renaming to an already existing CV name', () => {
      seedWorkspace('WS1', {
        cvs: {
          'CV1': createCvDocument(),
          'CV2': createCvDocument()
        }
      })
      const result = editCv('WS1', 'CV1', { newCvName: 'CV2' })
      expect(result.error).toContain('already exists')
    })
  })

  describe('editCoverLetter', () => {
    it('renames a cover letter', () => {
      seedWorkspace('WS1', {
        coverLetters: { 'OldCL': createCoverLetterDocument() }
      })
      const result = editCoverLetter('WS1', 'OldCL', { newClName: 'NewCL' })
      expect(result.success).toBe(true)
      const ws = useWorkspaceStore()
      expect(ws.workspaces['WS1'].coverLetters['NewCL']).toBeDefined()
    })

    it('updates cover letter data', () => {
      seedWorkspace('WS1', {
        coverLetters: { 'MyCL': createCoverLetterDocument() }
      })
      const result = editCoverLetter('WS1', 'MyCL', {
        newClData: { title: 'Updated Title' }
      })
      expect(result.success).toBe(true)
      const ws = useWorkspaceStore()
      expect(ws.workspaces['WS1'].coverLetters['MyCL'].data.title).toBe('Updated Title')
    })

    it('returns error when no edit operation provided', () => {
      seedWorkspace('WS1', {
        coverLetters: { 'MyCL': createCoverLetterDocument() }
      })
      const result = editCoverLetter('WS1', 'MyCL', {})
      expect(result.error).toContain('At least one')
    })

    it('returns error for nonexistent cover letter', () => {
      seedWorkspace('WS1')
      const result = editCoverLetter('WS1', 'NoCL', { newClName: 'NewCL' })
      expect(result.error).toContain('not found')
    })

    it('replaces cover letter data in replace mode', () => {
      seedWorkspace('WS1', {
        coverLetters: { 'MyCL': createCoverLetterDocument() }
      })
      const result = editCoverLetter('WS1', 'MyCL', {
        newClData: { title: 'Replaced Title' },
        dataEditingMode: 'replace'
      })
      expect(result.success).toBe(true)
      const ws = useWorkspaceStore()
      expect(ws.workspaces['WS1'].coverLetters['MyCL'].data.title).toBe('Replaced Title')
    })
  })

  describe('editWorkspaceContext', () => {
    it('updates existing context', () => {
      seedWorkspace('WS1', {
        extra: { notes: { content: 'old', createdAt: Date.now(), lastModified: Date.now() } }
      })
      const result = editWorkspaceContext('WS1', 'notes', 'new content')
      expect(result.success).toBe(true)

      const ws = useWorkspaceStore()
      expect(ws.workspaces['WS1'].notes.content).toBe('new content')
    })

    it('returns error for reserved keys', () => {
      seedWorkspace('WS1')
      const result = editWorkspaceContext('WS1', 'cvs', 'data')
      expect(result.error).toContain('reserved')
    })

    it('returns error for nonexistent context key', () => {
      seedWorkspace('WS1')
      const result = editWorkspaceContext('WS1', 'nokey', 'data')
      expect(result.error).toContain('not found')
    })

    it('returns error for missing workspace_name', () => {
      const result = editWorkspaceContext('', 'notes', 'content')
      expect(result.error).toBeDefined()
    })

    it('returns error for missing context_key', () => {
      seedWorkspace('WS1')
      const result = editWorkspaceContext('WS1', '', 'content')
      expect(result.error).toBeDefined()
    })

    it('returns error for missing new_context_content', () => {
      seedWorkspace('WS1', {
        extra: { notes: { content: 'old', createdAt: Date.now(), lastModified: Date.now() } }
      })
      const result = editWorkspaceContext('WS1', 'notes', '')
      expect(result.error).toBeDefined()
    })
  })

  describe('editUserProfile', () => {
    it('updates professional experience', () => {
      const result = editUserProfile('New professional experience')
      expect(result.success).toBe(true)

      const profile = useUserProfileStore()
      expect(profile.professionalExperience).toBe('New professional experience')
    })

    it('returns error for non-string input', () => {
      const result = editUserProfile(123)
      expect(result.error).toContain('string')
    })
  })

  // ─── DELETION ───────────────────────────────────────
  describe('deletion with confirmation', () => {
    it('deleteWorkspaceWithConfirm resolves on confirm', async () => {
      seedWorkspace('WS1')

      const deletePromise = deleteWorkspaceWithConfirm('WS1')

      // Simulate user confirming
      setTimeout(() => confirmDeletion(), 0)

      const result = await deletePromise
      expect(result.success).toBe(true)
      expect(result.deleted).toBe('WS1')
    })

    it('deleteWorkspaceWithConfirm resolves with error on reject', async () => {
      seedWorkspace('WS1')

      const deletePromise = deleteWorkspaceWithConfirm('WS1')

      setTimeout(() => rejectDeletion(), 0)

      const result = await deletePromise
      expect(result.error).toContain('did not confirm')
    })

    it('deleteWorkspaceWithConfirm returns error for nonexistent workspace', async () => {
      const result = await deleteWorkspaceWithConfirm('NoWS')
      expect(result.error).toContain('not found')
    })

    it('deleteCvWithConfirm deletes CV on confirm', async () => {
      seedWorkspace('WS1', { cvs: { 'MyCv': createCvDocument() } })

      const deletePromise = deleteCvWithConfirm('WS1', 'MyCv')
      setTimeout(() => confirmDeletion(), 0)

      const result = await deletePromise
      expect(result.success).toBe(true)
    })

    it('deleteCoverLetterWithConfirm deletes cover letter on confirm', async () => {
      seedWorkspace('WS1', {
        coverLetters: { 'MyCL': createCoverLetterDocument() }
      })

      const deletePromise = deleteCoverLetterWithConfirm('WS1', 'MyCL')
      setTimeout(() => confirmDeletion(), 0)

      const result = await deletePromise
      expect(result.success).toBe(true)
    })

    it('deleteWorkspaceContextWithConfirm deletes context on confirm', async () => {
      seedWorkspace('WS1', {
        extra: { notes: { content: 'data', createdAt: Date.now(), lastModified: Date.now() } }
      })

      const deletePromise = deleteWorkspaceContextWithConfirm('WS1', 'notes')
      setTimeout(() => confirmDeletion(), 0)

      const result = await deletePromise
      expect(result.success).toBe(true)
    })

    it('deleteWorkspaceContextWithConfirm returns error for reserved keys', async () => {
      seedWorkspace('WS1')
      const result = await deleteWorkspaceContextWithConfirm('WS1', 'metadata')
      expect(result.error).toContain('reserved')
    })
  })
})

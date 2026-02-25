import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkspaceStore } from '../../stores/workspace'
import { useUserProfileStore } from '../../stores/userProfile'
import { useSettingsStore } from '../../stores/settings'
import { useSystemPromptsStore } from '../../stores/systemPrompts'
import {
  createCvDocument,
  createCoverLetterDocument
} from '../../test/factories'

// Mock the AI service module — must include ALL exports that downstream modules (settings.js) import
vi.mock('../ai', () => ({
  streamAndCollect: vi.fn(),
  isWebSearchCompatible: vi.fn(() => false),
  RECOMMENDED_MODELS: [],
  WEB_SEARCH_MODELS: [],
  fetchAvailableModels: vi.fn(),
  determineWebSearchCapability: vi.fn(() => false),
  streamAiResponse: vi.fn(),
  performAiAction: vi.fn(),
  performAiActionWithJson: vi.fn(),
  streamWithTools: vi.fn(),
  chatWithTools: vi.fn(),
}))

// Mock the prompt loader
vi.mock('../promptLoader', () => ({
  loadAgentPrompt: vi.fn(() => Promise.resolve('Mock agent prompt'))
}))

// Mock the JSON schemas
vi.mock('../../schemas/cvSchema.json', () => ({
  default: { type: 'object', properties: { name: { type: 'string' } } }
}))
vi.mock('../../schemas/coverLetterSchema.json', () => ({
  default: { type: 'object', properties: { name: { type: 'string' } } }
}))

import {
  AI_TOOLS,
  TOOL_DISPLAY_NAMES,
  COMMAND_TOOLS,
  getToolsForCommand,
  getToolsForApi,
  registerToolHandler,
  executeToolCall,
  setupToolHandlers
} from '../aiToolkit'

import { streamAndCollect } from '../ai'

// Helper: seed a workspace directly in the store
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
}

describe('aiToolkit', () => {
  // ─── Tool definitions ───────────────────────────────
  describe('AI_TOOLS', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(AI_TOOLS)).toBe(true)
      expect(AI_TOOLS.length).toBeGreaterThan(0)
    })

    it('every tool has correct structure', () => {
      for (const tool of AI_TOOLS) {
        expect(tool.type).toBe('function')
        expect(tool.function).toBeDefined()
        expect(tool.function.name).toBeTruthy()
        expect(tool.function.description).toBeTruthy()
        expect(tool.function.parameters).toBeDefined()
      }
    })

    it('contains expected tool names', () => {
      const names = AI_TOOLS.map(t => t.function.name)
      expect(names).toContain('go_to')
      expect(names).toContain('get_workspaces')
      expect(names).toContain('create_cv')
      expect(names).toContain('edit_cv')
      expect(names).toContain('delete_cv')
      expect(names).toContain('job_analysis')
      expect(names).toContain('generate_match_report')
      expect(names).toContain('research_company')
    })
  })

  // ─── TOOL_DISPLAY_NAMES ─────────────────────────────
  describe('TOOL_DISPLAY_NAMES', () => {
    it('has a display name for every tool', () => {
      const toolNames = AI_TOOLS.map(t => t.function.name)
      for (const name of toolNames) {
        expect(TOOL_DISPLAY_NAMES[name]).toBeTruthy()
      }
    })
  })

  // ─── COMMAND_TOOLS ──────────────────────────────────
  describe('COMMAND_TOOLS', () => {
    it('defines tool sets for analyze, match, and research', () => {
      expect(COMMAND_TOOLS.analyze).toBeDefined()
      expect(COMMAND_TOOLS.match).toBeDefined()
      expect(COMMAND_TOOLS.research).toBeDefined()
    })

    it('analyze tools include job_analysis', () => {
      expect(COMMAND_TOOLS.analyze).toContain('job_analysis')
    })

    it('match tools include generate_match_report', () => {
      expect(COMMAND_TOOLS.match).toContain('generate_match_report')
    })

    it('research tools include research_company', () => {
      expect(COMMAND_TOOLS.research).toContain('research_company')
    })
  })

  // ─── getToolsForCommand ─────────────────────────────
  describe('getToolsForCommand', () => {
    it('returns all tools when no command specified', () => {
      expect(getToolsForCommand(null)).toBe(AI_TOOLS)
    })

    it('returns all tools for unknown command', () => {
      expect(getToolsForCommand('unknown')).toBe(AI_TOOLS)
    })

    it('filters tools for analyze command', () => {
      const tools = getToolsForCommand('analyze')
      const names = tools.map(t => t.function.name)
      expect(names).toContain('job_analysis')
      expect(names).not.toContain('create_cv')
    })

    it('filters tools for match command', () => {
      const tools = getToolsForCommand('match')
      const names = tools.map(t => t.function.name)
      expect(names).toContain('generate_match_report')
      expect(names).toContain('get_user_profile')
      expect(names).not.toContain('go_to')
    })

    it('filters tools for research command', () => {
      const tools = getToolsForCommand('research')
      const names = tools.map(t => t.function.name)
      expect(names).toContain('research_company')
      expect(names).not.toContain('create_cv')
    })

    it('returns all tools for undefined command', () => {
      expect(getToolsForCommand(undefined)).toBe(AI_TOOLS)
    })
  })

  // ─── getToolsForApi ─────────────────────────────────
  describe('getToolsForApi', () => {
    it('returns all tools', () => {
      expect(getToolsForApi()).toBe(AI_TOOLS)
    })
  })

  // ─── executeToolCall ────────────────────────────────
  describe('executeToolCall', () => {
    it('returns error for unregistered tool', async () => {
      const result = await executeToolCall({
        function: { name: 'nonexistent_tool', arguments: '{}' }
      })
      expect(result.error).toContain('No handler registered')
      expect(result.tool).toBe('nonexistent_tool')
    })

    it('returns error for invalid JSON arguments', async () => {
      registerToolHandler('test_tool', async () => ({ success: true }))
      const result = await executeToolCall({
        function: { name: 'test_tool', arguments: '{invalid json' }
      })
      expect(result.error).toContain('Failed to parse')
    })

    it('handles empty arguments string', async () => {
      registerToolHandler('test_empty', async (args) => ({
        success: true,
        received: args
      }))
      const result = await executeToolCall({
        function: { name: 'test_empty', arguments: '' }
      })
      expect(result.success).toBe(true)
    })

    it('handles handler throwing an error', async () => {
      registerToolHandler('test_throw', async () => {
        throw new Error('Something went wrong')
      })
      const result = await executeToolCall({
        function: { name: 'test_throw', arguments: '{}' }
      })
      expect(result.error).toBe('Something went wrong')
      expect(result.tool).toBe('test_throw')
    })

    it('passes parsed arguments to handler', async () => {
      let receivedArgs
      registerToolHandler('test_args', async (args) => {
        receivedArgs = args
        return { success: true }
      })
      await executeToolCall({
        function: { name: 'test_args', arguments: '{"key":"value"}' }
      })
      expect(receivedArgs).toEqual({ key: 'value' })
    })

    it('handles arguments that are already an object', async () => {
      let receivedArgs
      registerToolHandler('test_obj_args', async (args) => {
        receivedArgs = args
        return { success: true }
      })
      await executeToolCall({
        function: { name: 'test_obj_args', arguments: { key: 'value' } }
      })
      expect(receivedArgs).toEqual({ key: 'value' })
    })
  })

  // ─── setupToolHandlers + executeToolCall integration ─
  describe('setupToolHandlers', () => {
    let mockRouter
    let mockRoute

    beforeEach(() => {
      // Reset auto-created default workspace so tests start with a clean slate
      const ws = useWorkspaceStore()
      ws.workspaces = {}
      ws.currentWorkspace = null

      mockRouter = { push: vi.fn() }
      mockRoute = { name: 'WorkspaceDashboard', path: '/', params: {}, query: {} }
      setupToolHandlers(mockRouter, mockRoute)
    })

    // ── READING handlers ─────────────────────────────
    describe('get_workspaces', () => {
      it('returns empty workspaces array when no workspaces exist', async () => {
        const result = await executeToolCall({
          function: { name: 'get_workspaces', arguments: '{}' }
        })
        expect(result.tool).toBe('get_workspaces')
        expect(result.workspaces).toEqual([])
      })

      it('returns workspace summaries', async () => {
        seedWorkspace('TestWS', { cvs: { 'CV1': createCvDocument() } })
        const result = await executeToolCall({
          function: { name: 'get_workspaces', arguments: '{}' }
        })
        expect(result.workspaces).toHaveLength(1)
        expect(result.workspaces[0].name).toBe('TestWS')
      })

      it('returns multiple workspaces', async () => {
        seedWorkspace('WS-A')
        seedWorkspace('WS-B', { cvs: { 'CV1': createCvDocument() } })
        const result = await executeToolCall({
          function: { name: 'get_workspaces', arguments: '{}' }
        })
        expect(result.workspaces).toHaveLength(2)
      })
    })

    describe('get_workspace', () => {
      it('returns workspace data', async () => {
        seedWorkspace('TestWS')
        const result = await executeToolCall({
          function: { name: 'get_workspace', arguments: '{"workspace_name":"TestWS"}' }
        })
        expect(result.name).toBe('TestWS')
      })

      it('returns error when workspace_name missing', async () => {
        const result = await executeToolCall({
          function: { name: 'get_workspace', arguments: '{}' }
        })
        expect(result.error).toContain('workspace_name is required')
      })

      it('returns error when workspace not found', async () => {
        const result = await executeToolCall({
          function: { name: 'get_workspace', arguments: '{"workspace_name":"NoSuchWS"}' }
        })
        expect(result.error).toContain('not found')
      })
    })

    describe('get_cv', () => {
      it('returns CV data', async () => {
        seedWorkspace('WS1', { cvs: { 'MyCv': createCvDocument() } })
        const result = await executeToolCall({
          function: {
            name: 'get_cv',
            arguments: '{"workspace_name":"WS1","cv_name":"MyCv"}'
          }
        })
        expect(result.name).toBe('MyCv')
        expect(result.data).toBeDefined()
      })

      it('returns error when cv_name missing', async () => {
        const result = await executeToolCall({
          function: {
            name: 'get_cv',
            arguments: '{"workspace_name":"WS1"}'
          }
        })
        expect(result.error).toContain('cv_name is required')
      })

      it('returns error when workspace_name missing', async () => {
        const result = await executeToolCall({
          function: {
            name: 'get_cv',
            arguments: '{"cv_name":"MyCv"}'
          }
        })
        expect(result.error).toContain('workspace_name is required')
      })

      it('returns error when cv not found', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'get_cv',
            arguments: '{"workspace_name":"WS1","cv_name":"NoCv"}'
          }
        })
        expect(result.error).toContain('not found')
      })
    })

    describe('get_cover_letter', () => {
      it('returns cover letter data', async () => {
        seedWorkspace('WS1', {
          coverLetters: { 'MyCL': createCoverLetterDocument() }
        })
        const result = await executeToolCall({
          function: {
            name: 'get_cover_letter',
            arguments: '{"workspace_name":"WS1","cover_letter_name":"MyCL"}'
          }
        })
        expect(result.name).toBe('MyCL')
      })

      it('returns error when cover_letter_name missing', async () => {
        const result = await executeToolCall({
          function: {
            name: 'get_cover_letter',
            arguments: '{"workspace_name":"WS1"}'
          }
        })
        expect(result.error).toContain('cover_letter_name is required')
      })

      it('returns error when workspace_name missing', async () => {
        const result = await executeToolCall({
          function: {
            name: 'get_cover_letter',
            arguments: '{"cover_letter_name":"MyCL"}'
          }
        })
        expect(result.error).toContain('workspace_name is required')
      })
    })

    describe('get_workspace_context', () => {
      it('returns context value', async () => {
        seedWorkspace('WS1', {
          extra: { notes: { content: 'test', createdAt: Date.now() } }
        })
        const result = await executeToolCall({
          function: {
            name: 'get_workspace_context',
            arguments: '{"workspace_name":"WS1","context_key":"notes"}'
          }
        })
        expect(result.key).toBe('notes')
      })

      it('returns error when workspace_name missing', async () => {
        const result = await executeToolCall({
          function: { name: 'get_workspace_context', arguments: '{}' }
        })
        expect(result.error).toContain('workspace_name is required')
      })

      it('lists all context keys when context_key omitted', async () => {
        seedWorkspace('WS1', {
          extra: { job_posting: { content: 'some job', createdAt: Date.now() } }
        })
        const result = await executeToolCall({
          function: {
            name: 'get_workspace_context',
            arguments: '{"workspace_name":"WS1"}'
          }
        })
        expect(result.context_keys).toBeDefined()
        expect(result.context_keys).toContain('job_posting')
      })

      it('returns error for reserved key', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'get_workspace_context',
            arguments: '{"workspace_name":"WS1","context_key":"metadata"}'
          }
        })
        expect(result.error).toContain('reserved')
      })
    })

    describe('get_user_profile', () => {
      it('returns wrapped profile', async () => {
        const result = await executeToolCall({
          function: { name: 'get_user_profile', arguments: '{}' }
        })
        expect(result.tool).toBe('get_user_profile')
        expect(result).toHaveProperty('profile')
      })
    })

    // ── CREATION handlers ────────────────────────────
    describe('create_workspace', () => {
      it('creates workspace via tool call', async () => {
        const result = await executeToolCall({
          function: {
            name: 'create_workspace',
            arguments: '{"workspace_name":"NewWS"}'
          }
        })
        expect(result.success).toBe(true)
        const ws = useWorkspaceStore()
        expect(ws.workspaces['NewWS']).toBeDefined()
      })

      it('returns error when workspace_name missing', async () => {
        const result = await executeToolCall({
          function: { name: 'create_workspace', arguments: '{}' }
        })
        expect(result.error).toContain('workspace_name is required')
      })

      it('returns error when workspace already exists', async () => {
        seedWorkspace('ExistingWS')
        const result = await executeToolCall({
          function: {
            name: 'create_workspace',
            arguments: '{"workspace_name":"ExistingWS"}'
          }
        })
        expect(result.error).toContain('already exists')
      })
    })

    describe('create_cv', () => {
      it('creates CV with schema-compliant data', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'create_cv',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              cv_data: { name: 'TestCV' }
            })
          }
        })
        expect(result.success).toBe(true)
        expect(result.cv_name).toBe('TestCV')
      })

      it('returns error when cv_data is missing', async () => {
        const result = await executeToolCall({
          function: {
            name: 'create_cv',
            arguments: '{"workspace_name":"WS1"}'
          }
        })
        expect(result.error).toContain('cv_data is required')
      })

      it('returns error when cv_data.name is missing', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'create_cv',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              cv_data: { data: { personalInfo: {} } }
            })
          }
        })
        expect(result.error).toContain('cv_data.name is required')
      })

      it('returns error when workspace not found', async () => {
        const result = await executeToolCall({
          function: {
            name: 'create_cv',
            arguments: JSON.stringify({
              workspace_name: 'NoSuchWS',
              cv_data: { name: 'TestCV' }
            })
          }
        })
        expect(result.error).toContain('not found')
      })
    })

    describe('create_cover_letter', () => {
      it('creates cover letter with schema-compliant data', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'create_cover_letter',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              cover_letter_data: { name: 'TestCL' }
            })
          }
        })
        expect(result.success).toBe(true)
        expect(result.cover_letter_name).toBe('TestCL')
      })

      it('returns error when cover_letter_data is missing', async () => {
        const result = await executeToolCall({
          function: {
            name: 'create_cover_letter',
            arguments: '{"workspace_name":"WS1"}'
          }
        })
        expect(result.error).toContain('cover_letter_data is required')
      })

      it('returns error when cover_letter_data.name is missing', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'create_cover_letter',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              cover_letter_data: { data: { title: 'My Cover Letter' } }
            })
          }
        })
        expect(result.error).toContain('cover_letter_data.name is required')
      })
    })

    describe('add_workspace_context', () => {
      it('adds context via tool call', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'add_workspace_context',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              context_key: 'my_notes',
              context_content: 'Some notes content'
            })
          }
        })
        expect(result.success).toBe(true)
      })

      it('returns error when context_key already exists', async () => {
        seedWorkspace('WS1', {
          extra: { my_notes: { content: 'existing', createdAt: Date.now(), lastModified: Date.now() } }
        })
        const result = await executeToolCall({
          function: {
            name: 'add_workspace_context',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              context_key: 'my_notes',
              context_content: 'Duplicate content'
            })
          }
        })
        expect(result.error).toContain('already exists')
      })

      it('returns error when context_key is a reserved word', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'add_workspace_context',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              context_key: 'metadata',
              context_content: 'Some content'
            })
          }
        })
        expect(result.error).toContain('reserved')
      })
    })

    // ── EDITING handlers ─────────────────────────────
    describe('edit_workspace', () => {
      it('renames workspace via tool call', async () => {
        seedWorkspace('OldName')
        const result = await executeToolCall({
          function: {
            name: 'edit_workspace',
            arguments: JSON.stringify({
              current_workspace_name: 'OldName',
              new_workspace_name: 'NewName'
            })
          }
        })
        expect(result.success).toBe(true)
      })

      it('returns error when current_workspace_name not found', async () => {
        const result = await executeToolCall({
          function: {
            name: 'edit_workspace',
            arguments: JSON.stringify({
              current_workspace_name: 'NoSuchWS',
              new_workspace_name: 'NewName'
            })
          }
        })
        expect(result.error).toContain('not found')
      })

      it('returns error when new_workspace_name already exists', async () => {
        seedWorkspace('WS1')
        seedWorkspace('WS2')
        const result = await executeToolCall({
          function: {
            name: 'edit_workspace',
            arguments: JSON.stringify({
              current_workspace_name: 'WS1',
              new_workspace_name: 'WS2'
            })
          }
        })
        expect(result.error).toContain('already exists')
      })
    })

    describe('edit_cv', () => {
      it('edits CV via tool call', async () => {
        seedWorkspace('WS1', { cvs: { 'MyCv': createCvDocument() } })
        const result = await executeToolCall({
          function: {
            name: 'edit_cv',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              current_cv_name: 'MyCv',
              cv_data: {
                data: { personalInfo: { name: 'Updated' } }
              }
            })
          }
        })
        expect(result.success).toBe(true)
        expect(result.params_received).toBeDefined()
      })

      it('returns error when cv_data is missing', async () => {
        const result = await executeToolCall({
          function: {
            name: 'edit_cv',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              current_cv_name: 'MyCv'
            })
          }
        })
        expect(result.error).toContain('cv_data is required')
      })

      it('returns error when CV not found', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'edit_cv',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              current_cv_name: 'NoCv',
              cv_data: { data: { personalInfo: { name: 'Updated' } } }
            })
          }
        })
        expect(result.error).toContain('not found')
      })

      it('renames CV when cv_data.name provided', async () => {
        seedWorkspace('WS1', { cvs: { 'OldCV': createCvDocument() } })
        const result = await executeToolCall({
          function: {
            name: 'edit_cv',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              current_cv_name: 'OldCV',
              cv_data: { name: 'NewCV' }
            })
          }
        })
        expect(result.success).toBe(true)
        const ws = useWorkspaceStore()
        expect(ws.workspaces['WS1'].cvs['NewCV']).toBeDefined()
      })
    })

    describe('edit_cover_letter', () => {
      it('edits cover letter via tool call', async () => {
        seedWorkspace('WS1', {
          coverLetters: { 'MyCL': createCoverLetterDocument() }
        })
        const result = await executeToolCall({
          function: {
            name: 'edit_cover_letter',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              current_cover_letter_name: 'MyCL',
              cover_letter_data: {
                data: { title: 'Updated Title' }
              }
            })
          }
        })
        expect(result.success).toBe(true)
      })

      it('returns error when cover_letter_data is missing', async () => {
        const result = await executeToolCall({
          function: {
            name: 'edit_cover_letter',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              current_cover_letter_name: 'MyCL'
            })
          }
        })
        expect(result.error).toContain('cover_letter_data is required')
      })

      it('returns error when cover letter not found', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'edit_cover_letter',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              current_cover_letter_name: 'NoCL',
              cover_letter_data: { data: { title: 'Title' } }
            })
          }
        })
        expect(result.error).toContain('not found')
      })
    })

    describe('edit_workspace_context', () => {
      it('updates context via tool call', async () => {
        seedWorkspace('WS1', {
          extra: { notes: { content: 'old', createdAt: Date.now(), lastModified: Date.now() } }
        })
        const result = await executeToolCall({
          function: {
            name: 'edit_workspace_context',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              context_key: 'notes',
              new_context_content: 'updated content'
            })
          }
        })
        expect(result.success).toBe(true)
      })

      it('returns error when context_key does not exist', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'edit_workspace_context',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              context_key: 'nokey',
              new_context_content: 'content'
            })
          }
        })
        expect(result.error).toContain('not found')
      })
    })

    describe('edit_user_profile', () => {
      it('updates profile via tool call', async () => {
        const result = await executeToolCall({
          function: {
            name: 'edit_user_profile',
            arguments: JSON.stringify({
              professionalExperience: 'Senior developer with 10 years exp'
            })
          }
        })
        expect(result.success).toBe(true)
        const profile = useUserProfileStore()
        expect(profile.professionalExperience).toBe('Senior developer with 10 years exp')
      })

      it('returns error when professionalExperience missing', async () => {
        const result = await executeToolCall({
          function: { name: 'edit_user_profile', arguments: '{}' }
        })
        expect(result.error).toContain('professionalExperience is required')
      })

      it('returns error when professionalExperience is not a string', async () => {
        const result = await executeToolCall({
          function: {
            name: 'edit_user_profile',
            arguments: '{"professionalExperience": 123}'
          }
        })
        expect(result.error).toContain('string')
      })
    })

    // ── NAVIGATION handler ───────────────────────────
    describe('go_to', () => {
      it('navigates to general_dashboard', async () => {
        const result = await executeToolCall({
          function: {
            name: 'go_to',
            arguments: '{"view":"general_dashboard"}'
          }
        })
        expect(result.success).toBe(true)
        expect(mockRouter.push).toHaveBeenCalled()
      })

      it('navigates to workspace_dashboard', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'go_to',
            arguments: '{"view":"workspace_dashboard","workspace_name":"WS1"}'
          }
        })
        expect(result.success).toBe(true)
      })

      it('navigates to cv_editor', async () => {
        seedWorkspace('WS1', { cvs: { 'MyCv': createCvDocument() } })
        const result = await executeToolCall({
          function: {
            name: 'go_to',
            arguments: '{"view":"cv_editor","workspace_name":"WS1","cv_name":"MyCv"}'
          }
        })
        expect(result.success).toBe(true)
      })

      it('returns error for unknown view', async () => {
        const result = await executeToolCall({
          function: {
            name: 'go_to',
            arguments: '{"view":"unknown_view"}'
          }
        })
        expect(result.error).toBeDefined()
      })

      it('returns error for workspace_dashboard without workspace_name', async () => {
        const result = await executeToolCall({
          function: {
            name: 'go_to',
            arguments: '{"view":"workspace_dashboard"}'
          }
        })
        expect(result.error).toBeDefined()
      })
    })

    // ── UTILITY: job_analysis handler ─────────────────
    describe('job_analysis', () => {
      beforeEach(() => {
        // Set up settings store with API key and model
        const settings = useSettingsStore()
        settings.openRouterKey = 'test-api-key'
        settings.taskModels = {
          jobAnalysis: 'test-model',
          matchReport: 'test-model',
          companyResearch: 'test-model'
        }

        // Set up system prompts store
        useSystemPromptsStore()
        // The default prompt is used since we load from file (mocked)
      })

      it('returns error when workspace_name missing', async () => {
        const result = await executeToolCall({
          function: {
            name: 'job_analysis',
            arguments: JSON.stringify({
              source_context_key: 'job_posting',
              target_context_key: 'job_analysis'
            })
          }
        })
        expect(result.error).toContain('workspace_name is required')
      })

      it('returns error when source_context_key missing', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'job_analysis',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              target_context_key: 'job_analysis'
            })
          }
        })
        expect(result.error).toContain('source_context_key is required')
      })

      it('returns error when target_context_key missing', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'job_analysis',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              source_context_key: 'job_posting'
            })
          }
        })
        expect(result.error).toContain('target_context_key is required')
      })

      it('returns error when source context is empty', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'job_analysis',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              source_context_key: 'job_posting',
              target_context_key: 'job_analysis'
            })
          }
        })
        expect(result.error).toBeDefined()
      })

      it('runs analysis and stores result on success', async () => {
        seedWorkspace('WS1', {
          extra: {
            job_posting: {
              content: 'Looking for a senior developer with 5 years exp',
              createdAt: Date.now(),
              lastModified: Date.now()
            }
          }
        })

        // Mock the AI response with text block
        streamAndCollect.mockResolvedValueOnce(
          'Some preamble\n```text\nJob Title: Senior Developer\nCompany: Acme\n```\nSome conclusion'
        )

        const result = await executeToolCall({
          function: {
            name: 'job_analysis',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              source_context_key: 'job_posting',
              target_context_key: 'job_analysis'
            })
          }
        })
        expect(result.success).toBe(true)
        expect(result.message).toContain('job_analysis')

        // Verify it was stored in workspace context
        const ws = useWorkspaceStore()
        expect(ws.workspaces['WS1'].job_analysis).toBeDefined()
        expect(ws.workspaces['WS1'].job_analysis.content).toContain('Senior Developer')
      })

      it('returns error when API key is not configured', async () => {
        const settings = useSettingsStore()
        settings.openRouterKey = ''

        seedWorkspace('WS1', {
          extra: {
            job_posting: {
              content: 'Job content',
              createdAt: Date.now(),
              lastModified: Date.now()
            }
          }
        })

        const result = await executeToolCall({
          function: {
            name: 'job_analysis',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              source_context_key: 'job_posting',
              target_context_key: 'job_analysis'
            })
          }
        })
        expect(result.error).toContain('API key')
      })
    })

    // ── UTILITY: generate_match_report handler ────────
    describe('generate_match_report', () => {
      beforeEach(() => {
        const settings = useSettingsStore()
        settings.openRouterKey = 'test-api-key'
        settings.taskModels = {
          jobAnalysis: 'test-model',
          matchReport: 'test-model',
          companyResearch: 'test-model'
        }
      })

      it('returns error when workspace_name missing', async () => {
        const result = await executeToolCall({
          function: {
            name: 'generate_match_report',
            arguments: JSON.stringify({
              source_context_key: 'job_analysis',
              target_context_key: 'match_report'
            })
          }
        })
        expect(result.error).toContain('workspace_name is required')
      })

      it('returns error when source_context_key missing', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'generate_match_report',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              target_context_key: 'match_report'
            })
          }
        })
        expect(result.error).toContain('source_context_key is required')
      })

      it('returns error when target_context_key missing', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'generate_match_report',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              source_context_key: 'job_analysis'
            })
          }
        })
        expect(result.error).toContain('target_context_key is required')
      })

      it('returns error when API key is not configured', async () => {
        const settings = useSettingsStore()
        settings.openRouterKey = ''

        seedWorkspace('WS1', {
          extra: {
            job_analysis: {
              content: 'Job analysis content',
              createdAt: Date.now(),
              lastModified: Date.now()
            }
          }
        })

        const profile = useUserProfileStore()
        profile.updateProfessionalExperience('5 years of experience')

        const result = await executeToolCall({
          function: {
            name: 'generate_match_report',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              source_context_key: 'job_analysis',
              target_context_key: 'match_report'
            })
          }
        })
        expect(result.error).toContain('API key')
      })

      it('returns error when user profile is empty', async () => {
        seedWorkspace('WS1', {
          extra: {
            job_analysis: {
              content: 'Job analysis content',
              createdAt: Date.now(),
              lastModified: Date.now()
            }
          }
        })

        const result = await executeToolCall({
          function: {
            name: 'generate_match_report',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              source_context_key: 'job_analysis',
              target_context_key: 'match_report'
            })
          }
        })
        expect(result.error).toContain('profile')
      })

      it('generates and stores match report on success', async () => {
        // Set up user profile
        const profile = useUserProfileStore()
        profile.updateProfessionalExperience('10 years of JavaScript experience')

        seedWorkspace('WS1', {
          extra: {
            job_analysis: {
              content: 'Looking for JS developer',
              createdAt: Date.now(),
              lastModified: Date.now()
            }
          }
        })

        streamAndCollect.mockResolvedValueOnce(
          '```text\nMatch Score: 85%\nStrong fit for this role.\n```'
        )

        const result = await executeToolCall({
          function: {
            name: 'generate_match_report',
            arguments: JSON.stringify({
              workspace_name: 'WS1',
              source_context_key: 'job_analysis',
              target_context_key: 'match_report'
            })
          }
        })
        expect(result.success).toBe(true)
        expect(result.report).toContain('Match Score')
      })
    })

    // ── UTILITY: research_company handler ─────────────
    describe('research_company', () => {
      beforeEach(() => {
        const settings = useSettingsStore()
        settings.openRouterKey = 'test-api-key'
        settings.taskModels = {
          companyResearch: 'test-model'
        }
      })

      it('returns error when company_info missing', async () => {
        const result = await executeToolCall({
          function: {
            name: 'research_company',
            arguments: '{}'
          }
        })
        expect(result.error).toContain('company_info is required')
      })

      it('returns error when API key not configured', async () => {
        const settings = useSettingsStore()
        settings.openRouterKey = ''

        const result = await executeToolCall({
          function: {
            name: 'research_company',
            arguments: '{"company_info":"Acme Corp"}'
          }
        })
        expect(result.error).toContain('API key')
      })

      it('returns research result on success', async () => {
        // Need system prompt set up
        useSystemPromptsStore()

        streamAndCollect.mockResolvedValueOnce('Acme Corp is a well-established company...')

        const result = await executeToolCall({
          function: {
            name: 'research_company',
            arguments: '{"company_info":"Acme Corp"}'
          }
        })
        expect(result.success).toBe(true)
        expect(result.research).toContain('Acme Corp')
      })
    })

    // ── DELETION handlers ────────────────────────────
    describe('delete_workspace', () => {
      it('delegates to deleteWorkspaceWithConfirm', async () => {
        seedWorkspace('WS1')
        // The deletion will hang waiting for confirmation, so we don't await fully
        // Just verify the tool is registered and callable
        const promise = executeToolCall({
          function: {
            name: 'delete_workspace',
            arguments: '{"workspace_name":"WS1"}'
          }
        })
        // This is an async operation that waits for user confirmation
        // We can't easily test the full flow here, but verify it's invoked
        expect(promise).toBeInstanceOf(Promise)
      })

      it('returns error immediately when workspace not found', async () => {
        const result = await executeToolCall({
          function: {
            name: 'delete_workspace',
            arguments: '{"workspace_name":"NoSuchWS"}'
          }
        })
        expect(result.error).toContain('not found')
      })
    })

    describe('delete_cv', () => {
      it('returns error immediately when workspace not found', async () => {
        const result = await executeToolCall({
          function: {
            name: 'delete_cv',
            arguments: '{"workspace_name":"NoSuchWS","cv_name":"MyCv"}'
          }
        })
        expect(result.error).toContain('not found')
      })

      it('returns error immediately when cv not found', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'delete_cv',
            arguments: '{"workspace_name":"WS1","cv_name":"NoCv"}'
          }
        })
        expect(result.error).toContain('not found')
      })
    })

    describe('delete_cover_letter', () => {
      it('returns error immediately when cover letter not found', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'delete_cover_letter',
            arguments: '{"workspace_name":"WS1","cover_letter_name":"NoCL"}'
          }
        })
        expect(result.error).toContain('not found')
      })
    })

    describe('delete_workspace_context', () => {
      it('returns error immediately for reserved key', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'delete_workspace_context',
            arguments: '{"workspace_name":"WS1","context_key":"metadata"}'
          }
        })
        expect(result.error).toContain('reserved')
      })

      it('returns error immediately when context key not found', async () => {
        seedWorkspace('WS1')
        const result = await executeToolCall({
          function: {
            name: 'delete_workspace_context',
            arguments: '{"workspace_name":"WS1","context_key":"nokey"}'
          }
        })
        expect(result.error).toContain('not found')
      })
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkspaceStore } from '../../stores/workspace'
import { useUserProfileStore } from '../../stores/userProfile'
import { useSettingsStore } from '../../stores/settings'
import { createCvDocument, createCoverLetterDocument } from '../../test/factories'

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
  chatWithTools: vi.fn()
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
      const names = AI_TOOLS.map((t) => t.function.name)
      expect(names).toContain('go_to')
      expect(names).toContain('get_workspaces')
      expect(names).toContain('create_cv')
      expect(names).toContain('edit_cv')
      expect(names).toContain('delete_cv')
      expect(names).toContain('list_agents')
      expect(names).toContain('summon_agent')
    })
  })

  // ─── TOOL_DISPLAY_NAMES ─────────────────────────────
  describe('TOOL_DISPLAY_NAMES', () => {
    it('has a display name for every tool', () => {
      const toolNames = AI_TOOLS.map((t) => t.function.name)
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

    it('analyze tools include list_agents and summon_agent', () => {
      expect(COMMAND_TOOLS.analyze).toContain('list_agents')
      expect(COMMAND_TOOLS.analyze).toContain('summon_agent')
    })

    it('match tools include list_agents and summon_agent', () => {
      expect(COMMAND_TOOLS.match).toContain('list_agents')
      expect(COMMAND_TOOLS.match).toContain('summon_agent')
    })

    it('research tools include list_agents and summon_agent', () => {
      expect(COMMAND_TOOLS.research).toContain('list_agents')
      expect(COMMAND_TOOLS.research).toContain('summon_agent')
    })

    it('cv and cover commands are defined', () => {
      expect(COMMAND_TOOLS.cv).toBeDefined()
      expect(COMMAND_TOOLS.cover).toBeDefined()
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
      const names = tools.map((t) => t.function.name)
      expect(names).toContain('list_agents')
      expect(names).toContain('summon_agent')
    })

    it('filters tools for match command', () => {
      const tools = getToolsForCommand('match')
      const names = tools.map((t) => t.function.name)
      expect(names).toContain('list_agents')
      expect(names).toContain('summon_agent')
      expect(names).toContain('get_user_profile')
    })

    it('filters tools for research command', () => {
      const tools = getToolsForCommand('research')
      const names = tools.map((t) => t.function.name)
      expect(names).toContain('list_agents')
      expect(names).toContain('summon_agent')
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
        seedWorkspace('TestWS', { cvs: { CV1: createCvDocument() } })
        const result = await executeToolCall({
          function: { name: 'get_workspaces', arguments: '{}' }
        })
        expect(result.workspaces).toHaveLength(1)
        expect(result.workspaces[0].name).toBe('TestWS')
      })

      it('returns multiple workspaces', async () => {
        seedWorkspace('WS-A')
        seedWorkspace('WS-B', { cvs: { CV1: createCvDocument() } })
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
        seedWorkspace('WS1', { cvs: { MyCv: createCvDocument() } })
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
          coverLetters: { MyCL: createCoverLetterDocument() }
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
          extra: {
            my_notes: { content: 'existing', createdAt: Date.now(), lastModified: Date.now() }
          }
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
        seedWorkspace('WS1', { cvs: { MyCv: createCvDocument() } })
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
        seedWorkspace('WS1', { cvs: { OldCV: createCvDocument() } })
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
          coverLetters: { MyCL: createCoverLetterDocument() }
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
        seedWorkspace('WS1', { cvs: { MyCv: createCvDocument() } })
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

    // ── AGENTS: list_agents handler ───────────────────
    describe('list_agents', () => {
      it('returns a list of agents', async () => {
        const result = await executeToolCall({
          function: { name: 'list_agents', arguments: '{}' }
        })
        expect(result.agents).toBeDefined()
        expect(Array.isArray(result.agents)).toBe(true)
        expect(result.agents.length).toBeGreaterThan(0)
      })

      it('each agent has id, name, and description', async () => {
        const result = await executeToolCall({
          function: { name: 'list_agents', arguments: '{}' }
        })
        for (const agent of result.agents) {
          expect(agent).toHaveProperty('id')
          expect(agent).toHaveProperty('name')
          expect(agent).toHaveProperty('description')
        }
      })

      it('includes the built-in agents', async () => {
        const result = await executeToolCall({
          function: { name: 'list_agents', arguments: '{}' }
        })
        const ids = result.agents.map((a) => a.id)
        expect(ids).toContain('job-analysis')
        expect(ids).toContain('match-report')
        expect(ids).toContain('company-research')
        expect(ids).toContain('cv-generation')
        expect(ids).toContain('cover-letter')
      })
    })

    // ── AGENTS: summon_agent handler ──────────────────
    describe('summon_agent', () => {
      beforeEach(() => {
        const settings = useSettingsStore()
        settings.openRouterKey = 'test-api-key'
      })

      it('returns error when agentId is missing', async () => {
        const result = await executeToolCall({
          function: { name: 'summon_agent', arguments: '{"input":"some text"}' }
        })
        expect(result.error).toBeDefined()
        expect(result.error).toContain('agentId')
      })

      it('returns error when input is missing', async () => {
        const result = await executeToolCall({
          function: { name: 'summon_agent', arguments: '{"agentId":"job-analysis"}' }
        })
        expect(result.error).toBeDefined()
        expect(result.error).toContain('input')
      })

      it('returns error when agent is not found', async () => {
        const result = await executeToolCall({
          function: {
            name: 'summon_agent',
            arguments: '{"agentId":"nonexistent-agent","input":"some text"}'
          }
        })
        expect(result.error).toBeDefined()
        expect(result.error).toContain('not found')
      })

      it('returns error when API key is not configured', async () => {
        const settings = useSettingsStore()
        settings.openRouterKey = ''
        const result = await executeToolCall({
          function: {
            name: 'summon_agent',
            arguments: '{"agentId":"job-analysis","input":"some text"}'
          }
        })
        expect(result.error).toBeDefined()
        expect(result.error).toContain('API key')
      })

      it('runs agent and returns result', async () => {
        streamAndCollect.mockResolvedValueOnce('```text\nGreat analysis\n```')
        const result = await executeToolCall({
          function: {
            name: 'summon_agent',
            arguments: '{"agentId":"job-analysis","input":"Senior Dev role"}'
          }
        })
        expect(result.success).toBe(true)
        expect(result.result).toContain('Great analysis')
      })

      it('appends :online when agent has webSearch enabled', async () => {
        streamAndCollect.mockResolvedValueOnce('```text\nResult\n```')
        await executeToolCall({
          function: {
            name: 'summon_agent',
            arguments: '{"agentId":"job-analysis","input":"some job"}'
          }
        })
        // job-analysis has webSearch: true, so :online should be appended
        expect(streamAndCollect).toHaveBeenCalled()
        const callArgs = streamAndCollect.mock.calls[streamAndCollect.mock.calls.length - 1]
        expect(callArgs[1]).toMatch(/:online$/)
      })

      it('stores output to workspace context when storeOutputToContextKey is set', async () => {
        seedWorkspace('WS1')
        streamAndCollect.mockResolvedValueOnce('```text\nAnalysis result\n```')
        const result = await executeToolCall({
          function: {
            name: 'summon_agent',
            arguments: JSON.stringify({
              agentId: 'job-analysis',
              input: 'Senior Dev role',
              workspace_name: 'WS1',
              storeOutputToContextKey: 'job_analysis'
            })
          }
        })
        expect(result.success).toBe(true)
        const ws = useWorkspaceStore()
        expect(ws.workspaces['WS1'].job_analysis).toBeDefined()
      })

      it('forwards onProgress to streamAndCollect', async () => {
        streamAndCollect.mockResolvedValueOnce('```text\nResult\n```')
        const onProgress = vi.fn()
        await executeToolCall(
          {
            function: {
              name: 'summon_agent',
              arguments: '{"agentId":"job-analysis","input":"some job"}'
            }
          },
          onProgress
        )
        const callArgs = streamAndCollect.mock.calls[streamAndCollect.mock.calls.length - 1]
        expect(callArgs[3]).toBe(onProgress)
      })
    })

    // ── executeToolCall onProgress forwarding ─────────────
    describe('executeToolCall with onProgress', () => {
      it('passes onProgress to handler as second argument', async () => {
        const mockHandler = vi.fn().mockResolvedValue({ success: true })
        registerToolHandler('_test_progress_tool', mockHandler)

        const onProgress = vi.fn()
        await executeToolCall(
          { function: { name: '_test_progress_tool', arguments: '{"foo":"bar"}' } },
          onProgress
        )

        expect(mockHandler).toHaveBeenCalledWith({ foo: 'bar' }, onProgress)
      })

      it('passes null when onProgress is not provided', async () => {
        const mockHandler = vi.fn().mockResolvedValue({ success: true })
        registerToolHandler('_test_no_progress', mockHandler)

        await executeToolCall({ function: { name: '_test_no_progress', arguments: '{}' } })

        expect(mockHandler).toHaveBeenCalledWith({}, undefined)
      })
    })
  })
})

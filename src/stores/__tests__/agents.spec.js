import { describe, it, expect, beforeEach } from 'vitest'
import { useAgentsStore } from '../agents'

describe('agents store', () => {
  let store

  beforeEach(() => {
    store = useAgentsStore()
  })

  // ─── Initial state ───────────────────────────────────────
  describe('initial state', () => {
    it('has the 5 built-in agents', () => {
      const agents = store.getAllAgents()
      const ids = agents.map((a) => a.id)
      expect(ids).toContain('job-analysis')
      expect(ids).toContain('match-report')
      expect(ids).toContain('company-research')
      expect(ids).toContain('cv-generation')
      expect(ids).toContain('cover-letter')
    })

    it('built-in agents have isBuiltIn: true', () => {
      const builtIns = store.getBuiltInAgents()
      expect(builtIns.every((a) => a.isBuiltIn)).toBe(true)
    })

    it('built-in agents have no custom agents initially', () => {
      const custom = store.getCustomAgents()
      expect(custom).toHaveLength(0)
    })

    it('all built-in agents have required fields', () => {
      const agents = store.getBuiltInAgents()
      for (const agent of agents) {
        expect(agent.id).toBeTruthy()
        expect(agent.name).toBeTruthy()
        expect(agent.description).toBeTruthy()
        expect(agent.model).toBeTruthy()
        expect(typeof agent.webSearch).toBe('boolean')
        expect(typeof agent.isBuiltIn).toBe('boolean')
      }
    })
  })

  // ─── getAgent ────────────────────────────────────────────
  describe('getAgent', () => {
    it('returns agent by ID', () => {
      const agent = store.getAgent('job-analysis')
      expect(agent).toBeDefined()
      expect(agent.id).toBe('job-analysis')
    })

    it('returns null for unknown ID', () => {
      expect(store.getAgent('nonexistent')).toBeNull()
    })

    it('returns null for undefined', () => {
      expect(store.getAgent(undefined)).toBeNull()
    })
  })

  // ─── getBuiltInAgents ────────────────────────────────────
  describe('getBuiltInAgents', () => {
    it('returns all 5 built-in agents', () => {
      expect(store.getBuiltInAgents()).toHaveLength(5)
    })
  })

  // ─── getCustomAgents ────────────────────────────────────
  describe('getCustomAgents', () => {
    it('returns empty array when no custom agents', () => {
      expect(store.getCustomAgents()).toHaveLength(0)
    })

    it('returns custom agents after creation', () => {
      store.createAgent({
        name: 'Test Agent',
        description: 'A test',
        systemPrompt: 'Be helpful',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      expect(store.getCustomAgents()).toHaveLength(1)
    })
  })

  // ─── getSlashCommandAgents ───────────────────────────────
  describe('getSlashCommandAgents', () => {
    it('returns only agents with a slash command set', () => {
      const agents = store.getSlashCommandAgents()
      expect(agents.every((a) => a.slashCommand)).toBe(true)
    })

    it('includes all 5 built-in agents (each has a slash command)', () => {
      const agents = store.getSlashCommandAgents()
      expect(agents).toHaveLength(5)
    })

    it('includes custom agents with slashCommand set', () => {
      store.createAgent({
        name: 'Planner',
        description: 'Plans things',
        systemPrompt: 'Be a planner',
        model: 'openai/gpt-4o-mini',
        webSearch: false,
        slashCommand: 'plan'
      })
      const agents = store.getSlashCommandAgents()
      expect(agents.some((a) => a.slashCommand === 'plan')).toBe(true)
    })

    it('excludes custom agents without a slash command', () => {
      store.createAgent({
        name: 'No Command',
        description: 'No slash command',
        systemPrompt: 'Do stuff',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      const agents = store.getSlashCommandAgents()
      expect(agents.every((a) => a.slashCommand)).toBe(true)
    })
  })

  // ─── getAgentBySlashCommand ──────────────────────────────
  describe('getAgentBySlashCommand', () => {
    it('returns the agent matching the slug', () => {
      const agent = store.getAgentBySlashCommand('analyze')
      expect(agent).toBeDefined()
      expect(agent.id).toBe('job-analysis')
    })

    it('returns null for unknown slug', () => {
      expect(store.getAgentBySlashCommand('nonexistent')).toBeNull()
    })
  })

  // ─── createAgent ─────────────────────────────────────────
  describe('createAgent', () => {
    it('creates a new custom agent', () => {
      const result = store.createAgent({
        name: 'My Agent',
        description: 'Does stuff',
        systemPrompt: 'Be a helper',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      expect(result.success).toBe(true)
      expect(result.id).toBeTruthy()
      expect(store.getAgent(result.id)).toBeDefined()
    })

    it('assigns isBuiltIn: false to custom agents', () => {
      const result = store.createAgent({
        name: 'Custom',
        description: 'Custom agent',
        systemPrompt: 'Do things',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      const agent = store.getAgent(result.id)
      expect(agent.isBuiltIn).toBe(false)
    })

    it('generates a slug-based ID from name', () => {
      const result = store.createAgent({
        name: 'My Test Agent',
        description: 'Testing',
        systemPrompt: 'Do stuff',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      expect(result.id).toMatch(/^my-test-agent/)
    })

    it('deduplicates IDs when name conflicts', () => {
      const r1 = store.createAgent({
        name: 'Duplicate',
        description: 'First',
        systemPrompt: 'First',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      const r2 = store.createAgent({
        name: 'Duplicate',
        description: 'Second',
        systemPrompt: 'Second',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      expect(r1.id).not.toBe(r2.id)
    })

    it('rejects empty name', () => {
      const result = store.createAgent({
        name: '',
        description: 'X',
        systemPrompt: 'X',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects empty model', () => {
      const result = store.createAgent({
        name: 'Valid Name',
        description: 'X',
        systemPrompt: 'X',
        model: '',
        webSearch: false
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty systemPrompt', () => {
      const result = store.createAgent({
        name: 'Valid Name',
        description: 'X',
        systemPrompt: '',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid slash command slug', () => {
      const result = store.createAgent({
        name: 'Valid',
        description: 'X',
        systemPrompt: 'X',
        model: 'openai/gpt-4o-mini',
        webSearch: false,
        slashCommand: 'Invalid Slug!'
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('slash command')
    })

    it('rejects duplicate slash command', () => {
      const result = store.createAgent({
        name: 'Conflict',
        description: 'X',
        systemPrompt: 'X',
        model: 'openai/gpt-4o-mini',
        webSearch: false,
        slashCommand: 'analyze' // built-in uses 'analyze'
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('analyze')
    })

    it('stores slashCommand and slashInjectionPrompt', () => {
      const result = store.createAgent({
        name: 'Planner',
        description: 'Plan tasks',
        systemPrompt: 'Be a planner',
        model: 'openai/gpt-4o-mini',
        webSearch: false,
        slashCommand: 'plan',
        slashInjectionPrompt: 'Use the planner agent.'
      })
      const agent = store.getAgent(result.id)
      expect(agent.slashCommand).toBe('plan')
      expect(agent.slashInjectionPrompt).toBe('Use the planner agent.')
    })
  })

  // ─── updateAgent ─────────────────────────────────────────
  describe('updateAgent', () => {
    it('updates a custom agent', () => {
      const { id } = store.createAgent({
        name: 'Old Name',
        description: 'X',
        systemPrompt: 'X',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      const result = store.updateAgent(id, { name: 'New Name' })
      expect(result.success).toBe(true)
      expect(store.getAgent(id).name).toBe('New Name')
    })

    it("updates a built-in agent's model", () => {
      const result = store.updateAgent('job-analysis', { model: 'custom/model' })
      expect(result.success).toBe(true)
      expect(store.getAgent('job-analysis').model).toBe('custom/model')
    })

    it("updates a built-in agent's system prompt", () => {
      const result = store.updateAgent('job-analysis', { systemPrompt: 'Custom prompt' })
      expect(result.success).toBe(true)
      expect(store.getAgent('job-analysis').systemPrompt).toBe('Custom prompt')
    })

    it('returns error for nonexistent agent', () => {
      const result = store.updateAgent('nonexistent', { name: 'X' })
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('returns error for empty name', () => {
      const { id } = store.createAgent({
        name: 'Agent',
        description: 'X',
        systemPrompt: 'X',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      const result = store.updateAgent(id, { name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects duplicate slash command on update', () => {
      const { id } = store.createAgent({
        name: 'Agent',
        description: 'X',
        systemPrompt: 'X',
        model: 'openai/gpt-4o-mini',
        webSearch: false,
        slashCommand: 'mycommand'
      })
      const result = store.updateAgent(id, { slashCommand: 'analyze' })
      expect(result.success).toBe(false)
    })
  })

  // ─── deleteAgent ─────────────────────────────────────────
  describe('deleteAgent', () => {
    it('deletes a custom agent', () => {
      const { id } = store.createAgent({
        name: 'To Delete',
        description: 'X',
        systemPrompt: 'X',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      const result = store.deleteAgent(id)
      expect(result.success).toBe(true)
      expect(store.getAgent(id)).toBeNull()
    })

    it('rejects deleting a built-in agent', () => {
      const result = store.deleteAgent('job-analysis')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Built-in')
    })

    it('returns error for nonexistent agent', () => {
      const result = store.deleteAgent('nonexistent')
      expect(result.success).toBe(false)
    })
  })

  // ─── resetAgentPrompt ────────────────────────────────────
  describe('resetAgentPrompt', () => {
    it('resets system prompt to null for built-in agent', () => {
      store.updateAgent('job-analysis', { systemPrompt: 'Custom prompt' })
      const result = store.resetAgentPrompt('job-analysis')
      expect(result.success).toBe(true)
      expect(store.getAgent('job-analysis').systemPrompt).toBeNull()
    })

    it('returns error for custom agent', () => {
      const { id } = store.createAgent({
        name: 'Custom',
        description: 'X',
        systemPrompt: 'X',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      const result = store.resetAgentPrompt(id)
      expect(result.success).toBe(false)
    })

    it('returns error for nonexistent agent', () => {
      const result = store.resetAgentPrompt('nonexistent')
      expect(result.success).toBe(false)
    })
  })

  // ─── Persistence ─────────────────────────────────────────
  describe('persistence', () => {
    it('auto-saves to localStorage on agent creation', async () => {
      const { nextTick } = await import('vue')
      store.createAgent({
        name: 'Persisted',
        description: 'X',
        systemPrompt: 'X',
        model: 'openai/gpt-4o-mini',
        webSearch: false
      })
      await nextTick()
      expect(localStorage.setItem).toHaveBeenCalledWith('app-lycan-agents', expect.any(String))
    })
  })
})

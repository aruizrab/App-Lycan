import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'app-lycan-agents'

// Old storage keys for migration
const OLD_SYSTEM_PROMPTS_KEY = 'app-lycan-system-prompts'
const OLD_CATEGORIES_KEY = 'app-lycan-system-prompt-categories'
const OLD_SETTINGS_KEY = 'app-lycan-ui-settings'

// Mapping from old PROMPT_TYPES / AI_COMMAND_TYPES to new agent IDs
const OLD_TYPE_TO_AGENT_ID = {
  jobAnalysis: 'job-analysis',
  matchReport: 'match-report',
  companyResearch: 'company-research',
  cvGeneration: 'cv-generation',
  coverLetter: 'cover-letter'
}

/**
 * Built-in agent definitions.
 * systemPrompt: null means "load from public/prompts/agents/{id}.md at runtime"
 */
const BUILT_IN_AGENTS = [
  {
    id: 'job-analysis',
    name: 'Job Analysis',
    description:
      'Analyzes job postings and extracts structured requirements, skills, responsibilities, and ATS keywords. Input: raw job posting text or URL content. Output: comprehensive HTML analysis. Store result with storeOutputToContextKey "job_analysis".',
    systemPrompt: null,
    model: 'perplexity/sonar-pro',
    webSearch: true,
    isBuiltIn: true,
    slashCommand: 'analyze',
    slashInjectionPrompt:
      'Use the job-analysis agent to analyze the job posting in this workspace. First read the workspace context for any existing job posting or job_posting key, then call summon_agent with agentId "job-analysis", passing the job posting text as input. Store the result with storeOutputToContextKey "job_analysis".'
  },
  {
    id: 'match-report',
    name: 'Match Report',
    description:
      'Compares the user professional profile against a job analysis and generates a comprehensive match report with scoring (0–100), strengths, gaps, and strategic recommendations. Input: user profile + job analysis combined as text. Store result with storeOutputToContextKey "match_report".',
    systemPrompt: null,
    model: 'openai/gpt-4o-mini',
    webSearch: false,
    isBuiltIn: true,
    slashCommand: 'match',
    slashInjectionPrompt:
      'Use the match-report agent to generate a profile-to-job match report. First get the user profile with get_user_profile and the job analysis from workspace context (key "job_analysis"), then pass them as combined input to summon_agent with agentId "match-report". Store the result with storeOutputToContextKey "match_report".'
  },
  {
    id: 'company-research',
    name: 'Company Research',
    description:
      'Researches a company using web search and produces a comprehensive report covering business model, culture, recent news, and red/green flags for job applicants. Input: company name, URL, or brief description. Store result with storeOutputToContextKey "company_research".',
    systemPrompt: null,
    model: 'perplexity/sonar-pro',
    webSearch: true,
    isBuiltIn: true,
    slashCommand: 'research',
    slashInjectionPrompt:
      'Use the company-research agent to research the company. Extract the company name from the job_analysis workspace context (or ask the user if unavailable), then call summon_agent with agentId "company-research", passing the company name/URL as input. Store the result with storeOutputToContextKey "company_research".'
  },
  {
    id: 'cv-generation',
    name: 'CV Generation',
    description:
      'Creates or improves CV content based on the user profile, job analysis, and match report. Input: user profile + job analysis + current CV data (if available) combined as text. Returns structured CV content suggestions or updated sections.',
    systemPrompt: null,
    model: 'openai/gpt-4o-mini',
    webSearch: false,
    isBuiltIn: true,
    slashCommand: 'cv',
    slashInjectionPrompt:
      'Use the cv-generation agent to help with CV creation or improvement. Get the user profile with get_user_profile, the job analysis from workspace context, and any current CV data if available. Pass them as combined input to summon_agent with agentId "cv-generation".'
  },
  {
    id: 'cover-letter',
    name: 'Cover Letter',
    description:
      'Writes a personalized cover letter using the user profile, job analysis, match report, and company research. Input: user profile + all available workspace context combined. Returns HTML cover letter content ready for the cover letter editor.',
    systemPrompt: null,
    model: 'openai/gpt-4o-mini',
    webSearch: false,
    isBuiltIn: true,
    slashCommand: 'cover',
    slashInjectionPrompt:
      'Use the cover-letter agent to write a personalized cover letter. Get the user profile with get_user_profile and all relevant workspace context (job_analysis, match_report, company_research). Pass them as combined input to summon_agent with agentId "cover-letter".'
  }
]

/**
 * Create a fresh copy of the built-in agents array.
 */
const createBuiltInAgents = () =>
  BUILT_IN_AGENTS.map((agent) => ({ ...agent, createdAt: Date.now(), lastModified: Date.now() }))

/**
 * Validate an agent ID (slug-style: lowercase alphanumeric + hyphens)
 */
export const isValidAgentId = (id) => {
  return (
    typeof id === 'string' &&
    /^[a-z][a-z0-9-]*[a-z0-9]$/.test(id) &&
    id.length >= 2 &&
    id.length <= 64
  )
}

/**
 * Validate an agent slug used for slash commands
 */
export const isValidSlashCommand = (slug) => {
  if (!slug) return true // null/undefined/'' are valid (no slash command)
  return (
    typeof slug === 'string' &&
    /^[a-z][a-z0-9-]*$/.test(slug) &&
    slug.length >= 1 &&
    slug.length <= 32
  )
}

/**
 * Run one-time migration from old system prompts + settings stores.
 * Returns the migrated agents array, or null if nothing to migrate.
 */
const runMigration = () => {
  try {
    const oldPrompts = localStorage.getItem(OLD_SYSTEM_PROMPTS_KEY)
    const oldCategories = localStorage.getItem(OLD_CATEGORIES_KEY)
    const oldSettings = localStorage.getItem(OLD_SETTINGS_KEY)

    if (!oldPrompts && !oldSettings) {
      // Nothing to migrate — first install
      return null
    }

    const agents = createBuiltInAgents()

    // Migrate system prompts → agent system prompts
    if (oldPrompts) {
      try {
        const parsed = JSON.parse(oldPrompts)
        for (const [oldType, agentId] of Object.entries(OLD_TYPE_TO_AGENT_ID)) {
          const promptConfig = parsed[oldType]
          if (promptConfig && promptConfig.activeId && promptConfig.activeId !== 'default') {
            // User had a custom prompt active — copy it
            const customPrompt = promptConfig.custom?.find((p) => p.id === promptConfig.activeId)
            if (customPrompt?.content) {
              const agent = agents.find((a) => a.id === agentId)
              if (agent) {
                agent.systemPrompt = customPrompt.content
                agent.lastModified = Date.now()
              }
            }
          }
        }

        // Migrate custom categories → custom agents
        if (oldCategories) {
          const cats = JSON.parse(oldCategories)
          const defaultSettings = { openRouterModel: 'openai/gpt-4o-mini' }
          let settingsModel = defaultSettings.openRouterModel
          if (oldSettings) {
            try {
              const s = JSON.parse(oldSettings)
              settingsModel = s.openRouterModel || settingsModel
            } catch {
              // ignore
            }
          }

          for (const [key, cat] of Object.entries(cats)) {
            const promptConfig = parsed[key]
            const activePrompt =
              promptConfig?.activeId === 'default'
                ? { content: promptConfig?.default || '' }
                : promptConfig?.custom?.find((p) => p.id === promptConfig?.activeId) || {
                    content: promptConfig?.default || ''
                  }

            agents.push({
              id: key,
              name: cat.name || key,
              description: `Custom agent migrated from system prompt category "${cat.name || key}".`,
              systemPrompt: activePrompt?.content || '',
              model: settingsModel,
              webSearch: false,
              isBuiltIn: false,
              slashCommand: null,
              slashInjectionPrompt: null,
              createdAt: cat.createdAt || Date.now(),
              lastModified: Date.now()
            })
          }
        }
      } catch (e) {
        console.warn('[agents] Failed to migrate system prompts', e)
      }
    }

    // Migrate task models → agent models
    if (oldSettings) {
      try {
        const parsed = JSON.parse(oldSettings)
        const taskModels = parsed.taskModels || {}
        for (const [oldType, agentId] of Object.entries(OLD_TYPE_TO_AGENT_ID)) {
          const model = taskModels[oldType]
          if (model) {
            const agent = agents.find((a) => a.id === agentId)
            if (agent) {
              // Strip :online suffix — webSearch flag controls this now
              agent.model = model.replace(/:online$/, '')
              agent.lastModified = Date.now()
            }
          }
        }
      } catch (e) {
        console.warn('[agents] Failed to migrate task models', e)
      }
    }

    // Clean up old keys
    localStorage.removeItem(OLD_SYSTEM_PROMPTS_KEY)
    localStorage.removeItem(OLD_CATEGORIES_KEY)

    return agents
  } catch (e) {
    console.warn('[agents] Migration failed', e)
    return null
  }
}

/**
 * Agents Store
 *
 * Unified store for all AI sub-agents (built-in + custom).
 * Replaces the old systemPrompts store and per-task model settings.
 */
export const useAgentsStore = defineStore('agents', () => {
  const agents = ref([])

  // ── Persistence ──────────────────────────────────────────

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agents.value))
    } catch (e) {
      console.warn('[agents] Failed to persist agents', e)
    }
  }

  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge saved agents with current built-in definitions
          // (ensures new built-ins are added after code updates)
          const savedMap = new Map(parsed.map((a) => [a.id, a]))

          const merged = BUILT_IN_AGENTS.map((builtIn) => {
            const saved = savedMap.get(builtIn.id)
            if (saved) {
              // Preserve user edits, but update non-editable fields from source
              return {
                ...builtIn,
                ...saved,
                isBuiltIn: true // always true for built-ins
              }
            }
            return { ...builtIn, createdAt: Date.now(), lastModified: Date.now() }
          })

          // Add custom agents (not in BUILT_IN_AGENTS)
          const builtInIds = new Set(BUILT_IN_AGENTS.map((a) => a.id))
          for (const agent of parsed) {
            if (!builtInIds.has(agent.id)) {
              merged.push(agent)
            }
          }

          agents.value = merged
          return
        }
      }

      // No saved data: try migration from old stores
      const migrated = runMigration()
      if (migrated) {
        agents.value = migrated
        persist() // save immediately so migration doesn't run again
        return
      }

      // Fresh install — use built-in defaults
      agents.value = createBuiltInAgents()
    } catch (e) {
      console.warn('[agents] Failed to load agents, using defaults', e)
      agents.value = createBuiltInAgents()
    }
  }

  loadFromStorage()
  watch(agents, persist, { deep: true })

  // ── Getters ──────────────────────────────────────────────

  /**
   * Get agent by ID.
   */
  const getAgent = (id) => agents.value.find((a) => a.id === id) || null

  /**
   * Get all agents as a plain array (built-in + custom).
   */
  const getAllAgents = () => agents.value

  /**
   * Get built-in agents only.
   */
  const getBuiltInAgents = () => agents.value.filter((a) => a.isBuiltIn)

  /**
   * Get custom agents only.
   */
  const getCustomAgents = () => agents.value.filter((a) => !a.isBuiltIn)

  /**
   * Get all agents that have a slash command defined.
   */
  const getSlashCommandAgents = () => agents.value.filter((a) => a.slashCommand)

  /**
   * Get agent by slash command slug.
   */
  const getAgentBySlashCommand = (slug) => agents.value.find((a) => a.slashCommand === slug) || null

  // ── CRUD ─────────────────────────────────────────────────

  /**
   * Create a new custom agent.
   * @param {Object} agentData - Agent fields (name, description, systemPrompt, model, webSearch, slashCommand, slashInjectionPrompt)
   * @returns {{ success: boolean, id?: string, error?: string }}
   */
  const createAgent = (agentData) => {
    const {
      name,
      description,
      systemPrompt,
      model,
      webSearch,
      slashCommand,
      slashInjectionPrompt
    } = agentData

    if (!name || !name.trim()) {
      return { success: false, error: 'Agent name is required.' }
    }
    if (!model || !model.trim()) {
      return { success: false, error: 'Model is required.' }
    }
    if (!systemPrompt || !systemPrompt.trim()) {
      return { success: false, error: 'System prompt is required.' }
    }
    if (slashCommand && !isValidSlashCommand(slashCommand)) {
      return {
        success: false,
        error: 'Invalid slash command slug. Use lowercase alphanumeric and hyphens.'
      }
    }

    // Check for slash command conflict
    if (slashCommand) {
      const conflict = agents.value.find((a) => a.slashCommand === slashCommand)
      if (conflict) {
        return {
          success: false,
          error: `Slash command "/${slashCommand}" is already used by "${conflict.name}".`
        }
      }
    }

    // Generate a unique slug ID
    const baseId =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'agent'

    let id = baseId
    let counter = 1
    while (agents.value.find((a) => a.id === id)) {
      id = `${baseId}-${counter++}`
    }

    const newAgent = {
      id,
      name: name.trim(),
      description: description?.trim() || '',
      systemPrompt: systemPrompt.trim(),
      model: model.trim(),
      webSearch: Boolean(webSearch),
      isBuiltIn: false,
      slashCommand: slashCommand?.trim() || null,
      slashInjectionPrompt: slashInjectionPrompt?.trim() || null,
      createdAt: Date.now(),
      lastModified: Date.now()
    }

    agents.value.push(newAgent)
    return { success: true, id }
  }

  /**
   * Update an existing agent (built-in or custom).
   * Built-in agents can be edited but not deleted.
   * @param {string} id - Agent ID
   * @param {Object} updates - Fields to update
   * @returns {{ success: boolean, error?: string }}
   */
  const updateAgent = (id, updates) => {
    const agent = agents.value.find((a) => a.id === id)
    if (!agent) {
      return { success: false, error: `Agent "${id}" not found.` }
    }

    if (updates.name !== undefined && !updates.name?.trim()) {
      return { success: false, error: 'Agent name cannot be empty.' }
    }
    if (updates.model !== undefined && !updates.model?.trim()) {
      return { success: false, error: 'Model cannot be empty.' }
    }
    if (
      updates.slashCommand !== undefined &&
      updates.slashCommand &&
      !isValidSlashCommand(updates.slashCommand)
    ) {
      return { success: false, error: 'Invalid slash command slug.' }
    }
    // Check slash command conflict (excluding self)
    if (updates.slashCommand) {
      const conflict = agents.value.find(
        (a) => a.slashCommand === updates.slashCommand && a.id !== id
      )
      if (conflict) {
        return {
          success: false,
          error: `Slash command "/${updates.slashCommand}" is already used by "${conflict.name}".`
        }
      }
    }

    const allowedUpdates = [
      'name',
      'description',
      'systemPrompt',
      'model',
      'webSearch',
      'slashCommand',
      'slashInjectionPrompt'
    ]
    for (const key of allowedUpdates) {
      if (key in updates) {
        agent[key] = updates[key]
      }
    }
    agent.lastModified = Date.now()

    return { success: true }
  }

  /**
   * Delete a custom agent.
   * Built-in agents cannot be deleted.
   * @param {string} id - Agent ID
   * @returns {{ success: boolean, error?: string }}
   */
  const deleteAgent = (id) => {
    const index = agents.value.findIndex((a) => a.id === id)
    if (index === -1) {
      return { success: false, error: `Agent "${id}" not found.` }
    }
    if (agents.value[index].isBuiltIn) {
      return { success: false, error: 'Built-in agents cannot be deleted.' }
    }
    agents.value.splice(index, 1)
    return { success: true }
  }

  /**
   * Reset a built-in agent's system prompt to the default (null = load from file).
   * @param {string} id - Agent ID
   * @returns {{ success: boolean, error?: string }}
   */
  const resetAgentPrompt = (id) => {
    const agent = agents.value.find((a) => a.id === id)
    if (!agent) {
      return { success: false, error: `Agent "${id}" not found.` }
    }
    if (!agent.isBuiltIn) {
      return { success: false, error: 'Only built-in agents have a default prompt to reset to.' }
    }
    agent.systemPrompt = null
    agent.lastModified = Date.now()
    return { success: true }
  }

  return {
    agents,
    getAgent,
    getAllAgents,
    getBuiltInAgents,
    getCustomAgents,
    getSlashCommandAgents,
    getAgentBySlashCommand,
    createAgent,
    updateAgent,
    deleteAgent,
    resetAgentPrompt
  }
})

/**
 * AI Toolkit — Tool Definitions & Handlers
 *
 * Defines every tool the AI can use to interact with App-Lycan and
 * wires each one to the centralized data-access layer.
 *
 * Tool categories:
 *   NAVIGATION  – go_to
 *   READING     – get_workspaces, get_workspace, get_cv,
 *                 get_cover_letter, get_workspace_context, get_user_profile
 *   CREATION    – create_workspace, create_cv, create_cover_letter,
 *                 add_workspace_context
 *   EDITING     – edit_workspace, edit_cv, edit_cover_letter,
 *                 edit_workspace_context, edit_user_profile
 *   DELETION    – delete_workspace, delete_cv, delete_cover_letter,
 *                 delete_workspace_context
 *   AGENTS      – list_agents, summon_agent
 */

import * as data from './dataAccess'
import { useAgentsStore } from '../stores/agents'
import { useSettingsStore } from '../stores/settings'
import { streamAndCollect } from './ai'
import { loadAgentPrompt } from './promptLoader'
import cvSchema from '../schemas/cvSchema.json'
import coverLetterSchema from '../schemas/coverLetterSchema.json'

// =========================================================
// Tool Display Names (User-Friendly Messages)
// =========================================================

export const TOOL_DISPLAY_NAMES = {
  // Navigation
  go_to: 'Navigating to page',
  // Reading
  get_workspaces: 'Reading workspaces',
  get_workspace: 'Reading workspace',
  get_cv: 'Reading CV',
  get_cover_letter: 'Reading cover letter',
  get_workspace_context: 'Reading workspace context',
  get_user_profile: 'Reading user profile',
  // Creation
  create_workspace: 'Creating workspace',
  create_cv: 'Creating CV',
  create_cover_letter: 'Creating cover letter',
  add_workspace_context: 'Adding context',
  // Editing
  edit_workspace: 'Updating workspace',
  edit_cv: 'Updating CV',
  edit_cover_letter: 'Updating cover letter',
  edit_workspace_context: 'Updating context',
  edit_user_profile: 'Updating user profile',
  // Deletion
  delete_workspace: 'Deleting workspace',
  delete_cv: 'Deleting CV',
  delete_cover_letter: 'Deleting cover letter',
  delete_workspace_context: 'Deleting context',
  // Agents
  list_agents: 'Listing agents',
  summon_agent: 'Running agent'
}

// =========================================================
// Tool Definitions (OpenRouter / OpenAI format)
// =========================================================

export const AI_TOOLS = [
  // ── NAVIGATION ──────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'go_to',
      description:
        'Navigate to a specific view in App-Lycan. Use this to move the user to a different page.',
      parameters: {
        type: 'object',
        properties: {
          view: {
            type: 'string',
            enum: ['general_dashboard', 'workspace_dashboard', 'cv_editor', 'cover_letter_editor'],
            description: 'The target view to navigate to.'
          },
          workspace_name: {
            type: 'string',
            description: 'Required for workspace_dashboard, cv_editor, cover_letter_editor.'
          },
          cv_name: {
            type: 'string',
            description: 'Required for cv_editor.'
          },
          cover_letter_name: {
            type: 'string',
            description: 'Required for cover_letter_editor.'
          }
        },
        required: ['view']
      }
    }
  },

  // ── READING ─────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_workspaces',
      description: 'Get all workspaces with their CV and Cover Letter names.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_workspace',
      description: 'Get data of a single workspace by name.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: { type: 'string', description: 'Name of the workspace.' }
        },
        required: ['workspace_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_cv',
      description: 'Get the full data of a CV document.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: {
            type: 'string',
            description: 'Name of the workspace containing the CV.'
          },
          cv_name: { type: 'string', description: 'Name of the CV.' }
        },
        required: ['workspace_name', 'cv_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_cover_letter',
      description: 'Get the full data of a Cover Letter document.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: {
            type: 'string',
            description: 'Name of the workspace containing the Cover Letter.'
          },
          cover_letter_name: { type: 'string', description: 'Name of the Cover Letter.' }
        },
        required: ['workspace_name', 'cover_letter_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_workspace_context',
      description:
        'Get a specific context field from a workspace, or list all context keys if context_key is omitted.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: { type: 'string', description: 'Name of the workspace.' },
          context_key: {
            type: 'string',
            description:
              'Optional. The context key to retrieve (e.g. "job_analysis"). If omitted, returns a list of all context keys.'
          }
        },
        required: ['workspace_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_profile',
      description:
        'Get the user\'s professional profile. Returns { profile: "text content..." } where profile is a text string containing all professional information. This is the global profile used across all workspaces.',
      parameters: { type: 'object', properties: {} }
    }
  },

  // ── CREATION ────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'create_workspace',
      description: 'Create a new workspace.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: { type: 'string', description: 'Name for the new workspace.' }
        },
        required: ['workspace_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_cv',
      description:
        'Create a new CV in a workspace. The cv_data must follow the schema and include a "name" property for the document name. Optionally include "data" property with CV content.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: { type: 'string', description: 'Workspace to create the CV in.' },
          cv_data: cvSchema
        },
        required: ['workspace_name', 'cv_data']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_cover_letter',
      description:
        'Create a new Cover Letter in a workspace. The cover_letter_data must follow the schema and include a "name" property for the document name. Optionally include "data" property with content.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: {
            type: 'string',
            description: 'Workspace to create the Cover Letter in.'
          },
          cover_letter_data: coverLetterSchema
        },
        required: ['workspace_name', 'cover_letter_data']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_workspace_context',
      description:
        'Add a new context field to a workspace. Used to store AI-generated analysis, reports, or research that can be retrieved later.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: { type: 'string', description: 'Name of the workspace.' },
          context_key: {
            type: 'string',
            description:
              'Key name for the context (e.g. "job_analysis", "match_report", "company_research").'
          },
          context_content: { type: 'string', description: 'Rich text content to store.' }
        },
        required: ['workspace_name', 'context_key', 'context_content']
      }
    }
  },

  // ── EDITING ─────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'edit_workspace',
      description: 'Rename a workspace.',
      parameters: {
        type: 'object',
        properties: {
          current_workspace_name: { type: 'string', description: 'Current name of the workspace.' },
          new_workspace_name: { type: 'string', description: 'New name for the workspace.' }
        },
        required: ['current_workspace_name', 'new_workspace_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_cv',
      description:
        'Edit a CV. Provide CV data following the schema structure. Include "name" property to rename, "data" property to update content, or both. IMPORTANT: Always call get_cv first to read the current state before editing — never rely on previously seen data from earlier in the conversation.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: { type: 'string', description: 'Workspace containing the CV.' },
          current_cv_name: { type: 'string', description: 'Current name of the CV to edit.' },
          cv_data: cvSchema,
          data_editing_mode: {
            type: 'string',
            enum: ['merge', 'replace'],
            description:
              'Optional. "merge" (default): deep-merges provided fields into existing data; object fields are merged recursively, and arrays of ID-bearing items are merged by their "id" (only supply the items you want to add/change — the rest are preserved). "replace": REPLACES THE ENTIRE document data object with exactly what you provide — every field and section NOT included will be PERMANENTLY DELETED. Use replace only when intentionally overwriting the whole document.'
          }
        },
        required: ['workspace_name', 'current_cv_name', 'cv_data']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_cover_letter',
      description:
        'Edit a Cover Letter. Provide cover letter data following the schema structure. Include "name" property to rename, "data" property to update content, or both. IMPORTANT: Always call get_cover_letter first to read the current state before editing — never rely on previously seen data from earlier in the conversation.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: { type: 'string', description: 'Workspace containing the Cover Letter.' },
          current_cover_letter_name: {
            type: 'string',
            description: 'Current name of the Cover Letter to edit.'
          },
          cover_letter_data: coverLetterSchema,
          data_editing_mode: {
            type: 'string',
            enum: ['merge', 'replace'],
            description:
              'Optional. "merge" (default): deep-merges provided fields into existing data. "replace": REPLACES THE ENTIRE document data object with exactly what you provide — every field NOT included will be PERMANENTLY DELETED. Use replace only when intentionally overwriting the whole document.'
          }
        },
        required: ['workspace_name', 'current_cover_letter_name', 'cover_letter_data']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_workspace_context',
      description: 'Update the content of an existing workspace context field.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: { type: 'string', description: 'Name of the workspace.' },
          context_key: { type: 'string', description: 'The context key to update.' },
          new_context_content: {
            type: 'string',
            description: 'New rich text content for the context.'
          }
        },
        required: ['workspace_name', 'context_key', 'new_context_content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_user_profile',
      description:
        "Update the user's professional profile. The profile is a single rich text field containing all professional information, experience, skills, and any contact details the user wants to include.",
      parameters: {
        type: 'object',
        properties: {
          professionalExperience: {
            type: 'string',
            description:
              'Complete professional profile in rich text format (replaces entire profile)'
          }
        },
        required: ['professionalExperience']
      }
    }
  },

  // ── DELETION ────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'delete_workspace',
      description: 'Delete a workspace. Requires user confirmation in the UI.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: { type: 'string', description: 'Name of the workspace to delete.' }
        },
        required: ['workspace_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_cv',
      description: 'Delete a CV from a workspace. Requires user confirmation in the UI.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: { type: 'string', description: 'Workspace containing the CV.' },
          cv_name: { type: 'string', description: 'Name of the CV to delete.' }
        },
        required: ['workspace_name', 'cv_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_cover_letter',
      description: 'Delete a Cover Letter from a workspace. Requires user confirmation in the UI.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: { type: 'string', description: 'Workspace containing the Cover Letter.' },
          cover_letter_name: { type: 'string', description: 'Name of the Cover Letter to delete.' }
        },
        required: ['workspace_name', 'cover_letter_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_workspace_context',
      description: 'Delete a context field from a workspace. Requires user confirmation in the UI.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: { type: 'string', description: 'Name of the workspace.' },
          context_key: { type: 'string', description: 'The context key to delete.' }
        },
        required: ['workspace_name', 'context_key']
      }
    }
  },

  // ── AGENTS ──────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'list_agents',
      description:
        "List all available AI agents (built-in and custom). Returns each agent's id, name, and description. Call this before summon_agent to discover what agents are available and what inputs they expect.",
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'summon_agent',
      description:
        'Invoke a specialized AI agent by ID. The agent runs its own LLM call with a dedicated system prompt and returns the result. Use list_agents first to discover available agents and read their descriptions to understand what input to pass. The agent description specifies what context/input it expects and what it produces.',
      parameters: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description:
              'The ID of the agent to invoke (e.g. "job-analysis", "match-report"). Use list_agents to see available IDs.'
          },
          input: {
            type: 'string',
            description:
              'The content to process — e.g. job posting text, combined user profile + job analysis, company name, etc. The agent description specifies what it expects here.'
          },
          workspace_name: {
            type: 'string',
            description:
              'Optional. Required when storeOutputToContextKey is set. Name of the workspace where the output will be stored.'
          },
          storeOutputToContextKey: {
            type: 'string',
            description:
              "Optional. If set, the agent's output is stored in the workspace context under this key. Requires workspace_name."
          }
        },
        required: ['agentId', 'input']
      }
    }
  }
]

// =========================================================
// Command → Tool mapping (which tools each command can use)
// =========================================================

// All slash commands now route through the main agent loop using list_agents + summon_agent.
// This defines the tool subset available for each slash command's guided agent session.
const SLASH_COMMAND_TOOLS = [
  'get_workspaces',
  'get_workspace',
  'get_workspace_context',
  'get_user_profile',
  'go_to',
  'create_workspace',
  'add_workspace_context',
  'edit_workspace_context',
  'list_agents',
  'summon_agent'
]

export const COMMAND_TOOLS = {
  analyze: SLASH_COMMAND_TOOLS,
  match: SLASH_COMMAND_TOOLS,
  research: SLASH_COMMAND_TOOLS,
  cv: SLASH_COMMAND_TOOLS,
  cover: SLASH_COMMAND_TOOLS
}

/**
 * Get tools filtered for a specific command, or all tools if no command.
 * @param {string|null} commandId
 * @returns {Array} Tool definitions
 */
export const getToolsForCommand = (commandId) => {
  if (!commandId || !COMMAND_TOOLS[commandId]) {
    return AI_TOOLS
  }
  const allowedNames = new Set(COMMAND_TOOLS[commandId])
  return AI_TOOLS.filter((t) => allowedNames.has(t.function.name))
}

/** Alias for backward compat */
export const getToolsForApi = () => AI_TOOLS

// =========================================================
// Handler registry
// =========================================================

const toolHandlers = new Map()

export const registerToolHandler = (toolName, handler) => {
  toolHandlers.set(toolName, handler)
}

export const executeToolCall = async (toolCall, onProgress) => {
  const { name, arguments: argsString } = toolCall.function
  const handler = toolHandlers.get(name)
  if (!handler) {
    return { tool: name, error: `No handler registered for tool: ${name}` }
  }

  let args
  try {
    // Handle empty or missing arguments for tools with no parameters
    if (!argsString || argsString === '') {
      args = {}
    } else {
      args = typeof argsString === 'string' ? JSON.parse(argsString) : argsString
    }
  } catch (e) {
    return { tool: name, error: `Failed to parse tool arguments: ${e.message}` }
  }

  try {
    const result = await handler(args, onProgress)
    return { tool: name, ...result }
  } catch (e) {
    return { tool: name, error: e.message }
  }
}

// =========================================================
// Setup handlers (called once with router instance)
// =========================================================

/**
 * Wire up all tool handlers.
 * @param {import('vue-router').Router} router - Vue Router instance for navigation tools
 * @param {import('vue-router').RouteLocationNormalized} route - Current route (reactive)
 */
export const setupToolHandlers = (router, _route) => {
  // ── NAVIGATION ──────────────────────────────────────────
  registerToolHandler('go_to', async (args) => {
    return data.navigateTo(router, {
      view: args.view,
      workspaceName: args.workspace_name,
      cvName: args.cv_name,
      coverLetterName: args.cover_letter_name
    })
  })

  // ── READING ─────────────────────────────────────────────
  registerToolHandler('get_workspaces', async () => {
    return { workspaces: data.getAllWorkspaces() }
  })

  registerToolHandler('get_workspace', async (args) => {
    if (!args.workspace_name) return { error: 'workspace_name is required' }
    return data.getWorkspace(args.workspace_name)
  })

  registerToolHandler('get_cv', async (args) => {
    if (!args.workspace_name) return { error: 'workspace_name is required' }
    if (!args.cv_name) return { error: 'cv_name is required' }
    return data.getCv(args.workspace_name, args.cv_name)
  })

  registerToolHandler('get_cover_letter', async (args) => {
    if (!args.workspace_name) return { error: 'workspace_name is required' }
    if (!args.cover_letter_name) return { error: 'cover_letter_name is required' }
    return data.getCoverLetter(args.workspace_name, args.cover_letter_name)
  })

  registerToolHandler('get_workspace_context', async (args) => {
    if (!args.workspace_name) return { error: 'workspace_name is required' }
    return data.getWorkspaceContext(args.workspace_name, args.context_key)
  })

  registerToolHandler('get_user_profile', async () => {
    const profile = data.getUserProfile()
    return { profile } // Wrap string in object for consistent tool response format
  })

  // ── CREATION ────────────────────────────────────────────
  registerToolHandler('create_workspace', async (args) => {
    if (!args.workspace_name) return { error: 'workspace_name is required' }
    return data.createWorkspace(args.workspace_name)
  })

  registerToolHandler('create_cv', async (args) => {
    if (!args.cv_data || typeof args.cv_data !== 'object') {
      return {
        error: 'cv_data is required and must be an object following the CV schema',
        received_params: Object.keys(args)
      }
    }

    // Extract name from schema-compliant cv_data
    const cvName = args.cv_data.name
    if (!cvName) {
      return {
        error: 'cv_data.name is required for creating a CV',
        received: args.cv_data
      }
    }

    // Extract data content if provided
    const cvData = args.cv_data.data

    return data.createCv(args.workspace_name, cvName, cvData)
  })

  registerToolHandler('create_cover_letter', async (args) => {
    if (!args.cover_letter_data || typeof args.cover_letter_data !== 'object') {
      return {
        error:
          'cover_letter_data is required and must be an object following the Cover Letter schema',
        received_params: Object.keys(args)
      }
    }

    // Extract name from schema-compliant cover_letter_data
    const clName = args.cover_letter_data.name
    if (!clName) {
      return {
        error: 'cover_letter_data.name is required for creating a Cover Letter',
        received: args.cover_letter_data
      }
    }

    // Extract data content if provided
    const clData = args.cover_letter_data.data

    return data.createCoverLetter(args.workspace_name, clName, clData)
  })

  registerToolHandler('add_workspace_context', async (args) => {
    return data.addWorkspaceContext(args.workspace_name, args.context_key, args.context_content)
  })

  // ── EDITING ─────────────────────────────────────────────
  registerToolHandler('edit_workspace', async (args) => {
    return data.editWorkspace(args.current_workspace_name, args.new_workspace_name)
  })

  registerToolHandler('edit_cv', async (args) => {
    if (!args.cv_data || typeof args.cv_data !== 'object') {
      return {
        error: 'cv_data is required and must be an object following the CV schema',
        received_params: Object.keys(args)
      }
    }

    // Extract name and data from schema-compliant cv_data
    const newCvName = args.cv_data.name
    const newCvData = args.cv_data.data

    const result = await data.editCv(args.workspace_name, args.current_cv_name, {
      newCvName: newCvName,
      newCvData: newCvData,
      dataEditingMode: args.data_editing_mode
    })

    // Enhance success response with parameter info
    if (result.success) {
      return {
        ...result,
        params_received: {
          name: newCvName ? 'provided (rename)' : 'not provided',
          data: newCvData ? 'provided (content update)' : 'not provided',
          data_editing_mode: args.data_editing_mode || 'default (merge)'
        }
      }
    }
    return result
  })

  registerToolHandler('edit_cover_letter', async (args) => {
    if (!args.cover_letter_data || typeof args.cover_letter_data !== 'object') {
      return {
        error:
          'cover_letter_data is required and must be an object following the Cover Letter schema',
        received_params: Object.keys(args)
      }
    }

    // Extract name and data from schema-compliant cover_letter_data
    const newClName = args.cover_letter_data.name
    const newClData = args.cover_letter_data.data

    const result = await data.editCoverLetter(args.workspace_name, args.current_cover_letter_name, {
      newClName: newClName,
      newClData: newClData,
      dataEditingMode: args.data_editing_mode
    })

    // Enhance success response with parameter info
    if (result.success) {
      return {
        ...result,
        params_received: {
          name: newClName ? 'provided (rename)' : 'not provided',
          data: newClData ? 'provided (content update)' : 'not provided',
          data_editing_mode: args.data_editing_mode || 'default (merge)'
        }
      }
    }
    return result
  })

  registerToolHandler('edit_workspace_context', async (args) => {
    return data.editWorkspaceContext(
      args.workspace_name,
      args.context_key,
      args.new_context_content
    )
  })

  registerToolHandler('edit_user_profile', async (args) => {
    if (!args.professionalExperience) {
      return { error: 'professionalExperience is required' }
    }

    if (typeof args.professionalExperience !== 'string') {
      return { error: 'professionalExperience must be a string' }
    }

    return data.editUserProfile(args.professionalExperience)
  })

  // ── DELETION ────────────────────────────────────────────
  registerToolHandler('delete_workspace', async (args) => {
    return data.deleteWorkspaceWithConfirm(args.workspace_name)
  })

  registerToolHandler('delete_cv', async (args) => {
    return data.deleteCvWithConfirm(args.workspace_name, args.cv_name)
  })

  registerToolHandler('delete_cover_letter', async (args) => {
    return data.deleteCoverLetterWithConfirm(args.workspace_name, args.cover_letter_name)
  })

  registerToolHandler('delete_workspace_context', async (args) => {
    return data.deleteWorkspaceContextWithConfirm(args.workspace_name, args.context_key)
  })

  // ── AGENTS ──────────────────────────────────────────────
  registerToolHandler('list_agents', async () => {
    const agentsStore = useAgentsStore()
    const agents = agentsStore.getAllAgents()
    return {
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        model: agent.model,
        webSearch: agent.webSearch,
        isBuiltIn: agent.isBuiltIn,
        slashCommand: agent.slashCommand || null
      }))
    }
  })

  registerToolHandler('summon_agent', async (args, onProgress) => {
    if (!args.agentId) return { error: 'agentId is required' }
    if (!args.input) return { error: 'input is required' }
    if (args.storeOutputToContextKey && !args.workspace_name) {
      return { error: 'workspace_name is required when storeOutputToContextKey is set' }
    }

    const agentsStore = useAgentsStore()
    const agent = agentsStore.getAgent(args.agentId)
    if (!agent) {
      return {
        error: `Agent "${args.agentId}" not found. Use list_agents to see available agents.`
      }
    }

    const settingsStore = useSettingsStore()
    const apiKey = settingsStore.openRouterKey
    if (!apiKey) return { error: 'OpenRouter API key is not configured' }

    // Resolve model (apply :online if webSearch enabled)
    let model = (agent.model || settingsStore.openRouterModel || 'openai/gpt-4o-mini').replace(
      /:online$/,
      ''
    )
    if (agent.webSearch) {
      model = `${model}:online`
    }

    // Resolve system prompt: use stored prompt if set, otherwise load from file
    let systemPromptContent = agent.systemPrompt
    if (!systemPromptContent) {
      try {
        systemPromptContent = await loadAgentPrompt(`agents/${agent.id}.md`)
      } catch {
        return {
          error: `No system prompt available for agent "${agent.id}". Please set a system prompt in Agent Settings.`
        }
      }
    }

    // Append output-format reminder
    const fullSystemPrompt =
      systemPromptContent +
      '\n\n**REMINDER: Wrap your output in a ```text``` code block. Content outside the block will be discarded.**'

    // Build agent messages
    const agentMessages = [
      { role: 'system', content: fullSystemPrompt },
      { role: 'user', content: args.input }
    ]

    // Run with retries to ensure text block compliance
    const MAX_RETRIES = 2
    let result = null
    let fullResponse = ''

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        fullResponse = await streamAndCollect(apiKey, model, agentMessages, onProgress || null)

        // Extract content from ```text``` block
        const textBlockMatch = fullResponse.match(/```text\s*\n([\s\S]*?)```/)
        if (textBlockMatch && textBlockMatch[1].trim()) {
          result = textBlockMatch[1].trim()
          break
        }

        // No text block — prompt for correction on subsequent attempts
        if (attempt < MAX_RETRIES) {
          agentMessages.push({ role: 'assistant', content: fullResponse })
          agentMessages.push({
            role: 'user',
            content:
              'Your output MUST be wrapped in a ```text``` code block. Please provide the full output again inside a ```text``` block.'
          })
        } else {
          // Last resort: use the full response
          result = fullResponse.trim()
        }
      } catch (e) {
        return { error: `Agent "${agent.id}" failed: ${e.message}` }
      }
    }

    if (!result) {
      return { error: `Agent "${agent.id}" produced no output` }
    }

    // Optionally store result to workspace context
    if (args.storeOutputToContextKey && args.workspace_name) {
      const existing = data.getWorkspaceContext(args.workspace_name, args.storeOutputToContextKey)
      let storeResult
      if (existing && !existing.error && existing.content) {
        storeResult = data.editWorkspaceContext(
          args.workspace_name,
          args.storeOutputToContextKey,
          result
        )
      } else {
        storeResult = data.addWorkspaceContext(
          args.workspace_name,
          args.storeOutputToContextKey,
          result
        )
      }
      if (storeResult.error) {
        return {
          error: `Agent "${agent.id}" completed but failed to store output: ${storeResult.error}`
        }
      }

      // Remove text block from response summary
      const summary = fullResponse.replace(/```text\s*\n[\s\S]*?```/, '').trim()
      return {
        success: true,
        message: `Agent "${agent.name}" completed. Result stored in "${args.storeOutputToContextKey}" in workspace "${args.workspace_name}".`,
        agentResponse: summary || 'Completed successfully.'
      }
    }

    return { success: true, result }
  })
}

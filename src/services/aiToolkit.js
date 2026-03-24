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
 *   UTILITY     – job_analysis, generate_match_report, research_company
 */

import * as data from './dataAccess'
import { useSystemPromptsStore, PROMPT_TYPES } from '../stores/systemPrompts'
import { useSettingsStore, AI_COMMAND_TYPES } from '../stores/settings'
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
  // Utility
  job_analysis: 'Analyzing job posting',
  generate_match_report: 'Generating match report',
  research_company: 'Researching company',
  // System Prompts
  list_system_prompts: 'Listing system prompts',
  get_system_prompt: 'Reading system prompt',
  // Sub-Agent
  sub_agent: 'Running sub-agent'
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

  // ── UTILITY ─────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'job_analysis',
      description:
        'Invoke a specialized agent to analyze a job posting stored in the workspace context and save the analysis result. The job posting MUST already be stored in the workspace context before calling this tool.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: {
            type: 'string',
            description:
              'Name of the workspace containing the job posting and where the analysis will be stored.'
          },
          source_context_key: {
            type: 'string',
            description:
              'The workspace context key where the job posting text is stored (e.g. "job_posting").'
          },
          target_context_key: {
            type: 'string',
            description:
              'The workspace context key where the resulting analysis will be stored (e.g. "job_analysis").'
          },
          comment: {
            type: 'string',
            description:
              'Optional. Additional instructions or feedback for iterating on an existing analysis.'
          }
        },
        required: ['workspace_name', 'source_context_key', 'target_context_key']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_match_report',
      description:
        'Generate a match report comparing the user profile against a job analysis. Uses a specialized AI agent to perform the analysis. Automatically fetches job context and user profile, and stores the result in the target workspace context key.',
      parameters: {
        type: 'object',
        properties: {
          workspace_name: {
            type: 'string',
            description: 'Name of the workspace containing the job analysis.'
          },
          source_context_key: {
            type: 'string',
            description:
              'The workspace context key where the job analysis is stored (e.g. "job_analysis").'
          },
          target_context_key: {
            type: 'string',
            description:
              'The workspace context key where the match report will be stored (e.g. "match_report").'
          },
          comment: {
            type: 'string',
            description:
              'Optional. Additional instructions or feedback for iterating on an existing match report.'
          }
        },
        required: ['workspace_name', 'source_context_key', 'target_context_key']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'research_company',
      description:
        'Invoke a specialized agent to research a company using web search and save the resulting report to the workspace context.',
      parameters: {
        type: 'object',
        properties: {
          company_info: {
            type: 'string',
            description: 'Company name, URL, or any relevant context to research.'
          },
          workspace_name: {
            type: 'string',
            description: 'Name of the workspace where the research report will be stored.'
          },
          target_context_key: {
            type: 'string',
            description:
              'The workspace context key where the research report will be saved (e.g. "company_research").'
          },
          current_research: {
            type: 'string',
            description: 'Optional. Existing research content to iterate on.'
          },
          iteration_prompt: {
            type: 'string',
            description:
              'Optional. Specific refinement instructions when iterating on existing research.'
          }
        },
        required: ['company_info', 'workspace_name', 'target_context_key']
      }
    }
  },

  // ── SYSTEM PROMPTS ───────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'list_system_prompts',
      description:
        "List all system prompt categories (predefined and user-created). Returns each category's key, display name, whether it is predefined, and the name of the currently active prompt.",
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_system_prompt',
      description:
        'Get the full text of the currently active system prompt for a given category key.',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description:
              'The system prompt category key (e.g. "jobAnalysis", "matchReport", or a custom key like "technical-review").'
          }
        },
        required: ['key']
      }
    }
  },

  // ── SUB-AGENT ────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'sub_agent',
      description:
        'Spawn an independent AI sub-agent to perform a task. The sub-agent runs a separate LLM call with its own system prompt and context, and returns the result. Use this for complex multi-step tasks, tasks requiring different models or web search, or tasks with specialized system prompts.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description:
              'The user-message instruction for the sub-agent. This is the main task or question.'
          },
          system_prompt: {
            type: 'string',
            description:
              'Either a system prompt category key (use list_system_prompts to discover keys) or literal text. If a known category key is provided, the active prompt for that category is loaded. Otherwise the text is used directly as the system prompt.'
          },
          model: {
            type: 'string',
            description:
              'Optional. Model ID to use (e.g. "openai/gpt-4o"). Defaults to the user\'s configured default model. Append ":online" to enable web search (e.g. "perplexity/sonar-pro:online").'
          },
          context_keys: {
            type: 'array',
            items: { type: 'string' },
            description:
              "Optional. Workspace context keys to load and inject into the sub-agent's context. Requires workspace_name."
          },
          include_user_profile: {
            type: 'boolean',
            description:
              "Optional. If true, the user's professional profile is included in the sub-agent's context. Default: false."
          },
          workspace_name: {
            type: 'string',
            description:
              'Required when context_keys or output_key is provided. Name of the workspace for context resolution and output storage.'
          },
          output_key: {
            type: 'string',
            description:
              "Optional. If set, the sub-agent's output is stored in this workspace context key and a success confirmation is returned. If omitted, the full response text is returned."
          }
        },
        required: ['prompt', 'system_prompt']
      }
    }
  }
]

// =========================================================
// Command → Tool mapping (which tools each command can use)
// =========================================================

export const COMMAND_TOOLS = {
  analyze: [
    'get_workspaces',
    'get_workspace',
    'get_workspace_context',
    'go_to',
    'create_workspace',
    'job_analysis',
    'add_workspace_context',
    'edit_workspace_context'
  ],
  match: [
    'get_workspace_context',
    'get_user_profile',
    'generate_match_report',
    'edit_user_profile',
    'add_workspace_context',
    'edit_workspace_context'
  ],
  research: [
    'get_workspaces',
    'get_workspace',
    'get_workspace_context',
    'go_to',
    'create_workspace',
    'research_company',
    'add_workspace_context',
    'edit_workspace_context'
  ]
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

  // ── UTILITY: job_analysis ─────────────────────────────
  registerToolHandler('job_analysis', async (args) => {
    if (!args.workspace_name) return { error: 'workspace_name is required' }
    if (!args.source_context_key) return { error: 'source_context_key is required' }
    if (!args.target_context_key) return { error: 'target_context_key is required' }

    const settingsStore = useSettingsStore()
    const systemPromptsStore = useSystemPromptsStore()

    const apiKey = settingsStore.openRouterKey
    if (!apiKey) return { error: 'OpenRouter API key is not configured' }

    // Get model for job analysis — strip :online suffix since agent has no web search
    let model = settingsStore.getModelForTask(AI_COMMAND_TYPES.JOB_ANALYSIS)
    if (!model) return { error: 'No model configured for job analysis' }
    model = model.replace(/:online$/, '')

    // Load job posting from workspace context
    const sourceCtx = data.getWorkspaceContext(args.workspace_name, args.source_context_key)
    if (sourceCtx.error) return { error: `Failed to load job posting: ${sourceCtx.error}` }

    const jobPostingContent =
      typeof sourceCtx.content === 'object'
        ? sourceCtx.content.content || JSON.stringify(sourceCtx.content)
        : sourceCtx.content
    if (!jobPostingContent || !jobPostingContent.trim()) {
      return { error: `Job posting at "${args.source_context_key}" is empty` }
    }

    // Determine system prompt: custom user prompt or default from file
    let systemPromptContent
    const activePrompt = systemPromptsStore.getActivePrompt(PROMPT_TYPES.JOB_ANALYSIS)
    if (activePrompt && !activePrompt.isDefault) {
      // User has a custom prompt selected — use it
      systemPromptContent = activePrompt.content
    } else {
      // Load default agent prompt from file
      try {
        systemPromptContent = await loadAgentPrompt('agents/job-analysis.md')
      } catch {
        // Fallback to store default if file load fails
        systemPromptContent = activePrompt?.content
        if (!systemPromptContent) return { error: 'No system prompt available for job analysis' }
      }
    }

    // Append instruction to output in text block
    systemPromptContent +=
      '\n\n**REMINDER: Your analysis MUST be wrapped in a ```text``` code block. Content outside the block will be discarded.**'

    // Build agent messages
    const agentMessages = [{ role: 'system', content: systemPromptContent }]

    let userContent = `Analyze the following job posting:\n\n${jobPostingContent}`

    // If iterating on existing analysis
    if (args.comment && args.comment.trim()) {
      const targetCtx = data.getWorkspaceContext(args.workspace_name, args.target_context_key)
      if (targetCtx && !targetCtx.error && targetCtx.content) {
        const existingAnalysis =
          typeof targetCtx.content === 'object'
            ? targetCtx.content.content || JSON.stringify(targetCtx.content)
            : targetCtx.content
        userContent += `\n\n---\n\n## Current Analysis (to revise)\n${existingAnalysis}`
        userContent += `\n\n## Revision Instructions\n${args.comment}`
      }
    }

    agentMessages.push({ role: 'user', content: userContent })

    // Run the agent — no tools, no web search, just focused analysis
    const MAX_RETRIES = 2
    let analysis = null
    let fullResponse = ''

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await streamAndCollect(apiKey, model, agentMessages, null)
        fullResponse = result

        // Extract content from ```text``` block
        const textBlockMatch = result.match(/```text\s*\n([\s\S]*?)```/)
        if (textBlockMatch && textBlockMatch[1].trim()) {
          analysis = textBlockMatch[1].trim()
          break
        }

        // If no text block found, ask the agent to fix it
        if (attempt < MAX_RETRIES) {
          agentMessages.push({ role: 'assistant', content: result })
          agentMessages.push({
            role: 'user',
            content:
              'Your job analysis MUST be wrapped in a ```text``` code block. Please provide the analysis again, this time inside a ```text``` block.'
          })
        } else {
          // Last resort: use the full response if no text block after retries
          analysis = result.trim()
        }
      } catch (e) {
        return { error: `Job analysis agent failed: ${e.message}` }
      }
    }

    if (!analysis) {
      return { error: 'Job analysis agent produced no output' }
    }

    // Store the analysis in the target workspace context key
    const targetCtx = data.getWorkspaceContext(args.workspace_name, args.target_context_key)
    let storeResult
    if (targetCtx && !targetCtx.error && targetCtx.content) {
      // Update existing
      storeResult = data.editWorkspaceContext(
        args.workspace_name,
        args.target_context_key,
        analysis
      )
    } else {
      // Create new
      storeResult = data.addWorkspaceContext(args.workspace_name, args.target_context_key, analysis)
    }

    if (storeResult.error) {
      return { error: `Analysis completed but failed to store: ${storeResult.error}` }
    }

    // Remove the text block from the full response and return the rest as context for the main assistant
    const responseWithoutTextBlock = fullResponse.replace(/```text\s*\n[\s\S]*?```/, '').trim()

    return {
      success: true,
      message: `Job analysis saved to "${args.target_context_key}" in workspace "${args.workspace_name}"`,
      agentResponse: responseWithoutTextBlock || 'Analysis completed successfully.'
    }
  })

  // ── UTILITY: generate_match_report ──────────────────────
  registerToolHandler('generate_match_report', async (args) => {
    if (!args.workspace_name) return { error: 'workspace_name is required' }
    if (!args.source_context_key) return { error: 'source_context_key is required' }
    if (!args.target_context_key) return { error: 'target_context_key is required' }

    // Load job analysis from SOURCE workspace key
    const jobCtx = data.getWorkspaceContext(args.workspace_name, args.source_context_key)
    if (jobCtx.error) return { error: jobCtx.error }

    const jobContent =
      typeof jobCtx.content === 'object'
        ? jobCtx.content.content || JSON.stringify(jobCtx.content)
        : jobCtx.content
    if (!jobContent || !jobContent.trim()) {
      return { error: 'Job analysis not found. Please run /analyze command first.' }
    }

    // Load user profile
    const profile = data.getUserProfile()
    if (!profile || !profile.trim()) {
      return { error: 'User profile empty.' }
    }

    const settingsStore = useSettingsStore()
    const systemPromptsStore = useSystemPromptsStore()

    const apiKey = settingsStore.openRouterKey
    if (!apiKey) return { error: 'OpenRouter API key is not configured' }

    // Get model — strip :online suffix since agent has no web search
    let model = settingsStore.getModelForTask(AI_COMMAND_TYPES.MATCH_REPORT)
    if (!model) return { error: 'No model configured for match report' }
    model = model.replace(/:online$/, '')

    // Determine system prompt: custom user prompt or default from file
    let systemPromptContent
    const activePrompt = systemPromptsStore.getActivePrompt(PROMPT_TYPES.MATCH_REPORT)
    if (activePrompt && !activePrompt.isDefault) {
      // User has a custom prompt selected — use it
      systemPromptContent = activePrompt.content
    } else {
      // Load default agent prompt from file
      try {
        systemPromptContent = await loadAgentPrompt('agents/match-report.md')
      } catch {
        // Fallback to store default if file load fails
        systemPromptContent = activePrompt?.content
        if (!systemPromptContent) return { error: 'No system prompt available for match report' }
      }
    }

    // Append instruction to output in text block
    systemPromptContent +=
      '\n\n**REMINDER: Your match report MUST be wrapped in a ```text``` code block. Content outside the block will be discarded.**'

    // Build agent messages
    const agentMessages = [{ role: 'system', content: systemPromptContent }]

    // Check if TARGET key already exists (iteration vs new)
    const targetCtx = data.getWorkspaceContext(args.workspace_name, args.target_context_key)
    const isIteration = targetCtx && !targetCtx.error && targetCtx.content

    if (!isIteration) {
      // New match report — send job analysis + user profile
      agentMessages.push({
        role: 'user',
        content: `## User Profile\n${profile}\n\n## Job Analysis\n${jobContent}`
      })
    } else {
      // Iteration on existing report
      const existingReport =
        typeof targetCtx.content === 'object'
          ? targetCtx.content.content || JSON.stringify(targetCtx.content)
          : targetCtx.content

      agentMessages.push({
        role: 'user',
        content: `## User Profile\n${profile}\n\n## Job Analysis\n${jobContent}\n\n---\n\n## Current Match Report (to revise)\n${existingReport}`
      })

      if (args.comment && args.comment.trim()) {
        agentMessages.push({
          role: 'user',
          content: `## Revision Instructions\n${args.comment}`
        })
      }
    }

    // Run the agent — no tools, no web search, just focused analysis
    const MAX_RETRIES = 2
    let matchReport = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await streamAndCollect(apiKey, model, agentMessages, null)

        // Extract content from ```text``` block
        const textBlockMatch = result.match(/```text\s*\n([\s\S]*?)```/)
        if (textBlockMatch && textBlockMatch[1].trim()) {
          matchReport = textBlockMatch[1].trim()
          break
        }

        // If no text block found, ask the agent to fix it
        if (attempt < MAX_RETRIES) {
          agentMessages.push({ role: 'assistant', content: result })
          agentMessages.push({
            role: 'user',
            content:
              'Match report MUST BE in a text block. Please provide the match report again, this time inside a ```text``` block.'
          })
        } else {
          // Last resort: use the full response if no text block after retries
          matchReport = result.trim()
        }
      } catch (e) {
        return { error: `Match report agent failed: ${e.message}` }
      }
    }

    if (!matchReport) {
      return { error: 'Match report agent produced no output' }
    }

    // Store the match report in the TARGET workspace context key
    let storeResult
    if (isIteration) {
      // Update existing
      storeResult = data.editWorkspaceContext(
        args.workspace_name,
        args.target_context_key,
        matchReport
      )
    } else {
      // Create new
      storeResult = data.addWorkspaceContext(
        args.workspace_name,
        args.target_context_key,
        matchReport
      )
    }

    if (storeResult.error) {
      return { error: `Match report completed but failed to store: ${storeResult.error}` }
    }

    return {
      success: true,
      message: `Match report saved to "${args.target_context_key}" in workspace "${args.workspace_name}"`,
      report: matchReport
    }
  })

  // ── UTILITY: research_company ───────────────────────────
  registerToolHandler('research_company', async (args) => {
    if (!args.company_info) return { error: 'company_info is required' }

    const settingsStore = useSettingsStore()
    const systemPromptsStore = useSystemPromptsStore()

    const apiKey = settingsStore.openRouterKey
    if (!apiKey) return { error: 'OpenRouter API key is not configured' }

    // Get model and append :online to enable web search via OpenRouter
    let model = settingsStore.getModelForTask(AI_COMMAND_TYPES.COMPANY_RESEARCH)
    if (!model) return { error: 'No model configured for company research' }
    model = model.replace(/:online$/, '') + ':online'

    // Determine system prompt: custom user prompt or default from file
    let systemPromptContent
    const activePrompt = systemPromptsStore.getActivePrompt(PROMPT_TYPES.COMPANY_RESEARCH)
    if (activePrompt && !activePrompt.isDefault) {
      // User has a custom prompt selected — use it
      systemPromptContent = activePrompt.content
    } else {
      // Load default agent prompt from file
      try {
        systemPromptContent = await loadAgentPrompt('agents/company-research.md')
      } catch {
        // Fallback to store default if file load fails
        systemPromptContent = activePrompt?.content
        if (!systemPromptContent)
          return { error: 'No system prompt available for company research' }
      }
    }

    // Append instruction to output in text block (appended programmatically, independent of system prompt)
    systemPromptContent +=
      '\n\n**REMINDER: Your company research report MUST be wrapped in a ```text``` code block. Content outside the block will be discarded.**'

    // Build agent messages
    const agentMessages = [{ role: 'system', content: systemPromptContent }]

    if (args.current_research) {
      // Iteration mode — refine existing research
      agentMessages.push({
        role: 'user',
        content: `## Company Information\n${args.company_info}\n\n---\n\n## Current Research (to improve)\n${args.current_research}${args.iteration_prompt ? `\n\n## Iteration Instructions\n${args.iteration_prompt}` : ''}`
      })
    } else {
      // New research
      agentMessages.push({
        role: 'user',
        content: `Research the following company:\n\n${args.company_info}`
      })
    }

    // Run the agent with web search enabled via :online model suffix
    const MAX_RETRIES = 2
    let research = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await streamAndCollect(apiKey, model, agentMessages, null)

        // Extract content from ```text``` block
        const textBlockMatch = result.match(/```text\s*\n([\s\S]*?)```/)
        if (textBlockMatch && textBlockMatch[1].trim()) {
          research = textBlockMatch[1].trim()
          break
        }

        // If no text block found, ask the agent to fix it
        if (attempt < MAX_RETRIES) {
          agentMessages.push({ role: 'assistant', content: result })
          agentMessages.push({
            role: 'user',
            content:
              'Company research report MUST BE in a text block. Please provide the research report again, this time inside a ```text``` block.'
          })
        } else {
          // Last resort: use the full response if no text block after retries
          research = result.trim()
        }
      } catch (e) {
        return { error: `Company research failed: ${e.message}` }
      }
    }

    if (!research) {
      return { error: 'Company research agent produced no output' }
    }

    // Save to workspace context if workspace_name and target_context_key were provided
    if (args.workspace_name && args.target_context_key) {
      const targetCtx = data.getWorkspaceContext(args.workspace_name, args.target_context_key)
      let storeResult
      if (targetCtx && !targetCtx.error && targetCtx.content) {
        // Update existing
        storeResult = data.editWorkspaceContext(
          args.workspace_name,
          args.target_context_key,
          research
        )
      } else {
        // Create new
        storeResult = data.addWorkspaceContext(
          args.workspace_name,
          args.target_context_key,
          research
        )
      }

      if (storeResult.error) {
        return { error: `Research completed but failed to store: ${storeResult.error}` }
      }
    }

    return { success: true, message: 'Company research completed successfully', research }
  })

  // ── SYSTEM PROMPTS ──────────────────────────────────────
  registerToolHandler('list_system_prompts', async () => {
    const systemPromptsStore = useSystemPromptsStore()
    const categories = systemPromptsStore.listCategories()
    return {
      categories: categories.map((cat) => {
        const activePrompt = systemPromptsStore.getActivePrompt(cat.key)
        return {
          key: cat.key,
          name: cat.name,
          isDefault: cat.isDefault,
          activePromptName: activePrompt?.name || 'Default'
        }
      })
    }
  })

  registerToolHandler('get_system_prompt', async (args) => {
    if (!args.key) return { error: 'key is required' }

    const systemPromptsStore = useSystemPromptsStore()
    if (!systemPromptsStore.hasCategory(args.key)) {
      return {
        error: `System prompt category "${args.key}" not found. Use list_system_prompts to see available categories.`
      }
    }

    const activePrompt = systemPromptsStore.getActivePrompt(args.key)
    if (!activePrompt) {
      return { error: `No active prompt found for category "${args.key}".` }
    }

    return {
      key: args.key,
      name: activePrompt.name,
      isDefault: activePrompt.isDefault,
      content: activePrompt.content
    }
  })

  // ── SUB-AGENT ───────────────────────────────────────────
  registerToolHandler('sub_agent', async (args, onProgress) => {
    if (!args.prompt) return { error: 'prompt is required' }
    if (!args.system_prompt) return { error: 'system_prompt is required' }

    // Validate workspace_name requirement
    if ((args.context_keys?.length > 0 || args.output_key) && !args.workspace_name) {
      return { error: 'workspace_name is required when context_keys or output_key is provided' }
    }

    const settingsStore = useSettingsStore()
    const systemPromptsStore = useSystemPromptsStore()

    const apiKey = settingsStore.openRouterKey
    if (!apiKey) return { error: 'OpenRouter API key is not configured' }

    // Resolve model
    let model = args.model || settingsStore.openRouterModel
    if (!model) return { error: 'No model configured. Please set a default model in settings.' }

    // Resolve system prompt: key lookup first, then treat as literal text
    let systemPromptContent
    if (systemPromptsStore.hasCategory(args.system_prompt)) {
      const activePrompt = systemPromptsStore.getActivePrompt(args.system_prompt)
      if (activePrompt && activePrompt.content) {
        systemPromptContent = activePrompt.content
      } else {
        return { error: `System prompt category "${args.system_prompt}" has no content.` }
      }
    } else {
      // Treat as literal text
      systemPromptContent = args.system_prompt
    }

    // Build context block from context keys and user profile
    let contextBlock = ''

    if (args.context_keys?.length > 0) {
      for (const key of args.context_keys) {
        const ctx = data.getWorkspaceContext(args.workspace_name, key)
        if (ctx && !ctx.error) {
          const content =
            typeof ctx.content === 'object'
              ? ctx.content.content || JSON.stringify(ctx.content)
              : ctx.content
          if (content && content.trim()) {
            contextBlock += `\n\n## Context: ${key}\n${content}`
          }
        }
      }
    }

    if (args.include_user_profile) {
      const profile = data.getUserProfile()
      if (profile && profile.trim()) {
        contextBlock += `\n\n## User Profile\n${profile}`
      }
    }

    // Assemble messages
    const fullSystemPrompt = contextBlock
      ? `${systemPromptContent}\n\n---\n\n# Provided Context${contextBlock}`
      : systemPromptContent

    const agentMessages = [
      { role: 'system', content: fullSystemPrompt },
      { role: 'user', content: args.prompt }
    ]

    // Run the sub-agent (bare LLM call — no tools, no recursion)
    let fullResponse
    try {
      fullResponse = await streamAndCollect(apiKey, model, agentMessages, onProgress || null)
    } catch (e) {
      return { error: `Sub-agent failed: ${e.message}` }
    }

    if (!fullResponse || !fullResponse.trim()) {
      return { error: 'Sub-agent produced no output' }
    }

    // Handle output
    if (args.output_key) {
      // Store in workspace context
      const targetCtx = data.getWorkspaceContext(args.workspace_name, args.output_key)
      let storeResult
      if (targetCtx && !targetCtx.error && targetCtx.content) {
        storeResult = data.editWorkspaceContext(args.workspace_name, args.output_key, fullResponse)
      } else {
        storeResult = data.addWorkspaceContext(args.workspace_name, args.output_key, fullResponse)
      }

      if (storeResult.error) {
        return { error: `Sub-agent completed but failed to store output: ${storeResult.error}` }
      }

      return {
        success: true,
        message: `Sub-agent output stored in "${args.output_key}" in workspace "${args.workspace_name}"`,
        output_key: args.output_key
      }
    }

    // Return full response
    return {
      success: true,
      response: fullResponse
    }
  })
}

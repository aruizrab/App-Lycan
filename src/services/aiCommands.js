/**
 * AI Commands — Slash command definitions and processing
 *
 * Slash commands inject a guided prompt into the main agent's user message.
 * The main agent then discovers and invokes the appropriate agent via
 * list_agents + summon_agent. Commands are sourced from the agents store
 * (built-in and custom agents that have a slashCommand set).
 */

import { useAgentsStore } from '../stores/agents'

/**
 * URL detection regex
 */
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i
export const isUrl = (input) => URL_REGEX.test(input?.trim() || '')

/**
 * Get all available slash commands from the agents store.
 * Returns an array of objects with { id, name, description } for the command menu.
 */
export const getAllCommands = () => {
  try {
    const agentsStore = useAgentsStore()
    return agentsStore.getSlashCommandAgents().map((agent) => ({
      id: agent.slashCommand,
      name: agent.name,
      description: agent.description
    }))
  } catch {
    return []
  }
}

/**
 * Get a command's injection prompt.
 * The injection prompt is the guided text prepended to the user message.
 *
 * @param {string} commandId - The slash command slug (e.g. 'analyze')
 * @param {string} content - Any additional content the user typed after the command
 * @returns {string} The user message to send to the main agent
 */
export const getInjectionPrompt = (commandId, content) => {
  try {
    const agentsStore = useAgentsStore()
    const agent = agentsStore.getAgentBySlashCommand(commandId)
    if (!agent) return content || ''

    const basePrompt =
      agent.slashInjectionPrompt || `Use the ${agent.name} agent to help with this task.`

    if (content && content.trim()) {
      return `${basePrompt}\n\nAdditional context from the user: ${content.trim()}`
    }
    return basePrompt
  } catch {
    return content || ''
  }
}

/**
 * Parse user input to detect a slash command.
 * @param {string} text - Raw input text
 * @returns {{ commandId: string|null, content: string }}
 */
export const parseCommand = (text) => {
  if (!text.startsWith('/')) {
    return { commandId: null, content: text }
  }

  const parts = text.split(' ')
  const slug = parts[0].slice(1).toLowerCase()
  const content = parts.slice(1).join(' ').trim()

  try {
    const agentsStore = useAgentsStore()
    const agent = agentsStore.getAgentBySlashCommand(slug)
    if (agent) {
      return { commandId: slug, content }
    }
  } catch {
    // agents store not ready yet
  }

  return { commandId: null, content: text }
}

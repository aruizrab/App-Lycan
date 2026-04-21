/**
 * @deprecated This store has been superseded by the agents store (src/stores/agents.js).
 * It is kept as an empty stub for backward compatibility.
 * Migration from old localStorage data is handled by the agents store on first load.
 */

import { defineStore } from 'pinia'

/**
 * @deprecated Use useAgentsStore instead.
 */
export const PROMPT_TYPES = {
  JOB_ANALYSIS: 'jobAnalysis',
  MATCH_REPORT: 'matchReport',
  COMPANY_RESEARCH: 'companyResearch',
  CV_GENERATION: 'cvGeneration',
  COVER_LETTER: 'coverLetter'
}

/**
 * @deprecated Stub store. No functionality — use useAgentsStore.
 */
export const useSystemPromptsStore = defineStore('systemPrompts', () => {
  return {}
})

/**
 * @deprecated The systemPrompts store has been replaced by the agents store.
 * This file tests the minimal stub that remains for backward compatibility.
 */
import { describe, it, expect } from 'vitest'
import { useSystemPromptsStore, PROMPT_TYPES } from '../systemPrompts'

describe('systemPrompts store (deprecated stub)', () => {
  it('exports PROMPT_TYPES constants', () => {
    expect(PROMPT_TYPES.JOB_ANALYSIS).toBe('jobAnalysis')
    expect(PROMPT_TYPES.MATCH_REPORT).toBe('matchReport')
    expect(PROMPT_TYPES.COMPANY_RESEARCH).toBe('companyResearch')
    expect(PROMPT_TYPES.CV_GENERATION).toBe('cvGeneration')
    expect(PROMPT_TYPES.COVER_LETTER).toBe('coverLetter')
  })

  it('exports a Pinia store factory', () => {
    expect(typeof useSystemPromptsStore).toBe('function')
  })
})

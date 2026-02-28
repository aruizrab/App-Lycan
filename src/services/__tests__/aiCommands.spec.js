import { describe, it, expect } from 'vitest'
import {
  AI_COMMANDS,
  isUrl,
  parseCommand,
  getCommand,
  getAllCommands
} from '../aiCommands'

describe('aiCommands', () => {
  // ─── isUrl ──────────────────────────────────────────────
  describe('isUrl', () => {
    it('recognizes a full https URL', () => {
      expect(isUrl('https://example.com/jobs/123')).toBe(true)
    })

    it('recognizes http URL', () => {
      expect(isUrl('http://example.com')).toBe(true)
    })

    it('recognizes URL without protocol', () => {
      expect(isUrl('example.com')).toBe(true)
    })

    it('recognizes URL with subdomain', () => {
      expect(isUrl('jobs.linkedin.com/view/123')).toBe(true)
    })

    it('trims whitespace before matching', () => {
      expect(isUrl('  https://example.com  ')).toBe(true)
    })

    it('rejects plain text', () => {
      expect(isUrl('this is not a url')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(isUrl('')).toBe(false)
    })

    it('handles null/undefined input', () => {
      expect(isUrl(null)).toBe(false)
      expect(isUrl(undefined)).toBe(false)
    })

    it('rejects a string with spaces (not a URL)', () => {
      expect(isUrl('hello world')).toBe(false)
    })

    it('recognizes URL with path', () => {
      expect(isUrl('https://linkedin.com/jobs/view/12345')).toBe(true)
    })
  })

  // ─── AI_COMMANDS ────────────────────────────────────────
  describe('AI_COMMANDS', () => {
    it('defines analyze, match, research, and cv commands', () => {
      expect(AI_COMMANDS.analyze).toBeDefined()
      expect(AI_COMMANDS.match).toBeDefined()
      expect(AI_COMMANDS.research).toBeDefined()
      expect(AI_COMMANDS.cv).toBeDefined()
    })

    it('each command has required fields', () => {
      for (const cmd of Object.values(AI_COMMANDS)) {
        expect(cmd).toHaveProperty('id')
        expect(cmd).toHaveProperty('name')
        expect(cmd).toHaveProperty('promptFile')
        expect(cmd).toHaveProperty('promptType')
        expect(cmd).toHaveProperty('commandType')
        expect(cmd).toHaveProperty('buildUserMessage')
      }
    })

    describe('analyze.buildUserMessage', () => {
      it('wraps content when provided', () => {
        const msg = AI_COMMANDS.analyze.buildUserMessage('some job text')
        expect(msg).toContain('some job text')
        expect(msg).toContain('Analyze')
      })

      it('returns generic message when no content', () => {
        const msg = AI_COMMANDS.analyze.buildUserMessage('')
        expect(msg).toContain('workspace')
      })

      it('returns generic message when content is null', () => {
        const msg = AI_COMMANDS.analyze.buildUserMessage(null)
        expect(msg).toContain('workspace')
      })

      it('includes URL content when URL provided', () => {
        const msg = AI_COMMANDS.analyze.buildUserMessage('https://example.com/job')
        expect(msg).toContain('https://example.com/job')
      })
    })

    describe('analyze.requiresWebSearch', () => {
      it('returns true for URL input', () => {
        expect(AI_COMMANDS.analyze.requiresWebSearch('https://example.com/job')).toBe(true)
      })

      it('returns false for plain text input', () => {
        expect(AI_COMMANDS.analyze.requiresWebSearch('Software Engineer role')).toBe(false)
      })
    })

    describe('match.buildUserMessage', () => {
      it('returns a fixed message', () => {
        const msg = AI_COMMANDS.match.buildUserMessage()
        expect(msg).toContain('match report')
      })
    })

    describe('research.buildUserMessage', () => {
      it('wraps content when provided', () => {
        const msg = AI_COMMANDS.research.buildUserMessage('Acme Corp')
        expect(msg).toContain('Acme Corp')
      })

      it('returns generic message when no content', () => {
        const msg = AI_COMMANDS.research.buildUserMessage('')
        expect(msg).toContain('workspace')
      })

      it('returns generic message when content is null', () => {
        const msg = AI_COMMANDS.research.buildUserMessage(null)
        expect(msg).toContain('workspace')
      })
    })

    it('research always requires web search', () => {
      expect(AI_COMMANDS.research.requiresWebSearch).toBe(true)
    })

    it('match never requires web search', () => {
      expect(AI_COMMANDS.match.requiresWebSearch).toBe(false)
    })

    describe('cv.buildUserMessage', () => {
      it('wraps content with CV name when provided', () => {
        const msg = AI_COMMANDS.cv.buildUserMessage('Senior Dev CV')
        expect(msg).toContain('Senior Dev CV')
        expect(msg).toContain('Generate')
      })

      it('returns generic message when no content', () => {
        const msg = AI_COMMANDS.cv.buildUserMessage('')
        expect(msg).toContain('workspace')
      })

      it('returns generic message when content is null', () => {
        const msg = AI_COMMANDS.cv.buildUserMessage(null)
        expect(msg).toContain('workspace')
      })
    })

    it('cv never requires web search', () => {
      expect(AI_COMMANDS.cv.requiresWebSearch).toBe(false)
    })
  })

  // ─── parseCommand ───────────────────────────────────────
  describe('parseCommand', () => {
    it('parses /analyze with content', () => {
      const result = parseCommand('/analyze https://example.com/job')
      expect(result.commandId).toBe('analyze')
      expect(result.content).toBe('https://example.com/job')
    })

    it('parses /match without content', () => {
      const result = parseCommand('/match')
      expect(result.commandId).toBe('match')
      expect(result.content).toBe('')
    })

    it('parses /research with multi-word content', () => {
      const result = parseCommand('/research Acme Corp Inc')
      expect(result.commandId).toBe('research')
      expect(result.content).toBe('Acme Corp Inc')
    })

    it('parses /cv without content', () => {
      const result = parseCommand('/cv')
      expect(result.commandId).toBe('cv')
      expect(result.content).toBe('')
    })

    it('parses /cv with a CV name', () => {
      const result = parseCommand('/cv Senior Developer CV')
      expect(result.commandId).toBe('cv')
      expect(result.content).toBe('Senior Developer CV')
    })

    it('is case-insensitive for command names', () => {
      const result = parseCommand('/ANALYZE something')
      expect(result.commandId).toBe('analyze')
    })

    it('returns null commandId for unknown commands', () => {
      const result = parseCommand('/unknown stuff')
      expect(result.commandId).toBeNull()
      expect(result.content).toBe('/unknown stuff')
    })

    it('returns null commandId for non-command text', () => {
      const result = parseCommand('just some text')
      expect(result.commandId).toBeNull()
      expect(result.content).toBe('just some text')
    })

    it('returns null commandId for slash-only input', () => {
      const result = parseCommand('/')
      expect(result.commandId).toBeNull()
    })

    it('trims trailing whitespace from content', () => {
      const result = parseCommand('/analyze   some job   ')
      expect(result.commandId).toBe('analyze')
      expect(result.content).toBe('some job')
    })

    it('returns empty content when no text after command', () => {
      const result = parseCommand('/research')
      expect(result.commandId).toBe('research')
      expect(result.content).toBe('')
    })
  })

  // ─── getCommand ─────────────────────────────────────────
  describe('getCommand', () => {
    it('returns command definition for valid id', () => {
      const cmd = getCommand('analyze')
      expect(cmd).toBe(AI_COMMANDS.analyze)
    })

    it('returns null for invalid id', () => {
      expect(getCommand('nonexistent')).toBeNull()
    })

    it('returns null for undefined', () => {
      expect(getCommand(undefined)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(getCommand('')).toBeNull()
    })

    it('returns null for null', () => {
      expect(getCommand(null)).toBeNull()
    })
  })

  // ─── getAllCommands ─────────────────────────────────────
  describe('getAllCommands', () => {
    it('returns an array of all commands', () => {
      const commands = getAllCommands()
      expect(Array.isArray(commands)).toBe(true)
      expect(commands.length).toBe(Object.keys(AI_COMMANDS).length)
    })

    it('contains every defined command', () => {
      const commands = getAllCommands()
      const ids = commands.map(c => c.id)
      expect(ids).toContain('analyze')
      expect(ids).toContain('match')
      expect(ids).toContain('research')
      expect(ids).toContain('cv')
    })
  })
})

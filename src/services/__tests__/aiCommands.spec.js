import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { isUrl, parseCommand, getAllCommands, getInjectionPrompt } from '../aiCommands'

describe('aiCommands', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

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

    it('parses /cover without content', () => {
      const result = parseCommand('/cover')
      expect(result.commandId).toBe('cover')
      expect(result.content).toBe('')
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

  // ─── getAllCommands ─────────────────────────────────────
  describe('getAllCommands', () => {
    it('returns an array of commands', () => {
      const commands = getAllCommands()
      expect(Array.isArray(commands)).toBe(true)
      expect(commands.length).toBeGreaterThan(0)
    })

    it('contains the built-in slash commands', () => {
      const commands = getAllCommands()
      const ids = commands.map((c) => c.id)
      expect(ids).toContain('analyze')
      expect(ids).toContain('match')
      expect(ids).toContain('research')
      expect(ids).toContain('cv')
      expect(ids).toContain('cover')
    })

    it('each command has id, name, and description', () => {
      const commands = getAllCommands()
      for (const cmd of commands) {
        expect(cmd).toHaveProperty('id')
        expect(cmd).toHaveProperty('name')
        expect(cmd).toHaveProperty('description')
        expect(typeof cmd.id).toBe('string')
        expect(typeof cmd.name).toBe('string')
      }
    })
  })

  // ─── getInjectionPrompt ─────────────────────────────────
  describe('getInjectionPrompt', () => {
    it('returns a non-empty string for a known command', () => {
      const prompt = getInjectionPrompt('analyze', '')
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(0)
    })

    it('appends extra content when provided', () => {
      const prompt = getInjectionPrompt('analyze', 'https://example.com/job')
      expect(prompt).toContain('https://example.com/job')
    })

    it('returns empty string for an unknown command with no content', () => {
      const prompt = getInjectionPrompt('nonexistent', '')
      expect(prompt).toBe('')
    })

    it('returns content for unknown command when content is provided', () => {
      const prompt = getInjectionPrompt('nonexistent', 'some content')
      expect(prompt).toContain('some content')
    })
  })
})

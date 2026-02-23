# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint with auto-fix
npm run format       # Prettier format src/
npm run test:unit    # Run unit tests (Vitest + jsdom)
```

Run a single test file:
```bash
npx vitest src/components/__tests__/HelloWorld.spec.js
```

## Architecture

**App-Lycan** is a fully client-side SPA — no backend, no database. All user data lives in `localStorage`. AI features require the user's own OpenRouter API key.

### Tech Stack
- **Vue 3** (Composition API with `<script setup>`) + **Vite 7**
- **Pinia** for state management (Composition API style)
- **Tailwind CSS v4** for styling (dark mode via `dark:` prefix)
- **TipTap** for rich text editing
- **OpenRouter SDK** (`@openrouter/sdk`) for AI streaming, tool calling, web search

### Data Flow
```
User Input → View/Component → Store Action → localStorage (persist)
                                   ↓
                            AI Service (ai.js)
                                   ↓
                          OpenRouter API (HTTPS)
```

### Store Hierarchy

Global stores (settings, userProfile, systemPrompts, chat) are independent. Workspace store is the container for job applications, and CV/cover letter stores nest under workspaces.

| Store           | localStorage key           | Purpose                                  |
|-----------------|----------------------------|------------------------------------------|
| `settings`      | `app-lycan-settings`       | API key, model preferences               |
| `userProfile`   | `app-lycan-user-profile`   | User's professional info for AI context  |
| `systemPrompts` | `app-lycan-system-prompts` | Custom prompts per AI command type       |
| `chat`          | `app-lycan-chat-history`   | Unified AI chat sessions across views    |
| `workspace`     | `workspaces`               | Job application containers + AI context  |
| `cv`            | `cvData-{uuid}`            | CV document content                      |
| `cvMeta`        | `cv-list`                  | CV metadata index                        |
| `coverLetter`   | `coverLetters`             | Cover letter content                     |

All stores follow the same localStorage persistence pattern: load on init, `watch(state, persist, { deep: true })`.

### AI System

`AiStreamingChat.vue` is the unified chat UI used in all three main views (Dashboard, WorkspaceDashboard, DocumentEditor). It detects `/` slash commands and delegates to `src/services/aiCommands.js`.

- `src/services/ai.js` — OpenRouter SDK wrapper (`streamChat`, `streamWithTools`, `chatWithTools`, `fetchAvailableModels`)
- `src/services/aiToolkit.js` — Tool definitions (`AI_TOOLS` array) and handlers (`setupToolHandlers`, `executeToolCall`)
- `src/services/aiCommands.js` — Slash command implementations (`/analyze`, `/match`, `/research`, `/cv`, `/cover`)

Tool handlers are registered at app init and allow the AI to directly create/update CV and cover letter documents via function calling.

### Routing

Routes are workspace-scoped. Route guards validate workspace/document existence and redirect to `/` if not found. The `documentType` prop on `DocumentEditor` determines whether it renders a CV or cover letter.

```
/                                         → WorkspaceDashboard
/workspace/:workspaceName                 → Dashboard (per-workspace)
/workspace/:workspaceName/edit/:name      → DocumentEditor (CV)
/workspace/:workspaceName/cover-letter/:name → DocumentEditor (cover letter)
/profile                                  → UserProfile
/settings                                 → Settings
```

### Key Gotchas

- **`toRaw()`**: Use when passing Pinia reactive store data to external APIs (OpenRouter SDK)
- **localStorage limits**: ~5–10MB; large CV collections may hit this
- **Tool calling**: Not all OpenRouter models support it; check model capabilities before using `streamWithTools`
- **Web search**: Enabled per-model via `plugins: [{ id: 'web', max_results: 5 }]`; only certain providers support it (Anthropic, OpenAI, Perplexity, X-AI)
- **Path aliases**: `@` is not configured in vite.config.js — use relative imports

### Adding New AI Tools

1. Add tool definition to `AI_TOOLS` array in `src/services/aiToolkit.js`
2. Register handler via `registerToolHandler('tool_name', async (args) => {...})` in `setupToolHandlers()`

### Adding New Slash Commands

1. Add entry to `SLASH_COMMANDS` in `AiStreamingChat.vue`
2. Handle in `processSlashCommand()` in `AiStreamingChat.vue`
3. Implement the actual AI call in `src/services/aiCommands.js`

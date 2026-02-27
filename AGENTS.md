# Agent Guide for App-Lycan

> Quick reference for AI coding agents working on this codebase.

## Project Overview

**App-Lycan** is a privacy-first, browser-based CV and cover letter builder with AI assistance. Everything runs client-side with data stored in `localStorage`.

### Tech Stack
| Layer     | Technology                                    |
| --------- | --------------------------------------------- |
| Framework | Vue 3 (Composition API with `<script setup>`) |
| Build     | Vite 6                                        |
| State     | Pinia                                         |
| Styling   | Tailwind CSS v4                               |
| Icons     | Lucide Vue                                    |
| Rich Text | TipTap                                        |
| PDF       | html2pdf.js                                   |
| AI        | OpenRouter SDK (`@openrouter/sdk`)            |

## Branch Strategy

| Branch | Purpose |
| --- | --- |
| `master` | Stable released code. Only updated via merges from `develop`. |
| `develop` | Integration branch for work-in-progress. PRs target this branch. |
| feature/fix branches | Created from `master`; PR back to `develop`. |

**When making changes:**
1. Branch off `master` (or off a feature branch if there is a direct dependency).
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/) format.
3. Open a PR **targeting `develop`**, never `master` directly.
4. CI (lint + tests) runs on every PR to `develop` and `master`, and on every push to either branch.
5. Releases are triggered automatically by merging `develop` into `master`.

Do **not** commit directly to `master` or `develop`.

## Key Directories

```
src/
├── components/          # Reusable Vue components
├── views/               # Route-level page components
├── stores/              # Pinia state stores (source of truth)
├── services/            # Business logic & external APIs
├── composables/         # Vue composables (hooks)
└── router/              # Vue Router configuration
```

## Critical Files

### State Management (`src/stores/`)

| Store              | Purpose                            | Key Methods                                                                         |
| ------------------ | ---------------------------------- | ----------------------------------------------------------------------------------- |
| `chat.js`          | Unified AI chat history & sessions | `createSession()`, `addMessage()`, `ensureSession()`, `getApiMessages()`            |
| `workspace.js`     | Workspaces with AI context         | `createWorkspace()`, `setJobAnalysis()`, `setMatchReport()`, `setCompanyResearch()` |
| `cv.js`            | CV document CRUD                   | `createCv()`, `loadCv()`, `saveCv()`, `updateSection()`                             |
| `coverLetter.js`   | Cover letter CRUD                  | `createCoverLetter()`, `loadCoverLetter()`, `saveCoverLetter()`                     |
| `settings.js`      | App settings & API keys            | `apiKey`, `modelSettings`, `defaultModel`                                           |
| `userProfile.js`   | User's professional profile        | `profile`, `updateProfile()`                                                        |
| `systemPrompts.js` | Custom AI prompts                  | `getActivePrompt()`, `addPrompt()`                                                  |

### AI Services (`src/services/`)

| File            | Purpose                               | Key Exports                                                                      |
| --------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| `ai.js`         | OpenRouter SDK wrapper                | `streamChat()`, `streamWithTools()`, `chatWithTools()`, `fetchAvailableModels()` |
| `aiToolkit.js`  | Tool definitions for function calling | `AI_TOOLS`, `executeToolCall()`, `setupToolHandlers()`                           |
| `aiCommands.js` | Slash command implementations         | `performCvAiAction()`, `executeAiCommand()`                                      |

### Main Components

| Component                                        | Purpose                                              |
| ------------------------------------------------ | ---------------------------------------------------- |
| `AiStreamingChat.vue`                            | Unified AI chat with slash commands                  |
| `CvForm.vue` / `CvPreview.vue`                   | CV editing & preview                                 |
| `CoverLetterForm.vue` / `CoverLetterPreview.vue` | Cover letter editing & preview                       |
| `WorkspaceContextPanel.vue`                      | Job analysis, match report, company research display |
| `DocumentGrid.vue` / `DocumentList.vue`          | Document browser                                     |

## Common Tasks

### Adding a New AI Tool

1. Define tool in `src/services/aiToolkit.js`:
   ```javascript
   // Add to AI_TOOLS array
   {
       type: 'function',
       function: {
           name: 'your_tool_name',
           description: 'What the tool does',
           parameters: { /* JSON Schema */ }
       }
   }
   ```

2. Register handler in `setupToolHandlers()`:
   ```javascript
   registerToolHandler('your_tool_name', async (args) => {
       // Implementation using stores
       return { success: true, result: data }
   })
   ```

### Adding a New Slash Command

1. Add to `SLASH_COMMANDS` in `AiStreamingChat.vue`:
   ```javascript
   { name: '/yourcommand', description: 'Description', icon: YourIcon }
   ```

2. Handle in `processSlashCommand()` function

### Creating a New Store

1. Create file in `src/stores/yourStore.js`
2. Use Pinia's `defineStore` with Composition API style
3. Include localStorage persistence pattern:
   ```javascript
   const loadFromStorage = () => { /* ... */ }
   const persist = () => { /* ... */ }
   watch([state], persist, { deep: true })
   ```

### Adding a New Route/View

1. Create component in `src/views/YourView.vue`
2. Add route in `src/router/index.js`
3. Views receive route params via `useRoute()`

## Code Patterns

### Vue Component Structure
```vue
<script setup>
import { ref, computed } from 'vue'
import { useYourStore } from '@/stores/yourStore'

const store = useYourStore()
const localState = ref(null)
const derivedValue = computed(() => /* ... */)

const handleAction = () => { /* ... */ }
</script>

<template>
  <!-- Template here -->
</template>
```

### Store Pattern (Composition API)
```javascript
export const useYourStore = defineStore('yourStore', () => {
    const state = ref(initialValue)
    const derived = computed(() => /* ... */)
    
    const action = () => { /* mutate state */ }
    
    return { state, derived, action }
})
```

### AI Streaming Pattern
```javascript
const generator = streamChat(messages, { model, apiKey })
for await (const chunk of generator) {
    if (chunk.type === 'content') {
        content += chunk.content
    } else if (chunk.type === 'tool_call') {
        // Handle tool call
    }
}
```

## Data Flow

```
User Input → Component → Store Action → State Update → Reactivity → UI Update
                ↓
            Service (AI/API)
                ↓
            External API (OpenRouter)
```

## Testing

```bash
npm run test        # Run unit tests (Vitest)
npm run test:ui     # Run with UI
```

Test files are in `__tests__/` directories adjacent to source files.

## Common Gotchas

1. **localStorage Limits**: Large CV collections may hit browser limits (~5-10MB)
2. **API Key Storage**: Stored in localStorage, never sent to our servers
3. **Reactive Objects**: Use `toRaw()` when passing store data to external APIs
4. **Route Guards**: Check workspace/document existence before rendering

## Quick Commands

```bash
npm run dev         # Start dev server
npm run build       # Production build
npm run preview     # Preview production build
npm run lint        # ESLint check
npm run format      # Prettier format
```

## Related Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Design decisions and patterns
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [OpenRouter Docs](https://openrouter.ai/docs) - AI API reference

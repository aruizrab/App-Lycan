# Architecture Decisions

> Design patterns, architectural decisions, and rationale for App-Lycan.

## Table of Contents

- [Overview](#overview)
- [Core Principles](#core-principles)
- [State Architecture](#state-architecture)
- [AI System](#ai-system)
- [Data Persistence](#data-persistence)
- [Component Architecture](#component-architecture)
- [Decision Log](#decision-log)

---

## Overview

App-Lycan is a single-page application (SPA) built with Vue 3 that runs entirely in the browser. There is no backend server—all data is stored locally in the browser's `localStorage`.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Vue App   │  │ localStorage│  │     OpenRouter API      │  │
│  │             │  │             │  │  (External, via HTTPS)  │  │
│  │  ┌───────┐  │  │  - CVs      │  │                         │  │
│  │  │ Views │  │◄─┤  - Letters  │  │  - AI Chat Streaming    │  │
│  │  └───┬───┘  │  │  - Settings │  │  - Tool Calling         │  │
│  │      │      │  │  - Chats    │  │  - Web Search           │  │
│  │  ┌───▼───┐  │  │  - Profile  │  │                         │  │
│  │  │Stores │  │─►│  - Prompts  │  └─────────────────────────┘  │
│  │  └───┬───┘  │  └─────────────┘              ▲                │
│  │      │      │                               │                │
│  │  ┌───▼───┐  │                               │                │
│  │  │Service│──┼───────────────────────────────┘                │
│  │  └───────┘  │                                                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Principles

### 1. Privacy First
- **No backend database**: All user data stays in the browser
- **No telemetry**: We don't track users
- **API key control**: User provides their own OpenRouter key
- **Export/Import**: Full data portability via JSON

### 2. Offline-Capable
- Core functionality works without internet
- AI features require API connection
- Data never lost due to network issues

### 3. Progressive Enhancement
- Basic CV/letter creation works without AI
- AI enhances but isn't required

---

## State Architecture

We use Pinia with the Composition API style for all stores.

### Store Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      Global Stores                          │
├──────────────┬──────────────┬──────────────┬───────────────┤
│  settings.js │userProfile.js│systemPrompts │   chat.js     │
│  (API key,   │ (User's pro- │  (Custom AI  │  (AI chat     │
│   models)    │  file data)  │   prompts)   │   history)    │
└──────────────┴──────────────┴──────────────┴───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Workspace Store                           │
│  workspace.js - Container for job applications               │
│  Each workspace has: jobAnalysis, matchReport, companyResearch│
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│       cv.js             │     │     coverLetter.js          │
│  CV document CRUD       │     │  Cover letter CRUD          │
│  Multiple CVs per       │     │  Multiple letters per       │
│  workspace              │     │  workspace                  │
└─────────────────────────┘     └─────────────────────────────┘
              │
              ▼
┌─────────────────────────┐
│      cvMeta.js          │
│  CV metadata & list     │
│  (lightweight index)    │
└─────────────────────────┘
```

### Store Responsibilities

| Store           | Responsibility                                 | Persistence Key            |
| --------------- | ---------------------------------------------- | -------------------------- |
| `settings`      | API keys, model preferences, UI settings       | `app-lycan-settings`       |
| `userProfile`   | User's professional information for AI context | `app-lycan-user-profile`   |
| `systemPrompts` | Custom AI prompts per command type             | `app-lycan-system-prompts` |
| `chat`          | AI conversation sessions                       | `app-lycan-chat-history`   |
| `workspace`     | Job application containers with AI context     | `workspaces`               |
| `cv`            | CV document content                            | `cvData-{id}`              |
| `cvMeta`        | CV metadata list                               | `cv-list`                  |
| `coverLetter`   | Cover letter content                           | `coverLetters`             |

### State Persistence Pattern

All stores follow this pattern for localStorage persistence:

```javascript
export const useYourStore = defineStore('yourStore', () => {
    const STORAGE_KEY = 'your-storage-key'
    const state = ref(defaultValue)

    // Load on initialization
    const loadFromStorage = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) state.value = JSON.parse(saved)
        } catch (e) {
            console.warn('Failed to load from storage', e)
        }
    }

    // Persist on changes
    const persist = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
        } catch (e) {
            console.warn('Failed to persist to storage', e)
        }
    }

    loadFromStorage()
    watch(state, persist, { deep: true })

    return { state, /* actions */ }
})
```

---

## AI System

### Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                      AiStreamingChat.vue                       │
│  - Unified chat UI                                             │
│  - Slash command detection (/analyze, /cv, etc.)               │
│  - Session management                                          │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                        chat.js Store                           │
│  - Session storage                                             │
│  - Message history                                             │
│  - Streaming state                                             │
└────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│       ai.js             │     │     aiToolkit.js            │
│  OpenRouter SDK wrapper │     │  Tool definitions           │
│  - streamChat()         │     │  - AI_TOOLS array           │
│  - streamWithTools()    │     │  - executeToolCall()        │
│  - chatWithTools()      │     │  - setupToolHandlers()      │
└─────────────────────────┘     └─────────────────────────────┘
              │                               │
              ▼                               ▼
┌────────────────────────────────────────────────────────────────┐
│                      OpenRouter API                            │
│  - 300+ models available                                       │
│  - Streaming support                                           │
│  - Tool calling (function calling)                             │
│  - Web search plugin                                           │
└────────────────────────────────────────────────────────────────┘
```

### Slash Commands

Commands prefixed with `/` trigger specialized AI workflows:

| Command     | Purpose                                  | Requires Web Search |
| ----------- | ---------------------------------------- | ------------------- |
| `/analyze`  | Parse job posting, extract requirements  | Yes (for URLs)      |
| `/match`    | Compare profile to job requirements      | No                  |
| `/research` | Investigate company legitimacy & culture | Yes                 |
| `/cv`       | Generate tailored CV                     | No                  |
| `/cover`    | Generate cover letter                    | No                  |

### Tool Calling (Function Calling)

The AI can execute actions via OpenRouter's tool calling feature:

```javascript
// Tool definition (OpenAI-compatible format)
{
    type: 'function',
    function: {
        name: 'create_cv',
        description: 'Create a new CV document',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                personalInfo: { type: 'object', /* ... */ }
            }
        }
    }
}
```

Available tools:
- `create_cv` / `update_cv`
- `create_cover_letter` / `update_cover_letter`
- `analyze_job_posting`
- `research_company`
- `match_profile_to_job`
- `save_workspace_data`

### Web Search Integration

Models from specific providers support web search:
- Anthropic (Claude)
- OpenAI (GPT-4)
- Perplexity (Sonar models - native search)
- X-AI (Grok)

Web search is enabled via OpenRouter's plugin system:
```javascript
plugins: [{ id: 'web', max_results: 5 }]
```

---

## Data Persistence

### localStorage Schema

```
localStorage
├── app-lycan-settings          # Global settings, API key
├── app-lycan-user-profile      # User's professional profile
├── app-lycan-system-prompts    # Custom AI prompts
├── app-lycan-chat-history      # AI chat sessions
├── workspaces                  # Workspace index + context
├── cv-list                     # CV metadata array
├── cvData-{uuid}               # Individual CV content
└── coverLetters                # All cover letters
```

### Data Export Format

Users can export all data as JSON:

```json
{
    "version": "1.0",
    "exportedAt": "2026-02-04T...",
    "profile": { /* user profile */ },
    "workspaces": [ /* workspace array */ ],
    "cvs": [ /* cv array */ ],
    "coverLetters": [ /* letter array */ ],
    "settings": { /* app settings (excluding API key) */ }
}
```

---

## Component Architecture

### Component Categories

1. **Views** (`src/views/`) - Route-level components
   - Receive route params
   - Orchestrate multiple components
   - Handle page-level state

2. **Components** (`src/components/`) - Reusable UI pieces
   - Receive props, emit events
   - May access stores for global state
   - Should be relatively self-contained

3. **Composables** (`src/composables/`) - Shared logic
   - Vue composition functions
   - Reusable stateful logic

### Component Communication

```
Parent → Child: Props
Child → Parent: Events ($emit)
Siblings: Store (Pinia)
Global State: Store
```

### Key Component Relationships

```
App.vue
├── Dashboard.vue (/)
│   ├── DocumentGrid.vue
│   └── AiStreamingChat.vue (floating panel)
│
├── DocumentEditor.vue (/cv/:id, /letter/:id)
│   ├── CvForm.vue / CoverLetterForm.vue
│   ├── CvPreview.vue / CoverLetterPreview.vue
│   └── AiStreamingChat.vue (side panel)
│
├── WorkspaceDashboard.vue (/workspace/:id)
│   ├── WorkspaceContextPanel.vue
│   ├── DocumentList.vue
│   └── AiStreamingChat.vue
│
├── UserProfile.vue (/profile)
│
└── Settings.vue (/settings)
    ├── ModelSettings.vue
    └── SystemPromptsManager.vue
```

---

## Decision Log

### ADR-001: Client-Side Only Architecture
**Status**: Accepted  
**Context**: Need to prioritize user privacy and reduce operational costs  
**Decision**: No backend server; all data in localStorage  
**Consequences**: 
- ✅ Complete privacy
- ✅ No hosting costs
- ⚠️ Data limited to single browser
- ⚠️ No sync across devices (mitigated by export/import)

### ADR-002: OpenRouter for AI
**Status**: Accepted  
**Context**: Need AI capabilities with model flexibility  
**Decision**: Use OpenRouter SDK as unified API for 300+ models  
**Consequences**:
- ✅ Model flexibility (switch models easily)
- ✅ Single API key for all providers
- ✅ Consistent streaming API
- ⚠️ Dependency on OpenRouter availability

### ADR-003: Unified Chat Store
**Status**: Accepted (Feb 2026)  
**Context**: Chat history was getting lost due to fragmented state  
**Decision**: Single `chat.js` store accessible from all views  
**Consequences**:
- ✅ Consistent chat history
- ✅ Seamless context switching between views
- ✅ Session created on message send (not response)

### ADR-004: Tool Calling Architecture
**Status**: Accepted (Feb 2026)  
**Context**: AI needs to create/modify documents  
**Decision**: Use OpenRouter tool calling with registered handlers  
**Consequences**:
- ✅ Structured AI actions
- ✅ Type-safe tool parameters
- ✅ Handlers registered at app init
- ⚠️ Not all models support tool calling

### ADR-005: Tailwind CSS v4
**Status**: Accepted  
**Context**: Need rapid UI development with dark mode  
**Decision**: Use Tailwind CSS v4 with native dark mode  
**Consequences**:
- ✅ Fast styling
- ✅ Consistent design system
- ✅ Easy dark mode with `dark:` prefix

---

## Future Considerations

1. **IndexedDB Migration**: For larger data storage needs
2. **Service Worker**: For true offline capability
3. **WebRTC Sync**: Optional P2P sync between devices
4. **Plugin System**: Allow custom AI tools/commands

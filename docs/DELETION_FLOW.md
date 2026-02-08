# Deletion Confirmation Flow

## AI-Initiated Deletion Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ User: "Delete workspace 'Old Projects'"                          │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ AI Chat Component                                                 │
│  - Parses user intent                                            │
│  - Calls delete_workspace tool                                   │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ aiToolkit.js - delete_workspace handler                          │
│  executeToolCall('delete_workspace', { workspace_name })         │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ dataAccess.js - deleteWorkspaceWithConfirm()                     │
│  1. Create pending deletion object                               │
│  2. Return Promise (waits for user response)                     │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ DeletionConfirmDialog.vue                                         │
│  - Polls getPendingDeletion() every 100ms                        │
│  - Detects pending deletion                                      │
│  - Shows confirmation modal                                      │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                  ┌─────────┴─────────┐
                  │                   │
                  ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ User Confirms    │  │ User Cancels     │
        │ (Red button)     │  │ (or ESC/Outside) │
        └────────┬─────────┘  └────────┬─────────┘
                 │                     │
                 ▼                     ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │ confirmDeletion()    │  │ rejectDeletion()     │
    │ Promise → true       │  │ Promise → false      │
    └────────┬─────────────┘  └────────┬─────────────┘
             │                         │
             ▼                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ dataAccess.js - continues execution                              │
│  if (confirmed) {                                                │
│    workspace.deleteWorkspace(name)                               │
│    return { success: true }                                      │
│  } else {                                                        │
│    return { error: 'Deletion cancelled by user' }               │
│  }                                                               │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ AI Chat Component                                                 │
│  - Receives tool result                                          │
│  - Reports outcome to user                                       │
└──────────────────────────────────────────────────────────────────┘
```

## UI-Initiated Deletion Flow (Existing)

```
┌──────────────────────────────────────────────────────────────────┐
│ User clicks Delete button in Workspace/Document UI               │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ Component (Dashboard.vue / WorkspaceDashboard.vue)               │
│  - Shows browser confirm() dialog                                │
│  - Synchronous confirmation                                      │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                  ┌─────────┴─────────┐
                  │                   │
                  ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ User OK          │  │ User Cancel      │
        └────────┬─────────┘  └────────┬─────────┘
                 │                     │
                 ▼                     ▼
    ┌──────────────────────┐  ┌──────────────────┐
    │ Execute deletion     │  │ Do nothing       │
    │ store.delete...()    │  │                  │
    └──────────────────────┘  └──────────────────┘
```

## Key Design Decisions

### Why Two Different Confirmation Systems?

1. **Browser confirm() for UI actions**: 
   - Synchronous and immediate
   - Simple and familiar
   - Perfect for direct user actions
   - No polling or complexity needed

2. **DeletionConfirmDialog for AI actions**:
   - Async promise-based flow
   - Required for AI tool execution that needs to pause
   - More visually polished with dark mode support
   - Consistent with app's design system
   - Provides detailed context about what's being deleted

### Benefits of This Approach

- **Consistency Where It Matters**: AI interactions get a consistent, branded dialog
- **Simplicity**: UI deletions remain simple with native confirm()
- **Flexibility**: Can easily update UI to use DeletionConfirmDialog later if desired
- **Performance**: No unnecessary polling for UI-initiated deletions

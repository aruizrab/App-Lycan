# Deletion Confirmation UI - Implementation Notes

## Overview
The deletion confirmation system provides a user-friendly way to confirm all deletion operations in App-Lycan before they are executed.

## Architecture

### Components
- **DeletionConfirmDialog.vue** - Modal dialog component that watches for pending deletions
- **dataAccess.js** - Provides deletion confirmation API

### How It Works

1. **AI Tool Initiates Deletion**
   ```javascript
   // AI tool calls one of these:
   deleteWorkspaceWithConfirm(workspaceName)
   deleteCvWithConfirm(workspaceName, cvName)
   deleteCoverLetterWithConfirm(workspaceName, coverLetterName)
   deleteWorkspaceContextWithConfirm(workspaceName, contextKey)
   ```

2. **Confirmation Request Created**
   - `dataAccess.js` creates a pending deletion object with type and details
   - Returns a Promise that waits for user response

3. **Dialog Appears**
   - `DeletionConfirmDialog` polls `getPendingDeletion()` every 100ms
   - When pending deletion detected, dialog appears with appropriate message
   - Dialog shows different messages based on deletion type:
     - **Workspace**: Full warning about all nested content
     - **CV**: Confirmation with workspace and CV name
     - **Cover Letter**: Confirmation with workspace and cover letter name
     - **Context Data**: Confirmation with workspace and context key name

4. **User Decision**
   - **Confirm**: Calls `confirmDeletion()` → Promise resolves to `true` → Deletion proceeds
   - **Cancel**: Calls `rejectDeletion()` → Promise resolves to `false` → Deletion cancelled
   - **ESC Key**: Same as Cancel
   - **Click Outside**: Same as Cancel

5. **Result**
   - If confirmed, the deletion executes and returns success
   - If rejected, the deletion is cancelled and returns an error

## UI Features

- **Visual Design**: Red-themed warning dialog with alert icon
- **Accessibility**: ARIA labels, keyboard support (ESC to close)
- **Responsive**: Works on all screen sizes
- **Dark Mode**: Full dark mode support
- **Animations**: Smooth fade and scale transitions

## Usage Example

When AI receives a command like:
```
User: "Delete the workspace 'Old Projects'"
```

The AI will:
1. Use the `delete_workspace` tool
2. Tool calls `deleteWorkspaceWithConfirm('Old Projects')`
3. Dialog appears asking user to confirm
4. User clicks "Delete Workspace" or "Cancel"
5. AI receives success or error response
6. AI reports the outcome to user

## Testing

To test the deletion confirmation:

1. Start the dev server: `npm run dev`
2. Navigate to a workspace
3. Use AI chat to request a deletion, e.g.:
   - "Delete this workspace"
   - "Delete the CV named 'Software Engineer'"
   - "Delete the job analysis context"
4. Verify the confirmation dialog appears
5. Test both confirm and cancel actions
6. Verify the deletion only proceeds when confirmed

## Integration Points

The DeletionConfirmDialog is integrated at the App.vue level, making it available throughout the entire application regardless of which view is active.

```vue
<!-- App.vue -->
<template>
  <router-view></router-view>
  <DeletionConfirmDialog />
</template>
```

## Implementation Details

### Polling Strategy
The component uses a 100ms polling interval to check for pending deletions. This is a simple and effective approach that:
- Doesn't require complex event emitters
- Works across async boundaries
- Has minimal performance impact (simple object check)
- Stops polling when dialog is shown

### Promise-Based Confirmation
The confirmation system uses Promises to bridge synchronous UI interactions with async tool execution:
```javascript
const confirmed = await requestDeletionConfirmation('workspace', { workspaceName })
if (confirmed) {
  // Proceed with deletion
} else {
  // Return error
}
```

This allows the AI tool execution to pause and wait for user input before proceeding.

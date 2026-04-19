# Documentation Updates

When implementing a feature or refactor, assess whether the changes affect architecture or user-facing behavior. If they do, update the relevant documentation as part of the same branch — not as a separate PR.

## When to Update

### `docs/ARCHITECTURE.md`

Update when the change involves any of:

- New stores, services, or composables added
- Changes to how components communicate or are structured
- New external dependencies or integrations
- Changes to the localStorage schema or data persistence strategy
- New AI tools, slash commands, or tool calling handlers
- Architectural decisions that differ from or extend the existing ADRs — add a new ADR entry

### `README.md`

Update when the change involves any of:

- New user-facing features (add to the Features section)
- New slash commands (update the commands table)
- New AI tools available via function calling
- Changes to the tech stack or dependencies
- Changes to setup, installation, or configuration steps
- New environment variables or required configuration

### `AGENTS.md`

Update when the change involves any of:

- New stores added (update the State Management table)
- New services or key exports (update the AI Services table)
- New components that other agents should know about
- New common task patterns worth documenting

## How to Update

- Keep updates concise and consistent with the existing style of each document
- For `ARCHITECTURE.md` ADR entries, follow the existing format:
  ```
  ### ADR-XXX: Title
  **Status**: Accepted
  **Context**: Why this decision was needed
  **Decision**: What was decided
  **Consequences**: Trade-offs (use ✅ and ⚠️)
  ```
- Commit documentation updates together with the implementation using the `docs` type if standalone, or include them in the feature/fix commit if tightly coupled
- Do not create new documentation files unless explicitly requested

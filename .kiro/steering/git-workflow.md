# Git Workflow

When implementing a spec or any non-trivial change, follow this branch and PR workflow.

## Branch Creation

Before writing any code:

1. Ensure you are on `master` and it is up to date:
   ```bash
   git checkout master
   git pull origin master
   ```
2. Create a branch using the naming convention that matches the change type:
   - Features: `feature/<short-description>`
   - Bug fixes: `fix/<short-description>`
   - Refactors: `refactor/<short-description>`
   - Docs: `docs/<short-description>`

   Use kebab-case. Example: `feature/cv-drag-drop-sections`

3. All implementation work happens on this branch. Never commit directly to `master` or `develop`.

## Commits

Every commit must follow Conventional Commits format (enforced by commitlint):

```
<type>(<optional scope>): <short description>
```

- Imperative mood, lowercase, no trailing period, ≤ 72 chars
- Valid types: `feat`, `fix`, `perf`, `revert`, `docs`, `style`, `refactor`, `test`, `ci`, `chore`
- Recommended scopes: `ai`, `cv`, `cover-letter`, `workspace`, `settings`, `profile`, `router`, `store`, `ui`, `deps`

## Pull Request

When implementation is complete, open a PR targeting `develop` (never `master`):

```bash
gh pr create --base develop --title "<type>(<scope>): <description>" --body "<summary of changes>"
```

If the `gh` CLI is not available, output the PR details (title, base branch, description) so the user can create it manually.

The PR description should include:

- What was changed and why
- Any breaking changes
- How to test the changes

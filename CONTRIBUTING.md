# Contributing to App-Lycan

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to App-Lycan. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/repository-url/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/repository-url/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

- Open a new issue with the **enhancement** label.
- Describe the step-by-step behavior you suggest.
- Explain why this enhancement would be useful.

### Pull Requests

This project follows a **master → develop → feature branch** workflow:

| Branch    | Purpose                                                         |
| --------- | --------------------------------------------------------------- |
| `master`  | Stable, released code. Only receives merges from `develop`.    |
| `develop` | Integration branch for work-in-progress features and fixes.    |
| feature/* / fix/* | Short-lived branches created from `master` (or from another feature branch when there is a dependency). |

**Branch flow for a new feature or fix:**

1. Create your branch from `master` (or from an existing feature branch if your work depends on it).
   ```bash
   git checkout master
   git pull origin master
   git checkout -b feat/your-feature-name
   ```
2. Make your changes, commit with [Conventional Commits](https://www.conventionalcommits.org/) style messages.
3. Open a **Pull Request targeting `develop`** (not `master`).
4. Once the PR is merged, CI runs against `develop`.
5. When enough changes accumulate in `develop`, a maintainer will merge `develop` → `master`, triggering the release workflow.

**Additional rules:**

- Direct commits to `master` and `develop` are not allowed.
- Every PR must pass lint, unit tests, and e2e tests before merging.
- Commit messages are validated with `commitlint` on every PR.

## Development Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/app-lycan.git
    cd app-lycan
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run development server**
    ```bash
    npm run dev
    ```

## Project Structure

- `src/components`: UI components
- `src/stores`: Pinia state management
- `src/views`: Page views (Editor, Dashboard)
- `src/services`: External services (AI, etc.)

## Styleguides

### Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by `commitlint`. Each commit message must follow the format:

```
<type>(<optional scope>): <short description>
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

Examples:
- `feat(cv): add section reordering`
- `fix(ai): handle empty API key gracefully`
- `docs: update contributing guidelines`

Limit the subject line to 72 characters.

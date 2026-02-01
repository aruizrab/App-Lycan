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

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes.
4. Make sure your code lints.
5. Title your Pull Request clearly.

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

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less

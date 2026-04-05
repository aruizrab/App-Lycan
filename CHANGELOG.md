## [1.2.1](https://github.com/aruizrab/App-Lycan/compare/v1.2.0...v1.2.1) (2026-04-05)

### Bug Fixes

- **build:** apply /App-Lycan/ base only in production to avoid breaking dev/e2e ([30dd3e4](https://github.com/aruizrab/App-Lycan/commit/30dd3e4fa598e8c9b39ee29c0cee365188085e3e))
- **build:** set vite base path to /App-Lycan/ for GitHub Pages ([73d06c6](https://github.com/aruizrab/App-Lycan/commit/73d06c611a7556ca91f1eb8aced2f4bf6fcfc3e0))
- **router:** use import.meta.env.BASE_URL for GitHub Pages compatibility ([13308fa](https://github.com/aruizrab/App-Lycan/commit/13308fa8f48f4de277ad2bdbbdd23f87860be48f))

# [1.2.0](https://github.com/aruizrab/App-Lycan/compare/v1.1.0...v1.2.0) (2026-04-04)

### Bug Fixes

- **chat:** call setActivePinia before re-instantiating store in persistence tests ([cd8d7b0](https://github.com/aruizrab/App-Lycan/commit/cd8d7b0343c4bdb98ab1ec06b41a21d68d36c207))
- **model:** update Job Analysis command to not require web search ([d07da64](https://github.com/aruizrab/App-Lycan/commit/d07da648042c1743c99e6e0b5b1fc44b1d7504c8))
- **ui:** correct AI Settings header icon contrast in dark mode ([#7](https://github.com/aruizrab/App-Lycan/issues/7)) ([c575877](https://github.com/aruizrab/App-Lycan/commit/c5758775e224b2b6d46c7b6b95caed479c2e3e26))
- **ui:** fix dark mode text color in AI Settings General tab ([faa6083](https://github.com/aruizrab/App-Lycan/commit/faa60830273da44c518456ad4cb981e516a112d2))
- **ui:** hide AI chat panel from PDF export ([723d394](https://github.com/aruizrab/App-Lycan/commit/723d3941f085d5ec2c169d12433ae5d85c9868c3))
- **ui:** remove unused computed vars in AiStreamingChat ([5e421f0](https://github.com/aruizrab/App-Lycan/commit/5e421f072a7daea0efd10dbcc58a163dc5b70786))

### Features

- **ai:** add sub-agent tool and system prompt tools ([1bc0d98](https://github.com/aruizrab/App-Lycan/commit/1bc0d98a5e46ed80cc9c0127e79b682d980179c5))
- **chat:** implement model selection and migration for legacy sessions ([02a4a22](https://github.com/aruizrab/App-Lycan/commit/02a4a222f184c20833d28356a19e7b4e408c26c7))
- **context:** implement context management with summarization and token tracking ([53413e1](https://github.com/aruizrab/App-Lycan/commit/53413e1773d22d7853493e8e25236956959e9b10))
- **cv:** merge CV/cover-letter arrays by id on edit ([83ce022](https://github.com/aruizrab/App-Lycan/commit/83ce022f15414c7f0891a9f9b1462d2d4da356b3))
- **profile:** make user profile a modal ([b812c6f](https://github.com/aruizrab/App-Lycan/commit/b812c6f9cf486ff68f2049db810a397afa49ad1b))
- **store:** add custom system prompt categories with UI management ([092d749](https://github.com/aruizrab/App-Lycan/commit/092d749bf202ea235d46113951c6457779275732))

# [1.1.0](https://github.com/aruizrab/App-Lycan/compare/v1.0.0...v1.1.0) (2026-02-26)

### Bug Fixes

- update company research access in aiToolkit tests ([d37cbae](https://github.com/aruizrab/App-Lycan/commit/d37cbae745e04caafe1ee89f5ef8da62a072c6c1))

### Features

- implement research command workflow ([1796b70](https://github.com/aruizrab/App-Lycan/commit/1796b706def9eca63adcfa06290c03426429486d))

# 1.0.0 (2026-02-26)

### Bug Fixes

- always show add entry button in WorkspaceContextPanel ([2cd54ba](https://github.com/aruizrab/App-Lycan/commit/2cd54bac888ec8f3f435c382ba01cb1895281532))
- bump Node.js to v22 in CI/CD workflows ([02625d8](https://github.com/aruizrab/App-Lycan/commit/02625d89c39248a909f7f46dae2d85951520f1f1))
- migrate to ESLint 9 flat config and fix all lint errors ([bd88e78](https://github.com/aruizrab/App-Lycan/commit/bd88e78850375c3b76f2fd979f58b75ed4c29457))
- update semantic-release branch from main to master ([304c362](https://github.com/aruizrab/App-Lycan/commit/304c36271748e1fd2ddacdc04ab07170a0778e89))

### Features

- add AI integration for CV modifications and enhance CV store with undo/redo functionality ([875c363](https://github.com/aruizrab/App-Lycan/commit/875c363b9057bfad9946c84357db4e027712e9e6))
- add comprehensive unit test suite for stores and services ([50046fc](https://github.com/aruizrab/App-Lycan/commit/50046fcfc9e689503aea8a5cc5e128a5cf2e956f))
- add cover letter functionality with editor and preview components ([37da451](https://github.com/aruizrab/App-Lycan/commit/37da45145a784b34f62c214fe91019f7e217f521))
- add Playwright e2e test suite ([3eae705](https://github.com/aruizrab/App-Lycan/commit/3eae705cc5ec612f3406257237421f6b92ce0d92))
- add system prompts and user profile management features ([a74a8c9](https://github.com/aruizrab/App-Lycan/commit/a74a8c983dc899275b80fc60ada1ba0ad0d65acd))
- add workspace management features including creation, import, and export ([e84119e](https://github.com/aruizrab/App-Lycan/commit/e84119e03b6d8d9588423290577789999370224e))
- Enhance AI job analysis capabilities and UI improvements ([2e7c4ea](https://github.com/aruizrab/App-Lycan/commit/2e7c4ea2fb8fa1ccbd0f91814ad00c13d882a71c))
- implement model caching and fetching in settings store; remove CvEditor.vue; update DocumentEditor.vue and UserProfile.vue to utilize available models and improve profile editing experience ([6c1d3e2](https://github.com/aruizrab/App-Lycan/commit/6c1d3e247f56fb25b05a3714149ec4dad8e68791))
- integrate Vue Router for navigation and add CV editor view ([af832ac](https://github.com/aruizrab/App-Lycan/commit/af832ac1485e58ef52b88bb0c9faa91b89252c46))
- rename project to App-Lycan and update package metadata ([c38e6f9](https://github.com/aruizrab/App-Lycan/commit/c38e6f9a1055408e251d5ae2539972042d15aaad))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-24

### Added

- Initial release of App-Lycan
- Workspace management system
- Drag-and-drop CV builder
- Cover Letter builder
- AI-powered content enhancement (OpenRouter integration)
- ATS-friendly preview mode
- PDF Export via html2pdf.js
- LocalStorage persistence (full privacy)
- Dark/Light mode support

# 1.0.0 (2026-02-26)


### Bug Fixes

* always show add entry button in WorkspaceContextPanel ([2cd54ba](https://github.com/aruizrab/App-Lycan/commit/2cd54bac888ec8f3f435c382ba01cb1895281532))
* bump Node.js to v22 in CI/CD workflows ([02625d8](https://github.com/aruizrab/App-Lycan/commit/02625d89c39248a909f7f46dae2d85951520f1f1))
* migrate to ESLint 9 flat config and fix all lint errors ([bd88e78](https://github.com/aruizrab/App-Lycan/commit/bd88e78850375c3b76f2fd979f58b75ed4c29457))
* update semantic-release branch from main to master ([304c362](https://github.com/aruizrab/App-Lycan/commit/304c36271748e1fd2ddacdc04ab07170a0778e89))


### Features

* add AI integration for CV modifications and enhance CV store with undo/redo functionality ([875c363](https://github.com/aruizrab/App-Lycan/commit/875c363b9057bfad9946c84357db4e027712e9e6))
* add comprehensive unit test suite for stores and services ([50046fc](https://github.com/aruizrab/App-Lycan/commit/50046fcfc9e689503aea8a5cc5e128a5cf2e956f))
* add cover letter functionality with editor and preview components ([37da451](https://github.com/aruizrab/App-Lycan/commit/37da45145a784b34f62c214fe91019f7e217f521))
* add Playwright e2e test suite ([3eae705](https://github.com/aruizrab/App-Lycan/commit/3eae705cc5ec612f3406257237421f6b92ce0d92))
* add system prompts and user profile management features ([a74a8c9](https://github.com/aruizrab/App-Lycan/commit/a74a8c983dc899275b80fc60ada1ba0ad0d65acd))
* add workspace management features including creation, import, and export ([e84119e](https://github.com/aruizrab/App-Lycan/commit/e84119e03b6d8d9588423290577789999370224e))
* Enhance AI job analysis capabilities and UI improvements ([2e7c4ea](https://github.com/aruizrab/App-Lycan/commit/2e7c4ea2fb8fa1ccbd0f91814ad00c13d882a71c))
* implement model caching and fetching in settings store; remove CvEditor.vue; update DocumentEditor.vue and UserProfile.vue to utilize available models and improve profile editing experience ([6c1d3e2](https://github.com/aruizrab/App-Lycan/commit/6c1d3e247f56fb25b05a3714149ec4dad8e68791))
* integrate Vue Router for navigation and add CV editor view ([af832ac](https://github.com/aruizrab/App-Lycan/commit/af832ac1485e58ef52b88bb0c9faa91b89252c46))
* rename project to App-Lycan and update package metadata ([c38e6f9](https://github.com/aruizrab/App-Lycan/commit/c38e6f9a1055408e251d5ae2539972042d15aaad))

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

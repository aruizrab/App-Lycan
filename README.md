# App-Lycan <img src="public/logo.svg" align="right" width="120" />

> A privacy-first, AI-powered CV and cover letter builder that runs entirely in your browser.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue.js-3.x-green)
![Vite](https://img.shields.io/badge/Vite-6.x-blueviolet)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8)

**App-Lycan** is a powerful, open-source tool designed to help you create professional resumes and cover letters with ease. It combines a rich text editor, drag-and-drop layout management, and AI-powered content enhancement into a seamless, offline-first experience.

![Demo Screenshot](docs/demo-screenshot.png)
_(Note: Add a screenshot of the application here)_

## ✨ Features

### Core Features

- **🏠 Workspace Management**: Organize multiple job applications with dedicated workspaces. Each workspace can contain multiple CVs and cover letters tailored for a specific role.
- **🎨 Visual CV Builder**:
  - Drag-and-drop sections to reorder content.
  - Dedicated sections for Experience, Education, Projects, Skills, Languages, and more.
  - Real-time preview with ATS-friendly mode.
- **📝 Rich Text Editing**: Full WYSIWYG support powered by TipTap for all content fields.
- **📄 PDF Export**: High-quality PDF generation for download.
- **🌑 Dark/Light Mode**: Full theme support for comfortable editing at any time.
- **🔒 Privacy First**:
  - **No Database**: All data is stored in your browser's `localStorage`.
  - **Import/Export**: Detailed JSON export to backup or move your data.

### 🤖 Advanced AI Features

#### Unified AI Chat

- **Single Interface**: One consistent AI chat accessible from Dashboard, Document Editor, and Workspace views.
- **Persistent History**: Chat sessions saved automatically when you send a message, accessible from any view.
- **Streaming Responses**: Real-time AI responses with smooth streaming interface.
- **Tool Calling**: AI can directly create/edit CVs and cover letters via function calling.

#### OpenRouter SDK Integration

- **300+ Models**: Access to GPT-4, Claude, Gemini, Perplexity, and more via single API key.
- **Web Search Plugin**: Live web search capabilities for job URL analysis and company research.
- **Function Calling**: Structured tool execution for document manipulation.

#### Slash Commands

Type `/` in the chat to access specialized commands with autocomplete:

| Command     | Purpose                                | Web Search |
| ----------- | -------------------------------------- | ---------- |
| `/analyze`  | Extract requirements from job postings | Yes (URLs) |
| `/match`    | Compatibility analysis vs your profile | No         |
| `/research` | Company investigation & red flags      | Yes        |
| `/cv`       | Generate tailored CV for the role      | No         |
| `/cover`    | Generate personalized cover letter     | No         |

#### User Profile System

- **Global Professional Profile**: Rich-text editor for detailed professional experience.
- **Context for AI**: Your profile serves as the foundation for all AI-generated content.
- **Import/Export**: Portable JSON format for backup and sharing.

#### AI Tool Calling

The AI can execute actions directly through function calling:

- `create_cv` / `update_cv` - Create or modify CV documents
- `create_cover_letter` / `update_cover_letter` - Create or modify cover letters
- `analyze_job_posting` - Extract job requirements
- `research_company` - Investigate company details
- `match_profile_to_job` - Generate compatibility report

#### Workspace-Scoped AI Context

Each workspace maintains:

- **Job Analysis**: Extracted requirements, skills, and qualifications from job postings.
- **Match Report**: Compatibility score, strengths, gaps, and application recommendations.
- **Company Research**: Company details, culture insights, legitimacy score, and red flags.

#### Customization & Control

- **Per-Task Model Settings**: Configure different AI models for each command type.
- **Web Search Filtering**: Automatically filter model list based on web search requirements.
- **Custom System Prompts**: Full control over AI behavior with customizable prompts per command.
- **Match Threshold**: Configurable minimum score (default 70%) for job application recommendations.

#### Smart Features

- **URL Auto-Detection**: Automatically detects job posting URLs and fetches content with web search models.
- **Context Preview**: Collapsible accordion showing exactly what context is sent to AI.
- **Apply Button**: Review AI suggestions before applying them to your documents.
- **Regeneration**: Easily regenerate any AI context with updated parameters.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/your-username/app-lycan.git
    cd app-lycan
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Run the development server**

    ```bash
    npm run dev
    ```

4.  Open your browser to `http://localhost:5173` (or the port shown in your terminal).

## 🔑 AI Configuration

### Quick Setup

1. Navigate to **Settings** (⚙️ icon in the header) or **User Profile** (👤 icon).
2. Enter your [OpenRouter](https://openrouter.ai/) API Key.
3. The key is saved securely in your browser's local storage - we never see it!

### Advanced Configuration

#### Model Settings

- Configure different models for each AI command type (analyze, match, research, CV, cover).
- Add custom models with web search compatibility flags.
- Recommended models include GPT-4o, Claude Sonnet 4, Perplexity Sonar, and Gemini 2.0.

#### System Prompts

- Customize AI behavior with your own system prompts.
- Create multiple prompt variations per command type.
- Set active prompts for each command.
- Duplicate and modify default prompts as starting points.

#### User Profile

1. Go to **User Profile** to set up your professional information.
2. Add detailed professional experience using the rich text editor.
3. Include contact information (name, email, phone, location, LinkedIn, portfolio).
4. Your profile serves as context for all AI-generated content.

### Usage Tips

- **For Job Applications**: Create a new workspace per job, use `/analyze` on the job posting, then `/match` to see compatibility.
- **For Company Vetting**: Use `/research` with the company URL to check legitimacy and culture fit.
- **For Quick CVs**: Use `/cv` to generate tailored CVs based on job context and your profile.
- **Web Search Models**: Use Perplexity Sonar or Gemini for commands that need real-time web data (job URLs, company research).

## 🛠️ Technology Stack

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide Vue](https://lucide.dev/)
- **Rich Text**: [TipTap](https://tiptap.dev/)
- **PDF Generation**: [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/)
- **AI Integration**: [OpenRouter SDK](https://openrouter.ai/) (Streaming support, 300+ models)

## 📊 Project Structure

```
cv-maker/
├── src/
│   ├── components/        # Vue components
│   │   ├── AiStreamingChat.vue     # Unified AI chat with slash commands
│   │   ├── WorkspaceContextPanel.vue
│   │   ├── CvForm.vue / CvPreview.vue
│   │   ├── CoverLetterForm.vue / CoverLetterPreview.vue
│   │   ├── ModelSettings.vue
│   │   └── SystemPromptsManager.vue
│   ├── views/             # Page views
│   │   ├── Dashboard.vue           # Main dashboard with AI panel
│   │   ├── DocumentEditor.vue      # CV/Letter editor with AI
│   │   ├── WorkspaceDashboard.vue  # Workspace view with AI
│   │   ├── UserProfile.vue
│   │   └── Settings.vue
│   ├── stores/            # Pinia stores (state management)
│   │   ├── chat.js        # Unified AI chat sessions
│   │   ├── workspace.js   # Workspace with AI context
│   │   ├── cv.js          # CV document CRUD
│   │   ├── coverLetter.js # Cover letter CRUD
│   │   ├── userProfile.js # User's professional profile
│   │   ├── settings.js    # App settings & API keys
│   │   └── systemPrompts.js
│   ├── services/          # Business logic & APIs
│   │   ├── ai.js          # OpenRouter SDK integration
│   │   ├── aiToolkit.js   # Tool definitions for function calling
│   │   └── aiCommands.js  # Slash command implementations
│   ├── composables/       # Vue composables
│   └── router/            # Vue Router
├── docs/
│   └── ARCHITECTURE.md    # Architecture decisions & design patterns
├── AGENTS.md              # Guide for AI coding agents
└── public/
```

## 🎯 Recommended Workflow

### For Job Seekers

1. **Setup Profile**
   - Navigate to User Profile (👤 icon)
   - Fill in your professional experience using the rich text editor
   - Add contact information

2. **Create Workspace**
   - Create a new workspace for each job application
   - Name it after the company/role for easy organization

3. **Analyze Job Posting**
   - Open the workspace
   - Use `/analyze` command with the job posting URL or description
   - Review extracted requirements and qualifications

4. **Check Compatibility**
   - Use `/match` command to see how well you fit
   - Review strengths and gaps
   - Note the match score and recommendation

5. **Research Company**
   - Use `/research` command with the company website/LinkedIn
   - Check legitimacy score and red flags
   - Review company culture insights

6. **Generate Documents**
   - Use `/cv` command to create a tailored CV
   - Use `/cover` command for a personalized cover letter
   - Edit and refine as needed

7. **Export & Apply**
   - Export to PDF
   - Review one final time
   - Submit your application with confidence!

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) for details on our code of conduct and the process for submitting pull requests.

### For AI Agents / LLMs

If you're an AI coding assistant working on this project:

- Start with [AGENTS.md](AGENTS.md) for a quick reference guide
- See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for design decisions and patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the amazing Vue.js ecosystem
- Icons by [Lucide](https://lucide.dev/)
- AI powered by [OpenRouter](https://openrouter.ai/)
- Rich text editing by [TipTap](https://tiptap.dev/)

---

**Made with ❤️ for job seekers everywhere. Good luck with your applications!**

# App-Lycan <img src="public/logo.svg" align="right" width="120" />

> A privacy-first, AI-powered CV and cover letter builder that runs entirely in your browser.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Vue](https://img.shields.io/badge/Vue.js-3.x-green)
![Vite](https://img.shields.io/badge/Vite-6.x-blueviolet)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8)

**App-Lycan** is a powerful, open-source tool designed to help you create professional resumes and cover letters with ease. It combines a rich text editor, drag-and-drop layout management, and AI-powered content enhancement into a seamless, offline-first experience.

![Demo Screenshot](docs/demo-screenshot.png)
*(Note: Add a screenshot of the application here)*

## ✨ Features

- **🏠 Workspace Management**: Organize multiple versions of your CVs and cover letters in separate workspaces.
- **🎨 Visual CV Builder**:
  - Drag-and-drop sections to simple reorder content.
  - Dedicated sections for Experience, Education, Projects, Skills, Languages, and more.
  - Real-time preview.
- **🦾 AI Enhancement**:
  - Integrate with specific AI models via OpenRouter (GPT-4, Claude 3, etc.).
  - Fix typos, improve tone, and rewrite descriptions with one click.
  - **Privacy:** Your API key is stored locally in your browser.
- **📝 Rich Text Editing**: Full WYSIWYG support for all content fields.
- **👁️ ATS Mode**: View your CV in a raw, text-optimized format to ensure it parses correctly by Applicant Tracking Systems.
- **🔒 Privacy First**:
  - **No Database**: All data is stored in your browser's `localStorage`.
  - **Import/Export**: detailed JSON export to backup or move your data.
- **📄 PDF Export**: High-quality PDF generation for download.
- **🌑 Dark/Light Mode**: Full theme support for comfortable editing at any time.

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

To use the AI features:
1.  Go to **Settings** in the application.
2.  Enter your [OpenRouter](https://openrouter.ai/) API Key.
3.  Select your preferred model.
4.  The key is saved securely in your browser's local storage and never sent to our servers (because we don't have any!).

## 🛠️ Technology Stack

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide Vue](https://lucide.dev/)
- **Rich Text**: [TipTap](https://tiptap.dev/)
- **PDF Generation**: [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the amazing Vue.js ecosystem.
- Icons by Lucide.

import { defineStore } from 'pinia'
import { reactive, watch, toRefs, computed } from 'vue'

const STORAGE_KEY = 'app-lycan-system-prompts'

/**
 * AI Command types that support custom system prompts
 */
export const PROMPT_TYPES = {
    JOB_ANALYSIS: 'jobAnalysis',
    MATCH_REPORT: 'matchReport',
    COMPANY_RESEARCH: 'companyResearch',
    CV_GENERATION: 'cvGeneration',
    COVER_LETTER: 'coverLetter'
}

/**
 * Default system prompts for each AI command type
 */
export const DEFAULT_PROMPTS = {
    [PROMPT_TYPES.JOB_ANALYSIS]: `You are an expert job analyst assistant with web search capabilities. Your task is to analyze a job posting and extract key information.

**CRITICAL: When given a URL, you MUST use your native web search/browsing capability to fetch and read the actual content from that URL. Do not respond without first accessing and reading the page content.**

When analyzing a job posting (from text or URL):

1. **Job Title**: The exact title of the position
2. **Company**: Company name and brief description if available
3. **Location**: Work location and remote/hybrid options
4. **Key Responsibilities**: Main duties and tasks (bullet points)
5. **Required Qualifications**: Must-have skills, experience, education
6. **Preferred Qualifications**: Nice-to-have skills and experience
7. **Technical Skills**: Specific technologies, tools, frameworks mentioned
8. **Soft Skills**: Communication, leadership, teamwork requirements
9. **Compensation**: Salary range, benefits if mentioned
10. **Company Culture**: Values, work environment indicators
11. **Red Flags**: Any concerning elements (unrealistic expectations, vague descriptions, etc.)
12. **Keywords**: Important terms for resume optimization

Format your response as structured HTML with clear headings and bullet points.
Be thorough but concise. Focus on actionable information that helps with application preparation.

**IMPORTANT: After generating the analysis, you MUST call the "save_workspace_data" tool to save your findings.**
- DataType: "jobAnalysis"
- Data: { 
    content: "YOUR_FULL_HTML_ANALYSIS", 
    jobTitle: "Extracted Title", 
    company: "Extracted Company", 
    source: "url" (if URL used) or "text" 
  }

**Remember: If the user provides a URL, you MUST fetch and read its content before analyzing. Use your web search capability to access the page.**`,

    [PROMPT_TYPES.MATCH_REPORT]: `You are an expert career advisor and recruiter. Your task is to analyze how well a candidate's profile matches a specific job opportunity.

Given the candidate's professional profile and a job analysis, evaluate:

1. **Match Score (0-100)**: Overall compatibility percentage
2. **Strengths**: Skills and experiences that align well with requirements (list with explanations)
3. **Gaps/Weaknesses**: Missing or underdeveloped qualifications (list with severity)
4. **Transferable Skills**: Relevant skills that could compensate for gaps
5. **Experience Alignment**: How well past roles prepare for this position
6. **Recommendation**: Should the candidate apply? (Apply/Consider/Skip)
7. **Application Strategy**: How to position the application for best results
8. **Talking Points**: Key achievements to highlight in cover letter/interview
9. **Skills to Develop**: Short-term improvements that could strengthen candidacy

Be honest but constructive. A match score below 50% should recommend "Skip" unless there are compelling transferable skills.
A score of 50-69% should recommend "Consider" with caveats.
A score of 70%+ should recommend "Apply" with strategy tips.

Format your response as structured HTML with clear sections.`,

    [PROMPT_TYPES.COMPANY_RESEARCH]: `You are an expert business researcher and career advisor. Your task is to research a company to help a job applicant make informed decisions and prepare compelling application materials.

Research and analyze the following aspects:

**LEGITIMACY CHECK:**
1. Company verification (founding date, headquarters, employee count)
2. Online presence quality (professional website, social media activity)
3. Glassdoor/Indeed reviews summary (overall rating, common themes)
4. Red flags (complaints about payment, high turnover, legal issues)
5. Legitimacy Score (0-100) with explanation

**STRATEGIC INTELLIGENCE:**
1. Business Model: How the company makes money
2. Products/Services: Core offerings and target market
3. Recent News: Latest announcements, achievements, press coverage
4. Company Culture: Values, work environment, employee testimonials
5. Growth Trajectory: Funding, expansion, market position
6. Challenges: Known difficulties or industry headwinds
7. Leadership: Key executives and their backgrounds
8. Competitive Landscape: Main competitors and differentiation

**APPLICATION INSIGHTS:**
1. What the company values in employees
2. Topics to mention in cover letter
3. Questions to ask in interview
4. How to demonstrate cultural fit

Format as structured HTML. Be balanced - acknowledge both positives and concerns.
If information is unavailable, say so rather than speculating.`,

    [PROMPT_TYPES.CV_GENERATION]: `You are an expert CV/resume writer with deep knowledge of ATS systems and hiring practices.

Your task is to help create or improve a CV based on:
- The candidate's professional profile
- The job analysis (if available)
- The match report (if available)

**GUIDELINES:**
1. **ATS Optimization**: Use keywords from the job posting naturally
2. **Impact Statements**: Use action verbs and quantify achievements (increased X by Y%)
3. **Relevance**: Prioritize experience most relevant to the target role
4. **Clarity**: Use clear, professional language
5. **Structure**: Maintain logical flow and consistent formatting
6. **Length**: Keep content concise but comprehensive

**WHEN EDITING:**
- Preserve HTML formatting tags (bold, italic, lists)
- Maintain the existing CV structure unless asked to reorganize
- Only modify sections specifically requested

**OUTPUT FORMAT:**
Return a JSON object with:
- "cvData": The complete modified CV data structure
- "message": Brief explanation of changes made

Ensure all text is grammatically correct and professionally written.`,

    [PROMPT_TYPES.COVER_LETTER]: `You are an expert cover letter writer who creates compelling, personalized application letters.

Using the provided context (job analysis, match report, company research, user profile), craft a cover letter that:

**STRUCTURE:**
1. **Opening Hook**: Attention-grabbing first line that shows genuine interest
2. **Why This Company**: Demonstrate knowledge of the company (from research)
3. **Why You're Qualified**: Connect your experience to their needs (from match report)
4. **Specific Value**: Concrete examples of what you'll bring
5. **Cultural Fit**: Show alignment with company values
6. **Call to Action**: Professional closing with enthusiasm

**GUIDELINES:**
- Length: 3-4 paragraphs, under 400 words
- Tone: Professional yet personable
- Avoid: Generic phrases, obvious keyword stuffing, desperation
- Include: Specific details that prove you've done your homework
- Format: Clean HTML with proper paragraphs

**PERSONALIZATION:**
- Reference specific company achievements or goals
- Address pain points the role seems designed to solve
- Connect your unique background to their specific needs

The cover letter should feel genuine and tailored, not templated.
Output the letter body as HTML that can be directly used in the cover letter editor.`
}

/**
 * Default prompts state structure
 */
const defaultPromptsState = () => {
    const state = {}
    Object.values(PROMPT_TYPES).forEach(type => {
        state[type] = {
            default: DEFAULT_PROMPTS[type],
            custom: [], // [{ id, name, content, createdAt, lastModified }]
            activeId: 'default' // 'default' or custom prompt id
        }
    })
    return state
}

/**
 * System Prompts Store
 * Manages customizable system prompts for each AI command type
 */
export const useSystemPromptsStore = defineStore('systemPrompts', () => {
    const state = reactive(defaultPromptsState())

    /**
     * Load prompts from localStorage
     */
    const loadFromStorage = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                // Merge with defaults to handle new prompt types added in updates
                const defaults = defaultPromptsState()
                Object.keys(defaults).forEach(type => {
                    if (parsed[type]) {
                        state[type] = {
                            ...defaults[type],
                            ...parsed[type],
                            // Always use latest default prompt
                            default: defaults[type].default
                        }
                    }
                })
            }
        } catch (e) {
            console.warn('Failed to load system prompts, using defaults', e)
        }
    }

    /**
     * Persist prompts to localStorage
     */
    const persist = () => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        } catch (e) {
            console.warn('Failed to persist system prompts', e)
        }
    }

    // Load on initialization
    loadFromStorage()

    // Auto-save on changes
    watch(state, persist, { deep: true })

    /**
     * Get active prompt for a command type
     */
    const getActivePrompt = (type) => {
        const promptConfig = state[type]
        if (!promptConfig) return null

        if (promptConfig.activeId === 'default') {
            return {
                id: 'default',
                name: 'Default',
                content: promptConfig.default,
                isDefault: true
            }
        }

        const customPrompt = promptConfig.custom.find(p => p.id === promptConfig.activeId)
        if (customPrompt) {
            return { ...customPrompt, isDefault: false }
        }

        // Fallback to default if active custom prompt not found
        return {
            id: 'default',
            name: 'Default',
            content: promptConfig.default,
            isDefault: true
        }
    }

    /**
     * Get all prompts for a command type (default + custom)
     */
    const getAllPrompts = (type) => {
        const promptConfig = state[type]
        if (!promptConfig) return []

        return [
            { id: 'default', name: 'Default', content: promptConfig.default, isDefault: true },
            ...promptConfig.custom.map(p => ({ ...p, isDefault: false }))
        ]
    }

    /**
     * Set active prompt for a command type
     */
    const setActivePrompt = (type, promptId) => {
        if (state[type]) {
            state[type].activeId = promptId
        }
    }

    /**
     * Add custom prompt
     */
    const addCustomPrompt = (type, name, content) => {
        if (!state[type]) return null

        const newPrompt = {
            id: crypto.randomUUID(),
            name,
            content,
            createdAt: Date.now(),
            lastModified: Date.now()
        }

        state[type].custom.push(newPrompt)
        return newPrompt.id
    }

    /**
     * Update custom prompt
     */
    const updateCustomPrompt = (type, promptId, updates) => {
        if (!state[type]) return false

        const prompt = state[type].custom.find(p => p.id === promptId)
        if (prompt) {
            Object.assign(prompt, updates, { lastModified: Date.now() })
            return true
        }
        return false
    }

    /**
     * Delete custom prompt
     */
    const deleteCustomPrompt = (type, promptId) => {
        if (!state[type]) return false

        const index = state[type].custom.findIndex(p => p.id === promptId)
        if (index !== -1) {
            state[type].custom.splice(index, 1)
            // Reset to default if deleted prompt was active
            if (state[type].activeId === promptId) {
                state[type].activeId = 'default'
            }
            return true
        }
        return false
    }

    /**
     * Duplicate a prompt (custom only)
     */
    const duplicatePrompt = (type, promptId) => {
        if (!state[type]) return null

        let sourcePrompt
        if (promptId === 'default') {
            sourcePrompt = { name: 'Default', content: state[type].default }
        } else {
            sourcePrompt = state[type].custom.find(p => p.id === promptId)
        }

        if (!sourcePrompt) return null

        return addCustomPrompt(type, `${sourcePrompt.name} (Copy)`, sourcePrompt.content)
    }

    /**
     * Reset a command type to default prompt
     */
    const resetToDefault = (type) => {
        if (state[type]) {
            state[type].activeId = 'default'
        }
    }

    /**
     * Get custom prompts count for a type
     */
    const getCustomPromptsCount = (type) => {
        return state[type]?.custom.length || 0
    }

    /**
     * Export all custom prompts
     */
    const exportPrompts = () => {
        const exported = {}
        Object.keys(state).forEach(type => {
            exported[type] = {
                custom: state[type].custom,
                activeId: state[type].activeId
            }
        })
        return JSON.stringify(exported, null, 2)
    }

    /**
     * Import custom prompts
     */
    const importPrompts = (jsonContent, merge = true) => {
        try {
            const parsed = JSON.parse(jsonContent)

            Object.keys(parsed).forEach(type => {
                if (state[type] && parsed[type]) {
                    if (merge) {
                        // Merge: add imported prompts without duplicates
                        const existingIds = new Set(state[type].custom.map(p => p.id))
                        parsed[type].custom?.forEach(p => {
                            if (!existingIds.has(p.id)) {
                                state[type].custom.push(p)
                            }
                        })
                    } else {
                        // Replace: overwrite custom prompts
                        state[type].custom = parsed[type].custom || []
                        state[type].activeId = parsed[type].activeId || 'default'
                    }
                }
            })

            return true
        } catch (e) {
            console.error('Failed to import prompts', e)
            return false
        }
    }

    return {
        ...toRefs(state),
        getActivePrompt,
        getAllPrompts,
        setActivePrompt,
        addCustomPrompt,
        updateCustomPrompt,
        deleteCustomPrompt,
        duplicatePrompt,
        resetToDefault,
        getCustomPromptsCount,
        exportPrompts,
        importPrompts,
        PROMPT_TYPES
    }
})

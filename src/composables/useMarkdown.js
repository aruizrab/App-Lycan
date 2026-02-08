import { marked } from 'marked'
import DOMPurify from 'dompurify'

/**
 * Composable for rendering markdown safely
 * Uses marked for parsing and DOMPurify for sanitization
 */
export const useMarkdown = () => {
    // Configure marked options
    marked.setOptions({
        breaks: true,        // Convert \n to <br>
        gfm: true,          // GitHub Flavored Markdown
        headerIds: false,   // Disable header IDs (not needed in chat)
        mangle: false       // Don't mangle email addresses
    })

    /**
     * Render markdown to safe HTML
     * @param {string} markdown - Raw markdown text
     * @returns {string} Sanitized HTML
     */
    const renderMarkdown = (markdown) => {
        if (!markdown) return ''

        try {
            // Parse markdown to HTML
            const rawHtml = marked.parse(markdown)

            // Sanitize HTML to prevent XSS
            const cleanHtml = DOMPurify.sanitize(rawHtml, {
                ALLOWED_TAGS: [
                    'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
                    'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3',
                    'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                    'hr', 'del', 'ins', 'sup', 'sub'
                ],
                ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
            })

            return cleanHtml
        } catch (e) {
            console.error('Markdown rendering error:', e)
            return markdown // Fallback to plain text
        }
    }

    return {
        renderMarkdown
    }
}

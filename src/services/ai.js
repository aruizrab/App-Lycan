export const performAiAction = async (apiKey, model, cvData, userPrompt, systemInstructions) => {
    if (!apiKey) {
        throw new Error('OpenRouter API Key is missing. Please configure it in settings.')
    }

    const payload = {
        model: model,
        messages: [
            {
                role: 'system',
                content: systemInstructions
            },
            {
                role: 'user',
                content: JSON.stringify({
                    cvData: cvData,
                    userPrompt: userPrompt
                })
            }
        ],
        response_format: { type: 'json_object' }
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin, // Required by OpenRouter
                'X-Title': 'CV Maker' // Optional
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error?.message || `API Error: ${response.statusText}`)
        }

        const data = await response.json()
        const content = data.choices[0].message.content

        try {
            return JSON.parse(content)
        } catch (e) {
            console.error("Failed to parse AI response", content)
            throw new Error("AI response was not valid JSON")
        }

    } catch (error) {
        console.error('AI Service Error:', error)
        throw error
    }
}

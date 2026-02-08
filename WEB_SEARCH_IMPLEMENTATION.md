# Web Search Implementation for Analyze Command

## Issue
The `/analyze` command was not properly enabling web search when analyzing job posting URLs, preventing models from fetching and analyzing remote content.

## Solution
Updated the AI command execution flow to properly pass web search plugin configuration to OpenRouter API when needed.

## Changes Made

### 1. Updated `executeAiCommand()` in `src/services/aiCommands.js`
**What Changed:**
- Added conditional web search plugin configuration based on `needsWebSearch` flag
- Plugin `{ id: 'web' }` is now properly passed to the streaming function
- Added console logging for debugging

**How it works:**
```javascript
const streamOptions = {}
if (needsWebSearch) {
    console.log('[executeAiCommand] Enabling web search plugin for', command.name)
    streamOptions.plugins = [{ id: 'web' }]
}

const fullResponse = await streamAndCollect(
    apiKey,
    model,
    messages,
    onChunk,
    streamOptions  // ← Web search plugin passed here
)
```

### 2. Enhanced logging in `streamAiResponse()` in `src/services/ai.js`
**What Changed:**
- Added logging when web search plugin is detected
- Added handling for web search result annotations
- Improved visibility of when web search is actually being used

**Benefits:**
- Easier debugging of web search behavior
- Ability to capture and display web search citations to users
- Better insight into API interactions

## How Web Search Works (Per OpenRouter Docs)

### Plugin Configuration
When you pass `plugins: [{ id: 'web' }]` in the API request:
- **Native-capable models** (OpenAI, Anthropic, Perplexity, xAI) use their provider's native search
- **Other models** use Exa search as fallback
- Models are automatically instructed to cite sources using markdown links

### Alternative: `:online` Suffix
Instead of using plugins, you can append `:online` to the model ID:
```javascript
{ model: "openai/gpt-4o:online" }
// Equivalent to:
{ model: "openai/gpt-4o", plugins: [{ id: 'web' }] }
```

### Web Search Results Format
Results come back as annotations in the response:
```javascript
{
  message: {
    role: "assistant",
    content: "Based on the job posting at [company.com](https://company.com)...",
    annotations: [
      {
        type: "url_citation",
        url_citation: {
          url: "https://company.com/jobs/123",
          title: "Software Engineer - Company Name",
          content: "...",
          start_index: 100,
          end_index: 200
        }
      }
    ]
  }
}
```

## Testing

### To verify web search is working:

1. **Check Console Logs:**
   - Look for `[executeAiCommand] Enabling web search plugin for Analyze Job`
   - Look for `[streamAiResponse] Web search plugin enabled for model: <model-id>`
   - Look for `[streamAiResponse] Received web search annotations: N`

2. **Test with URL:**
   ```
   /analyze https://example.com/jobs/software-engineer
   ```
   
3. **Verify Model Support:**
   - Ensure you're using a model that supports web search
   - Check model settings - web search compatible models have 🌐 icon
   - Recommended: Anthropic Claude, OpenAI GPT-4, Perplexity models

4. **Expected Behavior:**
   - Model should fetch content from the URL
   - Analysis should include specific details from the remote page
   - Response may include citations/links to sources

## Command Requirements

Commands that require web search:
- **`/analyze`** (Job Analysis): Only when URL is provided
  - `isUrl(input)` determines if web search is needed
  - Text-based analysis doesn't need web search
  
- **`/research`** (Company Research): Always requires web search
  - Fetches company information from multiple sources
  - Checks reviews, news, social media

## Future Enhancements

### Potential Improvements:
1. **Display Web Search Citations:** Show users which sources were consulted
2. **Search Context Size:** Allow users to configure search depth (low/medium/high)
3. **Engine Selection:** Let users choose between native and Exa search
4. **Max Results:** Configure how many web results to include (default: 5)

### Configuration Options Available:
```javascript
plugins: [
  {
    id: 'web',
    engine: 'native' | 'exa' | undefined,  // Choose search engine
    max_results: 5,                          // Number of results (default: 5)
    search_prompt: 'Custom prompt...'        // Custom search instruction
  }
]
```

## Cost Considerations

### Web Search Pricing:
- **Native Search** (OpenAI, Anthropic, Perplexity, xAI):
  - Costs passed through from provider
  - Usually included in standard API pricing
  - Check provider docs for specifics

- **Exa Search** (fallback for other models):
  - $4 per 1000 results via OpenRouter credits
  - Default 5 results = $0.02 per request
  - Additional to LLM token costs

## References

- [OpenRouter Web Search Documentation](https://openrouter.ai/docs/guides/features/plugins/web-search)
- [AGENTS.md](AGENTS.md) - Project AI implementation guide
- [src/services/ai.js](src/services/ai.js) - Core AI service
- [src/services/aiCommands.js](src/services/aiCommands.js) - Command execution logic

# SUB AGENT TOOL DEFINITION

We want to enable Lycan AI to spawn sub agents with a new tool.

## Prerequisites

Before building the tool, the following changes must be ensured in the codebase.

### System Prompts

System Prompts are in AI Settings > System Prompts in the application.

- There are predefined system prompts: Job Analysis, Match Report, Company Research, CV Generation, Cover Letter. These cannot be deleted.
- The predefined system prompts are more of a category: There is the default one, and the user can add/edit/delete new ones, as well as select which prompt is to be used.
- User will now be able to manually add new categories, with the similar behavior: add/edit/delete new prompts, as well as select which prompt is to be used.
- Categories (both default and user created) must be able to be referenced by a key, similar to how workspace context keys work.

This set up is necessary to enable the System Prompt Tools.

### System Prompt Tools

#### List System Prompts

Obtains a list of existing system prompts by key.

#### Get System Prompt

Returns the active (selected) system prompt for a given key.

## Sub Agent Tool

Params:

- Model:
  - IF not specified, uses default model.
  - IF user specifies what model they wish to use, LycanAI will use that model for the sub-agent.
  - IF the task requires web search, Lycan will append ":online" to the model name, which will trigger the sub-agent to have web search enabled.
- System Prompt:
  - Can either be a system prompt key, or a text.
  - IF it's a key, the tool loads into the system instructions of the sub-agent the text of the active (selected) system prompt corresponding to that key.
  - IF it's a text, the tool loads that text directly into the system instructions of the sub-agent.
  - User can specify Lycan whether to use an existing prompt, and Lycan will use the List System Prompts to verify its existence and have the exact text of the key.
- Context:
  - LycanAI can pass context to the sub-agent. Instead of directly inputting the text to the sub-agent, it can pass context keys that will be loaded into the sub-agent's context. This allows the sub-agent to have access to relevant information without overwhelming the prompt with too much text. LycanAI can also specify whether to pass the user profile, which will be loaded to the context as well.
- Prompt:
  - The prompt that the sub-agent will receive as user input when spawned. This is the main instruction for the sub-agent on what to do. It can be a question, a task, or any instruction that guides the sub-agent's behavior.
- Output key (optional):
  - If not defined, LycanAI will receive the full response of the sub-agent.´
  - If defined, the output of the agent will be stored in the workspace context key, and Lycan AI will receive an execution success from the tool.

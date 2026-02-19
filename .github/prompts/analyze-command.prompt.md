Let's rework the analyze command.

# ANALYZE COMMAND WORKFLOW
´´´
User triggers /analyze command.
IF there is a URL in the command:
    Assistant uses native web search to fetch the job posting
    Assistant ads job posting to the workspace context
ELSE:
    The Assistant checks the workspace context for a job posting entry.
    IF NOT there THEN:
        Ask the user to either add the job posting to the workspace context, or provide it in the chat.
        IF user provides in the chat:
           Add entry of job posting to the workspace.
        IF user adds it to the context themselves and reports back:
           Check if its in the workspace context, if not keep repeating back to the suer until it's in the workspace context or offer to add it.
FINALLY:
Assistant uses the job_analysis command, passing as param:
- the job posting workspace key
- the context key where the job analysis will be stored
- any additional comments (in case they are iterating over an existing analysis)
When tool execution finishes, report back to the user.
´´´
Notes:
- When user triggers /analyze, a prompt in public/prompts/commands/analyze.md is loaded and added as system instructions to the chat in order to command the AI assistant to perform the described workflow.

JOB ANALYSIS TOOL WORKFLOW:
´´´
Tool receives:
- the job posting workspace key (let's call it SOURCE)
- the context key where the job analysis will be stored (let's call it TARGET)
- any additional comments (in case they are iterating over an existing analysis) (let's call it COMMENT)

IF TARGET key does not exist in the workspace (it's a new analysis):
    Create a new AI agent instance, suing the configured model for the task and loading system instructions from public/prompts/agents/job-analysis.md that describes how the agent must perform the analysis.
    IF user has created any analysis prompt and it's selected to use that one, use that prompt instead, otherwise default to job-analysis.md.
    Besides the used system prompt, include an instruction to make the AI agent output the rich text analysis in a text block (```text```)`.
ELSE:

    The job posting is loaded from SOURCE key and added to the chat.
    Wait for full agent response.
    Extract job analysis from text block, discarding any additional comments the AI agent may have done in the response.
    IF there is no text block or it's empty, add a user message to the agent chat saying "Job analysis MUST BE in a text block". Repeat until the text block arrives.
    Add extracted job analysis into TARGET workspace context key.
    Return success.
´´´
Notes:
- Any errors from the specialized agent i nthe analysis tool is reported back to the general assistant and tool execution finished.
- The customized agent received no ":online" in the model name for web search nor toolkit, it's only purpose is to perform the job analysis in isolation and maximize attention on that task.

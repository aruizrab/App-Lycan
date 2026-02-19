Ensure match command follows this workflow. Edit anything if necessary.

# MATCH COMMAND WORKFLOW
```
User triggers /match command.

STEP 1: Verify Job Analysis Exists
    The Assistant checks the workspace context for a job analysis entry.
    IF NOT there THEN:
        Inform the user they need to run the /analyze command first to create a job analysis.
        Explain that the match report requires an existing job analysis to compare against their profile.
        STOP - do not proceed until job analysis exists.

STEP 2: Verify User Profile is Complete
    The Assistant checks the user profile data.
    IF profile is empty, contains placeholder text, or has insufficient meaningful data THEN:
        Encourage the user to fill out their profile with real professional information.
        Offer to help gather their experience, skills, and background through conversation.
        Explain that the AI assistant can help populate the profile by chatting with them about:
            - Work experience and achievements
            - Skills and competencies
            - Education and certifications
            - Projects and contributions
        IF user agrees to chat-based profile building:
            Conduct conversational interview to gather profile information.
            Once sufficient information is collected, offer to populate the profile.
        IF user prefers to fill it manually:
            Direct them to the profile section.
        STOP - do not proceed until profile has meaningful data.

STEP 3: Generate Match Report
    Assistant uses the match_report tool, passing as params:
        - the job analysis workspace key (SOURCE)
        - the context key where the match report will be stored (TARGET)
        - any additional comments (in case they are iterating over an existing match report)
    
    When tool execution finishes, report back to the user with key insights from the match report.
```

Notes:
- When user triggers /match, a prompt in public/prompts/commands/match.md is loaded and added as system instructions to the chat in order to guide the AI assistant through the described workflow.
- The match command depends on both job analysis (workspace context) and user profile (global store) being populated with real data.

---

# MATCH REPORT TOOL WORKFLOW
```
Tool receives:
    - the job analysis workspace key (let's call it SOURCE)
    - the context key where the match report will be stored (let's call it TARGET)
    - any additional comments (in case they are iterating over an existing report) (let's call it COMMENT)

Tool execution:
    Load job analysis from SOURCE workspace key.
    IF job analysis does not exist or is empty:
        Return error: "Job analysis not found. Please run /analyze command first."
    
    Load user profile from global access point (userProfile store).
    IF user profile is empty:
        Return error: "User profile empty."

    Create a new AI agent instance, using the configured model for the task.
    Load system instructions from public/prompts/agents/match-report.md that describes how the agent must perform the matching analysis.
    IF user has created a custom match prompt and it's selected, use that prompt instead, otherwise default to match-report.md.
    Include instruction to make the AI agent output the rich text match report in a text block (```text```). Append it programmatically independently of the loaded system prompt.
    
    IF TARGET key does not exist in the workspace (it's a new match report):
        Add to agent chat:
            - Job analysis from SOURCE key
            - User profile data
    
    ELSE (TARGET key exists - iteration on existing report):
        Load existing match report from TARGET key.
        Add COMMENT as user message describing what to refine/update.

    Wait for full agent response.
    Extract match report from text block, discarding any additional comments.
    IF there is no text block or it's empty:
        Add a user message to the agent chat saying "Match report MUST BE in a text block".
        Repeat until the text block arrives.
    
    Save extracted match report to TARGET workspace context key.
    Return success.
```

Notes:
- Any errors from the specialized agent in the analysis tool is reported back to the general assistant and tool execution finished.
- The customized agent receives no ":online" in the model name for web search nor toolkit, it's only purpose is to perform the report in isolation and maximize attention on that task.

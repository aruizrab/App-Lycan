Let's enhance the current AI chat setup.

# Current setup

- The AI chat can be opened from workspace view, document editor, and cover letter editor.
- There commands that can be executed from the chat that trigger certain prompts and the use of a specific model.
- A set of tools is sent to the model to execute functions in the app.
- Default prompts are specified for each command, with the chance for the user to add new prompts.

# Concepts

From now we will use the following keywords for concepts:
- USER COMMAND: A command the user uses in the chat (typing "/command-name").
- AGENT TOOL: A tool the AI can execute to interact with the app.
- APP CONTEXT: Current state of the app (current view, current workspace, current CV/Cover Letter).
- GENERAL CONTEXT: What the app is about and what is the role of the AI. 
- USER PROFILE: The rich text formatted profile of the user that is available through all workspaces and can be edited by the user.

# Enhancements and Changes

Create a TODO for the following set of tasks and either invoke a sub agent for each task or do it yourself.

## 1. APP Architecture

The app is already data driven and works based on data models that are stored and loaded from the local storage. You need to focus implementations on selecting what of this data is provided to the AI as context at any point in a request, having the AI tools interact with this data, and have the UI read and interact with the data, to make the app easily scalable and maintainable. Ensure there is centralized point for data access, reading, and modification.

## 2. AI Chat

AI chat can also be opened from the general Dashboard.

## 3. General prompt

No matter where in the project the AI chat is opened and used, or what USER COMMAND is executed, there is always an initial system prompt that let's the model understand the GENERAL CONTEXT. This prompt must be in an external markdown file that is loaded into the AI chat system prompts. The prompt must contain:

### GENERAL CONTEXT (static)

The AI model needs to know that its role is that of an assistant in an application for creating job applications called App-Lycan. App-Lycan contains workspaces > workspaces contain CVs and cover letters. App-Lycan is divided in four views:

- General dashboard: Where the user can see their workspaces and perform CRUD operations on them.
- Workspace dashboard: Where the user can see the CVs and Cover Letters of the workspace and perform CRUD operations on them.
- CV editor: Where the user can see and edit a specific CV.
- Cover Letter editor: Where the user can see and edit a specific Cover Letter.

The AI must know it is not only a conversational assistant, but also can perform any action the user can perform in App-Lycant through tools.

### APP CONTEXT (dynamic)

Must be formatted in json and filled in the prompt by code.

- Available views: General Dashboard, Workspace Dashboard, CV Editor, Cover Letter Editor.
- Current view.
- IF in General Dashboard: Full tree of data (only names, no CV or cover letter details).
- IF in Workspace Dashboard: Full tree of current workspace data.
- IF in CV editor: Full tree of current workspace data + current CV name.
- IF in Cover Letter editor: Full tree of current workspace data + current CV name.

Example of how context would look like in General Dashboard:
```json
{
  "all_views": ["general_dashboard", "workspace_dashboard", "cv_editor", "cover_letter_editor"],
  "current_view": "general_dashboard",
  "workspaces": [
    {
      "name": "Business_Corp_Gmbh_Data_Analyst_Position",
      "cvs": ["John_Doe_Data_Analyst_CV_1", "John_Doe_Data_Analyst_CV_2"],
      "cover_letters": ["Business_Corp_John_Doe_Cover_Letter_1", "Business_Corp_John_Doe_Cover_Letter_2"]
    },
    {
      "name": "CompaNy_Sales_Manager_Position",
      "cvs": ["John_Doe_Sales_Manager_CV_1", "John_Doe_Sales_Manager_CV_2"],
      "cover_letters": ["CompaNy_John_Doe_Cover_Letter_1", "CompaNy_John_Doe_Cover_Letter_2"]
    },
  ]
}
```

Example of how context would look like in Workspace Dashboard:
```json
{
  "all_views": ["general_dashboard", "workspace_dashboard", "cv_editor", "cover_letter_editor"],
  "current_view": "workspace_dashboard",
  "workspace": {
    "name": "Business_Corp_Gmbh_Data_Analyst_Position",
    "cvs": ["John_Doe_Data_Analyst_CV_1", "John_Doe_Data_Analyst_CV_2"],
    "cover_letters": ["Business_Corp_John_Doe_Cover_Letter_1", "Business_Corp_John_Doe_Cover_Letter_2"]
  }
}
```

Example of how context would look like in CV Editor:
```json
{
  "all_views": ["general_dashboard", "workspace_dashboard", "cv_editor", "cover_letter_editor"],
  "current_view": "cv_editor",
  "workspace": {
    "name": "Business_Corp_Gmbh_Data_Analyst_Position",
    "cvs": ["John_Doe_Data_Analyst_CV_1", "John_Doe_Data_Analyst_CV_2"],
    "cover_letters": ["Business_Corp_John_Doe_Cover_Letter_1", "Business_Corp_John_Doe_Cover_Letter_2"]
  },
  "current_cv": "John_Doe_Data_Analyst_CV_1"
}
```

Example of how context would look like in Cover Letter Editor:
```json
{
  "all_views": ["general_dashboard", "workspace_dashboard", "cv_editor", "cover_letter_editor"],
  "current_view": "cover_letter_editor",
  "workspace": {
    "name": "Business_Corp_Gmbh_Data_Analyst_Position",
    "cvs": ["John_Doe_Data_Analyst_CV_1", "John_Doe_Data_Analyst_CV_2"],
    "cover_letters": ["Business_Corp_John_Doe_Cover_Letter_1", "Business_Corp_John_Doe_Cover_Letter_2"]
  },
  "current_cover_letter": "Business_Corp_John_Doe_Cover_Letter_1"
}
```

## AI tools

The AI must know it has a set of tools it can leverage to interact with App-Lycan, they are added to the tools param in the OpenRouter chat SDK. There are already tools defined, but make sure they match the following requirements. Additionally create tools that are missing based on requirements and remove tools that are not mentioned in the requirements. The purpose of these tools to allow same actions as user:

### NAVIGATION TOOLS
- go_to:
  - Description: Go to a specific view.
  - Params:
    - View name (required)
    - Workspace name (optional)
    - CV name (optional)
    - Cover Letter name (optional)
  - Constraints:
    - IF navigating to General Dashboard THEN ONLY view name is required.
    - IF navigating to Workspace Dashboard THEN view name AND workspace name are required.
    - IF navigating to CV Editor THEN view name AND workspace name AND CV name are required (CVs can have the same name in different workspaces).
    - IF navigating to Cover Letter Editor THEN view name AND workspace name AND Cover Letter name are required (Cover Letters can have the same name in different workspaces).
  - Returns: tool name + result
    - Success if tool executed correctly.
    - Errors if tool wrong use (wrong names, missing params, etc).

### READING TOOLS
- get_app_context:
  - Description: Get all app context.
  - Returns: tool name + result
    - Success: Same JSON output as defined in [APP CONTEXT (dynamic)](#app-context-dynamic). Reuse function.
    - Error: anything that could have happened when trying to get data

- get_workspaces:
  - Description: Get all workspace data (only names, no CV or cover letter details).
  - Returns: tool name + result
    - Success: Same JSON output as workspaces list defined [APP CONTEXT (dynamic)](#app-context-dynamic). Reuse functionality.
    - Error: anything that could have happened when trying to get data
  - Example:
```json
{
  "workspaces": [
    {
      "name": "Business_Corp_Gmbh_Data_Analyst_Position",
      "cvs": ["John_Doe_Data_Analyst_CV_1", "John_Doe_Data_Analyst_CV_2"],
      "cover_letters": ["Business_Corp_John_Doe_Cover_Letter_1", "Business_Corp_John_Doe_Cover_Letter_2"]
    },
    {
      "name": "CompaNy_Sales_Manager_Position",
      "cvs": ["John_Doe_Sales_Manager_CV_1", "John_Doe_Sales_Manager_CV_2"],
      "cover_letters": ["CompaNy_John_Doe_Cover_Letter_1", "CompaNy_John_Doe_Cover_Letter_2"]
    },
  ]
}
```

- get_workspace:
  - Description: Get data of a single workspace
  - Params:
    - Workspace name (required)
  - Returns: tool name + result
    - Success: Workspace JSON
    - Error: missing params, names not existing, errors getting the data
  - Example:
```json
{
  "name": "Business_Corp_Gmbh_Data_Analyst_Position",
  "cvs": ["John_Doe_Data_Analyst_CV_1", "John_Doe_Data_Analyst_CV_2"],
  "cover_letters": ["Business_Corp_John_Doe_Cover_Letter_1", "Business_Corp_John_Doe_Cover_Letter_2"]
}
```

- get_cv:
  - Description: Get all data of a single CV
  - Params:
    - Workspace name (required)
    - CV name (required)
  - Returns: tool name + result
    - Success: CV JSON (the full JSON content)
    - Error: missing params, names not existing, errors getting the data

- get_cover_letter:
  - Description: Get all data of a single Cover Letter
  - Params:
    - Workspace name (required)
    - Cover Letter name (required)
  - Returns: tool name + result
    - Success: Cover Letter JSON (the full JSON content)
    - Error: missing params, names not existing, errors getting the data

- get_workspace_context:
  - Description: Get a specific context field content of a workspace or list all context keys.
  - Params:
    - Workspace name (required)
    - Context key (optional) - The name of the context field that will be retrieved from the workspace data (e.g. "job_analysis"). If omitted, the tool returns a list of all current context keys for the workspace.
  - Returns: tool name + result
    - Success:
      - If Context key provided: Context content in rich text format
      - If Context key omitted: { "context_keys": ["job_analysis", "company_research", ...] }
    - Error: missing required params, workspace name not existing, context key not existing in workspace, errors getting the context content

### CREATION TOOLS
- create_workspace:
  - Description: Create a new workspace
  - Params:
    - Workspace name (required)
  - Returns: tool name + result
    - Success: Created workspace
    - Error: missing params, workspace name already exists, errors creating the workspace

- create_cv:
  - Description: Create a new CV in a workspace
  - Params:
    - Workspace name (required)
    - CV name (required)
    - CV data (optional) - Must strictly follow the CV schema
  - Returns: tool name + result
    - Success: Created CV
    - Error: missing required params, workspace name not existing, CV name already exists in workspace, invalid CV data schema, errors creating the CV

- create_cover_letter:
  - Description: Create a new Cover Letter in a workspace
  - Params:
    - Workspace name (required)
    - Cover Letter name (required)
    - Cover Letter data (optional) - Must strictly follow the Cover Letter schema
  - Returns: tool name + result
    - Success: Created Cover Letter
    - Error: missing required params, workspace name not existing, Cover Letter name already exists in workspace, invalid Cover Letter data schema, errors creating the Cover Letter

- add_workspace_context:
  - Description: Add context to a workspace. This tool is meant to be used by the AI to add information to the workspace that it can later use in the conversation. The content added with this tool is not meant to be directly shown to the user, but rather to be stored as context in the workspace that the AI can later retrieve and use.
  - Params:
    - Workspace name (required)
    - Context key (required) - The name of the context field that will be added to the workspace data (e.g. "job_analysis").
    - Context content (required) - The content of the context that will be added to the workspace data, must be text in rich text format.
  - Returns: tool name + result
    - Success: Added context to workspace
    - Error: missing required params, workspace name not existing, errors adding context to workspace, existing context key in workspace

### EDITING TOOLS
- edit_workspace:
  - Description: Edit a workspace name
  - Params:
    - Current workspace name (required)
    - New workspace name (required)
  - Returns: tool name + result
    - Success: Edited workspace
    - Error: missing params, current workspace name not existing, new workspace name already existing, errors editing the workspace

- edit_cv:
  - Description: Edit a CV name or data
  - Params:
    - Workspace name (required)
    - Current CV name (required)
    - New CV name (optional)
    - New CV data (optional) - Must strictly follow the CV schema
    - Data editing mode (optional) - "merge" or "replace". If not provided, default to "merge". If "merge" is selected, only the fields provided in the new CV data will be updated, the rest of the CV data will remain unchanged. If "replace" is selected, the new CV data will replace the existing CV data entirely.
  - Returns: tool name + result
    - Success: Edited CV
    - Error: missing required params, workspace name not existing, current CV name not existing in workspace, new CV name already existing in workspace (if new CV name provided), invalid new CV data schema (if new CV data provided), errors editing the CV

- edit_cover_letter:
  - Description: Edit a Cover Letter name or data
  - Params:
    - Workspace name (required)
    - Current Cover Letter name (required)
    - New Cover Letter name (optional)
    - New Cover Letter data (optional) - Must strictly follow the Cover Letter schema
    - Data editing mode (optional) - "merge" or "replace". If not provided, default to "merge". If "merge" is selected, only the fields provided in the new Cover Letter data will be updated, the rest of the Cover Letter data will remain unchanged. If "replace" is selected, the new Cover Letter data will replace the existing Cover Letter data entirely.
  - Returns: tool name + result
    - Success: Edited Cover Letter
    - Error: missing required params, workspace name not existing, current Cover Letter name not existing in workspace, new Cover Letter name already existing in workspace (if new Cover Letter name provided), invalid new Cover Letter data schema (if new Cover Letter data provided), errors editing the Cover Letter

- edit_workspace_context:
  - Description: Edit context of a workspace. This tool is meant to be used by the AI to edit information in the workspace context that it can later use in the conversation. The content edited with this tool is not meant to be directly shown to the user, but rather to be stored as context in the workspace that the AI can later retrieve and use.
  - Params:
    - Workspace name (required)
    - Context key (required) - The name of the context field that will be edited in the workspace data (e.g. "job_analysis").
    - New context content (required) - The new content of the context that will be updated in the workspace data, must be text in rich text format.
  - Returns: tool name + result
    - Success: Edited context in workspace
    - Error: missing required params, workspace name not existing, context key not existing in workspace, errors editing context in workspace

### DELETION TOOLS
- delete_workspace:
  - Description: Delete a workspace
  - Params:
    - Workspace name (required)
  - Constraints: The execution of this tool requires user confirmation. After the AI executes the tool, the user must confirm the deletion action in the UI before the workspace is actually deleted.
  - Returns: tool name + result
    - Success: Deleted workspace
    - Error: missing params, workspace name not existing, errors deleting the workspace, user did not confirm the deletion action

- delete_cv:
  - Description: Delete a CV from a workspace
  - Params:
    - Workspace name (required)
    - CV name (required)
  - Constraints: The execution of this tool requires user confirmation. After the AI executes the tool, the user must confirm the deletion action in the UI before the CV is actually deleted.
  - Returns: tool name + result
    - Success: Deleted CV
    - Error: missing params, workspace name not existing, CV name not existing in workspace, errors deleting the CV, user did not confirm the deletion action

- delete_cover_letter:
  - Description: Delete a Cover Letter from a workspace
  - Params:
    - Workspace name (required)
    - Cover Letter name (required)
  - Constraints: The execution of this tool requires user confirmation. After the AI executes the tool, the user must confirm the deletion action in the UI before the Cover Letter is actually deleted.
  - Returns: tool name + result
    - Success: Deleted Cover Letter
    - Error: missing params, workspace name not existing, Cover Letter name not existing in workspace, errors deleting the Cover Letter, user did not confirm the deletion action

- delete_workspace_context:
  - Description: Delete a context field from a workspace.
  - Params:
    - Workspace name (required)
    - Context key (required) - The name of the context field to be removed (e.g. "job_analysis").
  - Constraints: The execution of this tool requires user confirmation. After the AI executes the tool, the UI must request explicit user confirmation before the context key is actually removed from the workspace.
  - Returns: tool name + result
    - Success: Deleted context key from workspace
    - Error: missing params, workspace name not existing, context key not existing in workspace, errors deleting the context, user did not confirm the deletion action

### UTILITY TOOLS
- analyze_job:
  - Description: Creates an agent instance that receives as input the text of a job offer and outputs a rich text formatted text analysis of the job offer. The purpose of this tool is to delegate the actual analysis of the job offer while the main agent focuses on the orchestration of the analysis in the app (creating/editing workspace context, navigating the user to the right place, etc). The tool should be flexible enough to allow improvements and iterations on the analysis without having to change the main agent orchestration logic. The default system prompt for this agent is stored in a markdown file, but the user can create custom prompts to customize the analysis and select which prompt is being used (this is already done in the app, as well as what model to use for the analysis, just make sure to connect it with this tool).
  - Params: 
    - Job offer content (required) - The text of the job offer to be analyzed.
    - Current analysis (optional) - If the model is iterating on an existing analysis, the current analysis content can be provided as input to the tool so the agent can improve it.
    - Iteration prompt (optional) - If the model is iterating on an existing analysis, it can provide a comment on what is being improved in this iteration (e.g. "add more details about the company culture").
  - Returns:
    - Success: Job analysis in rich text format
    - Error: missing required params, errors during the analysis

- generate_match_report:
  - Description: Creates an agent instance that receives as input a job analysis context key from the current workspace and the user profile, then outputs a rich text formatted match report comparing the user's qualifications against the job requirements. The purpose of this tool is to delegate the actual match analysis while the main agent focuses on orchestration (fetching context, creating/editing workspace context, navigating the user, etc). The tool should be flexible enough to allow improvements and iterations on the match report without having to change the main agent orchestration logic. The default system prompt for this agent is stored in a markdown file, but the user can create custom prompts to customize the match report generation and select which prompt is being used (this is already done in the app, as well as what model to use for the analysis, just make sure to connect it with this tool). The tool automatically fetches the job context content and user profile before invoking the agent.
  - Params: 
    - Workspace name (required) - The name of the workspace containing the job context.
    - Job context key (required) - The context key containing the job analysis to compare against (e.g. "job_analysis").
    - Current report (optional) - If the model is iterating on an existing match report, the current report content can be provided as input to the tool so the agent can improve it.
    - Iteration prompt (optional) - If the model is iterating on an existing match report, it can provide a comment on what is being improved in this iteration (e.g. "emphasize technical skills alignment").
  - Returns:
    - Success: Match report in rich text format
    - Error: missing required params, workspace name not existing, job context key not existing in workspace, user profile not available, errors during the match report generation

- research_company:
  - Description: Creates an agent instance that receives as input company information (name, URL, or description) and outputs a rich text formatted company research report. The agent has web search capabilities to gather information about the company from online sources. The purpose of this tool is to delegate the actual research while the main agent focuses on orchestration (fetching context, creating/editing workspace context, navigating the user, etc). The tool should be flexible enough to allow improvements and iterations on the research without having to change the main agent orchestration logic. The default system prompt for this agent is stored in a markdown file, but the user can create custom prompts to customize the research and select which prompt is being used (this is already done in the app, as well as what model to use for the research, just make sure to connect it with this tool).
  - Params: 
    - Company info (required) - The company name, URL, or description to research.
    - Current research (optional) - If the model is iterating on an existing research report, the current research content can be provided as input to the tool so the agent can improve it.
    - Iteration prompt (optional) - If the model is iterating on an existing research report, it can provide a comment on what is being improved in this iteration (e.g. "focus more on company culture and values").
  - Returns:
    - Success: Company research report in rich text format
    - Error: missing required params, errors during the research

## USER COMMANDS

If the user does not execute any command and simply chats with the AI, do not include any additional system prompt beyond the general prompt defined in the [General prompt](#general-prompt) section. Also provide the full list of available tools to the AI.

### Analyze Command

Instructs AI to analyze a job offer.

- Command: "/analyze <content>"
- Parameters:
  - content: URL or text of the job offer to analyze.

When this command is executed, the following is added to the AI chat:
- System prompt (place this content in an external markdown file and load it as the AI chat system prompt) requirements:
  1. If the /analyze input is a URL, first perform a native web search/fetch to obtain the job offer text; if fetching fails, ask the user for the job text.
  2. Ensure the job text is available before proceeding.
  3. Inspect APP CONTEXT to read current_view and workspace structure.
  4. If current_view == "general_dashboard": call get_workspaces to list workspaces (report progress to the user, e.g. "Let me check the current workspaces").
  5. Try to match a workspace name to the company name + job role from the job text. If a match is found, ask user to confirm using that workspace; if confirmed, call go_to to navigate to that workspace.
  6. If no matching workspace: ask the user whether to create a new workspace or select an existing one. If user chooses create: call create_workspace (choose a workspace name that matches "[Company_Name]_[Job_Role]") then call go_to to navigate to the new workspace. If user selects existing: call go_to to that workspace.
  7. Once in the target workspace, call get_workspace_context if context is not new to check for an existing analysis context key (report progress, e.g. "Let me check context").
  8. If an existing analysis is present, ask the user whether to edit the existing analysis or create a new one.
  9. Invoke analyze_job (the analysis tool) with the job text. If editing, provide current analysis as "current analysis" and optionally an "iteration prompt" describing desired changes.
  10. After analyze_job returns, store the result: if editing, call edit_workspace_context to merge/replace per user's choice; if new, call add_workspace_context to create the analysis context.
  11. After each tool call or decision point, report concise status messages to the user describing actions taken and next steps (e.g. "Creating workspace...", "Adding analysis to workspace...", "Analysis completed.").
  12. Validate parameters and handle tool errors: if a tool returns an error or required params are missing, inform the user and request corrective input.
- User message: "Analyze this job offer: <content>"
- Tools: get_app_context, get_workspaces, get_workspace, get_workspace_context, go_to, create_workspace, analyze_job, add_workspace_context, edit_workspace_context

### Match Report Command

Instructs AI to generate a match report between the User Profile and a job offer.

- Command: "/match"

When this command is executed, the following is added to the AI chat:
- System prompt (place this content in an external markdown file and load it as the AI chat system prompt) requirements:
  1. Inspect APP CONTEXT to read current_view and workspace information.
  2. If current_view != "workspace_dashboard" AND current_view != "cv_editor" AND current_view != "cover_letter_editor": inform the user they must be in a workspace context to generate a match report.
  3. Call get_workspace_context (without context_key param) to list all available context keys in the current workspace (report progress, e.g. "Let me check the workspace context").
  4. Check if any context key containing "job" or "analysis" exists in the workspace. If no job-related context exists: inform the user that a job analysis must be created first before generating a match report, and suggest using the /analyze command.
  5. If multiple job-related contexts exist, ask the user which one to use for the match report.
  6. Once the job context is identified, call get_workspace_context again (with context_key param) to check for an existing match report context key (report progress, e.g. "Let me check for existing match reports").
  7. If an existing match report is present, ask the user whether to edit the existing match report or create a new one.
  8. Invoke generate_match_report (the match report tool) with the context key of the job analysis. If editing, provide current match report as "current report" and optionally an "iteration prompt" describing desired changes.
  9. After generate_match_report returns, store the result: if editing, call edit_workspace_context to merge/replace per user's choice; if new, call add_workspace_context to create the match report context with an appropriate key (e.g. "match_report").
  10. After each tool call or decision point, report concise status messages to the user describing actions taken and next steps (e.g. "Fetching job analysis...", "Generating match report...", "Match report completed.").
  11. Validate parameters and handle tool errors: if a tool returns an error or required params are missing, inform the user and request corrective input.
- User message: "Generate a match report for my User Profile and the job offer in this workspace's context."
- Tools: get_app_context, get_workspace_context, generate_match_report, add_workspace_context, edit_workspace_context

### Company Research Command

Instructs AI to research a company and generate a comprehensive report.

- Command: "/research [company_info]"
- Parameters:
  - company_info (optional): Company name, URL, or description to research. If omitted, the agent will attempt to extract company information from existing job analysis context.

When this command is executed, the following is added to the AI chat:
- System prompt (place this content in an external markdown file and load it as the AI chat system prompt) requirements:
  1. Check if company_info was provided by the user.
  2. If company_info is NOT provided:
     a. Inspect APP CONTEXT to read current_view and workspace information.
     b. If current_view == "general_dashboard": inform the user they must provide company info or be in a workspace context with job analysis.
     c. If in a workspace context (workspace_dashboard, cv_editor, or cover_letter_editor): call get_workspace_context (without context_key param) to list all available context keys.
     d. Check if any context key containing "job" or "analysis" exists. If no job-related context exists: inform the user they must provide company info directly or create a job analysis first using the /analyze command.
     e. If job analysis context exists, call get_workspace_context (with the job context_key) to retrieve the job analysis content.
     f. Extract company name and relevant information from the job analysis content (report progress, e.g. "Extracting company information from job analysis...").
     g. If company information cannot be extracted: inform the user and ask them to provide company info directly.
  3. Once company info is available (either provided or extracted), proceed with the research.
  4. Inspect APP CONTEXT to read current_view and workspace structure.
  5. If current_view == "general_dashboard": call get_workspaces to list workspaces (report progress to the user, e.g. "Let me check the current workspaces").
  6. Try to match a workspace name to the company name from the company info. If a match is found, ask user to confirm using that workspace; if confirmed, call go_to to navigate to that workspace.
  7. If no matching workspace: ask the user whether to create a new workspace or select an existing one. If user chooses create: call create_workspace (choose a workspace name based on the company name) then call go_to to navigate to the new workspace. If user selects existing: call go_to to that workspace.
  8. Once in the target workspace, call get_workspace_context (without context_key param) to check for existing context keys (report progress, e.g. "Let me check the workspace context").
  9. Check if any context key containing "company" or "research" exists. If an existing company research is present, ask the user whether to edit the existing research or create a new one.
  10. Invoke research_company (the research tool) with the company info. If editing, provide current research as "current research" and optionally an "iteration prompt" describing desired changes.
  11. After research_company returns, store the result: if editing, call edit_workspace_context to merge/replace per user's choice; if new, call add_workspace_context to create the research context with an appropriate key (e.g. "company_research").
  12. After each tool call or decision point, report concise status messages to the user describing actions taken and next steps (e.g. "Creating workspace...", "Researching company...", "Adding research to workspace...", "Research completed.").
  13. Validate parameters and handle tool errors: if a tool returns an error or required params are missing, inform the user and request corrective input.
- User message: 
  - If company_info provided: "Research this company: <company_info>"
  - If company_info omitted: "Research the company from the job analysis in this workspace."
- Tools: get_app_context, get_workspaces, get_workspace, get_workspace_context, go_to, create_workspace, research_company, add_workspace_context, edit_workspace_context

Let's create the generate cv command.

# PRECONDITIONS

Ensure the following conditions are met in the app code. If not, implement them.

## CV REQUIREMENTS

- In the AI Settings > System prompts, there must be a prompt containing the requirements for generated CVs. Right now there is one named "CV Generation", which must be renamed "CV Requirements". It uses a default prompt, and the user can add custom prompts and select which one to use when generating CVs. The existing default prompt must be modified, since now it defined the behavior of the agent rather than the requirements for the generated CV. Requirements must define structure, language style, tone and any other relevant aspect of the generated CV, but it should not include instructions for the agent on how to perform the generation, since that will be defined in a separate system prompt for the agent. We will refer to this prompt as GLOBAL_CV_REQUIREMENTS.
- In a workspace, the user can create a context entry for custom CV requirements specific to that workspace. The entry name can vary, depending on whatever name the user has given it. We will refer to this as WORKSPACE_CV_REQUIREMENTS.

# GENERATE CV COMMAND WORKFLOW

User triggers /cv command.

A system prompt in public/prompts/commands/cv.md is loaded and added as system instructions to the chat in order to command the AI assistant to perform the described workflow.

The prompt will instruct the assistant to follow this workflow:

STEP 1: Verify we are in a workspace
Assistant verifies current app context is in a workspace.
IF there are no workspaces THEN:
Inform the user that they need a workspace to create the CV and offer to create one.
STOP - do not proceed until user is in a workspace.
IF there are workspaces THEN:
Ask the user which workspace they want to create the CV in, or whether to create a new workspace for the CV.
STOP - do not proceed until user is in a workspace.

STEP 2: Verify User Profile is Complete
The Assistant checks the user profile data.
IF profile is empty, contains placeholder text, or has insufficient meaningful data THEN:
Encourage the user to fill out their profile with real professional information.
Offer to help gather their experience, skills, and background through conversation.
Explain that the AI assistant can help populate the profile by chatting with them about: - Work experience and achievements - Skills and competencies - Education and certifications - Projects and contributions
IF user agrees to chat-based profile building:
Conduct conversational interview to gather profile information.
Once sufficient information is collected, offer to populate the profile.
IF user prefers to fill it manually:
Direct them to the profile section.
STOP - do not proceed until profile has meaningful data.

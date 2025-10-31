import { AzureChatOpenAI } from '@langchain/openai';
import { StateGraph, END, START } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { NotebookState, AzureConfig } from './types';

// Define the agent state
interface AgentState {
  messages: BaseMessage[];
  notebookState: NotebookState;
  actions: any[];
}

// Helper function to get cell output after execution
async function getCellOutput(tabId: number, index: number, maxWaitMs: number = 10000): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 500; // Check every 500ms
  
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    const stateResponse = await chrome.tabs.sendMessage(tabId, {
      type: 'GET_NOTEBOOK_STATE'
    });
    
    if (stateResponse.success && stateResponse.data) {
      const cell = stateResponse.data.cells[index];
      if (cell && cell.outputs && cell.outputs.length > 0) {
        return cell.outputs.join('\n');
      }
    }
  }
  
  return 'No output captured (execution may still be running)';
}

// Define tools for the agent
const addCodeCellTool = tool(
  async ({ index, content }: { index: number; content: string }) => {
    // Send message to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return 'Failed: No active tab';

    const addResponse = await chrome.tabs.sendMessage(tab.id, {
      type: 'ADD_CODE_CELL',
      payload: { index, content }
    });

    if (!addResponse.success) {
      return 'Failed to add code cell';
    }

    // Execute the newly added cell
    const executeResponse = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXECUTE_CELL',
      payload: { index }
    });

    if (!executeResponse.success) {
      return `Added code cell at index ${index} but failed to execute it`;
    }

    // Wait for and capture the output
    const output = await getCellOutput(tab.id, index);
    return `Successfully added and executed code cell at index ${index}\n\nOutput:\n${output}`;
  },
  {
    name: 'add_code_cell',
    description: 'Add a new code cell at the specified index in the Kaggle notebook and execute it',
    schema: z.object({
      index: z.number().describe('The index where the code cell should be inserted'),
      content: z.string().describe('The Python code content for the cell')
    })
  }
);

const addMarkdownCellTool = tool(
  async ({ index, content }: { index: number; content: string }) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return 'Failed: No active tab';

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'ADD_MARKDOWN_CELL',
      payload: { index, content }
    });

    return response.success ? `Successfully added markdown cell at index ${index}` : 'Failed to add markdown cell';
  },
  {
    name: 'add_markdown_cell',
    description: 'Add a new markdown cell at the specified index in the Kaggle notebook',
    schema: z.object({
      index: z.number().describe('The index where the markdown cell should be inserted'),
      content: z.string().describe('The markdown content for the cell')
    })
  }
);

const updateCellTool = tool(
  async ({ index, content }: { index: number; content: string }) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return 'Failed: No active tab';

    // First, get the cell type to determine if we should execute it
    const stateResponse = await chrome.tabs.sendMessage(tab.id, {
      type: 'GET_NOTEBOOK_STATE'
    });

    if (!stateResponse.success || !stateResponse.data) {
      return 'Failed to get notebook state';
    }

    const cell = stateResponse.data.cells[index];
    if (!cell) {
      return `Cell at index ${index} not found`;
    }

    const updateResponse = await chrome.tabs.sendMessage(tab.id, {
      type: 'UPDATE_CELL',
      payload: { index, content }
    });

    if (!updateResponse.success) {
      return 'Failed to update cell';
    }

    // Only execute if it's a code cell
    if (cell.type === 'code') {
      const executeResponse = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXECUTE_CELL',
        payload: { index }
      });

      if (!executeResponse.success) {
        return `Updated cell at index ${index} but failed to execute it`;
      }

      // Wait for and capture the output
      const output = await getCellOutput(tab.id, index);
      return `Successfully updated and executed code cell at index ${index}\n\nOutput:\n${output}`;
    }

    return `Successfully updated markdown cell at index ${index}`;
  },
  {
    name: 'update_cell',
    description: 'Update the content of an existing cell in the Kaggle notebook. If it is a code cell, it will be executed automatically.',
    schema: z.object({
      index: z.number().describe('The index of the cell to update'),
      content: z.string().describe('The new content for the cell')
    })
  }
);

// Create the agent
export async function createAgent(config: AzureConfig) {
  const model = new AzureChatOpenAI({
    azureOpenAIApiKey: config.apiKey,
    azureOpenAIApiInstanceName: config.instanceName,
    azureOpenAIApiDeploymentName: config.deploymentName,
    azureOpenAIApiVersion: config.apiVersion || '2024-02-15-preview',
    temperature: 0.3,
    maxTokens: 4096
  });

  const tools = [addCodeCellTool, addMarkdownCellTool, updateCellTool];
  const modelWithTools = model.bindTools(tools);

  // Define the agent node
  async function callModel(state: AgentState): Promise<Partial<AgentState>> {
    // Inject current notebook state into context
    const cellCount = state.notebookState.cells.length;
    const cellsSummary = cellCount > 0 
      ? state.notebookState.cells.map((cell, i) => 
          `Cell ${i} (${cell.type}): ${cell.source.substring(0, 100)}${cell.source.length > 100 ? '...' : ''}`
        ).join('\n')
      : 'No cells in notebook.';
    
    const notebookStateMessage = new SystemMessage(
      `CURRENT NOTEBOOK STATE (${cellCount} cells):\n${cellsSummary}\n\nUse these exact indices when referencing cells.`
    );
    
    // Prepend notebook state to messages for this invocation only
    const messagesWithState = [notebookStateMessage, ...state.messages];
    const response = await modelWithTools.invoke(messagesWithState);
    
    return { messages: [response] };
  }

  // Define the tool execution node
  async function executeTools(state: AgentState): Promise<Partial<AgentState>> {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    
    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
      return {};
    }

    const toolResults: BaseMessage[] = [];
    
    for (const toolCall of lastMessage.tool_calls) {
      const tool = tools.find(t => t.name === toolCall.name);
      if (tool) {
        try {
          const result = await tool.invoke(toolCall.args);
          toolResults.push(new ToolMessage({
            content: String(result),
            tool_call_id: toolCall.id || '',
            name: toolCall.name
          }));
        } catch (error) {
          toolResults.push(new ToolMessage({
            content: `Error: ${error}`,
            tool_call_id: toolCall.id || '',
            name: toolCall.name
          }));
        }
      }
    }

    // Fetch updated notebook state after tool execution
    let updatedNotebookState = state.notebookState;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        const stateResponse = await chrome.tabs.sendMessage(tab.id, {
          type: 'GET_NOTEBOOK_STATE'
        });
        
        if (stateResponse.success && stateResponse.data) {
          updatedNotebookState = stateResponse.data;
        }
      }
    } catch (error) {
      console.error('Failed to fetch updated notebook state:', error);
    }

    return { 
      messages: toolResults,
      notebookState: updatedNotebookState
    };
  }

  // Define routing logic
  function shouldContinue(state: AgentState): string {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return 'tools';
    }
    
    return 'end';
  }

  // Build the graph
  const workflow = new StateGraph<AgentState>({
    channels: {
      messages: {
        value: (left: BaseMessage[], right: BaseMessage[]) => left.concat(right),
        default: () => []
      },
      notebookState: {
        value: (left: NotebookState, right: NotebookState) => right || left,
        default: () => ({ cells: [] })
      },
      actions: {
        value: (left: any[], right: any[]) => left.concat(right),
        default: () => []
      }
    }
  });

  workflow.addNode('agent', callModel);
  workflow.addNode('tools', executeTools);

  workflow.addEdge(START, 'agent');
  workflow.addConditionalEdges('agent', shouldContinue, {
    tools: 'tools',
    end: END
  });
  workflow.addEdge('tools', 'agent');

  return workflow.compile();
}

// Run the agent with a user prompt
export async function runAgent(
  prompt: string,
  notebookState: NotebookState | null,
  config: AzureConfig
): Promise<string> {
  try {
    // Validate notebook state
    if (!notebookState || !notebookState.cells) {
      return 'Error: Notebook state not available. Please make sure you are on a Kaggle notebook page and the page has fully loaded.';
    }

    const agent = await createAgent(config);

    const cellCount = notebookState.cells.length;
    const cellsSummary = cellCount > 0 
      ? notebookState.cells.map((cell, i) => `Cell ${i} (${cell.type}): ${cell.source.substring(0, 100)}...`).join('\n')
      : 'No cells found in the notebook.';

    const systemPrompt = `You are an expert AI assistant that helps automate Kaggle notebooks through iterative code execution.

You have access to the current notebook state with ${cellCount} cells.

Current notebook structure:
${cellsSummary}

## Your Capabilities:
- **add_code_cell**: Add a new Python code cell at any index (automatically executed, output returned)
- **add_markdown_cell**: Add a new markdown cell at any index
- **update_cell**: Update existing cell content (code cells are automatically executed, output returned)

## Important Workflow Instructions:
1. **Be autonomous and proactive** - Take reasonable next steps without asking the user for permission:
   - Make sensible assumptions based on context
   - Choose appropriate default parameters
   - Proceed with standard data science workflows
   - Only report back when the task is complete or when you need critical information
2. **Break down complex tasks** into multiple steps
3. **Write code incrementally** - add one cell at a time, check output, then proceed
4. **Always verify outputs** - check execution results before moving to the next step
5. **Auto-fix errors** - if you see an error, exception, or traceback in the output:
   - IMMEDIATELY analyze the error message
   - Identify the root cause (missing import, wrong variable name, incorrect syntax, etc.)
   - Update the cell with the corrected code
   - The fixed cell will be automatically executed
   - Continue this loop until the code runs successfully
6. **Use multiple rounds** - don't try to solve everything in one cell; use multiple cells for:
   - Data loading and exploration
   - Data preprocessing
   - Model training
   - Evaluation and visualization
7. **Check your work** - after each code execution, verify the output is correct before proceeding
8. **Never give up on errors** - keep iterating until the code works correctly
9. **Make reasonable decisions** - Don't ask "should I...?" or "would you like me to...?" - just do it:
   - Use standard libraries (pandas, plotly, sklearn, matplotlib, pytorch, transformers)
   - Apply common preprocessing steps (handle missing values, encode categoricals)
   - Choose reasonable model parameters
   - Follow data science best practices

## Execution Behavior:
When you add or update code cells, they are AUTOMATICALLY EXECUTED and you receive the output immediately.
The notebook state is AUTOMATICALLY REFRESHED after each action, so you always have the current cell count and structure.
Use this feedback loop to:
- Verify your code works correctly
- Inspect data and results
- Debug errors
- Make informed decisions about next steps
- Reference the correct cell indices (they update as you add cells)

## Error Detection and Recovery:
When you see ANY of these patterns in the output, it means there's an error that MUST be fixed:
- "Error:", "Exception:", "Traceback", "SyntaxError", "NameError", "TypeError", "ValueError", "KeyError", "AttributeError", "ImportError", "ModuleNotFoundError"
- Stack traces with "File" and "line" references
- "Failed", "not defined", "has no attribute", "cannot import"

When an error is detected:
1. Read the error message carefully to understand what went wrong
2. Identify the specific line or operation that failed
3. Use update_cell to fix the problematic cell with corrected code
4. Wait for the new execution output
5. If still failing, analyze the new error and iterate again
6. Do NOT move forward until the error is resolved

## Best Practices:
- Start with simple exploratory code (e.g., check data shape, dtypes)
- Build complexity gradually
- Add markdown cells to document your approach
- If a task requires multiple operations, use multiple cells
- Always check outputs before declaring success

## When to Complete and Report:
Complete the task autonomously and provide a final summary when:
- All requested operations have been successfully executed
- All errors have been fixed and code runs cleanly
- Results are verified and look reasonable
- The notebook is in a good state

Your final response should:
- Summarize what was accomplished
- Mention key results or findings
- Note any cells that were added/modified
- Be concise - the user can see the notebook

DO NOT ask questions like:
- "Should I proceed with...?"
- "Would you like me to...?"
- "Do you want me to add...?"
Just complete the task and report the results.

## Managing Output Size (CRITICAL):
To preserve context length and avoid token limits:
- **Limit print statements**: Use .head(), .tail(), .sample() instead of printing entire DataFrames
- **Suppress verbose output**: Add semicolon at end of lines to suppress output, or assign to underscore
- **Use shape/info**: Print df.shape, df.info(), df.describe() instead of full data
- **Limit iterations**: When printing in loops, limit to first few items (e.g., for i in range(min(5, len(data))))
- **Avoid large visualizations in output**: Save plots instead of displaying inline when possible
- **Summarize results**: Print summary statistics rather than full arrays/lists

Examples of good practices:
- ✅ print(df.head()) instead of print(df)
- ✅ print(f"Shape: {df.shape}") instead of printing full DataFrame
- ✅ model.fit(X, y); (semicolon suppresses output)
- ✅ print(array[:10]) instead of print(array) for large arrays

Be precise with cell indices and content. Think step-by-step and use the execution feedback to guide your work.`;

    const initialState: AgentState = {
      messages: [
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ],
      notebookState,
      actions: []
    };

    const result = await agent.invoke(initialState, {
      recursionLimit: 50 // Allow up to 50 iterations for complex multi-step tasks
    });
    
    const lastMessage = result.messages[result.messages.length - 1];
    return lastMessage.content as string;
  } catch (error) {
    console.error('Agent error:', error);
    return `Error running agent: ${error}`;
  }
}

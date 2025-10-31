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

// Define tools for the agent
const addCodeCellTool = tool(
  async ({ index, content }: { index: number; content: string }) => {
    // Send message to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return 'Failed: No active tab';

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'ADD_CODE_CELL',
      payload: { index, content }
    });

    return response.success ? `Successfully added code cell at index ${index}` : 'Failed to add code cell';
  },
  {
    name: 'add_code_cell',
    description: 'Add a new code cell at the specified index in the Kaggle notebook',
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

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'UPDATE_CELL',
      payload: { index, content }
    });

    return response.success ? `Successfully updated cell at index ${index}` : 'Failed to update cell';
  },
  {
    name: 'update_cell',
    description: 'Update the content of an existing cell in the Kaggle notebook',
    schema: z.object({
      index: z.number().describe('The index of the cell to update'),
      content: z.string().describe('The new content for the cell')
    })
  }
);

const executeCellTool = tool(
  async ({ index }: { index: number }) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return 'Failed: No active tab';

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'EXECUTE_CELL',
      payload: { index }
    });

    return response.success ? `Successfully executed cell at index ${index}` : 'Failed to execute cell';
  },
  {
    name: 'execute_cell',
    description: 'Execute a code cell in the Kaggle notebook',
    schema: z.object({
      index: z.number().describe('The index of the cell to execute')
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
    temperature: 0
  });

  const tools = [addCodeCellTool, addMarkdownCellTool, updateCellTool, executeCellTool];
  const modelWithTools = model.bindTools(tools);

  // Define the agent node
  async function callModel(state: AgentState): Promise<Partial<AgentState>> {
    const response = await modelWithTools.invoke(state.messages);
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

    return { messages: toolResults };
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

    const systemPrompt = `You are an AI assistant that helps automate Kaggle notebooks. 
You have access to the current notebook state with ${cellCount} cells.

Current notebook structure:
${cellsSummary}

You can:
- Add code cells at any index
- Add markdown cells at any index
- Update existing cell content
- Execute code cells

When the user asks you to perform actions, use the appropriate tools to modify the notebook.
Be precise with cell indices and content.`;

    const initialState: AgentState = {
      messages: [
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ],
      notebookState,
      actions: []
    };

    const result = await agent.invoke(initialState);
    
    const lastMessage = result.messages[result.messages.length - 1];
    return lastMessage.content as string;
  } catch (error) {
    console.error('Agent error:', error);
    return `Error running agent: ${error}`;
  }
}

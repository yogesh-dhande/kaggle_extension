export interface NotebookCell {
  id: string;
  type: 'code' | 'markdown';
  source: string;
  outputs?: string[];
  index: number;
}

export interface NotebookState {
  cells: NotebookCell[];
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AgentAction {
  type: 'add_code_cell' | 'add_markdown_cell' | 'update_cell' | 'execute_cell';
  payload: any;
}

export type MessageType = 
  | 'GET_NOTEBOOK_STATE'
  | 'ADD_CODE_CELL'
  | 'ADD_MARKDOWN_CELL'
  | 'UPDATE_CELL'
  | 'EXECUTE_CELL'
  | 'RUN_AGENT'
  | 'NOTEBOOK_STATE_UPDATE'
  | 'AGENT_RESPONSE';

export interface ChromeMessage {
  type: MessageType;
  payload?: any;
}

export interface AzureConfig {
  apiKey: string;
  instanceName: string;
  deploymentName: string;
  apiVersion?: string;
}

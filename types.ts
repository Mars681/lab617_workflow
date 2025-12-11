export interface MCPTool {
  id: string;
  name: string;
  description: string;
  category: 'math' | 'data' | 'analysis' | 'utility';
}

export interface WorkflowStep {
  id: string; // Unique instance ID
  toolId: string;
}

export interface ExecutionLog {
  stepIndex: number;
  stepName: string;
  toolId: string;
  request: any;
  response: any;
  status: 'success' | 'error';
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  isToolOutput?: boolean;
}

export enum ToolActionType {
  ADD = 'ADD',
  RESET = 'RESET'
}
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
  isWelcome?: boolean;
}

// Added for Basic Chat History
export interface BasicChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  selectedProjectIds?: string[];
}

export enum ToolActionType {
  ADD = 'ADD',
  RESET = 'RESET'
}

export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface RagFile {
  id: string;
  fileName: string;
  fileInfo: {
    project_id: string;
    [key: string]: any;
  };
  size?: number;
  status?: string;
  stats?: {
    chunks: number;
  };
  createAt?: string;
}

export interface RagChunk {
  id: string;
  name: string;
  content: string;
  fileName: string;
  size: number;
  createAt?: string;
  updateAt?: string;
}

export interface RagResult {
  id: string;
  content: string;
  filename: string;
  project_id: string;
}

export interface Chapter {
  title: string;
  summary: string;
}

export interface Outline {
  title: string;
  chapters: Chapter[];
}

// --- Configuration Types ---

export type ProviderType = 'gemini' | 'openai' | 'ollama';

export interface ModelProvider {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string; // For Gemini this might be empty or a custom endpoint
  apiKey: string;
  selectedModel: string; // The default model ID for this provider
}

export interface AppConfig {
  providers: ModelProvider[];
  defaults: {
    chatProviderId: string;
    workflowProviderId: string; // Must be a 'gemini' type provider or compatible
    writerProviderId: string;
  };
}
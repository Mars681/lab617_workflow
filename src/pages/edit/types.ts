export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  isSystemEvent?: boolean;
  isWelcome?: boolean;
}

export interface GenerationConfig {
  projectId: string | null;
  outline: string;
  topic: string;
}

export interface RagResult {
  id: string;
  content: string;
  filename: string;
  project_id: string;
}

export const GeneratorState = {
  IDLE: 'IDLE',
  PLANNING: 'PLANNING',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  RETRIEVING: 'RETRIEVING',
  WRITING: 'WRITING',
  COMPLETE: 'COMPLETE'
} as const;

export type GeneratorState = typeof GeneratorState[keyof typeof GeneratorState];

export interface Chapter {
  title: string;
  summary: string;
  slug?: string;
  children?: Chapter[];
}

export interface Outline {
  title: string;
  chapters: Chapter[];
}

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  preview: string;
  messages: Message[];
  documentContent: string;
  outline: Outline | null;
  globalContext: string;
  selectedProjectIds: string[];
}
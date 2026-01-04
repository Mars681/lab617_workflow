import { ChatSession } from '../types';

// NOTE: This acts as an in-memory database simulating a file-based storage.
// Data will reset on page reload unless persisted to backend/localstorage.

let MOCK_HISTORY_DB: ChatSession[] = [];

// Initialize with a mock session if empty (optional, for demo purposes)
const INITIAL_DEMO_SESSION: ChatSession = {
    id: 'demo-session',
    title: 'Demo Session (In-Memory)',
    updatedAt: Date.now(),
    preview: 'This is a temporary session...',
    messages: [{ role: 'assistant', content: 'Hello! This is a temporary in-memory session. Data will be lost upon refresh.' }],
    documentContent: '# Demo\n\nData is stored in memory.',
    outline: null,
    globalContext: '',
    selectedProjectIds: []
};
MOCK_HISTORY_DB.push(INITIAL_DEMO_SESSION);

export const historyService = {
  async getSessions(): Promise<ChatSession[]> {
    // Simulate async operation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...MOCK_HISTORY_DB]);
      }, 50);
    });
  },

  async getSessionById(id: string): Promise<ChatSession | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const session = MOCK_HISTORY_DB.find(s => s.id === id);
        resolve(session ? { ...session } : undefined);
      }, 50);
    });
  },

  async saveSession(session: ChatSession): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = MOCK_HISTORY_DB.findIndex(s => s.id === session.id);
        if (index >= 0) {
          MOCK_HISTORY_DB[index] = session;
        } else {
          MOCK_HISTORY_DB.push(session);
        }
        resolve();
      }, 50);
    });
  },

  async deleteSession(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        MOCK_HISTORY_DB = MOCK_HISTORY_DB.filter(s => s.id !== id);
        resolve();
      }, 50);
    });
  }
};
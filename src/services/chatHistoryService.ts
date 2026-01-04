import { BasicChatSession } from '../types';

const STORAGE_KEY = 'basic_chat_history_v1';

export const chatHistoryService = {
  getSessions(): BasicChatSession[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      // Sort by newest first
      return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
    } catch (e) {
      console.error("Failed to load chat history", e);
      return [];
    }
  },

  getSessionById(id: string): BasicChatSession | undefined {
    const sessions = this.getSessions();
    return sessions.find(s => s.id === id);
  },

  saveSession(session: BasicChatSession): void {
    try {
      const sessions = this.getSessions();
      const index = sessions.findIndex(s => s.id === session.id);
      
      if (index >= 0) {
        sessions[index] = session;
      } else {
        sessions.unshift(session);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      window.dispatchEvent(new Event('chat-history-updated'));
    } catch (e) {
      console.error("Failed to save chat session", e);
    }
  },

  deleteSession(id: string): void {
    try {
      let sessions = this.getSessions();
      sessions = sessions.filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      window.dispatchEvent(new Event('chat-history-updated'));
    } catch (e) {
      console.error("Failed to delete chat session", e);
    }
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('chat-history-updated'));
  }
};
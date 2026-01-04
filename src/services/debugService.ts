import { v4 as uuidv4 } from 'uuid';

export interface DebugLogEntry {
  id: string;
  timestamp: number;
  source: string;
  action: string;
  payload: any;
}

export interface DebugStateEntry {
  key: string;
  title: string;
  category: string; // e.g. 'System', 'Workflow', 'RAG', 'User'
  data: any;
  updatedAt: number;
}

class DebugService {
  private logs: DebugLogEntry[] = [];
  // The core of the new system: A generic registry
  private stateRegistry = new Map<string, DebugStateEntry>();
  
  private listeners: (() => void)[] = [];

  constructor() {
    this.logs = [];
  }

  // --- Event Logging (Time Series) ---
  public log(source: string, action: string, payload: any) {
    const entry: DebugLogEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      source,
      action,
      payload
    };
    this.logs = [entry, ...this.logs].slice(0, 100); // Increased limit slightly
    this.notify();
  }

  public getLogs() {
    return this.logs;
  }

  public clearLogs() {
    this.logs = [];
    this.notify();
  }

  // --- Dynamic State Registry (Snapshot Data) ---

  /**
   * Registers or updates a debug state.
   * @param key Unique identifier (e.g., 'workflow.current', 'rag.last_retrieval')
   * @param data The raw JSON data to inspect
   * @param options Meta info for display
   */
  public registerState(
    key: string, 
    data: any, 
    options: { title?: string, category?: string } = {}
  ) {
    this.stateRegistry.set(key, {
      key,
      data,
      title: options.title || key,
      category: options.category || 'Uncategorized',
      updatedAt: Date.now()
    });
    this.notify();
  }

  public removeState(key: string) {
    if (this.stateRegistry.delete(key)) {
      this.notify();
    }
  }

  public getAllStates(): DebugStateEntry[] {
    // Sort by category then title for consistent display
    return Array.from(this.stateRegistry.values()).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.title.localeCompare(b.title);
    });
  }

  public clearAllState() {
    this.stateRegistry.clear();
    this.notify();
  }

  /**
   * Helper to set backend status, often used during initialization.
   */
  public setBackendStatus(online: boolean) {
    this.registerState('system.backend', {
      online,
      checkTime: new Date().toISOString()
    }, { title: 'Backend Health', category: 'System' });
  }

  // --- Subscription ---

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const debugService = new DebugService();
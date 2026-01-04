import { checkHealth } from './rag';
import { isDevMode } from '../services/configService';

const LOCAL_AUTH_KEY = 'genai_workbench_local_auth';

export interface LocalCredentials {
  username: string;
  hash: string;
  salt: string;
}

// Simple client-side SHA-256 hashing using Web Crypto API
export const hashPassword = async (password: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const generateSalt = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const authService = {
  /**
   * Checks system health.
   */
  async checkBackendHealth(): Promise<boolean> {
    const isHealthy = await checkHealth();
    return isHealthy;
  },

  /**
   * Checks if local credentials have been set up.
   */
  hasLocalSetup(): boolean {
    return !!localStorage.getItem(LOCAL_AUTH_KEY);
  },

  /**
   * Sets up local admin user.
   */
  async setupLocalUser(username: string, password: string): Promise<void> {
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    const creds: LocalCredentials = { username, hash, salt };
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(creds));
  },

  /**
   * Verifies local user login.
   */
  async loginLocal(password: string): Promise<boolean> {
    const stored = localStorage.getItem(LOCAL_AUTH_KEY);
    if (!stored) return false;
    
    try {
      const creds: LocalCredentials = JSON.parse(stored);
      const hashAttempt = await hashPassword(password, creds.salt);
      return hashAttempt === creds.hash;
    } catch (e) {
      console.error("Auth Error", e);
      return false;
    }
  },

  /**
   * Mock Server Login (TODO: Implement actual API call later)
   */
  async loginServer(username: string, token: string): Promise<boolean> {
    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 800));
    // Accept anything for now
    return true; 
  }
};
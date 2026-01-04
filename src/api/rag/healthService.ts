import { fetchWithTimeout, RAG_API_BASE } from './config';

/**
 * Checks the health of the RAG backend.
 */
export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await fetchWithTimeout(`${RAG_API_BASE}/health`, {
      method: 'GET',
      timeout: 2000
    });
    return response.ok;
  } catch (e) {
    return false;
  }
};
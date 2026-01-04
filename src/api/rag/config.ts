// Helper to access Vite env variables safely
const getEnvVar = (key: string, fallback: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key] as string;
  }
  return fallback;
};

// RAG Configuration
export const RAG_API_BASE = getEnvVar('VITE_RAG_API_BASE', "http://10.6.22.1:8900");

// Define extended options interface
export interface FetchOptions extends RequestInit {
  timeout?: number;
}

export const fetchWithTimeout = async (resource: string, options: FetchOptions = {}) => {
  const { timeout = 30000, ...fetchOptions } = options; // Increased timeout for uploads
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: options.signal || controller.signal  
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};
import { ModelProvider } from '../types';

export interface ModelOption {
  id: string;
  name: string;
}

export const fetchModelsFromProvider = async (provider: ModelProvider): Promise<ModelOption[]> => {
  // Check API Key unless it's Ollama which often doesn't need one
  if (!provider.apiKey && provider.type !== 'ollama') {
    throw new Error("API Key is missing");
  }

  if (provider.type === 'openai' || provider.type === 'ollama') {
    // Standard OpenAI GET /v1/models
    let baseUrl = provider.baseUrl;

    // Apply defaults if empty
    if (!baseUrl) {
        if (provider.type === 'openai') baseUrl = 'https://api.openai.com/v1';
        else if (provider.type === 'ollama') baseUrl = 'http://localhost:11434/v1';
    }

    baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : ''; // Trim trailing slash
    
    if (!baseUrl) {
      throw new Error("Base URL is required");
    }

    // Auto-fix common Ollama URL mistakes
    if (provider.type === 'ollama') {
        if (!baseUrl.includes('/v1') && baseUrl.match(/:\d+$/)) {
            baseUrl += '/v1';
        }
    }
    
    const url = `${baseUrl}/models`;
    
    try {
      const headers: Record<string, string> = {};
      
      // Only attach Authorization if key exists.
      // We do NOT attach Content-Type for GET requests as it can trigger unnecessary CORS preflight checks.
      if (provider.apiKey) {
          headers['Authorization'] = `Bearer ${provider.apiKey}`;
      }

      const res = await fetch(url, {
        method: 'GET',
        headers,
        // mode: 'cors' // Default is cors
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`Failed to fetch models: ${res.status} ${err}`);
      }

      const data = await res.json();
      if (Array.isArray(data.data)) {
        return data.data.map((m: any) => ({
          id: m.id,
          name: m.id
        })).sort((a: any, b: any) => a.id.localeCompare(b.id));
      }
      return [];
    } catch (error: any) {
       console.warn("Fetch models failed:", error.message);
       
       // Improved error messaging for common local Ollama issues
       if (error.name === 'TypeError' && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
           if (provider.type === 'ollama') {
               throw new Error("Connection failed. Please ensure:\n1. Ollama is running (`ollama serve`)\n2. Environment variable `OLLAMA_ORIGINS=\"*\"` is set (to allow browser access).\n3. You are using 'http://localhost:11434/v1'");
           }
           throw new Error("Network error. Check your Base URL and CORS settings.");
       }
       
       throw error;
    }
  } else if (provider.type === 'gemini') {
    // Return standard Gemini models static list
    return [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.0-flash-lite-preview-02-05', name: 'Gemini 2.0 Flash Lite' },
      { id: 'gemini-2.0-pro-exp-02-05', name: 'Gemini 2.0 Pro Experimental' },
    ];
  }

  return [];
};
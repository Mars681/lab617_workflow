import { AppConfig, ModelProvider } from '../types';

const STORAGE_KEY = 'app_model_config_v3'; // Increment version to force fresh logic if needed, or handle migration

const getEnvFallback = (key: string, fallback: string = '') => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {}
  return fallback;
};

const getEnv = (key: string) => {
   // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    const val = import.meta.env[key];
    if (val) return val;
  }
  return getEnvFallback(key);
}

export const isDevMode = (): boolean => {
  const env = getEnv('VITE_APP_ENV');
  // Default to development if not specified, or if explicitly set to development
  return !env || env === 'development';
};

export const getAppMode = (): 'standalone' | 'multiuser' => {
  const mode = getEnv('VITE_APP_MODE');
  return mode === 'standalone' ? 'standalone' : 'multiuser';
};

// Default config from Environment Variables
const getDefaultConfig = (): AppConfig => {
  const providers: ModelProvider[] = [];
  
  // 1. Default Ollama (Placeholder for easy setup)
  providers.push({
    id: 'default-ollama',
    name: 'Ollama (Local)',
    type: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'ollama',
    selectedModel: 'llama3:latest'
  });

  // Determine default ID
  const defaultId = 'default-ollama';

  return {
    providers: providers,
    defaults: {
      chatProviderId: defaultId,
      workflowProviderId: defaultId,
      writerProviderId: defaultId
    }
  };
};

export const getAppConfig = (): AppConfig => {
  const defaults = getDefaultConfig();
  
  if (typeof window === 'undefined') return defaults;

  try {
    const localStr = localStorage.getItem(STORAGE_KEY);
    
    if (!localStr) {
      // Try migrating from v2
      const oldV2 = localStorage.getItem('app_model_config_v2');
      if (oldV2) {
          try {
              const v2Data = JSON.parse(oldV2);
              // Migrate and ensure structure matches
              if (v2Data.providers) {
                  return v2Data as AppConfig;
              }
          } catch(e) {}
      }
      return defaults;
    }

    const localData = JSON.parse(localStr);
    if (!localData.providers || !Array.isArray(localData.providers)) return defaults;

    return localData as AppConfig;
  } catch (e) {
    console.error("Failed to parse local config", e);
    return defaults;
  }
};

export const saveAppConfig = (config: AppConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event('config-updated'));
};

export const resetAppConfig = () => {
  localStorage.removeItem(STORAGE_KEY);
  // Also clean up old keys if desired, or keep them as backup
  window.dispatchEvent(new Event('config-updated'));
};

export const getProviderById = (config: AppConfig, id: string): ModelProvider | undefined => {
  return config.providers.find(p => p.id === id);
};
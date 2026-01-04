import React, { useState, useEffect, useRef } from 'react';
import { X, Globe, User, Check, Moon, Sun, Monitor, Cpu, Key, Server, Save, RotateCcw, Plus, Trash2, Edit2, PlayCircle, AlertCircle, ChevronDown, Terminal, Search, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAppConfig, saveAppConfig } from '../../services/configService';
import { fetchModelsFromProvider, ModelOption } from '../../api/modelRegistry';
import { AppConfig, ModelProvider, ProviderType } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import ConfirmModal, { ConfirmType } from './ConfirmModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, theme, setTheme, onLogout }) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'general' | 'models'>('general');
  const [config, setConfig] = useState<AppConfig>(getAppConfig());
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [tempProvider, setTempProvider] = useState<ModelProvider | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<ModelOption[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Custom Dropdown State
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: ConfirmType;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {},
  });

  // Reload config when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfig(getAppConfig());
    }
  }, [isOpen]);

  // Handle click outside for model dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModelDropdownOpen]);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  // --- Provider Management ---

  const handleAddProvider = () => {
    const newProvider: ModelProvider = {
      id: uuidv4(),
      name: '',
      type: 'openai',
      baseUrl: '', 
      apiKey: '',
      selectedModel: ''
    };
    setTempProvider(newProvider);
    setEditingProviderId(newProvider.id);
    setConnectionStatus('idle');
    setFetchedModels([]);
    setIsModelDropdownOpen(false);
  };

  const handleEditProvider = (provider: ModelProvider) => {
    setTempProvider({ ...provider });
    setEditingProviderId(provider.id);
    setConnectionStatus('idle');
    setFetchedModels([]);
    setIsModelDropdownOpen(false);
  };

  const handleDeleteProvider = (id: string) => {
    setConfirmState({
        isOpen: true,
        title: t('settings.provider.delete'),
        message: "Are you sure you want to delete this provider configuration?",
        type: 'danger',
        onConfirm: () => {
            const newProviders = config.providers.filter(p => p.id !== id);
            const newConfig = { ...config, providers: newProviders };
            
            setConfig(newConfig);
            saveAppConfig(newConfig);
            
            if (editingProviderId === id) {
                setEditingProviderId(null);
                setTempProvider(null);
            }
        }
    });
  };

  const handleSaveProvider = () => {
    if (!tempProvider) return;
    
    // Default Name if empty
    const providerToSave = { ...tempProvider };
    if (!providerToSave.name.trim()) {
       providerToSave.name = 'New Provider';
    }

    const exists = config.providers.find(p => p.id === providerToSave.id);
    let newProviders;
    if (exists) {
        newProviders = config.providers.map(p => p.id === providerToSave.id ? providerToSave : p);
    } else {
        newProviders = [...config.providers, providerToSave];
    }
    
    const newConfig = { ...config, providers: newProviders };
    setConfig(newConfig);
    saveAppConfig(newConfig);
    
    setEditingProviderId(null);
    setTempProvider(null);
  };

  const handleTypeChange = (newType: ProviderType) => {
      if (!tempProvider) return;
      
      setTempProvider({
          ...tempProvider,
          type: newType,
          baseUrl: '', // Reset to empty to show placeholder defaults
          selectedModel: '' 
      });
  };

  const getUrlPlaceholder = (type: ProviderType) => {
      if (type === 'openai') return 'https://api.openai.com/v1';
      if (type === 'ollama') return 'http://localhost:11434/v1';
      return 'https://...';
  }

  const handleTestConnection = async () => {
      if (!tempProvider) return;
      setIsTestingConnection(true);
      setConnectionStatus('idle');
      setStatusMessage('');
      setFetchedModels([]);
      setIsModelDropdownOpen(false);

      try {
          const models = await fetchModelsFromProvider(tempProvider);
          setFetchedModels(models);
          setConnectionStatus('success');
          setStatusMessage(`Success! Found ${models.length} models.`);
          
          if (models.length > 0) {
             const currentValid = models.find(m => m.id === tempProvider.selectedModel);
             if (!currentValid) {
                 setTempProvider(prev => prev ? ({ ...prev, selectedModel: models[0].id }) : null);
             }
          }
      } catch (e: any) {
          setConnectionStatus('error');
          setStatusMessage(e.message || "Connection failed");
      } finally {
          setIsTestingConnection(false);
      }
  };

  const getProviderIcon = (type: ProviderType) => {
      switch(type) {
          case 'gemini': return <Cpu size={14} className="text-sky-500"/>;
          case 'ollama': return <Terminal size={14} className="text-orange-500"/>;
          default: return <Server size={14} className="text-emerald-500"/>;
      }
  };

  // Filter models for custom dropdown
  const filteredModels = fetchedModels.filter(m => 
    m.name.toLowerCase().includes(modelSearch.toLowerCase()) || 
    m.id.toLowerCase().includes(modelSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 flex flex-col h-[85vh]">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('settings.title')}</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-100 dark:border-slate-700 px-6 space-x-6 shrink-0">
          <button 
            onClick={() => setActiveTab('general')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {t('settings.general')}
          </button>
          <button 
            onClick={() => setActiveTab('models')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'models' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            {t('settings.models')}
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-slate-900">
          
          {activeTab === 'general' && (
            <div className="p-6 space-y-8 overflow-y-auto h-full custom-scrollbar">
              <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{t('settings.account')}</label>
                 <div className="flex items-center gap-4 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">AI</div>
                    <div>
                       <div className="font-semibold text-slate-800 dark:text-slate-100">Demo User</div>
                       <div className="text-xs text-slate-500 dark:text-slate-400">free_plan@example.com</div>
                    </div>
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Globe size={14} />{t('settings.language')}</label>
                 <div className="grid grid-cols-2 gap-3">
                    {['en', 'zh'].map(lang => (
                        <button key={lang} onClick={() => changeLanguage(lang)} className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${i18n.language === lang ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                            <span className="text-sm font-medium">{lang === 'en' ? 'English' : '中文'}</span>
                            {i18n.language === lang && <Check size={16} className="text-indigo-600 dark:text-indigo-400" />}
                        </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Monitor size={14} />{t('settings.theme')}</label>
                 <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                    <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${theme === 'light' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}><Sun size={14} /> Light</button>
                    <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${theme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}><Moon size={14} /> Dark</button>
                 </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                 <button 
                    onClick={() => {
                        onLogout();
                        onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-all font-medium text-sm"
                 >
                    <LogOut size={16} />
                    Log Out
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'models' && (
             <div className="h-full flex flex-col md:flex-row">
                
                <div className={`w-full md:w-1/3 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col ${editingProviderId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('settings.provider.list')}</span>
                        <button onClick={handleAddProvider} className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 transition-colors" title={t('settings.provider.add')}>
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {config.providers.map(p => (
                            <div 
                                key={p.id} 
                                onClick={() => handleEditProvider(p)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${editingProviderId === p.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-800'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{p.name}</span>
                                    {getProviderIcon(p.type)}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">{p.baseUrl || (p.type === 'gemini' ? '' : '(Default URL)')}</div>
                                <div className="mt-2 flex gap-1">
                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">{p.selectedModel}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`flex-1 flex-col bg-slate-50 dark:bg-slate-900 h-full overflow-hidden ${editingProviderId ? 'flex' : 'hidden md:flex'}`}>
                   {editingProviderId && tempProvider ? (
                       <div className="flex flex-col h-full">
                           <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center">
                               <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                   <Edit2 size={16} /> {t('settings.provider.edit')}
                               </h3>
                               <div className="flex gap-2">
                                   <button onClick={() => handleDeleteProvider(editingProviderId)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title={t('settings.provider.delete')}><Trash2 size={16} /></button>
                                   <button onClick={() => setEditingProviderId(null)} className="md:hidden p-2 text-slate-500"><X size={16} /></button>
                               </div>
                           </div>
                           
                           <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                               <div className="grid grid-cols-2 gap-4">
                                   <div>
                                       <label className="block text-xs font-medium text-slate-500 mb-1">{t('settings.provider.name')}</label>
                                       <input 
                                         value={tempProvider.name}
                                         onChange={e => setTempProvider({...tempProvider, name: e.target.value})}
                                         className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                         placeholder="e.g. My Local Ollama"
                                       />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-medium text-slate-500 mb-1">{t('settings.provider.type')}</label>
                                       <div className="relative">
                                           <select
                                            value={tempProvider.type}
                                            onChange={e => handleTypeChange(e.target.value as ProviderType)}
                                            className="w-full p-2 pr-8 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            >
                                                <option value="openai">OpenAI Compatible</option>
                                                <option value="ollama">Ollama</option>
                                                <option value="gemini">Google Gemini</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none"/>
                                       </div>
                                   </div>
                               </div>

                               <div>
                                   <label className="block text-xs font-medium text-slate-500 mb-1">{t('settings.provider.baseUrl')}</label>
                                   <input 
                                     value={tempProvider.baseUrl}
                                     onChange={e => setTempProvider({...tempProvider, baseUrl: e.target.value})}
                                     className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                     placeholder={`${getUrlPlaceholder(tempProvider.type)} (Default)`}
                                   />
                                   <p className="text-[10px] text-slate-400 mt-1">Optional. Leave empty to use the default URL for this provider type.</p>
                               </div>

                               <div>
                                   <label className="block text-xs font-medium text-slate-500 mb-1">{t('settings.provider.apiKey')}</label>
                                   <div className="relative">
                                       <input 
                                         type="password"
                                         value={tempProvider.apiKey}
                                         onChange={e => setTempProvider({...tempProvider, apiKey: e.target.value})}
                                         className="w-full p-2 pl-8 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                         placeholder={t('settings.provider.apiKeyPlaceholder')}
                                       />
                                       <Key size={14} className="absolute left-2.5 top-2.5 text-slate-400"/>
                                   </div>
                               </div>

                               <div className="border-t border-slate-100 dark:border-slate-700 my-2"></div>

                               <div>
                                   <div className="flex justify-between items-center mb-2">
                                       <label className="text-xs font-medium text-slate-500">{t('settings.provider.modelId')}</label>
                                       <button 
                                          onClick={handleTestConnection}
                                          disabled={isTestingConnection}
                                          className="text-[10px] flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                                       >
                                          {isTestingConnection ? <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/> : <RotateCcw size={10}/>}
                                          {t('settings.provider.checkConnection')}
                                       </button>
                                   </div>
                                   
                                   {statusMessage && (
                                       <div className={`text-[10px] mb-2 px-2 py-1 rounded flex items-center gap-1.5 ${connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                                           {connectionStatus === 'success' ? <Check size={10}/> : <AlertCircle size={10}/>}
                                           {statusMessage}
                                       </div>
                                   )}

                                   {/* Custom Model ID Dropdown */}
                                   <div className="relative" ref={modelDropdownRef}>
                                       {fetchedModels.length > 0 ? (
                                           <>
                                                <div 
                                                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                                    className={`w-full p-2 pr-8 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 cursor-pointer flex items-center justify-between outline-none transition-all hover:border-indigo-300 dark:hover:border-indigo-600 ${isModelDropdownOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500' : ''}`}
                                                >
                                                    <span className={`truncate ${!tempProvider.selectedModel ? 'text-slate-400' : ''}`}>
                                                        {fetchedModels.find(m => m.id === tempProvider.selectedModel)?.name || tempProvider.selectedModel || t('settings.defaults.select')}
                                                    </span>
                                                    <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`}/>
                                                </div>
                                                
                                                {isModelDropdownOpen && (
                                                    <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                                                        <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                                            <div className="relative">
                                                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                                                                <input 
                                                                    autoFocus
                                                                    value={modelSearch}
                                                                    onChange={(e) => setModelSearch(e.target.value)}
                                                                    placeholder="Search models..."
                                                                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-slate-200 transition-all"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                                                            {filteredModels.length === 0 ? (
                                                                <div className="p-3 text-xs text-slate-400 text-center italic">No matching models found</div>
                                                            ) : (
                                                                filteredModels.map(m => (
                                                                    <button
                                                                        key={m.id}
                                                                        onClick={() => {
                                                                            setTempProvider({...tempProvider, selectedModel: m.id});
                                                                            setIsModelDropdownOpen(false);
                                                                        }}
                                                                        className={`w-full text-left px-3 py-2 text-xs rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 truncate transition-colors flex justify-between items-center ${tempProvider.selectedModel === m.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
                                                                    >
                                                                        <span>{m.name}</span>
                                                                        {tempProvider.selectedModel === m.id && <Check size={12} className="text-indigo-600 dark:text-indigo-400"/>}
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                           </>
                                       ) : (
                                           <input 
                                             value={tempProvider.selectedModel}
                                             onChange={e => setTempProvider({...tempProvider, selectedModel: e.target.value})}
                                             className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                             placeholder="gpt-4o, gemini-1.5-pro, etc."
                                           />
                                       )}
                                   </div>
                                   {fetchedModels.length > 0 && (
                                       <div className="text-[10px] text-slate-400 mt-1 text-right">
                                           {t('settings.provider.selectList')}
                                       </div>
                                   )}
                               </div>
                           </div>

                           <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                               <button 
                                 onClick={handleSaveProvider}
                                 className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/20"
                               >
                                   <Save size={16}/> {t('settings.provider.save')}
                               </button>
                           </div>
                       </div>
                   ) : (
                       <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
                           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                               <Server size={24} className="opacity-50"/>
                           </div>
                           <p>{t('settings.empty')}</p>
                       </div>
                   )}
                </div>
             </div>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
      />
    </div>
  );
};

export default SettingsModal;
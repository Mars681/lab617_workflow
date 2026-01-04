
import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  MessageSquare,
  PenTool,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  MessageCircle,
  Database,
  LogOut,
  History,
  Zap,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Import Global Styles
import './style/markdown-base.css';
import './style/chat.css';
import './style/theme-lab.css';
import './style/theme-academic.css';

import WorkflowBuilder from './pages/workflow/WorkflowBuilder';
import BasicChat from './pages/chat/BasicChat';
import { WriterPage } from './pages/edit/WriterPage';
import KnowledgePage from './pages/knowledge/KnowledgePage';
import LoginPage from './pages/login/LoginPage';
import SettingsModal from './pages/components/SettingsModal';
import ConfirmModal from './pages/components/ConfirmModal';
import { ModelDrawer } from './pages/components/ModelDrawer';
import { KnowledgeDrawer } from './pages/components/KnowledgeDrawer';
import { DebugDrawer } from './pages/components/DebugDrawer';
import { HistoryDrawer } from './pages/components/HistoryDrawer';
import { getAppConfig, isDevMode } from './services/configService';
import { chatHistoryService } from './services/chatHistoryService';
import { debugService } from './services/debugService';
import { fetchProjects } from './api/rag';
import { AppConfig, BasicChatSession, Project, ModelProvider } from './types';
import { authService } from './api/auth';
import { RAG_API_BASE } from './api/rag/config';

const App: React.FC = () => {
  const { t } = useTranslation();
  
  // -- Auth State --
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRagOnline, setIsRagOnline] = useState(false);

  // -- Main App State --
  const [activeTab, setActiveTab] = useState<'chat' | 'orchestrator' | 'writer' | 'knowledge'>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'history' | 'model' | 'knowledge' | null>(null);
  
  // Chat History State
  const [chatSessions, setChatSessions] = useState<BasicChatSession[]>([]);
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  // Config & Provider State
  const [config, setConfig] = useState<AppConfig>(getAppConfig());
  const [providerMap, setProviderMap] = useState({
    chat: config.defaults.chatProviderId,
    orchestrator: config.defaults.workflowProviderId,
    writer: config.defaults.writerProviderId,
    knowledge: config.defaults.workflowProviderId // Default to same as orchestrator
  });

  // Knowledge Base State
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [writerSelectedProjectIds, setWriterSelectedProjectIds] = useState<string[]>([]);
  const [chatSelectedProjectIds, setChatSelectedProjectIds] = useState<string[]>([]);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Theme Side Effects (Tailwind + Highlight.js)
  useEffect(() => {
    const root = window.document.documentElement;
    const highlightLink = document.getElementById('highlight-theme') as HTMLLinkElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      if (highlightLink) {
        highlightLink.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css";
      }
    } else {
      root.classList.remove('dark');
      if (highlightLink) {
        // Use a clean light theme like 'github' or 'atom-one-light'
        highlightLink.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css";
      }
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync Global State with Debug Service
  useEffect(() => {
    debugService.registerState('system.backend', {
      online: isRagOnline,
      apiUrl: RAG_API_BASE,
      env: isDevMode() ? 'development' : 'production'
    }, { title: 'Backend Health', category: 'System' });
  }, [isRagOnline]);

  // Listen for config updates
  useEffect(() => {
    const handleConfigUpdate = () => {
       const newConfig = getAppConfig();
       setConfig(newConfig);
       setProviderMap(prev => ({
         ...prev,
         chat: newConfig.defaults.chatProviderId,
         orchestrator: newConfig.defaults.workflowProviderId,
         writer: newConfig.defaults.writerProviderId
       }));
    };
    window.addEventListener('config-updated', handleConfigUpdate);
    return () => window.removeEventListener('config-updated', handleConfigUpdate);
  }, []);

  // Listen for chat history updates
  useEffect(() => {
    const loadSessions = () => {
      const sessions = chatHistoryService.getSessions();
      setChatSessions(sessions);
    };
    
    if (isAuthenticated) {
      loadSessions();
      window.addEventListener('chat-history-updated', loadSessions);
    }
    return () => window.removeEventListener('chat-history-updated', loadSessions);
  }, [isAuthenticated]);

  // Fetch KB Projects when Authenticated and RAG is Online
  useEffect(() => {
    if (isAuthenticated && isRagOnline) {
      fetchProjects().then(setProjects).catch(() => setProjects(null));
    } else {
      setProjects(null);
    }
  }, [isAuthenticated, isRagOnline]);

  // Initialize active chat session
  useEffect(() => {
    if (!isAuthenticated) return;

    // Attempt to restore last active session if none selected
    if (!activeChatSessionId) {
        const lastId = localStorage.getItem('basic_chat_active_id');
        if (lastId && chatSessions.some(s => s.id === lastId)) {
            setActiveChatSessionId(lastId);
            const session = chatSessions.find(s => s.id === lastId);
            if (session) {
                setChatSelectedProjectIds(session.selectedProjectIds || []);
            }
        }
    }
  }, [chatSessions, activeChatSessionId, isAuthenticated]);

  const updateActiveProvider = (newId: string) => {
    setProviderMap(prev => ({ ...prev, [activeTab]: newId }));
  };

  const handleChatSessionChange = (id: string) => {
      setActiveChatSessionId(id);
      localStorage.setItem('basic_chat_active_id', id);
      
      const session = chatSessions.find(s => s.id === id);
      if (session) {
          setChatSelectedProjectIds(session.selectedProjectIds || []);
      } else {
          setChatSelectedProjectIds([]);
      }
  };

  const handleNewChat = () => {
      setActiveChatSessionId(null);
      setChatSelectedProjectIds([]);
  };

  const handleDeleteChat = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setChatToDelete(id);
  };

  const confirmDeleteChat = () => {
      if (chatToDelete) {
          chatHistoryService.deleteSession(chatToDelete);
          if (activeChatSessionId === chatToDelete) {
              setActiveChatSessionId(null);
              setChatSelectedProjectIds([]);
          }
          setChatToDelete(null);
      }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsRagOnline(false);
    setActiveDrawer(null);
  };

  const currentProviderId = providerMap[activeTab];
  const currentProvider = config.providers.find(p => p.id === currentProviderId);

  // --- Login Screen Guard ---
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage 
          onLogin={(healthStatus) => {
            setIsRagOnline(healthStatus);
            setIsAuthenticated(true);
          }}
          theme={theme}
          onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        />
        {isDevMode() && <DebugDrawer />}
      </>
    );
  }

  // Calculate sidebar width for positioning fixed elements like drawers
  const sidebarWidth = isSidebarCollapsed ? 80 : 288; // w-20 = 5rem = 80px; w-72 = 18rem = 288px

  // Helper to toggle drawers safely
  const toggleDrawer = (drawer: 'history' | 'model' | 'knowledge') => {
    setActiveDrawer(prev => prev === drawer ? null : drawer);
  };

  const selectedKbCount = activeTab === 'writer' ? writerSelectedProjectIds.length : chatSelectedProjectIds.length;

  // --- Main Dashboard ---
  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      
      {/* --- Main Navigation Sidebar --- */}
      <nav 
        className={`${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        } flex flex-col py-6 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 z-50 shrink-0 transition-all duration-300 ease-in-out relative`}
      >
        {/* Logo Section (Clickable Toggle) */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`px-6 mb-8 w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} transition-all hover:opacity-80 group outline-none`}
          title={isSidebarCollapsed ? "Expand" : "Collapse"}
        >
          <div className="p-2 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-lg shadow-lg shadow-indigo-500/20 shrink-0">
            <Layout className="text-white w-5 h-5" />
          </div>
          <span className={`text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 whitespace-nowrap overflow-hidden transition-all duration-300 text-left ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            {t('app.title')}
          </span>
        </button>

        {/* Navigation Items */}
        <div className="px-3 space-y-2 shrink-0">
          {!isSidebarCollapsed && (
            <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600 animate-in fade-in duration-200">
              {t('sidebar.section.menu')}
            </div>
          )}

          <NavItem 
            isActive={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
            icon={<MessageSquare size={20} />}
            label={t('nav.chat')}
            isCollapsed={isSidebarCollapsed}
            colorClass="bg-sky-600 shadow-sky-900/20"
          />
          
          <NavItem 
            isActive={activeTab === 'orchestrator'}
            onClick={() => setActiveTab('orchestrator')}
            icon={<Layout size={20} />}
            label={t('nav.orchestrator')}
            isCollapsed={isSidebarCollapsed}
            colorClass="bg-indigo-600 shadow-indigo-900/20"
          />

          <NavItem 
            isActive={activeTab === 'writer'}
            onClick={() => setActiveTab('writer')}
            icon={<PenTool size={20} />}
            label={t('nav.writer')}
            isCollapsed={isSidebarCollapsed}
            colorClass="bg-emerald-600 shadow-emerald-900/20"
          />

          {isRagOnline && (
            <NavItem 
              isActive={activeTab === 'knowledge'}
              onClick={() => setActiveTab('knowledge')}
              icon={<Database size={20} />}
              label={t('nav.knowledge')}
              isCollapsed={isSidebarCollapsed}
              colorClass="bg-violet-600 shadow-violet-900/20"
            />
          )}
        </div>

        {/* Tools Section (Aligned Top/Below Nav, not Bottom) */}
        <div className="px-3 space-y-1 pt-4 mb-2">
             {!isSidebarCollapsed && (
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600 animate-in fade-in duration-200">
                  {t('sidebar.section.context')}
                </div>
             )}
             
             {/* Model Button */}
             <SidebarButton 
               active={activeDrawer === 'model'}
               onClick={() => toggleDrawer('model')}
               icon={<Zap size={20} />}
               label={t('sidebar.model')}
               subLabel={currentProvider?.name}
               isCollapsed={isSidebarCollapsed}
             />

             {/* Knowledge Button */}
             {isRagOnline && (activeTab === 'writer' || activeTab === 'chat') && (
               <SidebarButton 
                 active={activeDrawer === 'knowledge'}
                 onClick={() => toggleDrawer('knowledge')}
                 icon={<Layers size={20} />}
                 label={t('sidebar.knowledge')}
                 subLabel={selectedKbCount > 0 ? t('sidebar.selected', { count: selectedKbCount }) : t('sidebar.none')}
                 isCollapsed={isSidebarCollapsed}
               />
             )}

             {/* History Button */}
             {activeTab === 'chat' && (
               <SidebarButton 
                 active={activeDrawer === 'history'}
                 onClick={() => toggleDrawer('history')}
                 icon={<History size={20} />}
                 label={t('sidebar.history')}
                 isCollapsed={isSidebarCollapsed}
               />
             )}
        </div>

        {/* Spacer to push Profile to bottom */}
        <div className="flex-1" />

        {/* Bottom Section: User Profile */}
        <div className="px-3 space-y-1 pt-4 border-t border-slate-200 dark:border-slate-800 mb-4">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-all text-left group`}
            title={isSidebarCollapsed ? "Settings" : ""}
          >
             <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0 shadow-sm">
                AI
             </div>
             
             {!isSidebarCollapsed && (
                 <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate">Demo User</div>
                    <div className="text-xs text-slate-400 truncate">Free Plan</div>
                 </div>
             )}
             
             {!isSidebarCollapsed && (
                 <Settings size={16} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
             )}
          </button>
        </div>
      </nav>

      {/* Drawers */}
      <HistoryDrawer 
        isOpen={activeDrawer === 'history'}
        onClose={() => setActiveDrawer(null)}
        sessions={chatSessions}
        activeSessionId={activeChatSessionId}
        onSelectSession={handleChatSessionChange}
        onDeleteSession={handleDeleteChat}
        onNewChat={handleNewChat}
        sidebarWidth={sidebarWidth}
      />

      <ModelDrawer 
        isOpen={activeDrawer === 'model'}
        onClose={() => setActiveDrawer(null)}
        selectedId={currentProviderId}
        providers={config.providers}
        onChange={updateActiveProvider}
        sidebarWidth={sidebarWidth}
      />

      <KnowledgeDrawer
        isOpen={activeDrawer === 'knowledge'}
        onClose={() => setActiveDrawer(null)}
        projects={projects}
        selectedIds={activeTab === 'writer' ? writerSelectedProjectIds : chatSelectedProjectIds}
        onChange={activeTab === 'writer' ? setWriterSelectedProjectIds : setChatSelectedProjectIds}
        sidebarWidth={sidebarWidth}
      />

      {/* --- Content Area --- */}
      <div className="flex-1 h-full overflow-hidden bg-white dark:bg-slate-900 flex flex-col transition-colors duration-200 relative z-0">
        {/* Page Content */}
        <div className="flex-1 overflow-hidden relative">
           {activeTab === 'chat' && (
              <BasicChat 
                 providerId={currentProviderId} 
                 sessionId={activeChatSessionId}
                 onSessionChange={handleChatSessionChange}
                 selectedProjectIds={chatSelectedProjectIds}
                 onSelectedProjectIdsChange={setChatSelectedProjectIds}
              />
           )}
           {activeTab === 'orchestrator' && <WorkflowBuilder providerId={currentProviderId} />}
           {activeTab === 'writer' && (
             <WriterPage 
               providerId={currentProviderId} 
               selectedProjectIds={writerSelectedProjectIds}
               onSelectedProjectIdsChange={setWriterSelectedProjectIds}
             />
           )}
           {activeTab === 'knowledge' && isRagOnline && (
             <KnowledgePage providerId={currentProviderId} />
           )}
        </div>
      </div>
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        theme={theme}
        setTheme={setTheme}
        onLogout={handleLogout}
      />

      {/* Delete Chat Confirmation */}
      <ConfirmModal 
        isOpen={!!chatToDelete}
        onClose={() => setChatToDelete(null)}
        onConfirm={confirmDeleteChat}
        title="Delete Chat"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
        type="danger"
        confirmText="Delete"
      />

      {/* Dev Debug Drawer */}
      {isDevMode() && <DebugDrawer />}
    </div>
  );
};

interface NavItemProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  colorClass: string;
}

const NavItem: React.FC<NavItemProps> = ({ isActive, onClick, icon, label, isCollapsed, colorClass }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-lg text-left transition-all duration-200 group relative ${
      isActive 
        ? `${colorClass} text-white` 
        : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
    }`}
    title={isCollapsed ? label : ""}
  >
    <div className="shrink-0">{icon}</div>
    <span className={`font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
      {label}
    </span>
    {isCollapsed && isActive && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-current rounded-r-full opacity-50" />
    )}
  </button>
);

// Helper for Sidebar Buttons
interface SidebarButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  isCollapsed: boolean;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ active, onClick, icon, label, subLabel, isCollapsed }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 rounded-lg text-left transition-all duration-200 group ${
      active 
        ? 'bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400' 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-700 dark:hover:text-slate-300'
    }`}
    title={isCollapsed ? label : ""}
  >
    <div className={`shrink-0 transition-colors ${active ? 'text-indigo-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>{icon}</div>
    
    {!isCollapsed && (
      <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden transition-all duration-300">
        <div className="flex items-center justify-between">
           <span className="font-medium text-sm truncate">{label}</span>
           <ChevronRight size={14} className={`transition-transform duration-200 ${active ? 'rotate-90 opacity-100' : 'opacity-0 -translate-x-2 group-hover:translate-x-0 group-hover:opacity-50'}`} />
        </div>
        {subLabel && (
          <div className="text-[10px] opacity-70 truncate font-mono mt-0.5">{subLabel}</div>
        )}
      </div>
    )}
  </button>
);

export default App;

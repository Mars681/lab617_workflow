import React, { useEffect, useState } from 'react';
import { Layout, Server, Wifi, WifiOff, ArrowRight, ShieldCheck, UserPlus, Loader2, Sun, Moon, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../api/auth';
import { debugService } from '../../services/debugService';
import { RAG_API_BASE } from '../../api/rag/config';
import { getAppMode } from '../../services/configService';

interface LoginPageProps {
  onLogin: (isRagOnline: boolean) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, theme, onToggleTheme }) => {
  const { t, i18n } = useTranslation();
  
  // Stages: 'initializing' -> 'login' (Local or Server) -> 'setup' (Local First Time)
  const [stage, setStage] = useState<'initializing' | 'login' | 'setup'>('initializing');
  
  // Backend Connection Status (Technical)
  const [isRagOnline, setIsRagOnline] = useState(false);
  
  // Authentication Mode (Logical): 'server' (Organization) vs 'local' (Standalone)
  const [authMode, setAuthMode] = useState<'server' | 'local'>('local');
  
  // Form State
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const initSystem = async () => {
      // 1. Check Backend Health
      const online = await authService.checkBackendHealth();
      setIsRagOnline(online);
      // Sync status to debug service so the drawer reflects reality immediately
      debugService.setBackendStatus(online);

      // 2. Determine Auth Flow
      // Logic: Use Server Auth ONLY if backend is online AND we are NOT in forced standalone mode.
      const appMode = getAppMode();
      const useServerAuth = online && appMode !== 'standalone';

      if (useServerAuth) {
        setAuthMode('server');
        setStage('login');
      } else {
        setAuthMode('local');
        const hasAccount = authService.hasLocalSetup();
        setStage(hasAccount ? 'login' : 'setup');
      }
    };

    // Small artificial delay to show the boot sequence (feels more "app-like")
    setTimeout(initSystem, 800);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');


    try {
      let success = false;
      if (authMode === 'server') {
        // Server Login
        success = await authService.loginServer(username, password);
      } else {
        // Local Login
        success = await authService.loginLocal(password);
      }

      if (success) {
        // IMPORTANT: We pass the *actual* backend health status to the App.
        // Even if we forced 'standalone' login, if the backend is online, we want RAG features enabled.
        onLogin(isRagOnline);
      } else {
        setError(t('login.error.auth'));
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPass) {
      setError(t('login.error.match'));
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setIsLoading(true);
    try {
      await authService.setupLocalUser(username, password);
      // After setup, we log in. 
      // If backend was technically online but we are in setup (meaning forced standalone),
      // we still pass isRagOnline so features work.
      onLogin(isRagOnline); 
    } catch (err) {
      setError("Setup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  const getDescription = () => {
    if (stage === 'setup') {
      return t('login.setup.desc') || "Set up a local administrator account to use the application in standalone mode.";
    }
    if (authMode === 'server') {
      return t('login.server.desc');
    }
    // Standalone mode but connected to backend
    if (authMode === 'local' && isRagOnline) {
      return t('login.local.online.desc') || "RAG Backend connected. Running in local standalone mode.";
    }
    // Standalone mode and offline
    return t('login.local.desc');
  };

  // --- Render Helpers ---

  if (stage === 'initializing') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 transition-colors">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-indigo-100 dark:border-slate-700">
            <Layout className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('app.title')}</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('login.checking')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300 relative transition-colors">
      
      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button 
          onClick={toggleLanguage}
          className="p-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-slate-600 transition-all flex items-center gap-2 text-xs font-medium"
          title="Switch Language"
        >
          <Globe size={16} />
          {i18n.language === 'en' ? 'English' : '中文'}
        </button>
        <button 
          onClick={onToggleTheme}
          className="p-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-slate-600 transition-all"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Brand Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl shadow-lg shadow-indigo-500/20 mb-4">
          <Layout className="text-white w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('app.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t('app.subtitle')}</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
        
        {/* Status Bar */}
        <div className={`px-6 py-3 border-b flex items-center justify-between text-xs font-medium ${authMode === 'server' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-500'}`}>
          <span className="flex items-center gap-1.5">
            {authMode === 'server' ? <Server size={14} /> : <Server size={14} />}
            {authMode === 'server' ? t('login.mode.server') : t('login.mode.local')}
          </span>
          <span className="flex items-center gap-1.5">
            {isRagOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isRagOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              {stage === 'setup' ? <UserPlus className="text-indigo-500" size={24}/> : <ShieldCheck className="text-indigo-500" size={24}/>}
              {stage === 'setup' ? t('login.local.setup') : (authMode === 'server' ? t('login.title') : t('login.local.login'))}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {getDescription()}
            </p>
          </div>

          <form onSubmit={stage === 'setup' ? handleSetup : handleLogin} className="space-y-4">
            
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5 ml-1">
                {t('login.username')}
              </label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                // Disabled only in Server Mode when we might want to lock it (though here we allow typing)
                // Actually in server mode usually we want inputs enabled. 
                // Let's keep it enabled unless loading.
                disabled={isLoading} 
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white"
                placeholder="admin"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5 ml-1">
                {t('login.password')}
              </label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading}
                autoFocus
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white"
                placeholder="••••••••"
              />
            </div>

            {/* Confirm Password (Setup Only) */}
            {stage === 'setup' && (
              <div className="animate-in slide-in-from-top-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5 ml-1">
                  {t('login.confirmPassword')}
                </label>
                <input 
                  type="password" 
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {stage === 'setup' ? t('login.btn.setup') : t('login.btn.login')}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* Footer info */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[10px] text-slate-400">
            {authMode === 'server' 
              ? "Connected to Organization Server" 
              : "Running in Single-User Mode"}
          </p>
          <p className="text-[9px] text-slate-300 dark:text-slate-600 mt-1 font-mono">
            Backend: {RAG_API_BASE}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
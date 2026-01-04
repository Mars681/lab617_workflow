import React from 'react';
import { Bot, Code, PenTool, Sparkles, FileText, BrainCircuit } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectPrompt }) => {
  const { t } = useTranslation();

  const suggestions = [
    {
      icon: <Code size={20} className="text-blue-500" />,
      label: t('welcomeScreen.s1.label'),
      prompt: t('welcomeScreen.s1.prompt')
    },
    {
      icon: <PenTool size={20} className="text-purple-500" />,
      label: t('welcomeScreen.s2.label'),
      prompt: t('welcomeScreen.s2.prompt')
    },
    {
      icon: <BrainCircuit size={20} className="text-amber-500" />,
      label: t('welcomeScreen.s3.label'),
      prompt: t('welcomeScreen.s3.prompt')
    },
    {
      icon: <FileText size={20} className="text-emerald-500" />,
      label: t('welcomeScreen.s4.label'),
      prompt: t('welcomeScreen.s4.prompt')
    }
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
      
      {/* Hero Section */}
      <div className="mb-8 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative w-24 h-24 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center">
             <Bot size={48} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-700 p-1.5 rounded-full shadow-sm border border-slate-100 dark:border-slate-600">
             <Sparkles size={16} className="text-amber-400 fill-amber-400" />
          </div>
      </div>

      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">
        {t('welcomeScreen.title')}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-12 text-lg leading-relaxed">
        {t('welcomeScreen.subtitle')}
      </p>

      {/* Suggestion Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelectPrompt(s.prompt)}
            className="flex items-start gap-4 p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-left transition-all hover:shadow-md group relative overflow-hidden"
          >
            <div className="p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg group-hover:scale-110 transition-transform duration-300 shrink-0">
                {s.icon}
            </div>
            <div className="flex-1 min-w-0 z-10">
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {s.label}
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                {s.prompt}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
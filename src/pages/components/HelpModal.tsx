import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface HelpStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColorClass?: string;
}

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  steps: HelpStep[];
  actionText?: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  steps,
  actionText
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold mb-1">{title}</h2>
            <p className="text-indigo-100 text-sm">{subtitle}</p>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            {steps.map((step, index) => (
               <div key={index} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${step.iconColorClass || 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{index + 1}. {step.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{step.description}</p>
                  </div>
               </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <button 
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition"
            >
              {actionText || t('help.getStarted') || 'Get Started'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

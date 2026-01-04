import React from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

export type ConfirmType = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getThemeColor = () => {
    switch (type) {
      case 'danger': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'info': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
    }
  };

  const getBtnColor = () => {
    switch (type) {
      case 'danger': return 'bg-red-600 hover:bg-red-700 text-white';
      case 'info': return 'bg-blue-600 hover:bg-blue-700 text-white';
      default: return 'bg-indigo-600 hover:bg-indigo-700 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getThemeColor()}`}>
            {type === 'info' ? <Info size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${getBtnColor()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
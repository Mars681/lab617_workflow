import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FloatingMenuProps {
  position: { top: number; left: number } | null;
  onClose: () => void;
  onEditRequest: () => void;
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({ position, onClose, onEditRequest }) => {
  const { t } = useTranslation();
  if (!position) return null;

  return (
    <div 
      className="fixed z-50 flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-xl border border-gray-200 animate-in fade-in zoom-in duration-200"
      style={{ top: position.top - 50, left: position.left }}
    >
      <button 
        onClick={onEditRequest}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
      >
        <Sparkles className="w-4 h-4 text-indigo-500" />
        {t('menu.aiRefine')}
      </button>
      <div className="w-px h-4 bg-gray-200 mx-1" />
      <button 
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
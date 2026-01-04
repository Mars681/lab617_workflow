import React from 'react';

interface ChatActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

const ChatActionButton: React.FC<ChatActionButtonProps> = ({ icon, label, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border transition-colors ${
      disabled
        ? 'border-slate-200 text-slate-300 dark:border-slate-700 dark:text-slate-600 cursor-not-allowed'
        : 'border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 dark:border-slate-700 dark:text-slate-400 dark:hover:text-indigo-300 dark:hover:border-indigo-500/40 bg-white/70 dark:bg-slate-800/60'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default ChatActionButton;

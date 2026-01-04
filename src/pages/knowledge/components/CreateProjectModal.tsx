import React, { useState } from 'react';
import { X, Save, Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(name, description);
      onClose();
      // Reset form
      setName('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
             <Database size={18} className="text-violet-500"/>
             {t('knowledge.create', 'Create New Project')}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Name</label>
            <input 
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all dark:text-slate-100"
              placeholder="e.g. Finance Reports 2024"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description (Optional)</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all dark:text-slate-100 resize-none h-24"
              placeholder="Brief description of this knowledge base..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
            >
              {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save size={16} />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
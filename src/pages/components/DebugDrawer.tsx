import React, { useState, useEffect, useMemo } from 'react';
import { Bug, X, Activity, Trash2, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { debugService, DebugLogEntry, DebugStateEntry } from '../../services/debugService';

export const DebugDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inspector' | 'logs'>('inspector');
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [states, setStates] = useState<DebugStateEntry[]>([]);

  useEffect(() => {
    const sync = () => {
      setLogs(debugService.getLogs());
      setStates(debugService.getAllStates());
    };
    
    // Initial sync
    sync();
    
    // Subscribe
    return debugService.subscribe(sync);
  }, []);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as any);
  };

  const getSourceColor = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('rag')) return 'text-violet-600 bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800';
    if (s.includes('chat')) return 'text-sky-600 bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800';
    if (s.includes('writer')) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
    if (s.includes('workflow')) return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800';
    if (s.includes('system')) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    return 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
  };

  // Group states by category
  const groupedStates = useMemo(() => {
    const groups: Record<string, DebugStateEntry[]> = {};
    states.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, [states]);

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-[9999] p-3 rounded-full shadow-xl transition-all duration-300 ${isOpen ? 'translate-x-[400px]' : 'translate-x-0'} bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:scale-110 active:scale-95`}
        title="Open Debug Drawer"
      >
        <Bug size={20} />
      </button>

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-[500px] bg-slate-50 dark:bg-slate-950 shadow-2xl z-[10000] border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            <Bug size={16} className="text-amber-500" />
            Dev Workbench
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-500">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button 
            onClick={() => setActiveTab('inspector')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'inspector' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            State Inspector
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'logs' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            Event Stream
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          
          {/* INSPECTOR TAB */}
          {activeTab === 'inspector' && (
            <div className="space-y-6">
              {Object.keys(groupedStates).length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">
                  No active debug states registered.
                </div>
              ) : (
                Object.entries(groupedStates).map(([category, items]: [string, DebugStateEntry[]]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                      {category}
                    </h3>
                    
                    {items.map(item => (
                      <StateCard key={item.key} entry={item} />
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500">{logs.length} events captured</span>
                <button onClick={() => debugService.clearLogs()} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                  <Trash2 size={12} /> Clear
                </button>
              </div>
              
              {logs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">No activity recorded yet</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="mb-4 last:mb-0 group">
                    <div className="flex justify-between items-center mb-1 px-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getSourceColor(log.source)}`}>
                          {log.source}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{log.action}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{formatTime(log.timestamp)}</span>
                    </div>
                    
                    <div className="relative">
                      <pre className="block w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-[10px] font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap overflow-x-auto shadow-sm">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
};

// Sub-component for rendering a state block with collapse/copy features
const StateCard: React.FC<{ entry: DebugStateEntry }> = ({ entry }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(entry.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200">
      <div 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between p-2 cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-slate-400">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
            {entry.title}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[9px] text-slate-400 font-mono">
            {new Date(entry.updatedAt).toLocaleTimeString()}
          </span>
          <button 
            onClick={handleCopy}
            className="text-slate-400 hover:text-indigo-500 transition-colors"
            title="Copy JSON"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 relative">
          <pre className="p-3 text-[10px] font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap overflow-x-auto max-h-60 custom-scrollbar">
            {typeof entry.data === 'object' 
              ? JSON.stringify(entry.data, null, 2) 
              : String(entry.data)
            }
          </pre>
        </div>
      )}
    </div>
  );
};
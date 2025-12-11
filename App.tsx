import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Play, 
  Settings, 
  Box, 
  Trash2, 
  Layout, 
  ChevronRight, 
  Terminal,
  Activity,
  ArrowDown,
  HelpCircle,
  X,
  Zap,
  Globe,
  Code,
  Eye,
  Edit2
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';

import { MCP_TOOLS, DEFAULT_INPUT_JSON } from './constants';
import { WorkflowStep, ExecutionLog, MCPTool } from './types';
import WorkflowNode from './components/WorkflowNode';
import ChatAssistant from './components/ChatAssistant';
import DataVisualizer from './components/DataVisualizer';

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  // State
  const [workflowName, setWorkflowName] = useState('Example Workflow');
  const [globalInput, setGlobalInput] = useState(DEFAULT_INPUT_JSON);
  const [isEditingInput, setIsEditingInput] = useState(false); // New state for input mode
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(true);

  // Parse global input for visualization
  const parsedGlobalInput = useMemo(() => {
    try {
      return JSON.parse(globalInput);
    } catch (e) {
      return null;
    }
  }, [globalInput]);

  // Initialize with a demo workflow to show the user how it works immediately
  useEffect(() => {
    // Only set if empty
    if (workflowSteps.length === 0) {
      setWorkflowSteps([
        { id: uuidv4(), toolId: 'matrix.add' },
        { id: uuidv4(), toolId: 'data.normalize' },
        { id: uuidv4(), toolId: 'utils.log' }
      ]);
    }
  }, []);

  // --- Handlers ---

  const handleAddStep = (toolId: string) => {
    setWorkflowSteps(prev => [...prev, { id: uuidv4(), toolId }]);
  };

  const handleResetWorkflow = () => {
    setWorkflowSteps([]);
    setExecutionLogs([]);
  };

  const handleDeleteStep = (id: string) => {
    setWorkflowSteps(prev => prev.filter(s => s.id !== id));
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  // Chat Assistant callback
  const handleAssistantToolAction = useCallback((toolId: string, reset: boolean) => {
    if (reset) {
      setWorkflowSteps(prev => {
        // If just resetting
        return [{ id: uuidv4(), toolId }];
      });
    } else {
      setWorkflowSteps(prev => [...prev, { id: uuidv4(), toolId }]);
    }
  }, []);

  // Drag and Drop Logic for Workflow Reordering
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault(); // Necessary for onDrop to fire
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const newSteps = [...workflowSteps];
    const draggedItem = newSteps[draggedItemIndex];
    
    // Remove dragged item
    newSteps.splice(draggedItemIndex, 1);
    // Insert at new position
    newSteps.splice(index, 0, draggedItem);
    
    setWorkflowSteps(newSteps);
    setDraggedItemIndex(null);
  };

  // Mock Execution Engine
  const executeWorkflow = async () => {
    if (workflowSteps.length === 0) return;
    
    setIsExecuting(true);
    setExecutionLogs([]);

    let currentContext: any = {};
    try {
      currentContext = JSON.parse(globalInput);
    } catch (e) {
      alert("Invalid JSON Input");
      setIsExecuting(false);
      return;
    }

    const logs: ExecutionLog[] = [];

    // Simulate async execution step by step
    for (let i = 0; i < workflowSteps.length; i++) {
      const step = workflowSteps[i];
      const tool = MCP_TOOLS.find(t => t.id === step.toolId);
      
      if (!tool) continue;

      // Fake delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const logEntry: ExecutionLog = {
        stepIndex: i + 1,
        stepName: tool.name,
        toolId: tool.id,
        request: { context_keys: Object.keys(currentContext), tool: tool.id },
        response: {},
        status: 'success',
        timestamp: Date.now()
      };

      // Mock Logic based on tool ID
      if (tool.id === 'matrix.add') {
        logEntry.response = { result: [[2, 4], [6, 8]], message: "Matrices added successfully" };
      } else if (tool.id === 'data.normalize') {
        logEntry.response = { result: [0, 0.25, 0.5, 0.75, 1.0], message: "Data normalized using MinMax" };
      } else if (tool.id === 'poly.fit') {
        logEntry.response = { coefficients: [1.2, 0.5, 0.01], degree: 2, r_squared: 0.98 };
      } else if (tool.id === 'utils.log') {
        logEntry.response = { logged: true, timestamp: new Date().toLocaleTimeString() };
      } else {
        logEntry.response = { output: "Mock data generated", status: "OK" };
      }

      logs.push(logEntry);
      setExecutionLogs([...logs]); // Update UI incrementally
    }

    setIsExecuting(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
      
      {/* --- Sidebar (Left) --- */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Layout className="w-6 h-6" />
            <h1 className="font-bold text-lg tracking-tight">{t('app.title')}</h1>
          </div>
          <p className="text-xs text-slate-400">{t('app.subtitle')}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Workflow Config */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider">{t('config.title')}</label>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('config.workflowName')}</label>
              <input 
                type="text" 
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* JSON Input */}
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider">{t('config.globalInput')}</label>
              <button 
                onClick={() => setIsEditingInput(!isEditingInput)}
                className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
              >
                {isEditingInput ? <><Eye size={10} /> {t('config.view')}</> : <><Code size={10} /> {t('config.edit')}</>}
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-lg">
              {isEditingInput ? (
                <textarea 
                  value={globalInput}
                  onChange={(e) => setGlobalInput(e.target.value)}
                  className="w-full h-full p-3 bg-slate-900 text-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                  spellCheck={false}
                />
              ) : (
                <div className="p-3">
                  {parsedGlobalInput ? (
                    <DataVisualizer data={parsedGlobalInput} rootMode={true} />
                  ) : (
                    <div className="text-red-500 text-xs p-2 bg-red-50 rounded border border-red-100">
                      Invalid JSON syntax. Switch to edit mode to fix.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50">
          <button 
            onClick={executeWorkflow}
            disabled={isExecuting || workflowSteps.length === 0}
            className={`relative w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 ${
              isExecuting || workflowSteps.length === 0 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isExecuting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('btn.running')}
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                {t('btn.run')}
              </>
            )}
            {!isExecuting && workflowSteps.length > 0 && executionLogs.length === 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
            )}
          </button>
        </div>
      </aside>

      {/* --- Main Content (Right) --- */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="font-medium text-slate-900">{workflowName}</span>
            <ChevronRight size={16} />
            <span className="text-sm">{t('header.editMode')}</span>
          </div>
          <div className="flex items-center gap-4">
             <button
               onClick={toggleLanguage}
               className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-sm font-medium"
             >
               <Globe size={18} />
               <span>{i18n.language === 'en' ? 'English' : '中文'}</span>
             </button>
             <div className="h-4 w-px bg-slate-200" />
             <button 
               onClick={() => setShowHelp(true)}
               className="text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-sm"
             >
               <HelpCircle size={18} />
               <span className="hidden md:inline">{t('header.howToUse')}</span>
             </button>
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white shadow-sm" />
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Tool Palette (Left Internal) */}
          <div className="w-full md:w-64 bg-white/50 border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200/60 bg-white">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Box size={16} className="text-indigo-500"/>
                {t('toolbox.title')}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {MCP_TOOLS.map(tool => (
                <div 
                  key={tool.id}
                  onClick={() => handleAddStep(tool.id)}
                  className="group bg-white p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-slate-700 group-hover:text-indigo-700">
                      {t(`tool.${tool.id}.name`, tool.name)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 rounded">
                      {t(`cat.${tool.category}`, tool.category)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {t(`tool.${tool.id}.desc`, tool.description)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Canvas (Center) */}
          <div className="flex-1 bg-slate-50/50 p-8 overflow-y-auto flex flex-col relative">
            <div className="max-w-2xl mx-auto w-full">
              
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{t('canvas.title')}</h2>
                  <p className="text-sm text-slate-500">{t('canvas.subtitle')}</p>
                </div>
                {workflowSteps.length > 0 && (
                  <button 
                    onClick={handleResetWorkflow}
                    className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={14} /> {t('canvas.clear')}
                  </button>
                )}
              </div>

              {workflowSteps.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl h-64 flex flex-col items-center justify-center text-slate-400 bg-white/50">
                  <Layout className="w-12 h-12 mb-3 text-slate-300" />
                  <p className="font-medium">{t('canvas.empty.title')}</p>
                  <p className="text-sm">{t('canvas.empty.subtitle')}</p>
                </div>
              ) : (
                <div className="space-y-4 pb-20">
                  {workflowSteps.map((step, index) => (
                    <div key={step.id} className="relative">
                      <WorkflowNode 
                        step={step} 
                        index={index}
                        onDelete={handleDeleteStep}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                      {index < workflowSteps.length - 1 && (
                         <div className="absolute left-6 -bottom-5 text-slate-300 z-0">
                           <ArrowDown size={16} />
                         </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

          {/* Logs Panel (Right Internal) */}
          <div className="w-full md:w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 h-1/2 md:h-auto border-t md:border-t-0">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Terminal size={16} className="text-emerald-600" />
                {t('logs.title')}
              </h2>
              {isExecuting && <Activity size={16} className="text-indigo-500 animate-pulse" />}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3 font-mono text-xs">
              {executionLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                     <Play size={20} className="text-slate-300 ml-1" />
                  </div>
                  <p className="font-medium text-slate-500">{t('logs.empty.title')}</p>
                  <p className="text-[10px] mt-1 text-center max-w-[150px]">
                    {t('logs.empty.subtitle')}
                  </p>
                </div>
              ) : (
                executionLogs.map((log, idx) => (
                  <div key={idx} className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm animate-in slide-in-from-right-2 duration-300">
                    <div className="flex justify-between items-center mb-2 border-b border-slate-50 pb-2">
                      <span className="font-bold text-slate-700 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{log.stepIndex}</span>
                        {log.stepName}
                      </span>
                      <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Success</span>
                    </div>
                    
                    <div className="space-y-3">
                      {/* We don't really need to show Context Keys for beginners, it's confusing. 
                          We can focus on the Output. */}
                      <div>
                        <span className="text-slate-400 block mb-1 uppercase tracking-wider text-[9px] font-bold">{t('logs.output')}</span>
                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                           <DataVisualizer data={log.response} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Floating Chat Assistant */}
      <ChatAssistant onAddTool={handleAssistantToolAction} />
      
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold mb-1">{t('help.welcome')}</h2>
                <p className="text-indigo-100 text-sm">{t('help.subtitle')}</p>
              </div>
              <button onClick={() => setShowHelp(false)} className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Box size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">1. {t('help.step1.title')}</h3>
                    <p className="text-sm text-slate-500">{t('help.step1.desc')}</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Play size={20} className="ml-1"/>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">2. {t('help.step2.title')}</h3>
                    <p className="text-sm text-slate-500">{t('help.step2.desc')}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">3. {t('help.step3.title')}</h3>
                    <p className="text-sm text-slate-500">{t('help.step3.desc')}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setShowHelp(false)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition"
                >
                  {t('help.getStarted')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default App;
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  Connection as FlowConnection,
  Edge,
  Node,
  EdgeChange,
  NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Play,
  Box,
  Trash2,
  Layout,
  ChevronRight,
  Terminal,
  Activity,
  HelpCircle,
  Zap,
  Code,
  Eye,
  X,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';

import { DEFAULT_INPUT_JSON } from '../../constants';
import { ExecutionLog, MCPTool } from '../../types';
import WorkflowNode, { FlowNodeData } from './components/WorkflowNode';
import ChatAssistant from './components/ChatAssistant';
import DataVisualizer from '../components/DataVisualizer';
import { executeTool, getAvailableTools, getToolCategories } from '../../api/workflow';
import { isDevMode } from '../../services/configService';
import { debugService } from '../../services/debugService';

import { uploadMatToBackend } from '../../api/dipcaUpload';

interface WorkflowBuilderProps {
  providerId: string;
}

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({ providerId }) => {
  const { t, i18n } = useTranslation();

  // State
  const [workflowName, setWorkflowName] = useState('Example Workflow');
  const [globalInput, setGlobalInput] = useState(DEFAULT_INPUT_JSON);
  const [isEditingInput, setIsEditingInput] = useState(false);
  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // MAT upload state
  const [matFile, setMatFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  // Dynamic Tool Loading
  const [availableTools, setAvailableTools] = useState<MCPTool[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});

  // ✅ Resizable logs panel (desktop)
  const [logsWidth, setLogsWidth] = useState<number>(() => {
    const saved = localStorage.getItem('workflow_logs_width');
    return saved ? Number(saved) : 360;
  });
  const [isResizingLogs, setIsResizingLogs] = useState(false);

  // Parse global input for visualization
  const parsedGlobalInput = useMemo(() => {
    try {
      return JSON.parse(globalInput);
    } catch (e) {
      return null;
    }
  }, [globalInput]);

  // Check help seen state on mount
  useEffect(() => {
    const hasSeen = localStorage.getItem('has_seen_help_workflow');
    if (!hasSeen) {
      setShowHelp(true);
      localStorage.setItem('has_seen_help_workflow', 'true');
    }
  }, []);

  // Load tools and categories from service on mount AND when language changes
  useEffect(() => {
    const loadData = async () => {
      const [tools, cats] = await Promise.all([getAvailableTools(), getToolCategories()]);
      setAvailableTools(tools);
      setCategories(cats);

      // if (nodes.length === 0 && tools.length > 0) {
      //   setNodes([
      //     // { id: uuidv4(), toolId: 'matrix.add' },
      //     // { id: uuidv4(), toolId: 'data.normalize' },
      //     // { id: uuidv4(), toolId: 'utils.log' }
      //   ]);
      // }
    };
    loadData();
  }, [i18n.language]);

  // Sync state to debug service
  useEffect(() => {
    if (isDevMode()) {
      const toolDescriptions = nodes.map((step) => {
        const tool = availableTools.find((t) => t.id === step.data.toolId);
        if (!tool) {
          return { toolId: step.data.toolId, name: step.data.toolId, description: 'Unknown tool' };
        }

        const localizedName =
          typeof tool.name === 'string'
            ? tool.name
            : (tool as any).name?.[i18n.language] ?? (tool as any).name?.en ?? tool.id;

        const localizedDescription =
          typeof tool.description === 'string'
            ? tool.description
            : (tool as any).description?.[i18n.language] ??
              (tool as any).description?.en ??
              'No description';

        return { toolId: tool.id, name: localizedName, description: localizedDescription };
      });

      const safeNodes = nodes.map((n) => ({
        ...n,
        data: { ...n.data, onDelete: undefined },
      }));

      debugService.registerState(
        'workflow.current',
        {
          workflowName,
          stepCount: nodes.length,
          steps: safeNodes,
          connections: edges,
          toolDescriptions,
          globalInput: globalInput,
          executionLogs: executionLogs,
          lastExecution: executionLogs.length > 0 ? executionLogs[executionLogs.length - 1].timestamp : null,
        },
        { title: 'Current Workflow State', category: 'Workflow' }
      );
    }
  }, [workflowName, nodes, edges, availableTools, globalInput, executionLogs, i18n.language]);

  // ✅ Logs resize handlers
  const startResizeLogs = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLogs(true);
  }, []);

  useEffect(() => {
    if (!isResizingLogs) return;

    const onMove = (e: MouseEvent) => {
      // 右侧面板宽度 = 窗口宽度 - 鼠标X
      const next = window.innerWidth - e.clientX;

      // 限制最小/最大，避免把中间画布挤没
      const min = 260;
      const max = Math.min(640, Math.floor(window.innerWidth * 0.55));
      const clamped = Math.max(min, Math.min(max, next));

      setLogsWidth(clamped);
    };

    const onUp = () => {
      setIsResizingLogs(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizingLogs]);

  useEffect(() => {
    localStorage.setItem('workflow_logs_width', String(logsWidth));
  }, [logsWidth]);

  // --- Handlers ---

  const handleUploadMat = async () => {
    if (!matFile) {
      setUploadMsg('Please select a .mat or .csv file first.');
      return;
    }

    setIsUploading(true);
    setUploadMsg(null);

    try {
      const res = await uploadMatToBackend(matFile);

      let obj: any = {};
      try {
        obj = JSON.parse(globalInput);
      } catch {
        obj = {};
      }

      obj.mat_path = res.mat_path;
      obj.mat_key = obj.mat_key ?? 'Y';
      obj.train_ratio = obj.train_ratio ?? 0.25;
      obj.order = obj.order ?? 2;
      obj.nfactor = obj.nfactor ?? 3;
      obj.alpha = obj.alpha ?? 0.99;
      obj.prefix = obj.prefix ?? 'dipca';

      setGlobalInput(JSON.stringify(obj, null, 2));
      setUploadMsg(`Upload succeeded: ${res.filename} \u2192 ${res.mat_path}`);
    } catch (e: any) {
      setUploadMsg(`Upload failed: ${e?.message || e}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteStep = (id: string) => {
    setNodes((prev) => prev.filter((s) => s.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
  };

  const handleAddStep = useCallback(
    (toolId: string) => {
      const exists = availableTools.some((t) => t.id === toolId);
      if (!exists) {
        alert(`工具未注册到后端工具池：${toolId}\n请检查 getAvailableTools() 是否返回该工具。`);
        return;
      }
      const tool = availableTools.find((t) => t.id === toolId);
      setNodes((prev) => {
        const idx = prev.length;
        const newNode: Node<FlowNodeData> = {
          id: uuidv4(),
          type: 'tool',
          position: { x: 160 + (idx % 3) * 220, y: 80 + Math.floor(idx / 3) * 160 },
          data: {
            toolId,
            toolName: tool?.name || toolId,
            toolDescription: tool?.description || toolId,
            category: (tool?.category as MCPTool['category']) || 'utility',
            onDelete: handleDeleteStep,
          },
        };
        return [...prev, newNode];
      });
    },
    [availableTools, handleDeleteStep]
  );

  const handleResetWorkflow = () => {
    setNodes([]);
    setEdges([]);
    setExecutionLogs([]);
  };

  // Chat Assistant callback
  const handleAssistantToolAction = useCallback(
    (toolId: string, reset: boolean) => {
      if (reset) {
        setEdges([]);
        setNodes([]);
      }
      handleAddStep(toolId);
    },
    [handleAddStep]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: FlowConnection) =>
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', animated: true }, eds)),
    []
  );

  const nodeTypes = useMemo(() => ({ tool: WorkflowNode }), []);

  // Execution Engine
  const executeWorkflow = async () => {
    if (nodes.length === 0) return;

    setIsExecuting(true);
    setExecutionLogs([]);

    let baseInput: any = {};
    try {
      baseInput = JSON.parse(globalInput);
    } catch (e) {
      alert('Invalid JSON Input');
      setIsExecuting(false);
      return;
    }

    // Inputs collected per node from upstream connections
    const incomingPayloads: Record<string, any[]> = {};
    const incomingBySource: Record<string, Record<string, any[]>> = {};
    const logs: ExecutionLog[] = [];
    let sharedContext: Record<string, any> = { global_input: baseInput };

    // map edges to simple connection list
    const connectionList = edges.map((e) => ({ fromNodeId: e.source, toNodeId: e.target }));

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const tool = availableTools.find((t) => t.id === node.data.toolId);
      if (!tool) continue;

      const inputsForNode = incomingPayloads[node.id] || [];
      const context: any = {
        ...sharedContext,
        __prev_output: inputsForNode.length ? inputsForNode[inputsForNode.length - 1] : null,
        __all_inputs: inputsForNode,
        __inputs_by_node: incomingBySource[node.id] || {},
        step_index: i + 1,
      };
      const requestKeys = Object.keys(context);

      try {
        const res: any = await executeTool(tool.id, context);
        const payload = res?.context ?? res?.output ?? res;
        if (res?.context) {
          sharedContext = res.context;
        }
        const responseForLog = res?.output ?? res;

        const logEntry: ExecutionLog = {
          stepIndex: i + 1,
          stepName: tool?.name || node.data.toolName,
          toolId: tool?.id || node.data.toolId,
          request: { context_keys: requestKeys, tool: tool?.id || node.data.toolId },
          response: responseForLog,
          status: 'success',
          timestamp: Date.now(),
        };

        logs.push(logEntry);
        setExecutionLogs([...logs]);

        // Fan-out: push this output to all downstream nodes connected from this node
        const outgoing = connectionList.filter((c) => c.fromNodeId === node.id);
        outgoing.forEach((conn) => {
          const arr = incomingPayloads[conn.toNodeId] || [];
          arr.push(payload);
          incomingPayloads[conn.toNodeId] = arr;

          const bySource = incomingBySource[conn.toNodeId] || {};
          const fromList = bySource[node.id] || [];
          fromList.push(payload);
          bySource[node.id] = fromList;
          incomingBySource[conn.toNodeId] = bySource;
        });
      } catch (error: any) {
        const logEntry: ExecutionLog = {
          stepIndex: i + 1,
          stepName: tool?.name || node.data.toolName,
          toolId: tool?.id || node.data.toolId,
          request: { context_keys: requestKeys, tool: tool?.id || node.data.toolId },
          response: { error: error?.message || 'Execution Failed' },
          status: 'error',
          timestamp: Date.now(),
        };
        logs.push(logEntry);
        setExecutionLogs([...logs]);
      }
    }

    setIsExecuting(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      {/* Toolbar */}
      <div className="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 shrink-0 transition-colors">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">{workflowName}</span>
          <ChevronRight size={14} />
          <span className="text-xs">{t('header.editMode')}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHelp(true)}
            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5 text-xs"
          >
            <HelpCircle size={16} />
            <span className="hidden md:inline">{t('header.howToUse')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-sm z-10 transition-colors">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Workflow name */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider">{t('config.title')}</label>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('config.workflowName')}
                </label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Toolbox */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2 block">
                {t('toolbox.title')}
              </label>
              <div className="space-y-2">
                {availableTools.length === 0 ? (
                  <div className="text-xs text-slate-400 p-2 italic text-center">Loading tools...</div>
                ) : (
                  availableTools.map((tool) => (
                    <div
                      key={tool.id}
                      onClick={() => handleAddStep(tool.id)}
                      className="group bg-slate-50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-sm cursor-pointer transition-all active:scale-95"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-xs text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                          {tool.name}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                          {categories[tool.category] || tool.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-300 leading-snug line-clamp-2">
                        {tool.description || tool.id}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>


            {/* MAT/CSV Upload */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider">.mat .csv Upload</label>

              <input
                type="file"
                accept=".mat,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setMatFile(f);
                  setUploadMsg(null);
                }}
                className="block w-full text-xs text-slate-500
                  file:mr-3 file:py-1.5 file:px-3
                  file:rounded-lg file:border-0
                  file:text-xs file:font-semibold
                  file:bg-slate-100 file:text-slate-700
                  hover:file:bg-slate-200
                  dark:file:bg-slate-700 dark:file:text-slate-200
                  dark:hover:file:bg-slate-600"
              />

              <button
                onClick={handleUploadMat}
                disabled={!matFile || isUploading}
                className={`w-full py-2 rounded-lg text-xs font-semibold transition ${
                  !matFile || isUploading
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isUploading ? 'Uploading…' : 'Upload to backend and write into JSON (.mat / .csv)'}
              </button>

              {uploadMsg && (
                <div className="text-[11px] p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
                  {uploadMsg}
                </div>
              )}
            </div>

            {/* JSON Input */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  {t('config.globalInput')}
                </label>
                <button
                  onClick={() => setIsEditingInput(!isEditingInput)}
                  className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                >
                  {isEditingInput ? (
                    <>
                      <Eye size={10} /> {t('config.view')}
                    </>
                  ) : (
                    <>
                      <Code size={10} /> {t('config.edit')}
                    </>
                  )}
                </button>
              </div>

              <div className="h-40 overflow-y-auto bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                {isEditingInput ? (
                  <textarea
                    value={globalInput}
                    onChange={(e) => setGlobalInput(e.target.value)}
                    className="w-full h-full p-3 bg-slate-900 dark:bg-black text-slate-300 font-mono text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                    spellCheck={false}
                  />
                ) : (
                  <div className="p-2">
                    {parsedGlobalInput ? (
                      <DataVisualizer data={parsedGlobalInput} rootMode={true} className="text-[10px]" />
                    ) : (
                      <div className="text-red-500 text-xs p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-900/30">
                        Invalid JSON syntax.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={executeWorkflow}
              disabled={isExecuting || nodes.length === 0}
              className={`relative w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 text-sm ${
                isExecuting || nodes.length === 0
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isExecuting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('btn.running')}
                </>
              ) : (
                <>
                  <Play size={16} fill="currentColor" />
                  {t('btn.run')}
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1 bg-slate-50/50 dark:bg-slate-900 p-8 overflow-y-auto flex flex-col relative transition-colors">
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('canvas.title')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('canvas.subtitle')}</p>
              </div>
              {nodes.length > 0 && (
                <button
                  onClick={handleResetWorkflow}
                  className="text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Trash2 size={14} /> {t('canvas.clear')}
                </button>
              )}
            </div>

            <div className="h-[700px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-inner overflow-hidden">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                nodeTypes={nodeTypes}
                defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
              >
                <MiniMap pannable zoomable />
                <Controls />
                <Background gap={16} size={1} />
              </ReactFlow>
              {nodes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Layout className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="font-medium">{t('canvas.empty.title')}</p>
                  <p className="text-sm">{t('canvas.empty.subtitle')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ Logs (Resizable on desktop) */}
        <div className="relative w-full md:w-auto shrink-0 h-1/2 md:h-auto border-t md:border-t-0 transition-colors">
          {/* Drag handle: desktop only */}
          <div
            onMouseDown={startResizeLogs}
            className="hidden md:block absolute left-0 top-0 h-full w-1.5 cursor-col-resize
                       bg-transparent hover:bg-indigo-500/20 active:bg-indigo-500/30 z-20"
            title="拖拽调整日志面板宽度"
          />

          <div
            className={`bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col h-full transition-colors ${
              isResizingLogs ? 'select-none' : ''
            }`}
            style={{ width: logsWidth }}
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Terminal size={16} className="text-emerald-600 dark:text-emerald-400" />
                {t('logs.title')}
              </h2>
              {isExecuting && <Activity size={16} className="text-indigo-500 animate-pulse" />}
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900 space-y-3 font-mono text-xs">
              {executionLogs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <Play size={20} className="text-slate-300 dark:text-slate-600 ml-1" />
                  </div>
                  <p className="font-medium text-slate-500 dark:text-slate-400">{t('logs.empty.title')}</p>
                  <p className="text-[10px] mt-1 text-center max-w-[150px]">{t('logs.empty.subtitle')}</p>
                </div>
              ) : (
                executionLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 shadow-sm animate-in slide-in-from-right-2 duration-300"
                  >
                    <div className="flex justify-between items-center mb-2 border-b border-slate-50 dark:border-slate-700 pb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                          {log.stepIndex}
                        </span>
                        {log.stepName}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                          log.status === 'success'
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                            : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1 uppercase tracking-wider text-[9px] font-bold">
                        {t('logs.output')}
                      </span>
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2 border border-slate-100 dark:border-slate-700">
                        <DataVisualizer data={log.response} />

                        {/* 图像：使用链接打开 */}
                        {(log as any).response?.image_url && (
                          <a
                            href={(log as any).response.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-indigo-600 hover:text-indigo-800 underline text-xs"
                          >
                            📊 点击打开 DiPCA 监控图
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Assistant */}
      <ChatAssistant onAddTool={handleAssistantToolAction} providerId={providerId} />

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold mb-1">{t('workflow.help.welcome')}</h2>
                <p className="text-indigo-100 text-sm">{t('workflow.help.subtitle')}</p>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Box size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      1. {t('workflow.help.step1.title')}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('workflow.help.step1.desc')}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Play size={20} className="ml-1" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      2. {t('workflow.help.step2.title')}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('workflow.help.step2.desc')}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      3. {t('workflow.help.step3.title')}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('workflow.help.step3.desc')}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition"
                >
                  {t('workflow.help.getStarted')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowBuilder;

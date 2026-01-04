import React from 'react';
import { X, GripVertical } from 'lucide-react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MCPTool } from '../../../types';

export type FlowNodeData = {
  toolId: string;
  toolName: string;
  toolDescription: string;
  category: MCPTool['category'];
  onDelete?: (id: string) => void;
};

const WorkflowNodeComponent: React.FC<NodeProps<FlowNodeData>> = ({ id, data }) => {
  const getCategoryColor = (cat: MCPTool['category']) => {
    switch (cat) {
      case 'math':
        return 'border-blue-300 bg-blue-50/80 dark:border-blue-500/60 dark:bg-blue-900/40';
      case 'data':
        return 'border-emerald-300 bg-emerald-50/80 dark:border-emerald-500/60 dark:bg-emerald-900/40';
      case 'analysis':
        return 'border-amber-300 bg-amber-50/80 dark:border-amber-500/60 dark:bg-amber-900/40';
      case 'utility':
        return 'border-slate-300 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-800/60';
      default:
        return 'border-gray-300 bg-gray-50/80 dark:border-gray-600 dark:bg-gray-800/60';
    }
  };

  return (
    <div
      className={`relative group flex items-center gap-3 p-4 rounded-xl border-2 ${getCategoryColor(
        data.category
      )} shadow-sm hover:shadow-lg transition-all select-none bg-white dark:bg-slate-800`}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-sky-400" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-emerald-400" />

      <div className="mr-3 text-current opacity-50">
        <GripVertical size={18} />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-white/60 dark:bg-black/30 border border-black/5 dark:border-white/10">
            {data.toolName}
          </span>
        </div>
        <p className="text-[11px] opacity-80 mt-1 font-mono leading-snug">{data.toolId}</p>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
          {data.toolDescription}
        </p>
      </div>

      <button
        onClick={() => data.onDelete?.(id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 rounded-full transition-all"
        title="Delete node"
      >
        <X size={16} />
      </button>
    </div>
  );
};

WorkflowNodeComponent.displayName = 'WorkflowNode';

export default WorkflowNodeComponent;

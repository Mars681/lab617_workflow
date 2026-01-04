import React from 'react';
import { WorkflowStep, MCPTool } from '../../../types';
import { X, GripVertical } from 'lucide-react';

interface WorkflowNodeProps {
  step: WorkflowStep;
  index: number;
  tool?: MCPTool; // Received from parent which fetches it from service
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
}

const WorkflowNode = React.forwardRef<HTMLDivElement, WorkflowNodeProps>(
  ({ step, index, tool, onDelete, onDragStart, onDragOver, onDrop }, ref) => {
    if (!tool) {
      return (
        <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs">
          Unknown Tool: {step.toolId}
        </div>
      );
    }

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
        ref={ref}
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDrop={(e) => onDrop(e, index)}
        className={`relative group flex items-center gap-3 p-4 rounded-xl border-2 ${getCategoryColor(
          tool.category
        )} shadow-sm hover:shadow-lg transition-all cursor-move select-none animate-in fade-in slide-in-from-bottom-2 duration-300`}
      >
        <div
          data-port="in"
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-sky-400 bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm"
          title="Input"
        >
          <span className="block w-2 h-2 rounded-full bg-sky-400" />
        </div>

        <div
          data-port="out"
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-emerald-400 bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm"
          title="Output"
        >
          <span className="block w-2 h-2 rounded-full bg-emerald-400" />
        </div>

        <div className="mr-3 text-current opacity-50">
          <GripVertical size={18} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-white/60 dark:bg-black/30 border border-black/5 dark:border-white/10">
              {index + 1}
            </span>
            <h4 className="font-semibold text-sm">{tool.name}</h4>
          </div>
          <p className="text-[11px] opacity-80 mt-1 font-mono leading-snug">{tool.id}</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{tool.description}</p>
        </div>

        <button
          onClick={() => onDelete(step.id)}
          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 rounded-full transition-all"
        >
          <X size={16} />
        </button>
      </div>
    );
  }
);

WorkflowNode.displayName = 'WorkflowNode';

export default WorkflowNode;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { WorkflowStep, MCPTool } from '../types';
import { MCP_TOOLS } from '../constants';
import { X, GripVertical } from 'lucide-react';

interface WorkflowNodeProps {
  step: WorkflowStep;
  index: number;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
}

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ 
  step, 
  index, 
  onDelete, 
  onDragStart, 
  onDragOver, 
  onDrop 
}) => {
  const { t } = useTranslation();
  const tool = MCP_TOOLS.find(t => t.id === step.toolId);

  if (!tool) return null;

  const getCategoryColor = (cat: MCPTool['category']) => {
    switch(cat) {
      case 'math': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'data': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'analysis': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'utility': return 'bg-slate-50 text-slate-700 border-slate-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className={`relative group flex items-center p-3 rounded-xl border ${getCategoryColor(tool.category)} shadow-sm hover:shadow-md transition-all cursor-move select-none animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div className="mr-3 text-current opacity-40">
        <GripVertical size={18} />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-white/60 border border-black/5">
            {index + 1}
          </span>
          <h4 className="font-semibold text-sm">
            {t(`tool.${tool.id}.name`, tool.name)}
          </h4>
        </div>
        <p className="text-xs opacity-80 mt-0.5 font-mono">{tool.id}</p>
      </div>

      <button 
        onClick={() => onDelete(step.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 hover:text-red-600 rounded-full transition-all"
      >
        <X size={16} />
      </button>

      {/* Connector Line (Visual only, hidden for last item in parent) */}
      <div className="hidden absolute left-1/2 -bottom-4 w-0.5 h-4 bg-slate-300 -z-10 group-last:hidden" />
    </div>
  );
};

export default WorkflowNode;
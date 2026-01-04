import React from 'react';

// Recursive component to handle different data types
const DataValue: React.FC<{ value: any }> = ({ value }) => {
  if (value === null || value === undefined) return <span className="text-slate-400 italic">null</span>;

  // Matrix / 2D Array
  if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
    const rowCount = value.length;
    const colCount = Array.isArray(value[0]) ? value[0].length : 0;
    const shouldSummarize = rowCount > 10;
    const rowsToRender = shouldSummarize ? value.slice(0, 3) : value;

    return (
      <div className="inline-block border border-slate-200 rounded-lg overflow-hidden shadow-sm mt-1 max-w-full overflow-x-auto">
        {shouldSummarize && (
          <div className="px-3 py-2 text-[11px] text-slate-500 bg-slate-50 border-b border-slate-100">
            Matrix {rowCount} x {colCount} too large, showing first {rowsToRender.length} rows only.
          </div>
        )}
        <table className="min-w-full text-center bg-white text-xs">
          <tbody>
            {rowsToRender.map((row: any[], i: number) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                {row.map((cell: any, j: number) => (
                  <td key={j} className="p-2 border-r border-slate-100 last:border-0 font-mono text-slate-700 bg-slate-50/30 min-w-[30px]">
                    {typeof cell === 'number' && !Number.isInteger(cell) ? cell.toFixed(2) : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // 1D Array
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {value.map((item: any, i: number) => (
          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono border border-slate-200">
            {typeof item === 'number' && !Number.isInteger(item) ? item.toFixed(2) : String(item)}
          </span>
        ))}
      </div>
    );
  }

  // Object
  if (typeof value === 'object') {
     return (
       <div className="pl-2 border-l-2 border-slate-100 mt-1 space-y-1.5">
         {Object.entries(value).map(([k, v]) => (
           <div key={k} className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{k}:</span>
             <DataValue value={v} />
           </div>
         ))}
       </div>
     )
  }

  // Primitive
  return <span className="text-sm font-medium text-slate-700 font-mono break-all">{String(value)}</span>;
};

interface DataVisualizerProps {
  data: any;
  title?: string;
  className?: string;
  rootMode?: boolean; // If true, renders top-level keys as separate cards
}

const DataVisualizer: React.FC<DataVisualizerProps> = ({ data, title, className = '', rootMode = false }) => {
  // If data is just a flat object (like the global input), we want to render sections for each key
  if (rootMode && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:border-indigo-200 transition-colors">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{key}</span>
            </div>
            <DataValue value={value} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {title && <div className="text-xs font-bold text-slate-400 uppercase mb-1">{title}</div>}
      <DataValue value={data} />
    </div>
  );
};

export default DataVisualizer;

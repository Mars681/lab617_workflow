import React, { useState, useEffect, useMemo } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  Search, 
  RefreshCw, 
  Download, 
  Edit3, 
  Plus, 
  BarChart3, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  fetchFiles, 
  uploadFiles, 
  deleteFile, 
  fetchChunks, 
  deleteChunk, 
  editChunk, 
  addChunk, 
  rebuildChunks, 
  getExportUrl 
} from '../../../api/rag';
import { RagFile, RagChunk } from '../../../types';
import ConfirmModal from '../../components/ConfirmModal';

interface SplitProps {
  projectId: string;
}

const ITEMS_PER_PAGE = 10;

export const Split: React.FC<SplitProps> = ({ projectId }) => {
  const { t } = useTranslation();

  // State: Data
  const [files, setFiles] = useState<RagFile[]>([]);
  const [chunks, setChunks] = useState<RagChunk[]>([]);
  
  // State: UI & Interaction
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // State: Modals / Actions
  const [editingChunk, setEditingChunk] = useState<RagChunk | null>(null);
  const [isAddingChunk, setIsAddingChunk] = useState(false);
  const [chunkTextBuffer, setChunkTextBuffer] = useState('');
  const [newChunkDocId, setNewChunkDocId] = useState(''); // File ID to associate new chunk with
  
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    type: 'deleteFile' | 'deleteChunk' | 'rebuild';
    title: string;
    message: string;
    payload: any;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Auto-refresh logic: Poll if any file is in processing state
  useEffect(() => {
    const processingStatuses = ['processing', 'pending', 'uploading', 'queued'];
    const hasProcessingFiles = files.some(f => 
        processingStatuses.includes((f.status || '').toLowerCase())
    );

    if (hasProcessingFiles) {
        const timer = setTimeout(() => {
            loadData(true); // Silent reload
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [files, projectId]);

  const loadData = async (silent = false) => {
    if (!silent) {
      setIsLoadingFiles(true);
      setIsLoadingChunks(true);
    }
    try {
      const [filesData, chunksData] = await Promise.all([
        fetchFiles(projectId),
        fetchChunks(projectId)
      ]);
      setFiles(filesData);
      setChunks(chunksData);
    } catch (e) {
      console.error("Failed to load project data", e);
    } finally {
      if (!silent) {
        setIsLoadingFiles(false);
        setIsLoadingChunks(false);
      }
    }
  };

  // --- File Logic ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      await uploadFiles(projectId, Array.from(e.target.files));
      await loadData(); // Reload both files and chunks
    } catch (e: any) {
      alert(`${t('knowledge.split.uploadFailed', 'Upload failed')}: ${e.message}`);
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDeleteFileRequest = (file: RagFile) => {
    setConfirmAction({
      isOpen: true,
      type: 'deleteFile',
      title: t('knowledge.split.deleteDoc', 'Delete Document'),
      message: t('knowledge.split.deleteDocConfirm', { name: file.fileName }),
      payload: file.id
    });
  };

  // --- Chunk Logic ---

  const handleDeleteChunkRequest = (chunk: RagChunk) => {
    setConfirmAction({
      isOpen: true,
      type: 'deleteChunk',
      title: t('knowledge.split.deleteChunk', 'Delete Chunk'),
      message: t('knowledge.split.deleteChunkConfirm', { name: chunk.fileName }),
      payload: chunk
    });
  };

  const handleRebuildRequest = () => {
    setConfirmAction({
      isOpen: true,
      type: 'rebuild',
      title: t('knowledge.split.rebuild', 'Rebuild Chunks'),
      message: t('knowledge.split.rebuildConfirm', 'This will re-process all uploaded documents and overwrite existing chunks. Continue?'),
      payload: null
    });
  };

  const confirmModalAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'deleteFile') {
        await deleteFile(confirmAction.payload);
        setFiles(prev => prev.filter(f => f.id !== confirmAction.payload));
        // Refresh chunks as they might be gone
        const newChunks = await fetchChunks(projectId);
        setChunks(newChunks);
      } else if (confirmAction.type === 'deleteChunk') {
        const chunk = confirmAction.payload as RagChunk;
        await deleteChunk(chunk.id, chunk.fileName);
        setChunks(prev => prev.filter(c => c.id !== chunk.id));
      } else if (confirmAction.type === 'rebuild') {
        await rebuildChunks(projectId);
        await loadData();
      }
    } catch (e) {
      console.error("Action failed", e);
      alert(`${t('knowledge.split.actionFailed', 'Action failed')}. Check console for details.`);
    } finally {
      setConfirmAction(null);
    }
  };

  const handleSaveChunk = async () => {
    if (!chunkTextBuffer.trim()) return;
    
    try {
      if (editingChunk) {
        // Update existing
        await editChunk(editingChunk.fileName, editingChunk.id, chunkTextBuffer);
        setChunks(prev => prev.map(c => c.id === editingChunk.id ? { ...c, content: chunkTextBuffer } : c));
        setEditingChunk(null);
      } else if (isAddingChunk) {
        // Create new
        const targetFile = files.find(f => f.id === newChunkDocId) || files[0];
        if (!targetFile) {
            alert(t('knowledge.split.noFileForChunk', "No file available to associate chunk with."));
            return;
        }
        await addChunk(projectId, targetFile.fileName, targetFile.id, chunkTextBuffer);
        // Refresh chunks to get the ID
        const newChunks = await fetchChunks(projectId);
        setChunks(newChunks);
        setIsAddingChunk(false);
      }
    } catch (e: any) {
      alert(`${t('knowledge.split.actionFailed', 'Operation failed')}: ${e.message}`);
    }
  };

  // --- Derived State (Search & Stats) ---

  const filteredChunks = useMemo(() => {
    if (!searchQuery) return chunks;
    const lower = searchQuery.toLowerCase();
    return chunks.filter(c => c.content.toLowerCase().includes(lower) || c.fileName.toLowerCase().includes(lower));
  }, [chunks, searchQuery]);

  const stats = useMemo(() => {
    const totalChars = chunks.reduce((acc, c) => acc + c.content.length, 0);
    const avgChars = chunks.length > 0 ? Math.round(totalChars / chunks.length) : 0;
    return { count: chunks.length, totalChars, avgChars };
  }, [chunks]);

  const paginatedChunks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredChunks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredChunks, currentPage]);

  const totalPages = Math.ceil(filteredChunks.length / ITEMS_PER_PAGE);

  // --- Render Helpers ---

  const formatFileSize = (bytes?: number) => {
    if (typeof bytes !== 'number') return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status?: string) => {
    switch(status?.toLowerCase()) {
        case 'processed': 
        case 'success': 
            return <CheckCircle2 size={12} className="text-emerald-500" />;
        case 'failed': 
        case 'error':
            return <AlertTriangle size={12} className="text-red-500" />;
        case 'processing': 
        case 'pending':
        case 'queued':
            return <RefreshCw size={12} className="text-amber-500 animate-spin" />;
        default: 
            return <Clock size={12} className="text-slate-400" />;
    }
  };

  const renderHighlight = (text: string) => {
    if (!searchQuery) return <span className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{text}</span>;
    
    // Simple case-insensitive highlight
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return (
      <span className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
        {parts.map((part, i) => 
          part.toLowerCase() === searchQuery.toLowerCase() ? 
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-slate-900 dark:text-slate-100 rounded px-0.5">{part}</mark> : 
            part
        )}
      </span>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: Files */}
        <div className="w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col shrink-0">
          {/* Upload Area */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('knowledge.split.documents', 'Documents')}</h3>
            <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isUploading ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
               <div className="flex flex-col items-center justify-center pt-5 pb-6">
                   {isUploading ? (
                     <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
                   ) : (
                     <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
                   )}
                   <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isUploading ? t('knowledge.split.uploading', 'Uploading...') : t('knowledge.split.clickToUpload', 'Click to upload files')}
                   </p>
               </div>
               <input type="file" className="hidden" multiple onChange={handleFileUpload} disabled={isUploading} />
            </label>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {isLoadingFiles && files.length === 0 ? (
               <div className="text-center py-4 text-slate-400 text-xs">{t('knowledge.split.loadingFiles', 'Loading files...')}</div>
            ) : files.length === 0 ? (
               <div className="text-center py-8 text-slate-400 text-xs italic">{t('knowledge.split.noDocs', 'No documents uploaded')}</div>
            ) : (
               files.map(file => (
                 <div key={file.id} className="group flex items-start justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                    <div className="flex items-start gap-3 min-w-0">
                       <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded text-indigo-500 shrink-0 mt-0.5">
                           <FileText size={16} />
                       </div>
                       <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate mb-1" title={file.fileName}>{file.fileName}</div>
                          
                          <div className="flex flex-col gap-1 text-[10px] text-slate-400">
                              <div className="flex items-center gap-2">
                                  <span>{file.size ? formatFileSize(file.size) : 'Unknown size'}</span>
                                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                  <span>{file.createAt ? new Date(file.createAt).toLocaleDateString() : ''}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                  {getStatusIcon(file.status || 'unknown')}
                                  <span className="capitalize">{file.status || 'Unknown'}</span>
                              </div>
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteFileRequest(file)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all self-start"
                      title={t('knowledge.split.deleteDoc', 'Delete document')}
                    >
                      <Trash2 size={14} />
                    </button>
                 </div>
               ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Chunks */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
           
           {/* Header Stats & Toolbar */}
           <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 shrink-0">
              
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                 <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-md"><BarChart3 size={16}/></div>
                    <div>
                       <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.count}</div>
                       <div className="text-[10px] text-slate-500 uppercase font-bold">{t('knowledge.split.stats.chunks', 'Total Chunks')}</div>
                    </div>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-md"><FileText size={16}/></div>
                    <div>
                       <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.totalChars.toLocaleString()}</div>
                       <div className="text-[10px] text-slate-500 uppercase font-bold">{t('knowledge.split.stats.chars', 'Total Characters')}</div>
                    </div>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-md"><AlertCircle size={16}/></div>
                    <div>
                       <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.avgChars}</div>
                       <div className="text-[10px] text-slate-500 uppercase font-bold">{t('knowledge.split.stats.avg', 'Avg Characters')}</div>
                    </div>
                 </div>
              </div>

              {/* Actions Row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                 <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                       type="text" 
                       placeholder={t('knowledge.split.search', 'Search chunk content...')}
                       value={searchQuery}
                       onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                       className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                 </div>
                 
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                          setIsAddingChunk(true);
                          setChunkTextBuffer('');
                          setNewChunkDocId(files[0]?.id || '');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                      disabled={files.length === 0}
                    >
                       <Plus size={14} /> {t('knowledge.split.addChunk', 'Add Chunk')}
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <button 
                      onClick={handleRebuildRequest}
                      className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title={t('knowledge.split.rebuild', 'Rebuild Chunks')}
                    >
                       <RefreshCw size={18} />
                    </button>
                    <a 
                      href={getExportUrl(projectId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Export JSON"
                    >
                       <Download size={18} />
                    </a>
                 </div>
              </div>
           </div>

           {/* Chunk List */}
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingChunks && chunks.length === 0 ? (
                 <div className="flex items-center justify-center h-64 text-slate-400">{t('knowledge.split.loadingChunks', 'Loading chunks...')}</div>
              ) : paginatedChunks.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                     <Search size={48} className="mb-4 opacity-20" />
                     <p>{t('knowledge.split.noChunks', 'No chunks found')}</p>
                 </div>
              ) : (
                 paginatedChunks.map(chunk => (
                    <div key={chunk.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                       <div className="flex justify-between items-start mb-2 border-b border-slate-100 dark:border-slate-700 pb-2">
                          <div>
                             <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                <FileText size={12} /> {chunk.fileName}
                             </div>
                             <div className="text-[10px] text-slate-400 font-mono mt-0.5">{chunk.updateAt ? formatDate(chunk.updateAt) : formatDate(chunk.createAt)}</div>
                          </div>
                          <div className="flex gap-1">
                             <button 
                                onClick={() => {
                                   setEditingChunk(chunk);
                                   setChunkTextBuffer(chunk.content);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                                title={t('knowledge.split.editChunk', 'Edit Chunk')}
                             >
                                <Edit3 size={14} />
                             </button>
                             <button 
                                onClick={() => handleDeleteChunkRequest(chunk)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title={t('knowledge.split.deleteChunk', 'Delete Chunk')}
                             >
                                <Trash2 size={14} />
                             </button>
                          </div>
                       </div>
                       <div className="text-sm leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar">
                          {renderHighlight(chunk.content)}
                       </div>
                       <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-mono">{chunk.id}</span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">{chunk.size} chars</span>
                       </div>
                    </div>
                 ))
              )}
           </div>

           {/* Pagination */}
           {totalPages > 1 && (
             <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500">
                   {t('knowledge.split.pagination', { current: currentPage, total: totalPages })}
                </span>
                <div className="flex gap-2">
                   <button 
                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                     disabled={currentPage === 1}
                     className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700"
                   >
                      <ChevronLeft size={16} />
                   </button>
                   <button 
                     onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                     disabled={currentPage === totalPages}
                     className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700"
                   >
                      <ChevronRight size={16} />
                   </button>
                </div>
             </div>
           )}

        </div>
      </div>

      {/* Edit/Add Modal */}
      {(editingChunk || isAddingChunk) && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh]">
               <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">
                     {editingChunk ? t('knowledge.split.editChunk', 'Edit Chunk') : t('knowledge.split.newChunk', 'Add New Chunk')}
                  </h3>
                  <button 
                    onClick={() => { setEditingChunk(null); setIsAddingChunk(false); }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                     <X size={20} />
                  </button>
               </div>
               
               <div className="p-4 flex-1 overflow-y-auto space-y-4">
                  {isAddingChunk && (
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('knowledge.split.associate', 'Associate with Document')}</label>
                        <select 
                           value={newChunkDocId} 
                           onChange={(e) => setNewChunkDocId(e.target.value)}
                           className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        >
                           {files.map(f => (
                              <option key={f.id} value={f.id}>{f.fileName}</option>
                           ))}
                        </select>
                     </div>
                  )}
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('knowledge.split.content', 'Content')}</label>
                      <textarea 
                         value={chunkTextBuffer}
                         onChange={(e) => setChunkTextBuffer(e.target.value)}
                         className="w-full h-64 p-3 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                         placeholder={t('knowledge.split.typeContent', 'Type chunk content here...')}
                      />
                  </div>
               </div>

               <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                  <button 
                     onClick={() => { setEditingChunk(null); setIsAddingChunk(false); }}
                     className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                     {t('common.cancel', 'Cancel') || 'Cancel'}
                  </button>
                  <button 
                     onClick={handleSaveChunk}
                     disabled={!chunkTextBuffer.trim()}
                     className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                     <Save size={16} /> {t('common.save', 'Save') || 'Save'}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!confirmAction?.isOpen}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmModalAction}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        type={confirmAction?.type === 'rebuild' ? 'warning' : 'danger'}
        confirmText={confirmAction?.type === 'rebuild' ? t('knowledge.split.rebuild', 'Rebuild') : t('knowledge.split.deleteDoc', 'Delete')}
      />

    </div>
  );
};
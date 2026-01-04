import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  ChevronRight, 
  ArrowLeft, 
  Settings, 
  FileText, 
  Layers, 
  MessageSquare, 
  Network,
  Trash2,
  UploadCloud,
  FileSearch
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchProjects, deleteProject, createProject } from '../../api/rag';
import { Project } from '../../types';
import { Split } from './components/Split';
import ConfirmModal from '../components/ConfirmModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { HelpModal } from '../components/HelpModal';

interface KnowledgePageProps {
  providerId: string;
}

type StepType = 'split' | 'config' | 'build' | 'test' | 'graph';

const KnowledgePage: React.FC<KnowledgePageProps> = ({ providerId }) => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeStep, setActiveStep] = useState<StepType>('split');
  
  // Modals State
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    loadProjects();
    
    // Check if user has seen help
    const hasSeen = localStorage.getItem('has_seen_help_knowledge');
    if (!hasSeen) {
      setShowHelp(true);
      localStorage.setItem('has_seen_help_knowledge', 'true');
    }
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    const data = await fetchProjects();
    setProjects(data || []);
    setIsLoading(false);
  };

  const handleCreateProjectClick = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (name: string, description: string) => {
    const newProject = await createProject(name, description);
    setProjects([newProject, ...projects]);
    // Optional: Select the new project immediately
    // setSelectedProject(newProject); 
  };

  const handleDeleteProject = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setProjectToDelete(project);
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete) {
        try {
            await deleteProject(projectToDelete.id);
            setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
        } catch (e) {
            console.error("Failed to delete project", e);
            alert("Failed to delete project");
        } finally {
            setProjectToDelete(null);
        }
    }
  };

  // Steps definition
  const steps = [
      { id: 'split', label: t('knowledge.step.split', 'Doc Split'), icon: <FileText size={18} /> },
      { id: 'config', label: t('knowledge.step.config', 'Config'), icon: <Settings size={18} /> },
      { id: 'build', label: t('knowledge.step.build', 'Build'), icon: <Layers size={18} /> },
      { id: 'test', label: t('knowledge.step.test', 'QA Test'), icon: <MessageSquare size={18} /> },
      { id: 'graph', label: t('knowledge.step.graph', 'Graph'), icon: <Network size={18} /> },
  ];

  // 1. Project List View
  if (!selectedProject) {
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg text-violet-600 dark:text-violet-400">
                <Database size={20} />
            </div>
            <div>
                <h1 className="font-bold text-lg">{t('knowledge.title', 'Knowledge Base Management')}</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('knowledge.subtitle', 'Create and manage your RAG knowledge bases')}</p>
            </div>
          </div>
          <button 
            onClick={handleCreateProjectClick}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={16} />
            {t('knowledge.create', 'Create New')}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
           {isLoading ? (
               <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>
           ) : projects.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                   <Database size={48} className="mb-4 opacity-20" />
                   <p>{t('knowledge.empty', 'No knowledge bases found.')}</p>
                   <button onClick={handleCreateProjectClick} className="mt-4 text-violet-600 hover:underline">{t('knowledge.createOne', 'Create one now')}</button>
               </div>
           ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {projects.map(p => (
                       <div 
                         key={p.id}
                         onClick={() => setSelectedProject(p)}
                         className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 rounded-xl p-5 cursor-pointer transition-all hover:shadow-md flex flex-col h-full"
                       >
                           <div className="flex justify-between items-start mb-3">
                               <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
                                   <Database size={20} />
                               </div>
                               <button 
                                 onClick={(e) => handleDeleteProject(e, p)}
                                 className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                 title={t('knowledge.delete', 'Delete Project')}
                               >
                                   <Trash2 size={18} />
                               </button>
                           </div>
                           <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{p.name}</h3>
                           <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5em] flex-1">
                               {p.description || "No description provided."}
                           </p>
                           <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                               <div className="text-xs text-slate-400 font-mono bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded">{p.id}</div>
                               <span className="flex items-center gap-1 text-xs font-medium text-violet-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                   Manage <ChevronRight size={14} />
                               </span>
                           </div>
                       </div>
                   ))}
               </div>
           )}
        </div>

        <ConfirmModal 
            isOpen={!!projectToDelete}
            onClose={() => setProjectToDelete(null)}
            onConfirm={confirmDeleteProject}
            title={t('knowledge.deleteTitle', 'Delete Project')}
            message={t('knowledge.deleteConfirm', 'Are you sure you want to delete this project? This action cannot be undone.')}
            type="danger"
            confirmText={t('knowledge.delete', 'Delete')}
        />

        <CreateProjectModal 
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateSubmit}
        />

        {/* Help Modal */}
        <HelpModal 
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          title={t('knowledge.help.welcome', 'Knowledge Base Guide')}
          subtitle={t('knowledge.help.subtitle', 'Manage RAG context')}
          actionText={t('knowledge.help.getStarted', 'Manage Data')}
          steps={[
            {
              title: t('knowledge.help.step1.title', 'Create Project'),
              description: t('knowledge.help.step1.desc', 'Create a container for your documents.'),
              icon: <Database size={20} />,
              iconColorClass: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
            },
            {
              title: t('knowledge.help.step2.title', 'Upload & Split'),
              description: t('knowledge.help.step2.desc', 'Upload PDF/TXT/MD files. System chunks them automatically.'),
              icon: <UploadCloud size={20} />,
              iconColorClass: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            },
            {
              title: t('knowledge.help.step3.title', 'Use in Modules'),
              description: t('knowledge.help.step3.desc', 'Select this project in Chat or Writer to enable RAG.'),
              icon: <FileSearch size={20} />,
              iconColorClass: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            }
          ]}
        />
      </div>
    );
  }

  // 2. Builder View
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
       
       {/* Builder Header */}
       <div className="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 shrink-0 gap-4">
           <button 
             onClick={() => setSelectedProject(null)}
             className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
           >
               <ArrowLeft size={18} />
           </button>
           <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
           <div>
               <h2 className="font-bold text-sm">{selectedProject.name}</h2>
               <div className="text-[10px] text-slate-400 flex items-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                   Active
               </div>
           </div>
       </div>

       {/* Stepper Tabs */}
       <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4">
           <div className="flex gap-6 overflow-x-auto">
               {steps.map((step) => {
                   const isActive = activeStep === step.id;
                   return (
                       <button
                         key={step.id}
                         onClick={() => setActiveStep(step.id as StepType)}
                         className={`flex items-center gap-2 py-3 border-b-2 transition-all whitespace-nowrap px-1 ${
                             isActive 
                             ? 'border-violet-600 text-violet-600 dark:text-violet-400' 
                             : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                         }`}
                       >
                           {step.icon}
                           <span className="text-sm font-medium">{step.label}</span>
                       </button>
                   );
               })}
           </div>
       </div>

       {/* Step Content Area */}
       <div className="flex-1 overflow-hidden relative">
            {activeStep === 'split' ? (
                <Split projectId={selectedProject.id} />
            ) : (
                <div className="h-full w-full flex items-center justify-center p-8">
                     <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 text-center max-w-lg">
                          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 mx-auto">
                             {steps.find(s => s.id === activeStep)?.icon}
                          </div>
                          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">
                             {steps.find(s => s.id === activeStep)?.label} View
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                             This module is not implemented yet. Only "Doc Split" logic has been ported.
                          </p>
                          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded font-mono text-xs text-left border border-slate-200 dark:border-slate-700">
                             // TODO: Implement {activeStep}.tsx<br/>
                             ProjectId: {selectedProject.id}
                          </div>
                     </div>
                </div>
            )}
       </div>

    </div>
  );
};

export default KnowledgePage;
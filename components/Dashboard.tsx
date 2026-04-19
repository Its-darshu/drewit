import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { DrawingCanvas } from './DrawingCanvas';
import { localStorageService, ProjectFile } from '../services/localStorageService';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<ProjectFile[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveDirectory, setSaveDirectory] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if directory is already selected
  useEffect(() => {
    const dir = localStorageService.getCurrentDirectory();
    if (dir) {
      setSaveDirectory(dir);
      loadProjects();
    }
    loadStorageStats();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const projectList = await localStorageService.listProjects();
      const normalizedProjects = projectList
        .filter((project): project is ProjectFile => !!project && typeof project.name === 'string' && project.name.trim().length > 0)
        .map((project) => ({
          ...project,
          data: {
            ...(project.data || {}),
            elements: Array.isArray(project.data?.elements) ? project.data.elements : [],
          },
          lastModified: typeof project.lastModified === 'number' ? project.lastModified : Date.now(),
        }));
      setProjects(normalizedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      showStatus('error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadStorageStats = async () => {
    try {
      const stats = await localStorageService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
      setStorageStats(null);
    }
  };

  const showStatus = (type: 'success' | 'error' | 'info', text: string) => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    setStatusMessage({ type, text });
    statusTimeoutRef.current = setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSelectDirectory = async () => {
    const result = await localStorageService.requestDirectoryAccess();
    
    if (result.success) {
      setSaveDirectory(result.directory || null);
      showStatus('success', `Save location set to: ${result.directory}`);
      await loadProjects();
    } else {
      if (result.error?.includes('not supported')) {
        showStatus('info', 'Using browser storage. You can still save and load projects.');
        await loadProjects();
      } else {
        showStatus('error', result.error || 'Could not access directory');
      }
    }
  };

  const handleCreateProject = async () => {
    const trimmedName = newProjectName.trim();
    if (!trimmedName) return;
    
    setLoading(true);
    try {
      const result = await localStorageService.saveProject(trimmedName, [], {});
      
      if (result.success) {
        setNewProjectName('');
        setShowNewProjectModal(false);
        showStatus('success', `Project "${trimmedName}" created`);
        await loadProjects();
        setSelectedProject(trimmedName);
      } else {
        showStatus('error', result.error || 'Failed to create project');
      }
    } catch (error: any) {
      showStatus('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectName: string) => {
    if (!confirm(`Delete "${projectName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const result = await localStorageService.deleteProject(projectName);
      
      if (result.success) {
        showStatus('success', `Project "${projectName}" deleted`);
        await loadProjects();
      } else {
        showStatus('error', result.error || 'Failed to delete project');
      }
    } catch (error: any) {
      showStatus('error', error.message);
    }
  };

  const handleImportProject = async (file: File) => {
    const result = await localStorageService.importFromFile(file);
    
    if (result.success && result.data) {
      const projectName = file.name.replace(/\.(drewit\.)?json$/, '');
      const saveResult = await localStorageService.saveProject(
        projectName,
        result.data.elements,
        result.data.appState
      );
      
      if (saveResult.success) {
        showStatus('success', `Imported "${projectName}"`);
        await loadProjects();
        setShowImportModal(false);
      } else {
        showStatus('error', saveResult.error || 'Failed to save imported project');
      }
    } else {
      showStatus('error', result.error || 'Failed to import file');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (selectedProject) {
    return (
      <div className="h-screen flex flex-col app-shell">
        <header className="px-4 sm:px-6 py-3 border-b border-slate-200/70 bg-white/90 backdrop-blur-lg flex items-center justify-between">
          <button
            onClick={() => setSelectedProject(null)}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Projects</span>
          </button>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-600 font-semibold">{selectedProject}</span>
            {saveDirectory && (
              <span className="text-xs text-slate-500">📁 {saveDirectory}</span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-rose-600 hover:text-rose-700 font-semibold"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="flex-1">
          <DrawingCanvas projectName={selectedProject} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] uppercase text-amber-700">Workspace</p>
              <h1 className="brand-title text-3xl font-bold mt-1">SketchBoard Studio</h1>
              <p className="text-sm brand-muted mt-1">Welcome back, {user?.displayName}</p>
            </div>
            <div className="flex items-center space-x-4">
              {saveDirectory && (
                <div className="text-sm text-slate-700 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                  📁 {saveDirectory}
                </div>
              )}
              <img
                src={user?.photoURL || ''}
                alt={user?.displayName || ''}
                className="w-9 h-9 rounded-full ring-2 ring-orange-200"
              />
              <button
                onClick={handleLogout}
                className="text-sm text-rose-600 hover:text-rose-700 font-semibold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Status Messages */}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-2xl border ${
            statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
            statusMessage.type === 'error' ? 'bg-rose-50 border-rose-200' :
            'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-start">
              <div className={`flex-shrink-0 text-xl ${
                statusMessage.type === 'success' ? 'text-emerald-500' :
                statusMessage.type === 'error' ? 'text-rose-500' :
                'text-amber-500'
              }`}>
                {statusMessage.type === 'success' ? '✅' : 
                 statusMessage.type === 'error' ? '❌' : 'ℹ️'}
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm ${
                  statusMessage.type === 'success' ? 'text-emerald-900' :
                  statusMessage.type === 'error' ? 'text-rose-900' :
                  'text-amber-900'
                }`}>
                  {statusMessage.text}
                </p>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Storage Settings */}
        {!saveDirectory && localStorageService.isFileSystemAccessSupported() && (
          <div className="mb-6 p-6 glass-panel">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">💾 Save Work Locally</h3>
            <p className="text-sm brand-muted mb-4">
              Choose where to save your drawings on your computer. Your work will be saved automatically and persist between sessions.
            </p>
            <button
              onClick={handleSelectDirectory}
              className="brand-button"
            >
              Select Save Location
            </button>
          </div>
        )}

        {/* Storage Stats */}
        {storageStats && (
          <div className="mb-4 p-4 glass-panel text-sm text-slate-700">
            <div className="flex justify-between items-center">
              <span>Storage: {formatBytes(storageStats.usage)} / {formatBytes(storageStats.quota)}</span>
              <span className="text-xs font-semibold">{storageStats.percentUsed.toFixed(1)}% used</span>
            </div>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full" 
                style={{ width: `${Math.min(storageStats.percentUsed, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center mb-6">
          <div>
            <h2 className="brand-title text-2xl font-bold">Your Projects</h2>
            <p className="text-sm brand-muted mt-1">Open, manage, and continue your latest design boards.</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-semibold"
            >
              Import
            </button>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="brand-button"
            >
              New Project
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-200 border-t-orange-500 mx-auto"></div>
            <p className="mt-3 text-sm brand-muted">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-14 glass-panel">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-3 text-base font-semibold text-slate-900">No projects yet</h3>
            <p className="mt-1 text-sm brand-muted">Create your first project to start drawing.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="brand-button"
              >
                Create Project
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {projects.map((project) => (
              <div
                key={project.id || project.name}
                className="glass-panel overflow-hidden hover:-translate-y-1 transition-all duration-200 group relative"
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => setSelectedProject(project.name)}
                >
                  <div className="w-full h-32 bg-gradient-to-br from-orange-200/70 via-amber-100/80 to-sky-100 rounded-t-[22px] flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </div>
                
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.name);
                  }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-500 text-white p-1.5 rounded-full hover:bg-rose-600"
                  title="Delete project"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setSelectedProject(project.name)}
                >
                  <h3 className="text-base font-semibold text-slate-900 truncate">{project.name}</h3>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-slate-500">
                      {formatDate(project.lastModified)}
                    </p>
                    <span className="text-xs text-slate-500 font-semibold">
                      {Array.isArray(project.data?.elements) ? project.data.elements.length : 0} elements
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 w-full max-w-md">
            <h3 className="text-xl brand-title font-bold text-slate-900 mb-2">New Project</h3>
            <p className="text-sm brand-muted mb-4">Start a fresh board and switch between engines anytime.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Drawing"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 bg-white/80 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateProject()}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectName('');
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || loading}
                className="brand-button text-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 w-full max-w-md">
            <h3 className="text-xl brand-title font-bold text-slate-900 mb-2">Import Project</h3>
            <p className="text-sm brand-muted mb-4">Upload a .drewit.json file to add it to your workspace.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select a .drewit.json file
                </label>
                <input
                  type="file"
                  accept=".json,.drewit.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportProject(file);
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
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
      setProjects(projectList);
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
      <div className="h-screen flex flex-col">
        <header className="bg-white shadow-sm border-b px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => setSelectedProject(null)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Projects</span>
          </button>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">{selectedProject}</span>
            {saveDirectory && (
              <span className="text-xs text-gray-400">📁 {saveDirectory}</span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800"
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SketchBoard</h1>
              <p className="text-sm text-gray-500">Welcome back, {user?.displayName}</p>
            </div>
            <div className="flex items-center space-x-4">
              {saveDirectory && (
                <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-md">
                  📁 {saveDirectory}
                </div>
              )}
              <img
                src={user?.photoURL || ''}
                alt={user?.displayName || ''}
                className="w-8 h-8 rounded-full"
              />
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Status Messages */}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            statusMessage.type === 'success' ? 'bg-green-50 border-green-200' :
            statusMessage.type === 'error' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start">
              <div className={`flex-shrink-0 text-xl ${
                statusMessage.type === 'success' ? 'text-green-500' :
                statusMessage.type === 'error' ? 'text-red-500' :
                'text-blue-500'
              }`}>
                {statusMessage.type === 'success' ? '✅' : 
                 statusMessage.type === 'error' ? '❌' : 'ℹ️'}
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm ${
                  statusMessage.type === 'success' ? 'text-green-800' :
                  statusMessage.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
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
          <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h3 className="text-lg font-medium text-blue-900 mb-2">💾 Save Work Locally</h3>
            <p className="text-sm text-blue-700 mb-4">
              Choose where to save your drawings on your computer. Your work will be saved automatically and persist between sessions.
            </p>
            <button
              onClick={handleSelectDirectory}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Select Save Location
            </button>
          </div>
        )}

        {/* Storage Stats */}
        {storageStats && (
          <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <span>Storage: {formatBytes(storageStats.usage)} / {formatBytes(storageStats.quota)}</span>
              <span className="text-xs">{storageStats.percentUsed.toFixed(1)}% used</span>
            </div>
            <div className="mt-1 w-full bg-gray-300 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full" 
                style={{ width: `${Math.min(storageStats.percentUsed, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Your Projects</h2>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Import
            </button>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              New Project
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects yet</h3>
            <p className="mt-1 text-sm text-gray-500">Create your first project to start drawing.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Project
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow group relative"
              >
                <div 
                  className="aspect-w-16 aspect-h-10 bg-gray-100 rounded-t-lg cursor-pointer"
                  onClick={() => setSelectedProject(project.name)}
                >
                  <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
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
                  <h3 className="text-sm font-medium text-gray-900 truncate">{project.name}</h3>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      {formatDate(project.lastModified)}
                    </p>
                    <span className="text-xs text-gray-400">
                      {project.data.elements?.length || 0} elements
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">New Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Drawing"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select a .drewit.json file
                </label>
                <input
                  type="file"
                  accept=".json,.drewit.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportProject(file);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
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
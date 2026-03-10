/**
 * Local Storage Service
 * Handles saving/loading drawing data to local file system
 * Uses File System Access API for Chromium browsers, fallback to IndexedDB
 */

import { SketchElement } from '../types';

export interface ProjectFile {
  id: string;
  name: string;
  lastModified: number;
  data: {
    elements: SketchElement[];
    appState?: any;
  };
}

export interface StorageConfig {
  autoSaveInterval: number; // milliseconds
  maxBackups: number;
  fileExtension: string;
}

const DEFAULT_CONFIG: StorageConfig = {
  autoSaveInterval: 5000, // 5 seconds
  maxBackups: 5,
  fileExtension: '.drewit.json',
};

class LocalStorageService {
  private directoryHandle: FileSystemDirectoryHandle | null = null;
  private currentProjectHandle: FileSystemFileHandle | null = null;
  private autoSaveTimer: number | null = null;
  private pendingChanges: boolean = false;
  private config: StorageConfig = DEFAULT_CONFIG;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initIndexedDB().catch(err => {
      console.error('Failed to initialize IndexedDB:', err);
    });
  }

  /**
   * Check if File System Access API is supported
   */
  isFileSystemAccessSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  /**
   * Initialize IndexedDB as fallback
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DrewItDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Request directory access from user
   */
  async requestDirectoryAccess(): Promise<{
    success: boolean;
    directory?: string;
    error?: string;
  }> {
    if (!this.isFileSystemAccessSupported()) {
      return {
        success: false,
        error: 'File System Access API not supported. Using browser storage instead.',
      };
    }

    try {
      this.directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });

      // Verify permission
      const permission = await this.directoryHandle.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        const requested = await this.directoryHandle.requestPermission({ mode: 'readwrite' });
        if (requested !== 'granted') {
          return { success: false, error: 'Permission denied' };
        }
      }

      return {
        success: true,
        directory: this.directoryHandle.name,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Directory selection cancelled' };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current save directory name
   */
  getCurrentDirectory(): string | null {
    return this.directoryHandle?.name || null;
  }

  /**
   * List all project files in the directory
   */
  async listProjects(): Promise<ProjectFile[]> {
    if (this.directoryHandle) {
      return this.listProjectsFromFileSystem();
    } else {
      return this.listProjectsFromIndexedDB();
    }
  }

  /**
   * List projects from file system
   */
  private async listProjectsFromFileSystem(): Promise<ProjectFile[]> {
    if (!this.directoryHandle) return [];

    const projects: ProjectFile[] = [];

    try {
      for await (const entry of this.directoryHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith(this.config.fileExtension)) {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          const content = await file.text();
          
          try {
            const data = JSON.parse(content);
            projects.push({
              id: entry.name.replace(this.config.fileExtension, ''),
              name: entry.name.replace(this.config.fileExtension, ''),
              lastModified: file.lastModified,
              data,
            });
          } catch (parseError) {
            console.error(`Failed to parse ${entry.name}:`, parseError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to list projects:', error);
    }

    return projects.sort((a, b) => b.lastModified - a.lastModified);
  }

  /**
   * List projects from IndexedDB
   */
  private async listProjectsFromIndexedDB(): Promise<ProjectFile[]> {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result.sort((a, b) => b.lastModified - a.lastModified));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save project to file system or IndexedDB
   */
  async saveProject(
    projectName: string,
    elements: SketchElement[],
    appState?: any
  ): Promise<{ success: boolean; error?: string }> {
    const data = { elements, appState, savedAt: Date.now() };

    if (this.directoryHandle) {
      return this.saveToFileSystem(projectName, data);
    } else {
      return this.saveToIndexedDB(projectName, data);
    }
  }

  /**
   * Save to file system
   */
  private async saveToFileSystem(
    projectName: string,
    data: any
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.directoryHandle) {
      return { success: false, error: 'No directory selected' };
    }

    try {
      const fileName = projectName.endsWith(this.config.fileExtension)
        ? projectName
        : `${projectName}${this.config.fileExtension}`;

      // Create backup if file exists
      await this.createBackup(fileName);

      // Get or create file
      const fileHandle = await this.directoryHandle.getFileHandle(fileName, {
        create: true,
      });

      // Write file
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();

      this.currentProjectHandle = fileHandle;
      this.pendingChanges = false;

      return { success: true };
    } catch (error: any) {
      console.error('Save error:', error);
      
      if (error.name === 'NotAllowedError') {
        return { success: false, error: 'Permission denied' };
      }
      if (error.name === 'QuotaExceededError') {
        return { success: false, error: 'Storage quota exceeded' };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(fileName: string): Promise<void> {
    if (!this.directoryHandle) return;

    try {
      const fileHandle = await this.directoryHandle.getFileHandle(fileName, {
        create: false,
      });

      const file = await fileHandle.getFile();
      const content = await file.text();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = fileName.replace(
        this.config.fileExtension,
        `.backup.${timestamp}${this.config.fileExtension}`
      );

      const backupHandle = await this.directoryHandle.getFileHandle(backupName, {
        create: true,
      });

      const writable = await backupHandle.createWritable();
      await writable.write(content);
      await writable.close();

      // Clean old backups
      await this.cleanOldBackups(fileName);
    } catch (error) {
      // File doesn't exist yet, no backup needed
      if ((error as any).name !== 'NotFoundError') {
        console.warn('Backup creation failed:', error);
      }
    }
  }

  /**
   * Clean old backups, keeping only maxBackups
   */
  private async cleanOldBackups(fileName: string): Promise<void> {
    if (!this.directoryHandle) return;

    const baseName = fileName.replace(this.config.fileExtension, '');
    const backupPrefix = baseName + '.backup.';
    const backups: { name: string; timestamp: number }[] = [];

    try {
      for await (const entry of this.directoryHandle.values()) {
        if (
          entry.kind === 'file' &&
          entry.name.startsWith(backupPrefix)
        ) {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          backups.push({ name: entry.name, timestamp: file.lastModified });
        }
      }

      // Sort by timestamp descending
      backups.sort((a, b) => b.timestamp - a.timestamp);

      // Remove old backups
      for (let i = this.config.maxBackups; i < backups.length; i++) {
        await this.directoryHandle.removeEntry(backups[i].name);
      }
    } catch (error) {
      console.warn('Failed to clean old backups:', error);
    }
  }

  /**
   * Save to IndexedDB
   */
  private async saveToIndexedDB(
    projectName: string,
    data: any
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return { success: false, error: 'Database not available' };

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');

      const project: ProjectFile = {
        id: projectName,
        name: projectName,
        lastModified: Date.now(),
        data,
      };

      const request = store.put(project);

      request.onsuccess = () => {
        this.pendingChanges = false;
        resolve({ success: true });
      };

      request.onerror = () => {
        resolve({ success: false, error: request.error?.message });
      };
    });
  }

  /**
   * Load project from file system or IndexedDB
   */
  async loadProject(projectName: string): Promise<{
    success: boolean;
    data?: { elements: SketchElement[]; appState?: any };
    error?: string;
  }> {
    if (this.directoryHandle) {
      return this.loadFromFileSystem(projectName);
    } else {
      return this.loadFromIndexedDB(projectName);
    }
  }

  /**
   * Load from file system
   */
  private async loadFromFileSystem(projectName: string): Promise<{
    success: boolean;
    data?: { elements: SketchElement[]; appState?: any };
    error?: string;
  }> {
    if (!this.directoryHandle) {
      return { success: false, error: 'No directory selected' };
    }

    try {
      const fileName = projectName.endsWith(this.config.fileExtension)
        ? projectName
        : `${projectName}${this.config.fileExtension}`;

      const fileHandle = await this.directoryHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const content = await file.text();
      const data = JSON.parse(content);

      this.currentProjectHandle = fileHandle;

      return { success: true, data };
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return { success: false, error: 'Project not found' };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Load from IndexedDB
   */
  private async loadFromIndexedDB(projectName: string): Promise<{
    success: boolean;
    data?: { elements: SketchElement[]; appState?: any };
    error?: string;
  }> {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return { success: false, error: 'Database not available' };

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.get(projectName);

      request.onsuccess = () => {
        const project = request.result as ProjectFile;
        if (project) {
          resolve({ success: true, data: project.data });
        } else {
          resolve({ success: false, error: 'Project not found' });
        }
      };

      request.onerror = () => {
        resolve({ success: false, error: request.error?.message });
      };
    });
  }

  /**
   * Delete project
   */
  async deleteProject(projectName: string): Promise<{ success: boolean; error?: string }> {
    if (this.directoryHandle) {
      return this.deleteFromFileSystem(projectName);
    } else {
      return this.deleteFromIndexedDB(projectName);
    }
  }

  /**
   * Delete from file system
   */
  private async deleteFromFileSystem(projectName: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.directoryHandle) {
      return { success: false, error: 'No directory selected' };
    }

    try {
      const fileName = projectName.endsWith(this.config.fileExtension)
        ? projectName
        : `${projectName}${this.config.fileExtension}`;

      await this.directoryHandle.removeEntry(fileName);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete from IndexedDB
   */
  private async deleteFromIndexedDB(projectName: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return { success: false, error: 'Database not available' };

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.delete(projectName);

      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => resolve({ success: false, error: request.error?.message });
    });
  }

  /**
   * Mark that changes need to be saved
   */
  markDirty(): void {
    this.pendingChanges = true;
  }

  /**
   * Check if there are unsaved changes
   */
  hasPendingChanges(): boolean {
    return this.pendingChanges;
  }

  /**
   * Enable auto-save
   */
  enableAutoSave(
    projectName: string,
    getElements: () => SketchElement[],
    getAppState?: () => any
  ): void {
    this.disableAutoSave();

    this.autoSaveTimer = window.setInterval(async () => {
      if (this.pendingChanges) {
        const elements = getElements();
        const appState = getAppState?.();
        const result = await this.saveProject(projectName, elements, appState);
        
        if (!result.success) {
          console.error('Auto-save failed:', result.error);
        }
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * Disable auto-save
   */
  disableAutoSave(): void {
    if (this.autoSaveTimer !== null) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Export project as downloadable file (for browsers without File System Access API)
   */
  async exportAsFile(
    projectName: string,
    elements: SketchElement[],
    appState?: any
  ): Promise<void> {
    const data = { elements, appState, exportedAt: Date.now() };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}${this.config.fileExtension}`;
    a.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Import project from file upload
   */
  async importFromFile(file: File): Promise<{
    success: boolean;
    data?: { elements: SketchElement[]; appState?: any };
    error?: string;
  }> {
    try {
      const content = await file.text();
      const data = JSON.parse(content);

      if (!data.elements || !Array.isArray(data.elements)) {
        return { success: false, error: 'Invalid file format' };
      }

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    usage: number;
    quota: number;
    available: number;
    percentUsed: number;
  } | null> {
    if (!('estimate' in navigator.storage)) {
      return null;
    }

    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const available = quota - usage;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

    return { usage, quota, available, percentUsed };
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService();

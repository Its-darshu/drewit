import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Excalidraw,
  MainMenu,
  serializeAsJSON,
  WelcomeScreen,
} from '@excalidraw/excalidraw';
import type { AppState, BinaryFiles, ExcalidrawElement } from '@excalidraw/excalidraw/types';
import '@excalidraw/excalidraw/index.css';
import { localStorageService } from '../services/localStorageService';

interface ExcalidrawCanvasProps {
  projectName: string;
}

type ExcalidrawScene = {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
};

const EXCALIDRAW_TYPES = new Set([
  'selection',
  'rectangle',
  'diamond',
  'ellipse',
  'arrow',
  'line',
  'freedraw',
  'text',
  'image',
  'eraser',
  'frame',
  'magicframe',
  'embeddable',
  'laser',
]);

const asExcalidrawElements = (elements: unknown): ExcalidrawElement[] => {
  if (!Array.isArray(elements)) return [];

  return elements.filter((el): el is ExcalidrawElement => {
    if (!el || typeof el !== 'object') return false;
    const type = (el as { type?: unknown }).type;
    return typeof type === 'string' && EXCALIDRAW_TYPES.has(type);
  });
};

const buildPersistedAppState = (appState: AppState) => ({
  viewBackgroundColor: appState.viewBackgroundColor,
  gridSize: appState.gridSize,
  gridStep: appState.gridStep,
  exportBackground: appState.exportBackground,
  exportScale: appState.exportScale,
  zoom: appState.zoom,
  scrollX: appState.scrollX,
  scrollY: appState.scrollY,
  theme: appState.theme,
  editorMode: 'excalidraw',
});

export const ExcalidrawCanvas: React.FC<ExcalidrawCanvasProps> = ({ projectName }) => {
  const [initialScene, setInitialScene] = useState<ExcalidrawScene | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const saveTimerRef = useRef<number | null>(null);
  const latestSceneRef = useRef<ExcalidrawScene | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      const result = await localStorageService.loadProject(projectName);

      if (result.success && result.data) {
        const data = result.data;
        const scene: ExcalidrawScene = {
          elements: asExcalidrawElements(data.elements),
          appState: (data.appState || {}) as Partial<AppState>,
          files: (data.appState?.files || {}) as BinaryFiles,
        };
        setInitialScene(scene);
        latestSceneRef.current = scene;
        return;
      }

      const emptyScene: ExcalidrawScene = {
        elements: [],
        appState: { viewBackgroundColor: '#ffffff' },
        files: {},
      };
      setInitialScene(emptyScene);
      latestSceneRef.current = emptyScene;
    };

    loadProject();
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [projectName]);

  const persistScene = useCallback(async (scene: ExcalidrawScene) => {
    setSaveStatus('saving');

    const result = await localStorageService.saveProject(
      projectName,
      scene.elements as unknown as any[],
      {
        ...buildPersistedAppState(scene.appState as AppState),
        files: scene.files,
      },
    );

    setSaveStatus(result.success ? 'saved' : 'error');
  }, [projectName]);

  const queueSave = useCallback((scene: ExcalidrawScene) => {
    latestSceneRef.current = scene;
    localStorageService.markDirty();

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      if (latestSceneRef.current) {
        persistScene(latestSceneRef.current);
      }
    }, 700);
  }, [persistScene]);

  const handleSceneChange = useCallback((
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    queueSave({ elements, appState, files });
  }, [queueSave]);

  const handleExportSceneJSON = useCallback(() => {
    const scene = latestSceneRef.current;
    if (!scene) return;

    const payload = serializeAsJSON(
      scene.elements,
      scene.appState,
      scene.files,
      'local',
    );

    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.excalidraw`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectName]);

  const statusLabel = useMemo(() => {
    if (saveStatus === 'saving') return 'Saving...';
    if (saveStatus === 'error') return 'Save failed';
    return 'Saved';
  }, [saveStatus]);

  if (!initialScene) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white text-gray-500">
        Loading Excalidraw...
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 bg-white/95 border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
        <span className={`text-xs font-medium ${saveStatus === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
          {statusLabel}
        </span>
        <button
          onClick={handleExportSceneJSON}
          className="text-xs px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
          type="button"
        >
          Export Scene
        </button>
      </div>

      <Excalidraw
        initialData={initialScene}
        onChange={handleSceneChange}
      >
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.SaveToActiveFile />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.ClearCanvas />
        </MainMenu>
        <WelcomeScreen>
          <WelcomeScreen.Hints.MenuHint />
          <WelcomeScreen.Hints.ToolbarHint />
          <WelcomeScreen.Center>
            <WelcomeScreen.Center.Logo />
            <WelcomeScreen.Center.Heading>DrewIt + Excalidraw</WelcomeScreen.Center.Heading>
            <WelcomeScreen.Center.Menu>
              <WelcomeScreen.Center.MenuItemHelp />
            </WelcomeScreen.Center.Menu>
          </WelcomeScreen.Center>
        </WelcomeScreen>
      </Excalidraw>
    </div>
  );
};

export default ExcalidrawCanvas;
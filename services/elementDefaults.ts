import { SketchElement, Tool, Point } from '../types';
import { generateId, randomSeed } from './elementUtils';

const DEFAULT_STROKE_COLOR = '#000000';
const DEFAULT_FILL_COLOR = 'transparent';
const DEFAULT_BACKGROUND_COLOR = 'transparent';
const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_OPACITY = 1;
const DEFAULT_ROUGHNESS = 1;
const DEFAULT_FILL_STYLE = 'hachure' as const;
const DEFAULT_STROKE_STYLE = 'solid' as const;

export const createDefaultElement = (
  type: Tool,
  x1: number,
  y1: number,
  x2: number = x1,
  y2: number = y1
): Partial<SketchElement> => {
  const baseElement = {
    id: generateId(),
    x1,
    y1,
    x2,
    y2,
    strokeColor: DEFAULT_STROKE_COLOR,
    fillColor: DEFAULT_FILL_COLOR,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    strokeWidth: DEFAULT_STROKE_WIDTH,
    strokeStyle: DEFAULT_STROKE_STYLE,
    fillStyle: DEFAULT_FILL_STYLE,
    opacity: DEFAULT_OPACITY,
    roughness: DEFAULT_ROUGHNESS,
    roundness: null,
    angle: 0,
    seed: randomSeed(),
    version: 1,
    versionNonce: randomSeed(),
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
  };

  switch (type) {
    case Tool.PENCIL:
      return {
        ...baseElement,
        type: Tool.PENCIL,
        points: [{ x: 0, y: 0 }],
        lastCommittedPoint: null,
        simulatePressure: false,
      };

    case Tool.TEXT:
      return {
        ...baseElement,
        type: Tool.TEXT,
        text: '',
        fontSize: 20,
        fontFamily: 1,
        textAlign: 'left' as const,
        verticalAlign: 'top' as const,
        baseline: 0,
        containerId: null,
        originalText: '',
        lineHeight: 1.25,
      };

    case Tool.ARROW:
      return {
        ...baseElement,
        type: Tool.ARROW,
        points: [{ x: 0, y: 0 }],
        lastCommittedPoint: null,
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: 'arrow' as const,
        elbowed: false,
      };

    case Tool.IMAGE:
      return {
        ...baseElement,
        type: Tool.IMAGE,
        fileId: null,
        status: 'pending' as const,
        scale: [1, 1] as [number, number],
      };

    case Tool.FRAME:
      return {
        ...baseElement,
        type: Tool.FRAME,
        name: null,
      };

    case Tool.RECTANGLE:
    case Tool.ELLIPSE:
    case Tool.DIAMOND:
    case Tool.LINE:
      return {
        ...baseElement,
        type,
      };

    default:
      return baseElement;
  }
};

export const getDefaultAppState = () => ({
  tool: Tool.SELECTION,
  action: 'NONE' as const,
  selectedElementId: null,
  selectedElementIds: [],
  selectedGroupIds: {},
  editingGroupId: null,
  startPoint: undefined,
  resizePosition: undefined,
  gridSize: 20,
  gridModeEnabled: false,
  snapToGrid: false,
  showGrid: false,
  zoom: { value: 1 },
  scrollX: 0,
  scrollY: 0,
  viewBackgroundColor: '#ffffff',
  exportBackground: true,
  exportWithDarkMode: false,
  exportScale: 1,
  openMenu: null,
  contextMenu: null,
  showStats: false,
  pasteDialog: { shown: false, data: null },
});

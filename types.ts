export enum Tool {
  SELECTION = 'SELECTION',
  RECTANGLE = 'RECTANGLE',
  ELLIPSE = 'ELLIPSE',
  DIAMOND = 'DIAMOND',
  LINE = 'LINE',
  ARROW = 'ARROW',
  PENCIL = 'PENCIL',
  TEXT = 'TEXT',
  ERASER = 'ERASER',
  IMAGE = 'IMAGE',
  FRAME = 'FRAME',
}

export enum Action {
  NONE = 'NONE',
  DRAWING = 'DRAWING',
  MOVING = 'MOVING',
  RESIZING = 'RESIZING',
  ROTATING = 'ROTATING',
  WRITING = 'WRITING',
  PANNING = 'PANNING',
  SELECTING = 'SELECTING',
}

export type Point = {
  x: number;
  y: number;
};

export type Position = 'tl' | 'tr' | 'bl' | 'br' | 'start' | 'end' | 'inside' | 't' | 'r' | 'b' | 'l';

export type FillStyle = 'hachure' | 'cross-hatch' | 'solid' | 'zigzag';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type Arrowhead = 'arrow' | 'bar' | 'dot' | 'triangle' | null;
export type TextAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type RoundnessType = 'adaptive' | 'proportional' | 'legacy';

export type GroupId = string;

// Binding for connecting elements (e.g., arrows to shapes)
export type Binding = {
  elementId: number;
  focus: number; // 0-1 along the element edge
  gap: number;
};

// FIX: Refactored element types to create a proper discriminated union.
// This allows TypeScript to correctly narrow the type of an element based on its `type` property.
// Contains properties common to all element types.
interface ElementProperties {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  roughElement?: any;
  strokeColor: string;
  fillColor: string;
  backgroundColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fillStyle: FillStyle;
  opacity: number;
  roughness: number;
  roundness: { type: RoundnessType; value?: number } | null;
  angle: number;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  groupIds: GroupId[];
  frameId: number | null;
  boundElements: { id: number; type: 'arrow' | 'text' }[] | null;
  updated: number;
  link: string | null;
  locked: boolean;
}

// Represents generic shapes that don't have special properties.
export interface BaseElement extends ElementProperties {
  type: Exclude<Tool, Tool.SELECTION | Tool.PENCIL | Tool.TEXT | Tool.ERASER | Tool.IMAGE | Tool.ARROW>;
}

export interface PencilElement extends ElementProperties {
    type: Tool.PENCIL;
    points: Point[];
    lastCommittedPoint: Point | null;
    simulatePressure: boolean;
}

export interface TextElement extends ElementProperties {
    type: Tool.TEXT;
    text: string;
    fontSize: number;
    fontFamily: number;
    textAlign: TextAlign;
    verticalAlign: VerticalAlign;
    baseline: number;
    containerId: number | null;
    originalText: string;
    lineHeight: number;
}

export interface ArrowElement extends ElementProperties {
    type: Tool.ARROW;
    points: Point[];
    lastCommittedPoint: Point | null;
    startBinding: Binding | null;
    endBinding: Binding | null;
    startArrowhead: Arrowhead;
    endArrowhead: Arrowhead;
    elbowed: boolean;
}

export interface ImageElement extends ElementProperties {
    type: Tool.IMAGE;
    fileId: string | null;
    status: 'pending' | 'saved' | 'error';
    scale: [number, number];
}

export interface FrameElement extends ElementProperties {
    type: Tool.FRAME;
    name: string | null;
}

export type SketchElement = BaseElement | PencilElement | TextElement | ArrowElement | ImageElement | FrameElement;

export interface AppState {
    tool: Tool;
    action: Action;
    selectedElementId: number | null;
    selectedElementIds: number[];
    selectedGroupIds: Record<GroupId, boolean>;
    editingGroupId: GroupId | null;
    startPoint?: Point;
    resizePosition?: Position;
    gridSize: number | null;
    gridModeEnabled: boolean;
    snapToGrid: boolean;
    showGrid: boolean;
    zoom: { value: number };
    scrollX: number;
    scrollY: number;
    viewBackgroundColor: string;
    exportBackground: boolean;
    exportWithDarkMode: boolean;
    exportScale: number;
    openMenu: string | null;
    contextMenu: { top: number; left: number } | null;
    showStats: boolean;
    pasteDialog: { shown: boolean; data: any | null };
}

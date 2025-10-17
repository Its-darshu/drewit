
export enum Tool {
  SELECTION = 'SELECTION',
  RECTANGLE = 'RECTANGLE',
  ELLIPSE = 'ELLIPSE',
  LINE = 'LINE',
  ARROW = 'ARROW',
  PENCIL = 'PENCIL',
  TEXT = 'TEXT',
}

export enum Action {
  NONE = 'NONE',
  DRAWING = 'DRAWING',
  MOVING = 'MOVING',
  RESIZING = 'RESIZING',
  WRITING = 'WRITING',
  PANNING = 'PANNING',
}

export type Point = {
  x: number;
  y: number;
};

export type Position = 'tl' | 'tr' | 'bl' | 'br' | 'start' | 'end' | 'inside';

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
}

// Represents generic shapes that don't have special properties.
export interface BaseElement extends ElementProperties {
  type: Exclude<Tool, Tool.SELECTION | Tool.PENCIL | Tool.TEXT>;
}

export interface PencilElement extends ElementProperties {
    type: Tool.PENCIL;
    points: Point[];
}

export interface TextElement extends ElementProperties {
    type: Tool.TEXT;
    text?: string;
    fontSize?: number;
}

export type SketchElement = BaseElement | PencilElement | TextElement;

export interface AppState {
    tool: Tool;
    action: Action;
    selectedElementId: number | null;
    startPoint?: Point;
    resizePosition?: Position;
}

/**
 * Action System - Modular command architecture inspired by Excalidraw.
 * Each action is a self-contained unit with keyboard shortcut, predicate, and handler.
 */

import { SketchElement, Tool, Action as ActionState } from '../../types';

// ─── Types ──────────────────────────────────────────────────────────

export interface AppContext {
  elements: readonly SketchElement[];
  selectedElementIds: number[];
  tool: Tool;
  action: ActionState;
  zoom: number;
  panOffset: { x: number; y: number };
  clipboard: SketchElement[];
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

export interface ActionResult {
  elements?: SketchElement[];
  selectedElementIds?: number[];
  tool?: Tool;
  action?: ActionState;
  zoom?: number;
  panOffset?: { x: number; y: number };
  clipboard?: SketchElement[];
  showGrid?: boolean;
  snapToGrid?: boolean;
}

export interface ActionDefinition {
  name: string;
  label: string;
  icon?: string;
  shortcut?: string;
  // Whether this action is available in current context
  predicate: (ctx: AppContext) => boolean;
  // Execute the action
  perform: (ctx: AppContext, data?: any) => ActionResult;
}

// ─── Action Registry ────────────────────────────────────────────────

class ActionManager {
  private actions = new Map<string, ActionDefinition>();

  register(action: ActionDefinition): void {
    this.actions.set(action.name, action);
  }

  registerAll(actions: ActionDefinition[]): void {
    actions.forEach(a => this.register(a));
  }

  get(name: string): ActionDefinition | undefined {
    return this.actions.get(name);
  }

  getAll(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  getAvailable(ctx: AppContext): ActionDefinition[] {
    return this.getAll().filter(a => a.predicate(ctx));
  }

  execute(name: string, ctx: AppContext, data?: any): ActionResult | null {
    const action = this.actions.get(name);
    if (!action || !action.predicate(ctx)) return null;
    return action.perform(ctx, data);
  }

  // Find action by keyboard shortcut
  findByShortcut(key: string, ctrlKey: boolean, shiftKey: boolean, altKey: boolean): ActionDefinition | null {
    const shortcut = buildShortcutString(key, ctrlKey, shiftKey, altKey);
    for (const action of this.actions.values()) {
      if (action.shortcut === shortcut) {
        return action;
      }
    }
    return null;
  }
}

function buildShortcutString(key: string, ctrl: boolean, shift: boolean, alt: boolean): string {
  const parts: string[] = [];
  if (ctrl) parts.push('Ctrl');
  if (shift) parts.push('Shift');
  if (alt) parts.push('Alt');
  parts.push(key.length === 1 ? key.toUpperCase() : key);
  return parts.join('+');
}

// ─── Singleton ──────────────────────────────────────────────────────
export const actionManager = new ActionManager();

// ─── Built-in Actions ───────────────────────────────────────────────

import { moveElement } from '../drawingService';
import { duplicateElement, bringToFront, sendToBack, bringForward, sendBackward } from '../elementUtils';

// Delete selected elements
actionManager.register({
  name: 'deleteSelected',
  label: 'Delete',
  icon: 'trash',
  shortcut: 'Delete',
  predicate: ctx => ctx.selectedElementIds.length > 0,
  perform: ctx => ({
    elements: ctx.elements.filter(el => !ctx.selectedElementIds.includes(el.id)) as SketchElement[],
    selectedElementIds: [],
  }),
});

// Select all
actionManager.register({
  name: 'selectAll',
  label: 'Select All',
  shortcut: 'Ctrl+A',
  predicate: ctx => ctx.elements.length > 0,
  perform: ctx => ({
    selectedElementIds: ctx.elements.map(el => el.id),
  }),
});

// Duplicate
actionManager.register({
  name: 'duplicate',
  label: 'Duplicate',
  shortcut: 'Ctrl+D',
  predicate: ctx => ctx.selectedElementIds.length > 0,
  perform: ctx => {
    const selected = ctx.elements.filter(el => ctx.selectedElementIds.includes(el.id));
    const duplicated = selected.map(el => duplicateElement(el, { x: 20, y: 20 }));
    return {
      elements: [...ctx.elements, ...duplicated] as SketchElement[],
      selectedElementIds: duplicated.map(el => el.id),
    };
  },
});

// Bring to front
actionManager.register({
  name: 'bringToFront',
  label: 'Bring to Front',
  shortcut: 'Ctrl+]',
  predicate: ctx => ctx.selectedElementIds.length > 0,
  perform: ctx => ({
    elements: bringToFront(ctx.elements as SketchElement[], ctx.selectedElementIds),
  }),
});

// Send to back
actionManager.register({
  name: 'sendToBack',
  label: 'Send to Back',
  shortcut: 'Ctrl+[',
  predicate: ctx => ctx.selectedElementIds.length > 0,
  perform: ctx => ({
    elements: sendToBack(ctx.elements as SketchElement[], ctx.selectedElementIds),
  }),
});

// Bring forward
actionManager.register({
  name: 'bringForward',
  label: 'Bring Forward',
  predicate: ctx => ctx.selectedElementIds.length === 1,
  perform: ctx => ({
    elements: bringForward(ctx.elements as SketchElement[], ctx.selectedElementIds),
  }),
});

// Send backward
actionManager.register({
  name: 'sendBackward',
  label: 'Send Backward',
  predicate: ctx => ctx.selectedElementIds.length === 1,
  perform: ctx => ({
    elements: sendBackward(ctx.elements as SketchElement[], ctx.selectedElementIds),
  }),
});

// Zoom in
actionManager.register({
  name: 'zoomIn',
  label: 'Zoom In',
  shortcut: 'Ctrl+=',
  predicate: () => true,
  perform: ctx => ({
    zoom: Math.min(ctx.zoom * 1.2, 10),
  }),
});

// Zoom out
actionManager.register({
  name: 'zoomOut',
  label: 'Zoom Out',
  shortcut: 'Ctrl+-',
  predicate: () => true,
  perform: ctx => ({
    zoom: Math.max(ctx.zoom / 1.2, 0.1),
  }),
});

// Zoom reset
actionManager.register({
  name: 'zoomReset',
  label: 'Reset Zoom',
  shortcut: 'Ctrl+0',
  predicate: () => true,
  perform: () => ({
    zoom: 1,
    panOffset: { x: 0, y: 0 },
  }),
});

// Toggle grid
actionManager.register({
  name: 'toggleGrid',
  label: 'Toggle Grid',
  shortcut: "Ctrl+'",
  predicate: () => true,
  perform: ctx => ({
    showGrid: !ctx.showGrid,
  }),
});

// Toggle snap to grid
actionManager.register({
  name: 'toggleSnapToGrid',
  label: 'Toggle Snap',
  predicate: () => true,
  perform: ctx => ({
    snapToGrid: !ctx.snapToGrid,
  }),
});

// Tool selection actions
const toolActions: [string, string, Tool][] = [
  ['V', 'Select', Tool.SELECTION],
  ['R', 'Rectangle', Tool.RECTANGLE],
  ['O', 'Ellipse', Tool.ELLIPSE],
  ['D', 'Diamond', Tool.DIAMOND],
  ['L', 'Line', Tool.LINE],
  ['A', 'Arrow', Tool.ARROW],
  ['P', 'Pencil', Tool.PENCIL],
  ['T', 'Text', Tool.TEXT],
  ['E', 'Eraser', Tool.ERASER],
];

toolActions.forEach(([key, label, tool]) => {
  actionManager.register({
    name: `tool_${tool}`,
    label,
    shortcut: key,
    predicate: () => true,
    perform: () => ({ tool }),
  });
});

// Zoom to fit
actionManager.register({
  name: 'zoomToFit',
  label: 'Zoom to Fit',
  shortcut: 'Ctrl+Shift+1',
  predicate: ctx => ctx.elements.length > 0,
  perform: ctx => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ctx.elements.forEach(el => {
      minX = Math.min(minX, Math.min(el.x1, el.x2));
      minY = Math.min(minY, Math.min(el.y1, el.y2));
      maxX = Math.max(maxX, Math.max(el.x1, el.x2));
      maxY = Math.max(maxY, Math.max(el.y1, el.y2));
    });

    const padding = 50;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const viewW = ctx.viewportWidth || window.innerWidth;
    const viewH = ctx.viewportHeight || window.innerHeight;
    const zoom = Math.min(viewW / contentW, viewH / contentH, 1);
    const panX = (viewW - contentW * zoom) / 2 - (minX - padding) * zoom;
    const panY = (viewH - contentH * zoom) / 2 - (minY - padding) * zoom;

    return {
      zoom,
      panOffset: { x: panX, y: panY },
    };
  },
});

export default actionManager;

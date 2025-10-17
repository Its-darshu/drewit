import { RoughCanvas } from 'roughjs/bin/canvas';
import { SketchElement, Tool, Point, Position } from '../types';

export const createElement = (id: number, x1: number, y1: number, x2: number, y2: number, tool: Tool): SketchElement | null => {
  let baseElement = { id, x1, y1, x2, y2 };
  switch (tool) {
    case Tool.RECTANGLE:
      return { ...baseElement, type: Tool.RECTANGLE };
    case Tool.ELLIPSE:
      return { ...baseElement, type: Tool.ELLIPSE };
    case Tool.LINE:
      return { ...baseElement, type: Tool.LINE };
    case Tool.ARROW:
      return { ...baseElement, type: Tool.ARROW };
    case Tool.PENCIL:
      return { ...baseElement, type: Tool.PENCIL, points: [{ x: x1, y: y1 }] };
    case Tool.TEXT:
      return { ...baseElement, type: Tool.TEXT, text: '', fontSize: 24 };
    default:
      return null;
  }
};

const drawArrow = (roughCanvas: RoughCanvas, x1: number, y1: number, x2: number, y2: number, seed: number) => {
    const arrowLength = 20;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const x3 = x2 - arrowLength * Math.cos(angle - Math.PI / 6);
    const y3 = y2 - arrowLength * Math.sin(angle - Math.PI / 6);
    const x4 = x2 - arrowLength * Math.cos(angle + Math.PI / 6);
    const y4 = y2 - arrowLength * Math.sin(angle + Math.PI / 6);
    
    const options = { seed };

    roughCanvas.line(x1, y1, x2, y2, options);
    roughCanvas.line(x2, y2, x3, y3, options);
    roughCanvas.line(x2, y2, x4, y4, options);
}

export const drawElement = (roughCanvas: RoughCanvas, context: CanvasRenderingContext2D, element: SketchElement) => {
  const { id } = element;
  // Use the element's unique ID as a seed to prevent vibration
  const options = { seed: id };
  
  switch (element.type) {
    case Tool.RECTANGLE:
      roughCanvas.rectangle(element.x1, element.y1, element.x2 - element.x1, element.y2 - element.y1, options);
      break;
    case Tool.ELLIPSE:
      roughCanvas.ellipse(element.x1 + (element.x2 - element.x1) / 2, element.y1 + (element.y2 - element.y1) / 2, element.x2 - element.x1, element.y2 - element.y1, options);
      break;
    case Tool.LINE:
      roughCanvas.line(element.x1, element.y1, element.x2, element.y2, options);
      break;
    case Tool.ARROW:
      drawArrow(roughCanvas, element.x1, element.y1, element.x2, element.y2, id);
      break;
    case Tool.PENCIL:
      if (element.points && element.points.length > 0) {
        roughCanvas.linearPath(element.points.map(p => [p.x, p.y]), options);
      }
      break;
    case Tool.TEXT:
       if (element.text) {
        context.textBaseline = 'top';
        context.fillStyle = '#000';
        context.font = `${element.fontSize}px Virgil`;
        context.fillText(element.text, element.x1, element.y1);
       }
      break;
    default:
      // This should never happen for BaseElement types
      const exhaustiveCheck: never = element;
      throw new Error(`Type not recognised: ${exhaustiveCheck}`);
  }
};

export const getResizedCoordinates = (element: SketchElement): [number, number, number, number] => {
  const { x1, y1, x2, y2 } = element;

  if (element.type === Tool.PENCIL) {
    if (!element.points || element.points.length === 0) {
      return [x1, y1, x2, y2];
    }
    const { minX, minY, maxX, maxY } = element.points.reduce(
      (acc, p) => ({
        minX: Math.min(acc.minX, p.x),
        minY: Math.min(acc.minY, p.y),
        maxX: Math.max(acc.maxX, p.x),
        maxY: Math.max(acc.maxY, p.y),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    );
    return [minX, minY, maxX, maxY];
  }

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  return [minX, minY, maxX, maxY];
};

export const adjustElementCoordinates = (element: SketchElement): SketchElement => {
    const { type, x1, y1, x2, y2 } = element;
    if (type === Tool.RECTANGLE || type === Tool.ELLIPSE) {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      return { ...element, x1: minX, y1: minY, x2: maxX, y2: maxY };
    }
    return element;
};

const nearPoint = (x: number, y: number, x1: number, y1: number, name: Position) => {
    return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name : null;
};

const onLine = (x1: number, y1: number, x2: number, y2: number, x: number, y: number, maxDistance = 1) => {
    const a = { x: x1, y: y1 };
    const b = { x: x2, y: y2 };
    const c = { x, y };
    const offset = distance(a, b) - (distance(a, c) + distance(b, c));
    return Math.abs(offset) < maxDistance;
};

const distance = (a: Point, b: Point) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

export const isPointNearElement = (x: number, y: number, element: SketchElement): { position: Position | null } => {
    const { x1, y1, x2, y2 } = element;
    const [minX, minY, maxX, maxY] = getResizedCoordinates(element);

    switch (element.type) {
        case Tool.RECTANGLE:
        case Tool.ELLIPSE: {
            const topLeft = nearPoint(x, y, minX, minY, "tl");
            const topRight = nearPoint(x, y, maxX, minY, "tr");
            const bottomLeft = nearPoint(x, y, minX, maxY, "bl");
            const bottomRight = nearPoint(x, y, maxX, maxY, "br");
            const inside = x >= minX && x <= maxX && y >= minY && y <= maxY ? "inside" : null;
            return { position: topLeft || topRight || bottomLeft || bottomRight || inside };
        }
        case Tool.LINE:
        case Tool.ARROW: {
            const on = onLine(x1, y1, x2, y2, x, y);
            const start = nearPoint(x, y, x1, y1, "start");
            const end = nearPoint(x, y, x2, y2, "end");
            return { position: start || end || (on ? "inside" : null) };
        }
        case Tool.PENCIL: {
            if (!element.points || element.points.length < 2) return { position: null };
            const betweenAnyPoint = element.points.some((point, index) => {
                const nextPoint = element.points[index + 1];
                if (!nextPoint) return false;
                return onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y, 5);
            });
            return { position: betweenAnyPoint ? "inside" : null };
        }
        case Tool.TEXT: {
            return { position: x >= minX && x <= maxX && y >= minY && y <= maxY ? "inside" : null };
        }
        default:
            return { position: null };
    }
};

export const getElementAtPosition = (x: number, y: number, elements: readonly SketchElement[]): SketchElement | undefined => {
    return [...elements]
        .reverse()
        .find(element => isPointNearElement(x, y, element).position !== null);
};

export const getCursorForPosition = (position: Position | null): string => {
    switch (position) {
        case "tl":
        case "br":
            return "nwse-resize";
        case "tr":
        case "bl":
            return "nesw-resize";
        case "start":
        case "end":
            return "pointer";
        default:
            return "move";
    }
};

export const resizeElement = (x: number, y: number, position: Position, element: SketchElement) => {
    const { x1, y1 } = element;
    switch (position) {
        case 'tl':
        case 'start':
            return { x1: x, y1: y };
        case 'tr':
            return { x1: x1, y1: y, x2: x };
        case 'bl':
            return { x1: x, y1: y1, y2: y };
        case 'br':
        case 'end':
            return { x2: x, y2: y };
        default:
            return null;
    }
};
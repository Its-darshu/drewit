import { SketchElement, Point, GroupId, Binding } from '../types';

// Generate unique IDs
export const generateId = (): number => {
  return Date.now() + Math.random();
};

// Generate random seed for roughjs
export const randomSeed = (): number => {
  return Math.floor(Math.random() * 2 ** 31);
};

// Get element bounds
export const getElementBounds = (element: SketchElement): { x1: number; y1: number; x2: number; y2: number; width: number; height: number } => {
  const x1 = Math.min(element.x1, element.x2);
  const y1 = Math.min(element.y1, element.y2);
  const x2 = Math.max(element.x1, element.x2);
  const y2 = Math.max(element.y1, element.y2);
  
  return {
    x1,
    y1,
    x2,
    y2,
    width: x2 - x1,
    height: y2 - y1,
  };
};

// Get element center
export const getElementCenter = (element: SketchElement): Point => {
  const bounds = getElementBounds(element);
  return {
    x: bounds.x1 + bounds.width / 2,
    y: bounds.y1 + bounds.height / 2,
  };
};

// Check if point is inside element
export const isPointInElement = (point: Point, element: SketchElement): boolean => {
  const bounds = getElementBounds(element);
  return (
    point.x >= bounds.x1 &&
    point.x <= bounds.x2 &&
    point.y >= bounds.y1 &&
    point.y <= bounds.y2
  );
};

// Get elements in selection box
export const getElementsInSelection = (
  elements: SketchElement[],
  x1: number,
  y1: number,
  x2: number,
  y2: number
): SketchElement[] => {
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);

  return elements.filter(element => {
    if (element.isDeleted) return false;
    const bounds = getElementBounds(element);
    return (
      bounds.x1 >= minX &&
      bounds.y1 >= minY &&
      bounds.x2 <= maxX &&
      bounds.y2 <= maxY
    );
  });
};

// Get selection bounds for multiple elements
export const getSelectionBounds = (elements: SketchElement[]): { x1: number; y1: number; x2: number; y2: number; width: number; height: number } | null => {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach(element => {
    const bounds = getElementBounds(element);
    minX = Math.min(minX, bounds.x1);
    minY = Math.min(minY, bounds.y1);
    maxX = Math.max(maxX, bounds.x2);
    maxY = Math.max(maxY, bounds.y2);
  });

  return {
    x1: minX,
    y1: minY,
    x2: maxX,
    y2: maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

// Group operations
export const getNewGroupId = (): GroupId => {
  return `group_${Date.now()}_${Math.random()}`;
};

export const addToGroup = (element: SketchElement, groupId: GroupId): SketchElement => {
  return {
    ...element,
    groupIds: [...element.groupIds, groupId],
  };
};

export const removeFromGroup = (element: SketchElement, groupId: GroupId): SketchElement => {
  return {
    ...element,
    groupIds: element.groupIds.filter(id => id !== groupId),
  };
};

export const getElementsInGroup = (elements: SketchElement[], groupId: GroupId): SketchElement[] => {
  return elements.filter(el => el.groupIds.includes(groupId));
};

// Alignment operations
export const alignLeft = (elements: SketchElement[]): SketchElement[] => {
  if (elements.length < 2) return elements;
  const bounds = elements.map(el => getElementBounds(el));
  const minX = Math.min(...bounds.map(b => b.x1));
  
  return elements.map((el, i) => {
    const offset = minX - bounds[i].x1;
    return {
      ...el,
      x1: el.x1 + offset,
      x2: el.x2 + offset,
    };
  });
};

export const alignRight = (elements: SketchElement[]): SketchElement[] => {
  if (elements.length < 2) return elements;
  const bounds = elements.map(el => getElementBounds(el));
  const maxX = Math.max(...bounds.map(b => b.x2));
  
  return elements.map((el, i) => {
    const offset = maxX - bounds[i].x2;
    return {
      ...el,
      x1: el.x1 + offset,
      x2: el.x2 + offset,
    };
  });
};

export const alignTop = (elements: SketchElement[]): SketchElement[] => {
  if (elements.length < 2) return elements;
  const bounds = elements.map(el => getElementBounds(el));
  const minY = Math.min(...bounds.map(b => b.y1));
  
  return elements.map((el, i) => {
    const offset = minY - bounds[i].y1;
    return {
      ...el,
      y1: el.y1 + offset,
      y2: el.y2 + offset,
    };
  });
};

export const alignBottom = (elements: SketchElement[]): SketchElement[] => {
  if (elements.length < 2) return elements;
  const bounds = elements.map(el => getElementBounds(el));
  const maxY = Math.max(...bounds.map(b => b.y2));
  
  return elements.map((el, i) => {
    const offset = maxY - bounds[i].y2;
    return {
      ...el,
      y1: el.y1 + offset,
      y2: el.y2 + offset,
    };
  });
};

export const alignCenterHorizontal = (elements: SketchElement[]): SketchElement[] => {
  if (elements.length < 2) return elements;
  const bounds = elements.map(el => getElementBounds(el));
  const centers = bounds.map(b => b.x1 + b.width / 2);
  const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
  
  return elements.map((el, i) => {
    const offset = avgCenter - (bounds[i].x1 + bounds[i].width / 2);
    return {
      ...el,
      x1: el.x1 + offset,
      x2: el.x2 + offset,
    };
  });
};

export const alignCenterVertical = (elements: SketchElement[]): SketchElement[] => {
  if (elements.length < 2) return elements;
  const bounds = elements.map(el => getElementBounds(el));
  const centers = bounds.map(b => b.y1 + b.height / 2);
  const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
  
  return elements.map((el, i) => {
    const offset = avgCenter - (bounds[i].y1 + bounds[i].height / 2);
    return {
      ...el,
      y1: el.y1 + offset,
      y2: el.y2 + offset,
    };
  });
};

// Distribution operations
export const distributeHorizontally = (elements: SketchElement[]): SketchElement[] => {
  if (elements.length < 3) return elements;
  
  const sorted = [...elements].sort((a, b) => {
    const boundsA = getElementBounds(a);
    const boundsB = getElementBounds(b);
    return boundsA.x1 - boundsB.x1;
  });
  
  const bounds = sorted.map(el => getElementBounds(el));
  const totalWidth = bounds[bounds.length - 1].x2 - bounds[0].x1;
  const elementsWidth = bounds.reduce((sum, b) => sum + b.width, 0);
  const gap = (totalWidth - elementsWidth) / (sorted.length - 1);
  
  let currentX = bounds[0].x1;
  
  return sorted.map((el, i) => {
    if (i === 0 || i === sorted.length - 1) return el;
    
    currentX += bounds[i - 1].width + gap;
    const offset = currentX - bounds[i].x1;
    
    return {
      ...el,
      x1: el.x1 + offset,
      x2: el.x2 + offset,
    };
  });
};

export const distributeVertically = (elements: SketchElement[]): SketchElement[] => {
  if (elements.length < 3) return elements;
  
  const sorted = [...elements].sort((a, b) => {
    const boundsA = getElementBounds(a);
    const boundsB = getElementBounds(b);
    return boundsA.y1 - boundsB.y1;
  });
  
  const bounds = sorted.map(el => getElementBounds(el));
  const totalHeight = bounds[bounds.length - 1].y2 - bounds[0].y1;
  const elementsHeight = bounds.reduce((sum, b) => sum + b.height, 0);
  const gap = (totalHeight - elementsHeight) / (sorted.length - 1);
  
  let currentY = bounds[0].y1;
  
  return sorted.map((el, i) => {
    if (i === 0 || i === sorted.length - 1) return el;
    
    currentY += bounds[i - 1].height + gap;
    const offset = currentY - bounds[i].y1;
    
    return {
      ...el,
      y1: el.y1 + offset,
      y2: el.y2 + offset,
    };
  });
};

// Grid snapping
export const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

export const snapPointToGrid = (point: Point, gridSize: number): Point => {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  };
};

// Z-index operations
export const bringToFront = (elements: SketchElement[], targetIds: number[]): SketchElement[] => {
  const targetElements = elements.filter(el => targetIds.includes(el.id));
  const otherElements = elements.filter(el => !targetIds.includes(el.id));
  return [...otherElements, ...targetElements];
};

export const sendToBack = (elements: SketchElement[], targetIds: number[]): SketchElement[] => {
  const targetElements = elements.filter(el => targetIds.includes(el.id));
  const otherElements = elements.filter(el => !targetIds.includes(el.id));
  return [...targetElements, ...otherElements];
};

export const bringForward = (elements: SketchElement[], targetIds: number[]): SketchElement[] => {
  const result = [...elements];
  targetIds.forEach(id => {
    const index = result.findIndex(el => el.id === id);
    if (index < result.length - 1 && index !== -1) {
      [result[index], result[index + 1]] = [result[index + 1], result[index]];
    }
  });
  return result;
};

export const sendBackward = (elements: SketchElement[], targetIds: number[]): SketchElement[] => {
  const result = [...elements];
  targetIds.forEach(id => {
    const index = result.findIndex(el => el.id === id);
    if (index > 0) {
      [result[index], result[index - 1]] = [result[index - 1], result[index]];
    }
  });
  return result;
};

// Duplicate elements
export const duplicateElement = (element: SketchElement, offset: Point = { x: 20, y: 20 }): SketchElement => {
  return {
    ...element,
    id: generateId(),
    x1: element.x1 + offset.x,
    y1: element.y1 + offset.y,
    x2: element.x2 + offset.x,
    y2: element.y2 + offset.y,
    version: 1,
    versionNonce: randomSeed(),
    updated: Date.now(),
  };
};

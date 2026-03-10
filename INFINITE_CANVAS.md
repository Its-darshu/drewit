# Infinite Canvas Implementation

## Overview

The drawing application now features an **infinite canvas** with pan and zoom capabilities, allowing users to draw anywhere on an unlimited virtual workspace.

## Features

### 1. Pan (Move the Canvas)
- **Spacebar + Drag**: Hold spacebar and drag to pan around the canvas
- **Visual Feedback**: Cursor changes to "grab" when spacebar is held, "grabbing" while dragging
- **Pan State**: The canvas remembers your pan position as you work

### 2. Zoom
- **Mouse Wheel**: Ctrl/Cmd + Scroll to zoom in/out
- **Keyboard Shortcuts**:
  - `Ctrl/Cmd + =` or `Ctrl/Cmd + +` - Zoom in
  - `Ctrl/Cmd + -` - Zoom out
  - `Ctrl/Cmd + 0` - Reset zoom and pan to default (100% zoom, centered)
- **Zoom Range**: 10% to 500%
- **Smart Zoom**: When using mouse wheel, zooms towards the mouse cursor position

### 3. Viewport Information
- **Bottom-left display** shows:
  - Current zoom percentage
  - Pan offset coordinates
  - Number of visible elements / total elements

### 4. Infinite Grid
- **Visual reference**: Grid lines help with alignment and positioning
- **Origin axes**: Bold lines at (0, 0) show the canvas origin
- **Adaptive grid**: Grid transforms with zoom level for consistent visual density

## Technical Implementation

### Coordinate Transformation

The infinite canvas uses a coordinate transformation system:

```typescript
// Convert screen coordinates to canvas coordinates
screenToCanvas(screenX, screenY) → { x, y }

// Convert canvas coordinates to screen coordinates  
canvasToScreen(canvasX, canvasY) → { x, y }
```

### State Management

Key state variables:
- `zoom`: Current zoom level (1 = 100%)
- `panOffset`: Canvas offset in pixels { x, y }
- `isPanning`: Whether currently panning
- `panStart`: Starting position for pan gesture
- `spacePressed`: Whether spacebar is held

### Rendering Pipeline

1. **Transform**: Apply pan offset and zoom scale to rendering context
2. **Cull**: Only render elements visible in current viewport
3. **Draw**: Render visible elements with RoughJS
4. **Grid**: Draw infinite grid with origin axes
5. **Info**: Display viewport information

### Viewport Culling

For performance, only elements within the visible viewport are rendered:

```typescript
isElementVisible(element, canvas) → boolean
```

This prevents unnecessary rendering of thousands of off-screen elements.

## Usage Tips

### Getting Started
1. Draw elements normally with any tool
2. Hold **Spacebar** to enable pan mode
3. Drag to move around your canvas
4. Use **Ctrl + Mouse Wheel** to zoom

### Best Practices
- Use zoom to work on fine details
- Pan to organize elements across the workspace
- Reset zoom/pan (Ctrl+0) to return to origin
- Check viewport info to see how many elements are loaded

### Keyboard Shortcuts Summary

| Action | Shortcut |
|--------|----------|
| Pan Mode | Hold Spacebar + Drag |
| Zoom In | Ctrl/Cmd + = |
| Zoom Out | Ctrl/Cmd + - |
| Reset View | Ctrl/Cmd + 0 |
| Zoom with Wheel | Ctrl/Cmd + Scroll |

## Performance Considerations

### Viewport Culling
- Only visible elements are rendered
- Dramatically improves performance with large drawings
- No slowdown even with thousands of elements

### Efficient Transformations
- Canvas transformations (translate/scale) are hardware-accelerated
- Grid rendering is optimized for current zoom level
- Coordinate transformation is O(1) complexity

### Memory Usage
- All elements remain in memory regardless of viewport
- Auto-save includes all elements (not viewport-specific)
- Viewport info shows element count for awareness

## Implementation Details

### Files Modified
- **components/DrawingCanvas.tsx**: Main implementation
  - Added state variables for zoom/pan
  - Implemented coordinate transformation functions
  - Updated rendering pipeline with viewport culling
  - Added grid rendering
  - Integrated pan/zoom controls

### Key Functions

#### Coordinate Transformation
```typescript
const screenToCanvas = (screenX: number, screenY: number) => {
  return {
    x: (screenX - panOffset.x) / zoom,
    y: (screenY - panOffset.y) / zoom,
  };
};

const canvasToScreen = (canvasX: number, canvasY: number) => {
  return {
    x: canvasX * zoom + panOffset.x,
    y: canvasY * zoom + panOffset.y,
  };
};
```

#### Viewport Culling
```typescript
const isElementVisible = (element: Element, canvas: HTMLCanvasElement) => {
  const padding = 100; // Extra padding for smooth scrolling
  const viewportX = -panOffset.x / zoom - padding;
  const viewportY = -panOffset.y / zoom - padding;
  const viewportWidth = canvas.width / zoom + padding * 2;
  const viewportHeight = canvas.height / zoom + padding * 2;
  
  // Check if element bounds intersect with viewport
  // Returns true if visible, false otherwise
};
```

#### Zoom Functions
```typescript
const handleZoomIn = () => {
  setZoom(prevZoom => Math.min(prevZoom * 1.2, 5)); // Max 500%
};

const handleZoomOut = () => {
  setZoom(prevZoom => Math.max(prevZoom / 1.2, 0.1)); // Min 10%
};

const handleZoomReset = () => {
  setZoom(1);
  setPanOffset({ x: 0, y: 0 });
};
```

#### Mouse Wheel Zoom
```typescript
const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    
    // Calculate zoom towards mouse position
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));
    
    // Adjust pan offset so zoom centers on mouse
    const scale = newZoom / zoom;
    setPanOffset(prev => ({
      x: mouseX - (mouseX - prev.x) * scale,
      y: mouseY - (mouseY - prev.y) * scale,
    }));
    setZoom(newZoom);
  }
};
```

## Future Enhancements

Potential improvements:
- Mini-map showing full canvas with viewport indicator
- Zoom to fit selected elements
- Zoom to fit all elements
- Touch gestures for pan/zoom on tablets
- Customizable grid size and style
- Snap to grid option
- Ruler guides
- Canvas bounds visualization

## Troubleshooting

### Elements appear in wrong position
- Check that coordinate transformation is applied consistently
- Verify `getMousePos()` uses `screenToCanvas()` transformation

### Performance issues with many elements
- Viewport culling should handle this automatically
- Check viewport info to see rendered vs total elements
- If all elements render, verify `isElementVisible()` logic

### Zoom feels too fast/slow
- Adjust zoom factor in `handleWheel` (currently 0.9/1.1)
- Modify keyboard zoom multiplier (currently 1.2)

### Pan offset drifts
- Ensure pan mode releases properly on spacebar up
- Verify `handleKeyUp` resets panning state
- Check touch event handling doesn't interfere

## Architecture Notes

### Why Coordinate Transformation?
Rather than moving element positions, we transform the rendering context. This:
- Preserves original element coordinates
- Simplifies undo/redo (no position changes to track)
- Enables infinite canvas (no coordinate limits)
- Improves performance (GPU-accelerated transforms)

### Why Viewport Culling?
With an infinite canvas, users might create thousands of elements. Rendering all elements every frame would:
- Waste CPU/GPU resources
- Cause frame rate drops
- Consume excessive power
- Degrade user experience

Culling ensures only visible elements are rendered, maintaining smooth 60fps performance.

### Why Both Pan and Zoom?
- **Pan**: Navigate large canvas areas quickly
- **Zoom**: Work on fine details precisely
- Together: Professional drawing experience like Figma, Excalidraw, etc.

## Related Documentation
- [Drawing Bug Fix](DRAWING_BUG_FIX.md) - Pencil point initialization
- [Local Storage Architecture](LOCAL_STORAGE_ARCHITECTURE.md) - Auto-save integration
- [Excalidraw Features](EXCALIDRAW_FEATURES.md) - Overall feature set
- [Keyboard Shortcuts](KEYBOARD_SHORTCUTS.md) - All keyboard shortcuts

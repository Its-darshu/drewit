# Local Storage Architecture Guide

## Overview

The SketchBoard application has been redesigned to use **local file system storage** instead of cloud-based Firebase. This provides users with full control over their data, ensuring privacy, persistence, and offline capabilities.

---

## Architecture Changes

### 🔄 Before (Firebase Cloud Storage)
- User logs in → Firebase creates user session
- Boards automatically created in Firestore
- Elements saved to cloud database
- Requires internet connection
- Data stored on Firebase servers

### ✅ After (Local File System Storage)
- User logs in → presented with local storage options
- User selects directory on their computer
- Projects saved as `.drewit.json` files
- Works offline after initial setup
- Data stays on user's machine

---

## Core Components

### 1. Local Storage Service (`services/localStorageService.ts`)

**Purpose**: Handles all file system operations with dual-mode support.

#### Features:

**File System Access API (Modern Browsers)**
- Direct read/write access to user-selected directory
- Automatic backups (keeps last 5 versions)
- Real-time permission checks
- Write-through saves (no caching layer)

**IndexedDB Fallback (Older Browsers)**
- Browser-based storage for unsupported browsers
- Same API interface for consistency
- Automatic data persistence
- Export/import capabilities

#### Key Methods:

```typescript
// Request directory access from user
async requestDirectoryAccess(): Promise<{success, directory, error}>

// List all projects
async listProjects(): Promise<ProjectFile[]>

// Save project with auto-backup
async saveProject(name, elements, appState): Promise<{success, error}>

// Load project
async loadProject(name): Promise<{success, data, error}>

// Delete project
async deleteProject(name): Promise<{success, error}>

// Enable auto-save (every 1 second debounce)
enableAutoSave(projectName, getElements, getAppState)

// Export as downloadable file
async exportAsFile(projectName, elements, appState)

// Import from file
async importFromFile(file): Promise<{success, data, error}>

// Get storage statistics
async getStorageStats(): Promise<{usage, quota, available, percentUsed}>
```

---

### 2. Updated Dashboard (`components/Dashboard.tsx`)

**New UI Flow:**

1. **No Directory Selected:**
   - Shows "Save Work Locally" prompt
   - Button to select directory
   - Uses browser storage if File System API unavailable

2. **Directory Selected:**
   - Shows current save location
   - Lists all projects with metadata
   - New project / Import buttons
   - Storage usage indicator

**Key Features:**
- ✅ Directory picker with clear feedback
- ✅ Project grid with thumbnail placeholders
- ✅ Storage statistics display (usage/quota)
- ✅ Status messages (success/error/info)
- ✅ Import project from file
- ✅ Delete project with confirmation
- ✅ Real-time last modified timestamps

---

### 3. Updated Drawing Canvas (`components/DrawingCanvas.tsx`)

**Changes:**
- Replaced `boardId` prop with `projectName`
- Auto-load project on mount
- Auto-save with visual feedback (5-second debounce)
- Save status indicator: "Saving...", "✓ Saved", "⚠ Save failed"
- Export now uses local storage service

**Auto-Save Logic:**
1. Element changes detected
2. Wait 1 second (debounce)
3. Mark as dirty
4. Save to file/IndexedDB
5. Update status indicator
6. Auto-backup created (max 5 backups)

---

## File Format

### Project File: `{projectName}.drewit.json`

```json
{
  "elements": [
    {
      "id": 1,
      "type": "rectangle",
      "x1": 100,
      "y1": 100,
      "x2": 200,
      "y2": 200,
      "strokeColor": "#000000",
      "fillColor": "#ffffff",
      "strokeWidth": 2,
      "opacity": 1
    }
  ],
  "appState": {},
  "savedAt": 1707667200000
}
```

### Backup Files: `{projectName}.backup.{timestamp}.drewit.json`

Automatic backups are created before overwriting:
- `MyDrawing.backup.2026-02-11T10-30-45.drewit.json`
- Maximum 5 backups kept (oldest deleted automatically)

---

## Data Persistence & Integrity

### File System Access API Mode

**Persistence Guarantees:**
✅ Data written to user's file system (survives browser close, OS restart)
✅ Automatic backups before every save
✅ Permission re-verification on each operation

> **Note**: File locking is not implemented. Concurrent writes from multiple tabs may conflict.

**Error Handling:**
- `NotAllowedError` → Permission denied message
- `QuotaExceededError` → Insufficient storage alert
- `NotFoundError` → Project not found (file deleted externally)
- `AbortError` → User cancelled operation

### IndexedDB Fallback Mode

**Persistence Guarantees:**
✅ Browser-managed persistent storage
✅ Data survives browser close
✅ Automatic cleanup on storage pressure (browser-dependent)
⚠️ May be cleared if user clears browser data

**Warning Displayed:**
> "Using browser storage. You can still save and load projects."

---

## Storage Statistics

> **Note**: `navigator.storage.estimate()` reports origin-level storage (IndexedDB, Cache API, etc.), not File System Access API disk usage. Stats are most accurate in IndexedDB fallback mode.

Real-time monitoring displayed in Dashboard:

```
Storage: 2.5 MB / 10 GB (0.025% used)
[████                                        ]
```

**Calculated using:**
```typescript
const estimate = await navigator.storage.estimate();
usage = estimate.usage;
quota = estimate.quota;
available = quota - usage;
percentUsed = (usage / quota) * 100;
```

---

## User Workflows

### First Time User

1. Login with Google
2. Dashboard shows "Save Work Locally" prompt
3. Click "Select Save Location"
4. Browser shows directory picker
5. Select folder (e.g., `Documents/MyDrawings`)
6. Permission granted → Ready to create projects

### Creating a Project

1. Click "New Project"
2. Enter project name (e.g., "Logo Design")
3. Project file created: `Logo Design.drewit.json`
4. Canvas opens
5. Draw elements
6. Auto-save runs every 5 seconds

### Loading a Project

1. Dashboard shows project grid
2. Click project card
3. Project loads from file
4. Continue editing
5. Changes auto-saved

### Deleting a Project

1. Hover over project card
2. Red "X" button appears in corner
3. Click to delete
4. Confirmation dialog
5. File removed from directory

### Importing a Project

1. Click "Import" button
2. File picker opens
3. Select `.drewit.json` file
4. Project added to list
5. Ready to open

### Exporting a Project

1. Open project in canvas
2. Click export menu
3. Select "Export as .drewit"
4. File downloaded to browser downloads folder
5. Can be shared or backed up externally

---

## Browser Compatibility

### Full Support (File System Access API)
✅ Chrome/Edge 86+
✅ Opera 72+
✅ Chromium-based browsers

> **Note**: Version numbers are approximate. Check [caniuse.com](https://caniuse.com/native-filesystem-api) for current support data.

**Features:**
- Direct file system access
- User-selected directory
- Automatic backups
- Persistent storage location

### Fallback Support (IndexedDB)
✅ Firefox
✅ Safari
✅ Older Chrome/Edge

**Features:**
- Browser storage (no directory selection)
- Manual export/import
- Same save/load functionality
- No automatic directory persistence

---

## Security & Privacy

### Permissions

**Required:**
- `navigator.storage.estimate()` - Storage quota info
- `showDirectoryPicker()` - Directory selection
- Read/write permission on selected directory

**User Control:**
- User must explicitly grant directory access
- Permission can be revoked in browser settings
- Re-prompt if permission expired

### Data Privacy

✅ **All data stays on user's device**
✅ No cloud transmission
✅ No analytics or tracking on saved data
✅ User owns all files
✅ Can delete/backup/share files directly

---

## Error Handling

### Save Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Permission denied | User revoked access | Re-select directory |
| Storage full | Quota exceeded | Free up space or select different directory |
| File locked | Concurrent access | Close other instances |
| Invalid data | Corrupted file | Restore from backup |

### Load Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Project not found | File deleted externally | Create new or import backup |
| Parse error | Corrupted JSON | Edit file or restore backup |
| Permission denied | Lost directory access | Re-select directory |

---

## Migration from Firebase

### For Existing Users

**Option 1: Manual Export**
1. Open old board in Firebase version
2. Export as `.drewit.json`
3. In new version, click "Import"
4. Select exported file

**Option 2: Batch Migration** (Future Feature)
- Export all boards from Firebase
- Bulk import to local storage
- Preserve board names and metadata

---

## Future Enhancements

### Planned Features:
- 🔄 **Sync Service**: Optional sync to cloud (Google Drive, Dropbox)
- 🗂️ **Project Folders**: Organize projects into folders
- 🔍 **Search Projects**: Full-text search across all projects
- 📊 **Version History**: Browse and restore previous versions
- 🌐 **Collaboration**: Share projects via export/import
- 📱 **Mobile Support**: iOS/Android file system integration

---

## Developer Notes

### Testing Local Storage

```javascript
// Check if File System Access API is supported
localStorageService.isFileSystemAccessSupported()

// Test save
await localStorageService.saveProject('test', [], {})

// Test load
await localStorageService.loadProject('test')

// Check storage
await localStorageService.getStorageStats()
```

### Configuration

Edit `services/localStorageService.ts`:

```typescript
const DEFAULT_CONFIG: StorageConfig = {
  autoSaveInterval: 5000, // 5 seconds
  maxBackups: 5,
  fileExtension: '.drewit.json',
};
```

---

## Troubleshooting

### "Permission denied" on every save
**Solution:** Re-select directory. Browser may have revoked permission.

### Projects not loading
**Solution:** Check browser console. May need to re-select directory or use import.

### "Using browser storage" message appears
**Solution:** Browser doesn't support File System Access API. Use import/export for file management.

### Storage full error
**Solution:** 
- Check storage stats in Dashboard
- Delete old projects
- Select directory on different drive
- Clear browser cache (IndexedDB mode only)

---

## Summary

✅ **User Control**: Full ownership of data on local machine
✅ **Persistence**: Data survives browser close, OS restart
✅ **Privacy**: No cloud transmission, no tracking
✅ **Reliability**: Auto-save, auto-backup, error handling
✅ **Compatibility**: Works in all modern browsers (with fallback)
✅ **Performance**: No network latency, instant saves

**The local storage architecture provides a robust, privacy-focused, and user-friendly alternative to cloud-based storage while maintaining all the functionality of the original system.**

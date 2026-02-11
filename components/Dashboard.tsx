import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { DrawingCanvas } from './DrawingCanvas';
import { boardService, BoardMetadata, testFirestoreConnection } from '../services/boardService';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const [boards, setBoards] = useState<BoardMetadata[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [connectionTest, setConnectionTest] = useState<{ success: boolean; error?: string; details?: any } | null>(null);
  const [testing, setTesting] = useState(false);

  // Load user's boards on component mount
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    // Subscribe to real-time updates of user's boards
    const unsubscribe = boardService.subscribeToUserBoards(user.uid, (updatedBoards) => {
      setBoards(updatedBoards);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !user || creating) return;
    
    setCreating(true);
    try {
      const boardId = await boardService.createBoard(
        newBoardName.trim(),
        user.uid,
        user.email || '',
        newBoardDescription.trim()
      );
      
      setNewBoardName('');
      setNewBoardDescription('');
      setShowNewBoardModal(false);
      setSelectedBoard(boardId);
    } catch (error) {
      console.error('Failed to create board:', error);
      alert('Failed to create board. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBoard = async (boardId: string, boardName: string) => {
    if (!confirm(`Are you sure you want to delete "${boardName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await boardService.deleteBoard(boardId);
    } catch (error) {
      console.error('Failed to delete board:', error);
      alert('Failed to delete board. Please try again.');
    }
  };

  const handleTestConnection = async () => {
    if (!user) {
      setConnectionTest({ 
        success: false, 
        error: 'Please sign in first',
        details: { suggestion: 'Authentication required for Firestore access' }
      });
      return;
    }

    setTesting(true);
    setConnectionTest(null);
    console.log('🔄 Testing Firestore connection...');
    
    try {
      const result = await testFirestoreConnection();
      setConnectionTest(result);
      console.log('📊 Connection test result:', result);
    } catch (error) {
      console.error('❌ Test function failed:', error);
      setConnectionTest({
        success: false,
        error: 'Test function failed to execute',
        details: { error: error.message }
      });
    } finally {
      setTesting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (selectedBoard) {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-white shadow-sm border-b px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => setSelectedBoard(null)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {boards.find(b => b.id === selectedBoard)?.name}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="flex-1">
          <DrawingCanvas boardId={selectedBoard} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SketchBoard</h1>
              <p className="text-sm text-gray-500">Welcome back, {user?.displayName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className={`text-sm px-3 py-1 rounded-md transition-colors ${
                  testing 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                }`}
              >
                {testing ? (
                  <span className="flex items-center space-x-2">
                    <div className="animate-spin w-3 h-3 border border-yellow-600 border-t-transparent rounded-full"></div>
                    <span>Testing...</span>
                  </span>
                ) : (
                  'Test DB Connection'
                )}
              </button>
              <img
                src={user?.photoURL || ''}
                alt={user?.displayName || ''}
                className="w-8 h-8 rounded-full"
              />
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Connection Test Results */}
        {connectionTest && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            connectionTest.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start">
              <div className={`flex-shrink-0 text-xl ${
                connectionTest.success ? 'text-green-500' : 'text-red-500'
              }`}>
                {connectionTest.success ? '✅' : '❌'}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-semibold ${
                  connectionTest.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {connectionTest.success ? '🎉 Firestore Connection Successful!' : '⚠️ Firestore Connection Failed'}
                </h3>
                
                {connectionTest.success && connectionTest.details && (
                  <div className="mt-2 text-sm text-green-700">
                    <p>✓ Database write successful</p>
                    <p>✓ Database read successful</p>
                    <p>✓ Data cleanup successful</p>
                    <p className="text-xs mt-1 text-green-600">
                      Document ID: {connectionTest.details.documentId}
                    </p>
                  </div>
                )}
                
                {connectionTest.error && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-700">Error Details:</p>
                    <p className="text-sm text-red-600 bg-red-100 p-2 rounded mt-1 font-mono">
                      {connectionTest.error}
                    </p>
                    
                    {connectionTest.details?.suggestions && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-red-700">Suggested Solutions:</p>
                        <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                          {connectionTest.details.suggestions.map((suggestion: string, index: number) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={() => setConnectionTest(null)}
                  className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Your Boards</h2>
          <button
            onClick={() => setShowNewBoardModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create New Board
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading your boards...</p>
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No boards</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first board.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowNewBoardModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Board
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {boards.map((board) => (
              <div
                key={board.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow group relative"
              >
                <div 
                  className="aspect-w-16 aspect-h-10 bg-gray-100 rounded-t-lg cursor-pointer"
                  onClick={() => setSelectedBoard(board.id)}
                >
                  {board.thumbnail ? (
                    <img
                      src={board.thumbnail}
                      alt={board.name}
                      className="w-full h-32 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-t-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBoard(board.id, board.name);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  title="Delete board"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setSelectedBoard(board.id)}
                >
                  <h3 className="text-sm font-medium text-gray-900 truncate">{board.name}</h3>
                  {board.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{board.description}</p>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      Updated {board.updatedAt.toLocaleDateString()}
                    </p>
                    <span className="text-xs text-gray-400">
                      {board.elementCount} elements
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Board Modal */}
      {showNewBoardModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Board</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Board Name *
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Enter board name"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleCreateBoard()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  placeholder="Enter board description"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewBoardModal(false);
                  setNewBoardName('');
                  setNewBoardDescription('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBoard}
                disabled={!newBoardName.trim() || creating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {creating && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{creating ? 'Creating...' : 'Create'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
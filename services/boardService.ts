import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  Timestamp,
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase';
import { SketchElement } from '../types';

export interface Board {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  elements: SketchElement[];
  ownerId: string;
  ownerEmail: string;
  collaborators?: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardMetadata {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  ownerId: string;
  ownerEmail: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  elementCount: number;
}

class BoardService {
  private db = getFirestoreDb();
  private boardsCollection = 'boards';

  // Create a new board
  async createBoard(
    name: string, 
    ownerId: string, 
    ownerEmail: string,
    description?: string
  ): Promise<string> {
    try {
      const boardData = {
        name,
        description: description || '',
        thumbnail: '',
        elements: [],
        ownerId,
        ownerEmail,
        collaborators: [],
        isPublic: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(this.db, this.boardsCollection), boardData);
      console.log('Board created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating board:', error);
      throw new Error('Failed to create board');
    }
  }

  // Get user's boards
  async getUserBoards(userId: string): Promise<BoardMetadata[]> {
    try {
      const q = query(
        collection(this.db, this.boardsCollection),
        where('ownerId', '==', userId),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const boards: BoardMetadata[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        boards.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          thumbnail: data.thumbnail,
          ownerId: data.ownerId,
          ownerEmail: data.ownerEmail,
          isPublic: data.isPublic,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          elementCount: data.elements?.length || 0,
        });
      });

      return boards;
    } catch (error) {
      console.error('Error getting user boards:', error);
      throw new Error('Failed to load boards');
    }
  }

  // Get a specific board
  async getBoard(boardId: string): Promise<Board | null> {
    try {
      const docRef = doc(this.db, this.boardsCollection, boardId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        description: data.description,
        thumbnail: data.thumbnail,
        elements: data.elements || [],
        ownerId: data.ownerId,
        ownerEmail: data.ownerEmail,
        collaborators: data.collaborators || [],
        isPublic: data.isPublic,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    } catch (error) {
      console.error('Error getting board:', error);
      throw new Error('Failed to load board');
    }
  }

  // Update board elements (for real-time drawing)
  async updateBoardElements(boardId: string, elements: SketchElement[]): Promise<void> {
    try {
      const docRef = doc(this.db, this.boardsCollection, boardId);
      await updateDoc(docRef, {
        elements,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating board elements:', error);
      throw new Error('Failed to save drawing');
    }
  }

  // Update board metadata
  async updateBoardMetadata(
    boardId: string, 
    updates: { name?: string; description?: string; thumbnail?: string; isPublic?: boolean }
  ): Promise<void> {
    try {
      const docRef = doc(this.db, this.boardsCollection, boardId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating board metadata:', error);
      throw new Error('Failed to update board');
    }
  }

  // Delete a board
  async deleteBoard(boardId: string): Promise<void> {
    try {
      const docRef = doc(this.db, this.boardsCollection, boardId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting board:', error);
      throw new Error('Failed to delete board');
    }
  }

  // Listen to board changes (for real-time collaboration)
  subscribeToBoard(boardId: string, callback: (board: Board | null) => void): () => void {
    const docRef = doc(this.db, this.boardsCollection, boardId);
    
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const board: Board = {
          id: doc.id,
          name: data.name,
          description: data.description,
          thumbnail: data.thumbnail,
          elements: data.elements || [],
          ownerId: data.ownerId,
          ownerEmail: data.ownerEmail,
          collaborators: data.collaborators || [],
          isPublic: data.isPublic,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
        callback(board);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error listening to board changes:', error);
      callback(null);
    });
  }

  // Listen to user's boards
  subscribeToUserBoards(userId: string, callback: (boards: BoardMetadata[]) => void): () => void {
    const q = query(
      collection(this.db, this.boardsCollection),
      where('ownerId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const boards: BoardMetadata[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        boards.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          thumbnail: data.thumbnail,
          ownerId: data.ownerId,
          ownerEmail: data.ownerEmail,
          isPublic: data.isPublic,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          elementCount: data.elements?.length || 0,
        });
      });
      callback(boards);
    }, (error) => {
      console.error('Error listening to user boards:', error);
      callback([]);
    });
  }

  // Generate thumbnail from canvas
  generateThumbnail(canvas: HTMLCanvasElement): string {
    try {
      // Create a smaller thumbnail canvas
      const thumbnailCanvas = document.createElement('canvas');
      const thumbnailCtx = thumbnailCanvas.getContext('2d');
      
      if (!thumbnailCtx) return '';

      // Set thumbnail size
      const thumbnailWidth = 200;
      const thumbnailHeight = 150;
      thumbnailCanvas.width = thumbnailWidth;
      thumbnailCanvas.height = thumbnailHeight;

      // Fill white background
      thumbnailCtx.fillStyle = '#ffffff';
      thumbnailCtx.fillRect(0, 0, thumbnailWidth, thumbnailHeight);

      // Scale and draw the main canvas
      const scale = Math.min(
        thumbnailWidth / canvas.width,
        thumbnailHeight / canvas.height
      );
      
      const scaledWidth = canvas.width * scale;
      const scaledHeight = canvas.height * scale;
      const offsetX = (thumbnailWidth - scaledWidth) / 2;
      const offsetY = (thumbnailHeight - scaledHeight) / 2;

      thumbnailCtx.drawImage(
        canvas,
        offsetX,
        offsetY,
        scaledWidth,
        scaledHeight
      );

      return thumbnailCanvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return '';
    }
  }
}

// Test Firestore connection
export const testFirestoreConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const db = getFirestoreDb();
    
    // Try to create a test collection reference
    const testCollection = collection(db, 'connection-test');
    
    // Try to add a test document
    const testDoc = await addDoc(testCollection, {
      test: true,
      timestamp: serverTimestamp()
    });
    
    // Try to read the document back
    const docSnap = await getDoc(testDoc);
    
    if (docSnap.exists()) {
      // Clean up test document
      await deleteDoc(testDoc);
      return { success: true };
    } else {
      return { success: false, error: 'Document was not created properly' };
    }
  } catch (error: any) {
    console.error('Firestore connection test failed:', error);
    return { 
      success: false, 
      error: `${error.code || 'unknown'}: ${error.message}` 
    };
  }
};

export const boardService = new BoardService();

import { useState, useCallback } from 'react';

type HistoryState<T> = T[];

export const useHistory = <T,>(initialState: T[]) => {
  const [history, setHistory] = useState<HistoryState<T[]>>([initialState]);
  const [index, setIndex] = useState(0);

  const setState = useCallback((action: T[] | ((prevState: T[]) => T[]), overwrite = false) => {
    const currentState = history[index] || [];
    const newState = typeof action === 'function' ? (action as (prevState: T[]) => T[])(currentState) : action;
    
    if (overwrite) {
      const historyCopy = [...history];
      historyCopy[index] = newState;
      setHistory(historyCopy);
    } else {
      const updatedHistory = history.slice(0, index + 1);
      setHistory([...updatedHistory, newState]);
      setIndex(prevIndex => prevIndex + 1);
    }
  }, [history, index]);

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(prevIndex => prevIndex - 1);
    }
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex(prevIndex => prevIndex + 1);
    }
  }, [index, history.length]);

  return [history[index] || [], setState, undo, redo, index > 0, index < history.length - 1] as const;
};

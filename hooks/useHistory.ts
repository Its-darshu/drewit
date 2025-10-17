
import { useReducer, useCallback } from 'react';

type State<T> = {
  history: T[][];
  index: number;
};

type Action<T> =
  | { type: 'SET'; payload: { newState: T[]; overwrite: boolean } }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case 'SET': {
      const { newState, overwrite } = action.payload;
      if (overwrite) {
        const historyCopy = state.history.slice();
        historyCopy[state.index] = newState;
        return { ...state, history: historyCopy };
      }
      const updated = state.history.slice(0, state.index + 1).concat([newState]);
      return { history: updated, index: state.index + 1 };
    }
    case 'UNDO': {
      return { ...state, index: Math.max(0, state.index - 1) };
    }
    case 'REDO': {
      return { ...state, index: Math.min(state.history.length - 1, state.index + 1) };
    }
    default:
      return state;
  }
}

export const useHistory = <T,>(initialState: T[]) => {
  const [state, dispatch] = useReducer(reducer as any, {
    history: [initialState],
    index: 0,
  } as State<T>);

  const setState = useCallback((action: T[] | ((prevState: T[]) => T[]), overwrite = false) => {
    const current = state.history[state.index] || [];
    const newState = typeof action === 'function' ? (action as (p: T[]) => T[])(current) : action;
    dispatch({ type: 'SET', payload: { newState, overwrite } });
  }, [state.history, state.index]);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const canUndo = state.index > 0;
  const canRedo = state.index < state.history.length - 1;

  return [state.history[state.index] || [], setState, undo, redo, canUndo, canRedo] as const;
};

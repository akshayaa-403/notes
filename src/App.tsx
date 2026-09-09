import { useEffect } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useStore } from './state/StoreContext';
import { TopBar } from './components/TopBar';
import { BoardView } from './components/BoardView';
import { CalendarView } from './components/CalendarView';
import { Pomodoro } from './components/Pomodoro';
import { Toast } from './components/Toast';

/** Keeps the active board in step with the URL, so a board is deep-linkable
 *  and the back button moves between boards. */
function BoardRoute() {
  const { boardId } = useParams();
  const { state, dispatch } = useStore();
  const known = state.boards.some((b) => b.id === boardId);

  useEffect(() => {
    if (boardId && known && boardId !== state.activeBoard) {
      dispatch({ t: 'board/activate', id: boardId });
    }
  }, [boardId, known, state.activeBoard, dispatch]);

  if (!known) return <Navigate to={`/b/${state.activeBoard}`} replace />;
  return <BoardView />;
}

export function App() {
  const { state, error, clearError } = useStore();

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<Navigate to={`/b/${state.activeBoard}`} replace />} />
        <Route path="/b/:boardId" element={<BoardRoute />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Pomodoro />
      {error && <Toast message={error} onDismiss={clearError} />}
    </>
  );
}

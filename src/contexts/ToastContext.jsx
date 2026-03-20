import { createContext, useCallback, useMemo, useRef, useState } from 'react';

export const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});
  const onUndoCallbacksRef = useRef({});

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++toastId;

    setToasts((prev) => [...prev, { id, message, type }]);

    timersRef.current[id] = setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const undoable = useCallback((message, onConfirm, onUndo, duration = 5000) => {
    const id = ++toastId;

    // Store onUndo in ref, not in state
    if (onUndo) onUndoCallbacksRef.current[id] = onUndo;

    setToasts((prev) => [...prev, { id, message, type: 'undo', onConfirm }]);

    timersRef.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      delete timersRef.current[id];
      delete onUndoCallbacksRef.current[id];
      try { onConfirm(); } catch (_) { /* ignore */ }
    }, duration);
  }, []);

  const handleUndo = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    // Read onUndo from ref BEFORE calling setToasts (to keep updater pure)
    const onUndo = onUndoCallbacksRef.current[id];
    delete onUndoCallbacksRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (onUndo) try { onUndo(); } catch (_) { /* ignore */ }
  }, []);

  const success = useCallback((message) => {
    showToast(message, 'success');
  }, [showToast]);

  const error = useCallback((message) => {
    showToast(message, 'error', 4000);
  }, [showToast]);

  const info = useCallback((message) => {
    showToast(message, 'info');
  }, [showToast]);

  const value = useMemo(
    () => ({
      showToast,
      success,
      error,
      info,
      undoable
    }),
    [showToast, success, error, info, undoable]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            onClick={() => toast.type !== 'undo' && removeToast(toast.id)}
          >
            <span>{toast.message}</span>
            {toast.type === 'undo' && (
              <button
                className="toast-undo-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUndo(toast.id);
                }}
              >
                Desfazer
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

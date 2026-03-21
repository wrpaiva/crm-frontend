import { useToast } from './useToast';

export function useUndoableAction(setItems, actionFn, message) {
  const toast = useToast();

  function executeWithUndo(item, applyFn) {
    const id = item.id ?? item._id;
    const original = item;

    // Aplica mudança optimisticamente
    setItems((prev) =>
      prev.map((i) => ((i.id ?? i._id) === id ? applyFn(i) : i))
    );

    const onUndo = () =>
      setItems((prev) =>
        prev.map((i) => ((i.id ?? i._id) === id ? original : i))
      );

    toast.undoable(message, () => actionFn(id), onUndo);
  }

  return { executeWithUndo };
}

import { useToast } from './useToast';

export function useUndoableDelete(setItems, deleteFn, message = 'Item removido.') {
  const toast = useToast();

  function removeWithUndo(id, items) {
    const deletedIdx = items.findIndex((i) => (i.id ?? i._id) === id);
    if (deletedIdx === -1) return;

    const deletedItem = items[deletedIdx];
    const nextSibling = items[deletedIdx + 1] ?? null;
    const nextSiblingId = nextSibling ? (nextSibling.id ?? nextSibling._id) : null;

    // Remove optimisticamente
    setItems((prev) => prev.filter((i) => (i.id ?? i._id) !== id));

    const onUndo = () =>
      setItems((prev) => {
        if (!nextSiblingId) return [...prev, deletedItem];
        const anchorIdx = prev.findIndex((i) => (i.id ?? i._id) === nextSiblingId);
        if (anchorIdx === -1) return [...prev, deletedItem];
        const copy = [...prev];
        copy.splice(anchorIdx, 0, deletedItem);
        return copy;
      });

    toast.undoable(message, () => deleteFn(id), onUndo);
  }

  return { removeWithUndo };
}

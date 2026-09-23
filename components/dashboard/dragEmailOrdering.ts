/**
 * Reorders a block using a drop slot. A slot is the position before the item
 * under the pointer, or the length of the list for the final slot.
 */
export function reorderByInsertionIndex<T>(
  items: readonly T[],
  fromIndex: number,
  insertionIndex: number
): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    insertionIndex < 0 ||
    insertionIndex > items.length
  ) {
    return [...items];
  }

  const targetIndex =
    insertionIndex > fromIndex ? insertionIndex - 1 : insertionIndex;
  if (targetIndex === fromIndex) return [...items];

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, moved);
  return next;
}

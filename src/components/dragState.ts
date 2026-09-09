/* Reorder drag is HTML5 drag-and-drop, ported as-is from the original so this
   step is a like-for-like move to React. It does not fire on touch at all —
   dnd-kit replaces it in the mobile step, which is also what makes reordering
   keyboard-accessible. Until then this module holds the drag source, since
   dataTransfer cannot be read during dragover. */

let dragCardId: string | null = null;

export const dragState = {
  get id() {
    return dragCardId;
  },
  start(id: string) {
    dragCardId = id;
  },
  end() {
    dragCardId = null;
  },
};

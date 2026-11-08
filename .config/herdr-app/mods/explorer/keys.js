// Keyboard navigation as a pure function: a key and the list state in, the action to take out.
// up/down move, right opens (or steps into) a folder, left closes it (or goes to its parent),
// enter opens, escape clears the filter. Left/right/home/end stay with the caret while typing
// or filtering. Returns null when the key isn't ours.
//
// Actions: { type: "select", index } | { type: "toggle", path } | { type: "activate", item } | { type: "clear-filter" }

export function navigate(key, { list, sel, typing, query }) {
  const at = list.findIndex(item => item.path === sel);
  const item = list[at];
  const select = index => list.length ? { type: "select", index: Math.max(0, Math.min(list.length - 1, index)) } : null;

  if (key === "down") return select(at < 0 ? 0 : at + 1);
  if (key === "up") return select(at < 0 ? list.length - 1 : at - 1);
  if (key === "enter" && item) return { type: "activate", item };
  if (key === "escape" && query) return { type: "clear-filter" };
  if (typing || query || !item) return null;

  if (key === "home") return select(0);
  if (key === "end") return select(list.length - 1);
  if (key === "right" && item.dir) {
    if (!item.open) return { type: "toggle", path: item.path };
    return list[at + 1]?.depth > item.depth ? select(at + 1) : null;
  }
  if (key === "left") {
    if (item.dir && item.open) return { type: "toggle", path: item.path };
    let parent = at - 1;
    while (parent >= 0 && list[parent].depth >= item.depth) parent--;
    return parent < 0 ? null : select(parent);
  }
  return null;
}

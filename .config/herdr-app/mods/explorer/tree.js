// The folder tree as data: which entries each folder holds, and the flat list of rows on screen.
// Pure (no host calls), so it can be tested outside Herdr.

export const PER_FOLDER = 500;
export const TOTAL = 5000;
const MAX_DEPTH = 40;

// Folders first, then by name.
export function sortEntries(entries) {
  return entries.sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name));
}

// Expanded tree, top to bottom. `entries` maps a folder path ("" is the root) to its entries,
// `folders` is the set of expanded folder paths.
export function flatten(entries, folders, limit = TOTAL) {
  const rows = [];
  const walk = (prefix, depth) => {
    if (rows.length >= limit || depth > MAX_DEPTH) return;
    for (const entry of entries.get(prefix) ?? []) {
      if (rows.length >= limit) break;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const open = folders.has(path);
      rows.push({ path, name: entry.name, dir: entry.dir, open, depth });
      if (entry.dir && open) walk(path, depth + 1);
    }
  };
  walk("", 0);
  return rows;
}

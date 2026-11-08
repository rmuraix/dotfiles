import ICONS from "./icon-data.js";

// Material Icon Theme lookup, in VS Code's order: whole name, then the longest matching extension
// ("a.test.ts" tries "test.ts" then "ts"), then the default. Light themes use their own overrides first.
export function iconFor(name, dir, open, dark) {
  const lower = name.toLowerCase(), sets = dark ? [ICONS] : [ICONS.light, ICONS];
  for (const m of sets) {
    if (dir) { const hit = (open ? m.folderNamesOpen : m.folderNames)[lower]; if (hit) return hit; continue; }
    if (m.fileNames[lower]) return m.fileNames[lower];
    for (let i = lower.indexOf("."); i >= 0; i = lower.indexOf(".", i + 1)) { const hit = m.fileExtensions[lower.slice(i + 1)]; if (hit) return hit; }
  }
  const dflt = dir ? (open ? "folderOpen" : "folder") : "file";
  return (!dark && ICONS.light[dflt]) || ICONS[dflt];
}

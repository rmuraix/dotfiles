// Where the data comes from: the shell, git and the file system (local, or on another machine via `on`).
import { exec } from "herdr";
import { PER_FOLDER, TOTAL } from "./tree.js";

// One level of a folder as NUL-separated "kind\0name\0" pairs (kind d = folder, f = anything else).
// Skips .git, includes dotfiles and dangling links, stops after PER_FOLDER + 1 entries, and fails if
// the folder can't be read.
const LIST_SCRIPT = `
n=0
for p in "$1"/* "$1"/.[!.]* "$1"/..?*; do
  [ -e "$p" ] || [ -L "$p" ] || continue
  name=\${p##*/}
  [ "$name" = .git ] && continue
  if [ -d "$p" ]; then kind=d; else kind=f; fi
  printf "%s\\0%s\\0" "$kind" "$name"
  n=$((n+1))
  [ "$n" -gt ${PER_FOLDER} ] && break
done
test -d "$1"
`;

export async function directory(path, on) {
  const r = await exec("sh", ["-c", LIST_SCRIPT, "files", path], { on });
  if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
  const fields = r.stdout.split("\0");
  const entries = [];
  for (let i = 0; i + 1 < fields.length; i += 2) entries.push({ name: fields[i + 1], dir: fields[i] === "d" });
  return entries;
}

// "A" added/untracked, "U" unmerged, "D" deleted, "M" anything else, keyed by absolute path.
export async function gitMarks(cwd, on) {
  const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on }).catch(() => null);
  if (top?.code !== 0) return {};
  // Writes nothing under .git (index lock, fsmonitor cookie): the folder watch would refresh again.
  const status = await exec(
    "git",
    ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"],
    { cwd, on },
  ).catch(() => null);
  if (status?.code !== 0) return {};

  const root = top.stdout.trim();
  const marks = {};
  for (const entry of status.stdout.split("\0").filter(Boolean).slice(0, TOTAL)) {
    const xy = entry.slice(0, 2);
    const mark = xy === "??" || xy.includes("A") ? "A" : xy.includes("U") ? "U" : xy.includes("D") ? "D" : "M";
    marks[`${root}/${entry.slice(3)}`] = mark;
  }
  return marks;
}

// Every file under cwd, for the filter: tracked + untracked-not-ignored via git, else a bounded find.
export async function fileIndex(cwd, on) {
  const git = await exec("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd, on }).catch(() => null);
  let files;
  if (git?.code === 0) {
    files = git.stdout.split("\0").filter(Boolean);
  } else {
    const find = await exec("sh", ["-c", "find . -type f -not -path '*/.git/*' -not -path '*/node_modules/*' | head -20000"], { cwd, on });
    files = find.stdout.split("\n").filter(Boolean).map(file => file.replace(/^\.\//, ""));
  }
  return files.slice(0, 50000);
}

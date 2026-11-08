// A lazy file browser for the focused pane's folder: filter, context menu, Material icons and bounded read-only previews.
// macOS/Linux only (directory listing uses sh).
import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState, Input, InputState } from "gpui-base";
import { iconFor } from "./icons.js";
import { languageOf } from "./language.js";
import { spaces, panes, focused, exec, openOverlay, readTextFile, watchFolder, theme, settings, window } from "herdr";

function location() {
  const space = spaces().find(s => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on, space: space?.id };
}
const key = () => JSON.stringify(location());
// Catppuccin Mocha
const MOCHA = { keyword: "#cba6f7", string: "#a6e3a1", comment: "#6c7086", function: "#89b4fa", type: "#f9e2af", number: "#fab387",
  constant: "#fab387", boolean: "#fab387", variable: "#cdd6f4", operator: "#89dceb", punctuation: "#9399b2", "string.escape": "#f5c2e7" };
const icon = (name, dir, open, dark) => image(`mods/explorer/icons/${iconFor(name, dir, open, dark)}.svg`).size(16).flex_none();

const PER_FOLDER = 500, TOTAL = 5000, MAX_HITS = 200;

// Subsequence match, scored so basename and consecutive hits rank first. null = no match.
function fuzzy(path, query) {
  const p = path.toLowerCase(), base = p.lastIndexOf("/") + 1;
  let at = 0, score = 0, prev = -2;
  for (const ch of query) {
    const i = p.indexOf(ch, at);
    if (i < 0) return null;
    score += (i === prev + 1 ? 3 : 1) + (i >= base ? 2 : 0) - (i - at) * 0.01;
    prev = i; at = i + 1;
  }
  return score - p.length * 0.02;
}

const quote = path => /^[\w@%+=:,./-]+$/.test(path) ? path : `'${path.replace(/'/g, `'\\''`)}'`;

async function directory(path, on) {
  const script = 'n=0; for p in "$1"/* "$1"/.[!.]* "$1"/..?*; do [ -e "$p" ] || [ -L "$p" ] || continue; name=${p##*/}; [ "$name" = .git ] && continue; if [ -d "$p" ]; then kind=d; else kind=f; fi; printf "%s\\0%s\\0" "$kind" "$name"; n=$((n+1)); [ "$n" -gt 500 ] && break; done; test -d "$1"';
  const r = await exec("sh", ["-c", script, "files", path], { on });
  if (r.code !== 0) throw new Error(r.stderr || "Cannot list this folder");
  const fields = r.stdout.split("\0"), out = [];
  for (let i = 0; i + 1 < fields.length; i += 2) out.push({ name: fields[i + 1], dir: fields[i] === "d" });
  return out;
}

export default class Files extends View {
  init(_props, cx) {
    this.saved = new Map();
    this.entries = new Map(); this.folders = new Set(); this.pending = new Set(); this.marks = {};
    this.query = ""; this.index = null; this.menu = null;
    this.filter = InputState.new({ placeholder: "Filter files…" });
    this.filter.on("change", (_e, cx) => { this.query = this.filter.value().trim().toLowerCase(); this.menu = null; if (this.query) this.loadIndex(cx); cx.notify(); });
    this.refresh(cx);
    cx.timer.every(10000, cx => this.refresh(cx));
  }

  watch(root, cx) {
    if (this.on || this.watched === root) return;
    this.watched = root;
    const context = this.context;
    cx.spawn(async cx => {
      try { while (this.context === context) { await watchFolder(root); if (this.current(context)) this.refresh(cx); } }
      catch { if (this.context === context) this.watched = null; }
    });
  }

  current(context) {
    return this.context === context && key() === context.key;
  }

  async loadFolder(path, context) {
    const { on, cwd: root } = context;
    const entries = await directory(path ? `${root}/${path}` : root, on);
    if (!this.current(context) || (path && !this.folders.has(path))) return;
    const used = [...this.entries.entries()].filter(([p]) => p !== path).reduce((n, [, e]) => n + e.length, 0);
    this.entries.set(path, entries.slice(0, Math.max(0, Math.min(PER_FOLDER, TOTAL - used))).sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name)));
    if (entries.length > PER_FOLDER || used + entries.length > TOTAL) this.limited = true;
  }

  refresh(cx) {
    const { cwd, on } = location(), next = key();
    if (next !== this.context?.key) {
      if (this.context) this.saved.set(this.context.key, { folders: this.folders, file: this.file });
      const saved = this.saved.get(next);
      this.context = { key: next, cwd, on }; this.root = cwd; this.on = on; this.entries = new Map(); this.folders = new Set(saved?.folders);
      this.pending = new Set(); this.marks = {}; this.show(null); this.watched = null; this.error = null; this.limited = false;
      this.loading = false; this.index = null; this.menu = null;
      if (this.query) this.loadIndex(cx);
      if (saved?.file) this.show(saved.file, cx);
    }
    if (!cwd || this.loading) return;
    const context = this.context;
    this.loading = true;
    this.limited = false;
    cx.spawn(async cx => {
      try {
        for (const path of ["", ...this.folders]) {
          if (!this.current(context)) return;
          await this.loadFolder(path, context);
        }
        const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on }).catch(() => null);
        const marks = {};
        if (top?.code === 0) {
          // Writes nothing under .git (index lock, fsmonitor cookie): the folder watch would refresh again.
          const status = await exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all"], { cwd, on }).catch(() => null);
          if (status?.code === 0) for (const entry of status.stdout.split("\0").filter(Boolean).slice(0, TOTAL)) {
            const xy = entry.slice(0, 2);
            marks[`${top.stdout.trim()}/${entry.slice(3)}`] = xy === "??" || xy.includes("A") ? "A" : xy.includes("U") ? "U" : xy.includes("D") ? "D" : "M";
          }
        }
        if (!this.current(context)) return;
        this.marks = marks; this.error = null; this.watch(cwd, cx);
      } catch (e) { if (this.current(context)) this.error = String(e); }
      finally { if (this.context === context) this.loading = false; cx.notify(); }
    });
  }

  // Flat file list for the filter: tracked + untracked-not-ignored via git, else a bounded find.
  loadIndex(cx) {
    if (this.index || this.indexing || !this.root) return;
    const context = this.context, { cwd, on } = context;
    this.indexing = true;
    cx.spawn(async cx => {
      try {
        let r = await exec("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd, on }).catch(() => null);
        let files;
        if (r?.code === 0) files = r.stdout.split("\0").filter(Boolean);
        else {
          r = await exec("sh", ["-c", "find . -type f -not -path '*/.git/*' -not -path '*/node_modules/*' | head -20000"], { cwd, on });
          files = r.stdout.split("\n").filter(Boolean).map(f => f.replace(/^\.\//, ""));
        }
        if (this.current(context)) this.index = files.slice(0, 50000);
      } catch (e) { if (this.current(context)) this.error = String(e); }
      finally { this.indexing = false; cx.notify(); }
    });
  }

  hits() {
    const out = [];
    for (const path of this.index ?? []) { const score = fuzzy(path, this.query); if (score !== null) out.push({ path, score }); }
    return out.sort((a, b) => b.score - a.score).slice(0, MAX_HITS);
  }

  openMenu(path, dir, cx) {
    cx.stop_propagation();
    this.menu = { path, dir }; cx.notify();
    // Must match my-files-menu's items: 3 always, + Reveal (macOS, local), + Open (local files).
    const local = !this.on, count = 3 + (local && window()?.platform === "macos" ? 1 : 0) + (local && !dir ? 1 : 0);
    openOverlay({ mod: "explorer-menu", kind: "popup", width: 230, height: 8 + 6 + 29 * count,
      props: { path, dir, root: this.root, on: this.on, terminal: focused()?.terminal ?? null } });
  }

  toggle(path, cx) {
    if (this.folders.has(path)) {
      for (const folder of [...this.folders]) if (folder === path || folder.startsWith(path + "/")) {
        this.folders.delete(folder);
        this.entries.delete(folder);
      }
    } else {
      this.folders.add(path);
      if (!this.entries.has(path) && !this.pending.has(path)) {
        const context = this.context;
        this.pending.add(path);
        cx.spawn(async cx => {
          try { await this.loadFolder(path, context); }
          catch (e) { if (this.current(context)) this.error = String(e); }
          finally { if (this.context === context) this.pending.delete(path); cx.notify(); }
        });
      }
    }
    cx.notify();
  }

  show(path, cx) {
    this.code?.release(); this.code = null; this.file = path; this.fileError = null;
    if (!path || !cx) return;
    const context = this.context, root = this.root, on = this.on;
    cx.spawn(async cx => {
      try {
        const text = await readTextFile(`${root}/${path}`, { on });
        if (this.file !== path || !this.current(context)) return;
        if (text === null) { this.fileError = "This file is no longer available"; return; }
        if (text.includes("\0")) { this.fileError = "Binary file · no text preview"; return; }
                this.code = EditorState.new({ language: languageOf(path), readonly: true,
          value: text.length > 400000 ? text.slice(0, 400000) + "\n… (file truncated)" : text,
          font_family: settings().font_family, font_size: 12,
          syntax: MOCHA });
      } catch { if (this.file === path && this.current(context)) this.fileError = "Cannot preview this file (binary, too large, or unreadable)"; }
      finally { cx.notify(); }
    });
  }

  rows(prefix, depth, out, t) {
    const dark = settings().dark !== false;
    if (out.length >= TOTAL || depth > 40) return out;
    for (const entry of this.entries.get(prefix) ?? []) {
      if (out.length >= TOTAL) break;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name, open = this.folders.has(path), mark = this.marks[`${this.root}/${path}`];
      out.push(h_flex().id(`file-${path}`).h(28).flex_none().pl(8 + depth * 18).pr(8).gap(7).items_center().rounded(7).cursor_pointer().hover(s => s.bg(t.hover))
        .on_click((_e, cx) => { this.menu = null; entry.dir ? this.toggle(path, cx) : this.show(path, cx); })
        .on_mouse_down("right", (_e, cx) => this.openMenu(path, entry.dir, cx))
        .when(this.menu?.path === path, el => el.bg(t.selected))
        .child(entry.dir ? svg(`mods/explorer/chevron-${open ? "down" : "right"}.svg`).size(12).flex_none().text_color(t.dim) : div().w(12).flex_none())
        .child(icon(entry.name, entry.dir, open, dark))
        .child(div().flex_1().min_w(0).truncate().child(entry.name))
        .when(Boolean(mark), el => el.child(div().text_size(11).text_color(mark === "A" ? t.ansi2 : mark === "D" || mark === "U" ? t.ansi1 : t.blocked).child(mark))));
      if (entry.dir && open) this.rows(path, depth + 1, out, t);
    }
    return out;
  }

  hitRows(t) {
    const dark = settings().dark !== false;
    if (!this.index) return [div().p(8).text_size(12).text_color(t.dim).child(this.error || "Indexing files…")];
    const hits = this.hits();
    if (!hits.length) return [div().p(8).text_size(12).text_color(t.dim).child("No matching files")];
    return hits.map(({ path }) => {
      const i = path.lastIndexOf("/"), mark = this.marks[`${this.root}/${path}`];
      return h_flex().id(`hit-${path}`).h(28).flex_none().px(8).gap(7).items_center().rounded(7).cursor_pointer().hover(s => s.bg(t.hover))
        .on_click((_e, cx) => this.show(path, cx))
        .on_mouse_down("right", (_e, cx) => this.openMenu(path, false, cx))
        .when(this.menu?.path === path, el => el.bg(t.selected))
        .child(icon(path.slice(i + 1), false, false, dark))
        .child(div().flex_none().max_w("60%").truncate().child(path.slice(i + 1)))
        .child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).child(i > 0 ? path.slice(0, i) : ""))
        .when(Boolean(mark), el => el.child(div().text_size(11).text_color(mark === "A" ? t.ansi2 : mark === "D" || mark === "U" ? t.ansi1 : t.blocked).child(mark)));
    });
  }

  render(cx) {
    if (key() !== this.context?.key) this.refresh(cx);
    const t = theme();
    return v_flex().id("files").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(t.border).text_color(t.foreground).text_size(13)
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .when(Boolean(this.file), el => el.child(div().id("files-back").w(20).cursor_pointer().text_color(t.muted).on_click((_e, cx) => { this.show(null); cx.notify(); }).child("←")))
        .child(div().font_semibold().child("Files"))
        .child(div().flex_1().min_w(0).truncate().text_right().text_size(12).text_color(t.dim).child(this.file ?? this.root?.split(/[\\/]/).pop() ?? "")))
      .when(!this.file, el => el.child(div().flex_none().px(8).py(6).border_b(1).border_color(t.border).child(Input.new(this.filter))))
      .when(!this.file && Boolean(this.query), el => el.child(v_flex().id("files-hits").flex_1().min_h(0).overflow_y_scrollbar().p(6).children(this.hitRows(t))))
      .when(!this.file && !this.query, el => el.child(v_flex().id("files-tree").flex_1().min_h(0).overflow_y_scrollbar().p(6).children(this.rows("", 0, [], t))
        .when(Boolean(this.error) || !this.entries.get("")?.length, el => el.child(div().p(8).text_size(12).text_color(t.dim).child(this.error || (this.loading ? "Loading files…" : this.root ? "No files" : "No folder"))))
        .when(this.limited, el => el.child(div().p(8).text_size(11).text_color(t.dim).child("File list limited to 500 entries per folder and 5,000 total")))))
      .when(Boolean(this.file), el => el.child(this.code ? Editor.new(this.code).flex_1().min_h(0) : div().p(12).text_color(t.dim).child(this.fileError || "Loading file…")));
  }
}

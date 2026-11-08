// A lazy file browser for the focused pane's folder: filter, context menu, Material icons and bounded read-only previews.
// macOS/Linux only (directory listing uses sh).
import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState, Input, InputState, Scrollbar, v_virtual_list, VirtualListScrollHandle } from "gpui-base";
import { iconFor } from "./icons.js";
import { languageOf } from "./language.js";
import { spaces, panes, focused, exec, openOverlay, nextCommand, readTextFile, watchFolder, theme, settings, window } from "herdr";

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
    this.query = ""; this.index = null; this.sel = null; this.list = []; this.typing = false;
    this.handle = cx.focus_handle(); this.scroll = VirtualListScrollHandle.new();
    this.filter = InputState.new({ placeholder: "Filter files…" });
    this.filter.on("change", (_e, cx) => { this.query = this.filter.value().trim().toLowerCase(); this.sel = null; if (this.query) this.loadIndex(cx); cx.notify(); });
    this.filter.on("focus", (_e, cx) => { this.typing = true; cx.notify(); });
    this.filter.on("blur", (_e, cx) => { this.typing = false; cx.notify(); });
    // pane.go gives the keyboard to a focusable mod by sending "focus".
    cx.spawn(async cx => { for (;;) { if (await nextCommand() === "focus") this.handle.focus(); cx.notify(); } });
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
      this.loading = false; this.index = null; this.sel = null;
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
    cx.notify();
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

  // The rows on screen, top to bottom: filter hits, or the expanded tree.
  listing() {
    let list = [];
    if (this.query) {
      if (this.index) list = this.hits().map(({ path }) => { const i = path.lastIndexOf("/"); return { path, name: path.slice(i + 1), parent: i > 0 ? path.slice(0, i) : "", dir: false, open: false, depth: 0 }; });
      if (list.length && !list.some(x => x.path === this.sel)) this.sel = list[0].path;
    } else this.flat("", 0, list);
    return list;
  }

  flat(prefix, depth, out) {
    if (out.length >= TOTAL || depth > 40) return;
    for (const entry of this.entries.get(prefix) ?? []) {
      if (out.length >= TOTAL) break;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name, open = this.folders.has(path);
      out.push({ path, name: entry.name, dir: entry.dir, open, depth });
      if (entry.dir && open) this.flat(path, depth + 1, out);
    }
  }

  activate(item, cx) {
    if (item.dir) this.toggle(item.path, cx); else this.show(item.path, cx);
  }

  row(item, t, dark) {
    const mark = this.marks[`${this.root}/${item.path}`];
    return h_flex().id(`row-${item.path}`).h(28).flex_none().pl(8 + item.depth * 18).pr(8).gap(7).items_center().rounded(7).cursor_pointer().hover(s => s.bg(t.hover))
      .when(this.sel === item.path, el => el.bg(t.selected))
      .when(!this.query, el => el.child(item.dir ? svg(`mods/explorer/chevron-${item.open ? "down" : "right"}.svg`).size(12).flex_none().text_color(t.dim) : div().w(12).flex_none()))
      .child(icon(item.name, item.dir, item.open, dark))
      .child(div().min_w(0).truncate().when(this.query, el => el.flex_none().max_w("60%"), el => el.flex_1()).child(item.name))
      .when(this.query, el => el.child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).child(item.parent)))
      .when(Boolean(mark), el => el.child(div().text_size(11).text_color(mark === "A" ? t.ansi2 : mark === "D" || mark === "U" ? t.ansi1 : t.blocked).child(mark)));
  }

  // Arrow keys: up/down move, right opens (or steps into) a folder, left closes it (or goes to its parent),
  // enter opens, escape leaves a preview or clears the filter. Left/right stay with the caret while typing.
  onKey(e, cx) {
    const k = e.key, list = this.list;
    if (this.file) { if (k !== "escape") return; this.show(null); this.handle.focus(); cx.notify(); return; }
    const i = list.findIndex(x => x.path === this.sel), item = list[i];
    const go = j => { if (!list.length) return; j = Math.max(0, Math.min(list.length - 1, j)); this.sel = list[j].path; this.scroll.scroll_to_item(j); };
    if (k === "down") go(i < 0 ? 0 : i + 1);
    else if (k === "up") go(i < 0 ? list.length - 1 : i - 1);
    else if (k === "enter" && item) this.activate(item, cx);
    else if (k === "escape" && this.query) { this.filter.set_value(""); this.query = ""; this.sel = null; }
    else if (this.typing || this.query || !item) return;
    else if (k === "home") go(0);
    else if (k === "end") go(list.length - 1);
    else if (k === "right" && item.dir && !item.open) this.toggle(item.path, cx);
    else if (k === "right" && item.dir && list[i + 1]?.depth > item.depth) go(i + 1);
    else if (k === "left" && item.dir && item.open) this.toggle(item.path, cx);
    else if (k === "left") { let j = i - 1; while (j >= 0 && list[j].depth >= item.depth) j--; if (j < 0) return; go(j); }
    else return;
    cx.notify();
  }

  render(cx) {
    if (key() !== this.context?.key) this.refresh(cx);
    const t = theme(), dark = settings().dark !== false;
    const list = this.list = this.file ? this.list : this.listing();
    const listId = this.query ? "files-hits" : "files-tree";
    const empty = this.error || (this.query ? (this.index ? "No matching files" : "Indexing files…") : this.loading ? "Loading files…" : this.root ? "No files" : "No folder");
    const keyboard = this.handle.is_focused() || this.typing;
    return v_flex().id("files").track_focus(this.handle).on_key_down((e, cx) => this.onKey(e, cx))
      .size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(keyboard ? t.accent : t.border).text_color(t.foreground).text_size(13)
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .when(Boolean(this.file), el => el.child(div().id("files-back").w(20).cursor_pointer().text_color(t.muted).on_click((_e, cx) => { this.show(null); this.handle.focus(); cx.notify(); }).child("←")))
        .child(div().font_semibold().child("Files"))
        .child(div().flex_1().min_w(0).truncate().text_right().text_size(12).text_color(t.dim).child(this.file ?? this.root?.split(/[\\/]/).pop() ?? "")))
      .when(!this.file, el => el.child(div().flex_none().px(8).py(6).border_b(1).border_color(t.border).child(Input.new(this.filter))))
      .when(!this.file && list.length > 0, el => el.child(div().flex_1().min_h(0).relative()
        .child(div().size_full().p(6).child(v_virtual_list(listId, list.length, 28, i => list[i].path, range => list.slice(range.start, range.end).map(item => this.row(item, t, dark))).size_full().track_scroll(this.scroll)
          // Handlers can't live on rows inside a virtual list; the list reports the row's key (its path) instead.
          .on_item_click((path, cx) => { const item = this.list.find(x => x.path === path); if (!item) return; this.sel = path; this.handle.focus(); this.activate(item, cx); })
          .on_item_secondary_click((path, _e, cx) => { const item = this.list.find(x => x.path === path); if (!item) return; this.sel = path; this.openMenu(path, item.dir, cx); })))
        .child(Scrollbar.vertical(listId).viewport_from_layout().absolute().inset_0())))
      .when(!this.file && list.length === 0, el => el.child(div().flex_1().min_h(0).p(14).text_size(12).text_color(t.dim).child(empty)))
      .when(!this.file && this.limited && !this.query, el => el.child(div().flex_none().p(8).text_size(11).text_color(t.dim).child("File list limited to 500 entries per folder and 5,000 total")))
      .when(Boolean(this.file), el => el.child(this.code ? Editor.new(this.code).flex_1().min_h(0) : div().p(12).text_color(t.dim).child(this.fileError || "Loading file…")));
  }
}

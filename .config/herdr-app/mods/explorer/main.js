// A lazy file browser for the focused pane's folder: filter, context menu, Material icons, arrow-key
// navigation and bounded read-only previews (Markdown rendered). macOS/Linux only (directory listing uses sh).
//
//   tree.js     the folder tree as data         filter.js   fuzzy file filter      keys.js     arrow-key navigation
//   sources.js  shell/git/file system access     preview.js  reading + code editor  row.js      one list row
//   icons.js    Material Icon Theme lookup       language.js file name -> language
import { View, div } from "gpui-kit";
import { v_flex, h_flex, Editor, Input, InputState, TextView, Scrollbar, v_virtual_list, VirtualListScrollHandle } from "gpui-base";
import { spaces, panes, focused, openOverlay, nextCommand, watchFolder, theme, settings, window } from "herdr";
import { PER_FOLDER, TOTAL, flatten, sortEntries } from "./tree.js";
import { filterRows } from "./filter.js";
import { navigate } from "./keys.js";
import { directory, gitMarks, fileIndex } from "./sources.js";
import { isMarkdown, readPreview, makeEditor } from "./preview.js";
import { fileRow, ROW_HEIGHT } from "./row.js";

// What the panel follows: the focused pane's folder, on its machine.
function location() {
  const space = spaces().find(s => s.active);
  const f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on, space: space?.id };
}
const key = () => JSON.stringify(location());
const commas = n => String(n).replace(/\B(?=(\d{3})+$)/g, ",");

export default class Files extends View {
  // State
  //   context            { key, cwd, on }: what we're showing; stale async results are dropped by comparing it
  //   entries / folders  tree data: folder path -> entries, and the expanded folder paths
  //   query / index      the filter text (lowercase) and every file path, loaded on first use
  //   list / sel         the rows on screen and the selected row's path
  //   view               the open file: { path, text, code, error, markdown, rendered }, or null for the list
  init(_props, cx) {
    this.saved = new Map();
    this.entries = new Map();
    this.folders = new Set();
    this.pending = new Set();
    this.marks = {};
    this.query = "";
    this.index = null;
    this.sel = null;
    this.list = [];
    this.view = null;
    this.typing = false;
    this.handle = cx.focus_handle();
    this.scroll = VirtualListScrollHandle.new();

    this.filter = InputState.new({ placeholder: "Filter files…" });
    this.filter.on("change", (_e, cx) => {
      this.query = this.filter.value().trim().toLowerCase();
      this.sel = null;
      if (this.query) this.loadIndex(cx);
      cx.notify();
    });
    this.filter.on("focus", (_e, cx) => { this.typing = true; cx.notify(); });
    this.filter.on("blur", (_e, cx) => { this.typing = false; cx.notify(); });

    // pane.go gives the keyboard to a focusable mod by sending "focus".
    cx.spawn(async cx => {
      for (;;) {
        if (await nextCommand() === "focus") this.handle.focus();
        cx.notify();
      }
    });

    this.refresh(cx);
    cx.timer.every(10000, cx => this.refresh(cx));
  }

  current(context) {
    return this.context === context && key() === context.key;
  }

  // --- data -------------------------------------------------------------------------------------

  watch(root, cx) {
    if (this.on || this.watched === root) return;
    this.watched = root;
    const context = this.context;
    cx.spawn(async cx => {
      try {
        while (this.context === context) {
          await watchFolder(root);
          if (this.current(context)) this.refresh(cx);
        }
      } catch {
        if (this.context === context) this.watched = null;
      }
    });
  }

  async loadFolder(path, context) {
    const { on, cwd: root } = context;
    const entries = await directory(path ? `${root}/${path}` : root, on);
    if (!this.current(context) || (path && !this.folders.has(path))) return;

    // The whole tree is capped at TOTAL entries; whatever other folders hold counts against it.
    let used = 0;
    for (const [folder, held] of this.entries) if (folder !== path) used += held.length;
    const room = Math.max(0, Math.min(PER_FOLDER, TOTAL - used));
    this.entries.set(path, sortEntries(entries.slice(0, room)));
    if (entries.length > PER_FOLDER || used + entries.length > TOTAL) this.limited = true;
  }

  // Follow the focused pane: reset when its folder changes, then reload every expanded folder and the git marks.
  refresh(cx) {
    const { cwd, on } = location();
    const next = key();
    if (next !== this.context?.key) this.switchContext({ key: next, cwd, on }, cx);
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
        const marks = await gitMarks(cwd, on);
        if (!this.current(context)) return;
        this.marks = marks;
        this.error = null;
        this.watch(cwd, cx);
      } catch (e) {
        if (this.current(context)) this.error = String(e);
      } finally {
        if (this.context === context) this.loading = false;
        cx.notify();
      }
    });
  }

  // A different folder: remember what was expanded/open here, restore it if we've been there before.
  switchContext(context, cx) {
    if (this.context) this.saved.set(this.context.key, { folders: this.folders, file: this.view?.path });
    const saved = this.saved.get(context.key);

    this.context = context;
    this.root = context.cwd;
    this.on = context.on;
    this.entries = new Map();
    this.folders = new Set(saved?.folders);
    this.pending = new Set();
    this.marks = {};
    this.watched = null;
    this.error = null;
    this.limited = false;
    this.loading = false;
    this.index = null;
    this.sel = null;
    this.show(null);
    if (this.query) this.loadIndex(cx);
    if (saved?.file) this.show(saved.file, cx);
  }

  loadIndex(cx) {
    if (this.index || this.indexing || !this.root) return;
    const context = this.context;
    this.indexing = true;
    cx.spawn(async cx => {
      try {
        const files = await fileIndex(context.cwd, context.on);
        if (this.current(context)) this.index = files;
      } catch (e) {
        if (this.current(context)) this.error = String(e);
      } finally {
        this.indexing = false;
        cx.notify();
      }
    });
  }

  toggle(path, cx) {
    if (this.folders.has(path)) {
      for (const folder of [...this.folders]) {
        if (folder === path || folder.startsWith(path + "/")) {
          this.folders.delete(folder);
          this.entries.delete(folder);
        }
      }
    } else {
      this.folders.add(path);
      if (!this.entries.has(path) && !this.pending.has(path)) this.loadExpanded(path, cx);
    }
    cx.notify();
  }

  loadExpanded(path, cx) {
    const context = this.context;
    this.pending.add(path);
    cx.spawn(async cx => {
      try {
        await this.loadFolder(path, context);
      } catch (e) {
        if (this.current(context)) this.error = String(e);
      } finally {
        if (this.context === context) this.pending.delete(path);
        cx.notify();
      }
    });
  }

  // --- the open file ----------------------------------------------------------------------------

  // Open `path` in the panel, or go back to the list with null. Without `cx` it only closes.
  show(path, cx) {
    this.view?.code?.release();
    const markdown = Boolean(path) && isMarkdown(path);
    const view = this.view = path ? { path, text: null, code: null, error: null, markdown, rendered: markdown } : null;
    if (!view || !cx) return;

    const context = this.context;
    cx.spawn(async cx => {
      try {
        const result = await readPreview(context.cwd, path, context.on);
        if (this.view !== view || !this.current(context)) return;
        if (result.error) {
          view.error = result.error;
        } else {
          view.text = result.text;
          view.code = makeEditor(result.text, path);
        }
      } catch {
        if (this.view === view && this.current(context)) view.error = "Cannot preview this file (binary, too large, or unreadable)";
      } finally {
        cx.notify();
      }
    });
  }

  close(cx) {
    this.show(null);
    this.handle.focus();
    cx.notify();
  }

  // --- the list ---------------------------------------------------------------------------------

  // The rows on screen: filter hits (the first one selected), or the expanded tree.
  listing() {
    if (!this.query) return flatten(this.entries, this.folders);
    const rows = this.index ? filterRows(this.index, this.query) : [];
    if (rows.length && !rows.some(row => row.path === this.sel)) this.sel = rows[0].path;
    return rows;
  }

  activate(item, cx) {
    if (item.dir) this.toggle(item.path, cx);
    else this.show(item.path, cx);
  }

  openMenu(path, dir, cx) {
    cx.stop_propagation();
    cx.notify();
    // Must match explorer-menu's items: 3 always, + Reveal (macOS, local), + Open (local files).
    const local = !this.on;
    const count = 3 + (local && window()?.platform === "macos" ? 1 : 0) + (local && !dir ? 1 : 0);
    openOverlay({
      mod: "explorer-menu", kind: "popup", width: 230, height: 8 + 6 + 29 * count,
      props: { path, dir, root: this.root, on: this.on, terminal: focused()?.terminal ?? null },
    });
  }

  onKey(e, cx) {
    if (this.view) {
      if (e.key === "escape") this.close(cx);
      return;
    }
    const action = navigate(e.key, { list: this.list, sel: this.sel, typing: this.typing, query: this.query });
    if (!action) return;

    if (action.type === "select") {
      this.sel = this.list[action.index].path;
      this.scroll.scroll_to_item(action.index);
    } else if (action.type === "toggle") {
      this.toggle(action.path, cx);
    } else if (action.type === "activate") {
      this.activate(action.item, cx);
    } else if (action.type === "clear-filter") {
      this.filter.set_value("");
      this.query = "";
      this.sel = null;
    }
    cx.notify();
  }

  // --- render -----------------------------------------------------------------------------------

  render(cx) {
    if (key() !== this.context?.key) this.refresh(cx);
    const t = theme();
    if (!this.view) this.list = this.listing();
    const keyboard = this.handle.is_focused() || this.typing;
    const body = this.view
      ? [this.previewPane(t)]
      : [this.filterBar(t), this.listPane(t), this.limitNote(t)];

    return v_flex()
      .id("files")
      .track_focus(this.handle)
      .on_key_down((e, cx) => this.onKey(e, cx))
      .size_full().min_h(0).rounded(10).overflow_hidden()
      .bg(t.background).text_color(t.foreground).text_size(13)
      .border_1().border_color(keyboard ? t.accent : t.border)
      .child(this.header(t))
      .children(body.filter(Boolean));
  }

  header(t) {
    const view = this.view;
    const title = view?.path ?? this.root?.split(/[\\/]/).pop() ?? "";
    return h_flex()
      .h(42).flex_none().px(14).gap(8).items_center()
      .border_b(1).border_color(t.border)
      .when(Boolean(view), el => el.child(
        div().id("files-back").w(20).cursor_pointer().text_color(t.muted)
          .on_click((_e, cx) => this.close(cx))
          .child("←"),
      ))
      .child(div().font_semibold().child("Files"))
      .child(div().flex_1().min_w(0).truncate().text_right().text_size(12).text_color(t.dim).child(title))
      .when(Boolean(view?.markdown && view.code), el => el.child(
        div().id("files-md-toggle")
          .h(22).px(8).flex().items_center().flex_none().rounded(6).cursor_pointer().text_size(11)
          .bg(t.raised).text_color(t.muted).hover(s => s.bg(t.hover))
          .on_click((_e, cx) => { view.rendered = !view.rendered; cx.notify(); })
          .child(view.rendered ? "Source" : "Preview"),
      ));
  }

  filterBar(t) {
    return div().flex_none().px(8).py(6).border_b(1).border_color(t.border).child(Input.new(this.filter));
  }

  listPane(t) {
    const list = this.list;
    if (!list.length) return div().flex_1().min_h(0).p(14).text_size(12).text_color(t.dim).child(this.emptyMessage());

    const dark = settings().dark !== false;
    const filtering = Boolean(this.query);
    const listId = filtering ? "files-hits" : "files-tree";
    const rows = range => list.slice(range.start, range.end).map(item =>
      fileRow(item, { selected: this.sel === item.path, filtering, mark: this.marks[`${this.root}/${item.path}`], dark }, t));
    const itemAt = path => this.list.find(item => item.path === path);

    return div().flex_1().min_h(0).relative()
      .child(div().size_full().p(6).child(
        v_virtual_list(listId, list.length, ROW_HEIGHT, i => list[i].path, rows)
          .size_full()
          .track_scroll(this.scroll)
          // Handlers can't live on rows inside a virtual list; the list reports the row's key (its path) instead.
          .on_item_click((path, cx) => {
            const item = itemAt(path);
            if (!item) return;
            this.sel = path;
            this.handle.focus();
            this.activate(item, cx);
          })
          .on_item_secondary_click((path, _e, cx) => {
            const item = itemAt(path);
            if (!item) return;
            this.sel = path;
            this.openMenu(path, item.dir, cx);
          }),
      ))
      .child(Scrollbar.vertical(listId).viewport_from_layout().absolute().inset_0());
  }

  emptyMessage() {
    if (this.error) return this.error;
    if (this.query) return this.index ? "No matching files" : "Indexing files…";
    if (this.loading) return "Loading files…";
    return this.root ? "No files" : "No folder";
  }

  limitNote(t) {
    if (!this.limited || this.query) return null;
    return div().flex_none().p(8).text_size(11).text_color(t.dim)
      .child(`File list limited to ${PER_FOLDER} entries per folder and ${commas(TOTAL)} total`);
  }

  previewPane(t) {
    const { code, error, markdown, rendered, text, path } = this.view;
    if (!code) return div().p(12).text_color(t.dim).child(error || "Loading file…");
    if (markdown && rendered) {
      return div().id("files-md").flex_1().min_h(0).overflow_y_scrollbar().px(16).py(12)
        .child(TextView.markdown(`md-${path}`, text).selectable());
    }
    return Editor.new(code).flex_1().min_h(0);
  }
}

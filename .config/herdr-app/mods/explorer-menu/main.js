// Right-click menu for the Files panel (opened as a popup at the pointer by explorer).
// props: { path, root, on, dir, terminal, overlay }
import { View, div } from "gpui-kit";
import { v_flex } from "gpui-base";
import { props, closeOverlay, run, exec, notify, theme, window } from "herdr";

const quote = path => /^[\w@%+=:,./-]+$/.test(path) ? path : `'${path.replace(/'/g, `'\\''`)}'`;

export default class FilesMenu extends View {
  items() {
    const { path = "", root = "", on = null, dir = false, terminal = null } = props() ?? {};
    const abs = `${root}/${path}`;
    return [
      ["Send @path to terminal", cx => {
        if (!terminal) return notify({ title: "No terminal focused", body: "Focus a terminal pane first.", level: "warning" });
        cx.write_to_clipboard(`@${quote(path)} `);
        run("pane.focus", { terminal });
        run("terminal.paste");
      }],
      ["Copy path", cx => { cx.write_to_clipboard(abs); notify({ title: "Copied", body: abs, timeout: 1500 }); }],
      ["Copy relative path", cx => { cx.write_to_clipboard(path); notify({ title: "Copied", body: path, timeout: 1500 }); }],
      ...(!on && window()?.platform === "macos" ? [["Reveal in Finder", () => exec("open", ["-R", abs])]] : []),
      ...(!on && !dir ? [["Open in default app", () => exec("open", [abs])]] : []),
    ];
  }

  render() {
    const t = theme();
    return v_flex().id("files-menu").p(4).gap(1).text_size(13).text_color(t.foreground).children(
      this.items().map(([label, action], i) =>
        div().id(`fm-${i}`).h(28).px(10).flex().items_center().rounded(6).cursor_pointer().hover(s => s.bg(t.hover))
          .on_click((_e, cx) => { closeOverlay(props()?.overlay); action(cx); })
          .child(label)));
  }
}

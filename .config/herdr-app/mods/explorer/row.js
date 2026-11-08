// One row of the file list (tree or filter hits). Rows live inside a virtual list, so they take no handlers:
// clicks are reported by the list itself (see main.js).
import { div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { iconFor } from "./icons.js";

const ROW_HEIGHT = 28;
const INDENT = 18;

export { ROW_HEIGHT };

const icon = (name, dir, open, dark) => image(`mods/explorer/icons/${iconFor(name, dir, open, dark)}.svg`).size(16).flex_none();

function markColor(mark, t) {
  if (mark === "A") return t.ansi2;
  if (mark === "D" || mark === "U") return t.ansi1;
  return t.blocked;
}

// item: a row from tree.js / filter.js. In filter mode (`filtering`) rows are flat: name, then the folder it's in.
export function fileRow(item, { selected, filtering, mark, dark }, t) {
  const name = div().min_w(0).truncate();
  return h_flex()
    .id(`row-${item.path}`)
    .h(ROW_HEIGHT).flex_none().pl(8 + item.depth * INDENT).pr(8).gap(7)
    .items_center().rounded(7).cursor_pointer()
    .hover(s => s.bg(t.hover))
    .when(selected, el => el.bg(t.selected))
    .when(!filtering, el => el.child(
      item.dir
        ? svg(`mods/explorer/chevron-${item.open ? "down" : "right"}.svg`).size(12).flex_none().text_color(t.dim)
        : div().w(12).flex_none(),
    ))
    .child(icon(item.name, item.dir, item.open, dark))
    .child(filtering ? name.flex_none().max_w("60%").child(item.name) : name.flex_1().child(item.name))
    .when(filtering, el => el.child(div().flex_1().min_w(0).truncate().text_size(11).text_color(t.dim).child(item.parent)))
    .when(Boolean(mark), el => el.child(div().text_size(11).text_color(markColor(mark, t)).child(mark)));
}

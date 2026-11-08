// Reading a file for the preview and building the read-only code editor.
import { EditorState } from "gpui-base";
import { readTextFile, settings } from "herdr";
import { languageOf } from "./language.js";

const MAX_CHARS = 400000;

// Catppuccin Mocha
const SYNTAX = {
  keyword: "#cba6f7", string: "#a6e3a1", comment: "#6c7086", function: "#89b4fa", type: "#f9e2af", number: "#fab387",
  constant: "#fab387", boolean: "#fab387", variable: "#cdd6f4", operator: "#89dceb", punctuation: "#9399b2", "string.escape": "#f5c2e7",
};

export const isMarkdown = path => /\.(md|markdown|mdx)$/i.test(path);

// { text } for a readable text file (cut at MAX_CHARS), or { error } to show instead. Throws if it can't be read.
export async function readPreview(root, path, on) {
  const text = await readTextFile(`${root}/${path}`, { on });
  if (text === null) return { error: "This file is no longer available" };
  if (text.includes("\0")) return { error: "Binary file · no text preview" };
  return { text: text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "\n… (file truncated)" : text };
}

export function makeEditor(text, path) {
  return EditorState.new({
    language: languageOf(path),
    readonly: true,
    value: text,
    font_family: settings().font_family,
    font_size: 12,
    syntax: SYNTAX,
  });
}

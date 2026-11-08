// Languages the editor really highlights (checked by rendering each one): js py rust go json yaml css html
// sh bash zsh makefile sql c lua ruby. Anything else shows uncoloured, so map to the nearest supported one.
const LANG = { ts: "js", tsx: "js", mts: "js", cts: "js", jsx: "js", mjs: "js", cjs: "js", toml: "yaml", jsonc: "json", json5: "json", svelte: "html", vue: "html",
  htm: "html", yml: "yaml", bash: "bash", zsh: "zsh", fish: "sh", ksh: "sh", mk: "makefile", rb: "ruby", h: "c", hpp: "c", cc: "c", cpp: "c", sass: "css", scss: "css", less: "css",
  conf: "yaml", cfg: "yaml", ini: "yaml", env: "sh", dockerfile: "sh" };
const NAMES = { makefile: "makefile", gnumakefile: "makefile", dockerfile: "sh", ".zshrc": "zsh", ".zshenv": "zsh", ".zprofile": "zsh", ".zlogin": "zsh",
  ".bashrc": "bash", ".bash_profile": "bash", ".profile": "sh", ".envrc": "sh", ".gitconfig": "yaml", ".editorconfig": "yaml" };
export function languageOf(path) {
  const name = path.split("/").pop().toLowerCase();
  if (NAMES[name]) return NAMES[name];
  const ext = name.indexOf(".") > 0 ? name.split(".").pop() : "";
  return LANG[ext] ?? ext;
}

# --------------------
# Environment variable
# --------------------
# pkg-config
export PKG_CONFIG_PATH="${PKG_CONFIG_PATH:+$PKG_CONFIG_PATH:}/usr/local/lib/pkgconfig"
# fzf
export FZF_DEFAULT_COMMAND='fd --type f'
export FZF_CTRL_T_COMMAND='fd --type f'
export FZF_ALT_C_COMMAND='fd --type d'
export FZF_CTRL_T_OPTS="
  --preview 'bat -n --color=always {}'
  --bind 'ctrl-/:change-preview-window(down|hidden|)'"
export FZF_CTRL_R_OPTS="
  --preview 'echo {}' --preview-window up:3:hidden:wrap
  --bind 'ctrl-/:toggle-preview'
  --color header:italic"
export FZF_ALT_C_OPTS="--preview 'tree -C {}'"

# Remove path separator from WORDCHARS.
WORDCHARS=${WORDCHARS//[\/]}

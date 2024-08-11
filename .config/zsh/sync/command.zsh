# Set editor default keymap to emacs (`-e`) or vi (`-v`)
bindkey -v

function ghq-fzf() {
  local src=$(ghq list | fzf --preview "ls -lap $(ghq root)/{} | tail -n+4 | awk '{print \$9}'")
  if [ -n "$src" ]; then
    BUFFER="cd $(ghq root)/$src"
    zle accept-line
  fi
  zle -R -c
}
zle -N ghq-fzf
bindkey '^]' ghq-fzf
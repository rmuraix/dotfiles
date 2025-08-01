# Set editor default keymap to emacs (`-e`) or vi (`-v`)
bindkey -v

function ghq-fzf() {
  local src=$(ghq list | fzf --preview "lsd -la --color=always --icon=always $(ghq root)/{} | tail -n+4 | awk '{print \$11 \" \" \$12}'")
  if [ -n "$src" ]; then
    BUFFER="cd $(ghq root)/$src"
    zle accept-line
  fi
  zle -R -c
}
zle -N ghq-fzf
bindkey '^]' ghq-fzf
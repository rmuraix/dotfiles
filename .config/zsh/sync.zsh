# -----------------
# Zsh configuration
# -----------------
HISTFILE=${HOME}/.zsh_history
setopt AUTO_CD
setopt HIST_IGNORE_ALL_DUPS
setopt SHARE_HISTORY
setopt INC_APPEND_HISTORY
setopt HIST_REDUCE_BLANKS
# Set editor default keymap to emacs (`-e`) or vi (`-v`)
bindkey -v
# Remove path separator from WORDCHARS.
WORDCHARS=${WORDCHARS//[\/]}
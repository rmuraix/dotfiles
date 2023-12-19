# -----------------
# Zsh configuration
# -----------------
export STARSHIP_CONFIG=/home/rmuraix/dotfiles/.config/starship/starship.toml
HISTFILE=${HOME}/.zsh_history
HISTSIZE=1000
SAVEHIST=10000
setopt AUTO_CD
setopt HIST_IGNORE_ALL_DUPS
setopt SHARE_HISTORY
setopt INC_APPEND_HISTORY
setopt HIST_REDUCE_BLANKS
setopt incappendhistory
# Set editor default keymap to emacs (`-e`) or vi (`-v`)
bindkey -v
# Remove path separator from WORDCHARS.
WORDCHARS=${WORDCHARS//[\/]}


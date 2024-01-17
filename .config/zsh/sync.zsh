# -------------------
# XDG Base Directory
# -------------------
export XDG_CONFIG_HOME="$HOME/.config"
export XDG_CACHE_HOME="$HOME/.cache"
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_STATE_HOME="$HOME/.local/state"

# -----------------
# Zsh configuration
# -----------------
export STARSHIP_CONFIG="$HOME/.config/starship/starship.toml"
HISTFILE=${XDG_STATE_HOME}/.zsh_history
HISTSIZE=1000
SAVEHIST=10000
HISTORY_IGNORE="(cd|pwd|l[sal]|lla|rm|rmdir|code|nvim)"
setopt AUTO_CD
setopt HIST_IGNORE_ALL_DUPS
setopt SHARE_HISTORY
setopt HIST_REDUCE_BLANKS

# Set editor default keymap to emacs (`-e`) or vi (`-v`)
bindkey -v
# Remove path separator from WORDCHARS.
WORDCHARS=${WORDCHARS//[\/]}


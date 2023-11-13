# -----------------
# Zsh configuration
# -----------------

# Remove older command from the history if a duplicate is to be added.
setopt HIST_IGNORE_ALL_DUPS

# Set editor default keymap to emacs (`-e`) or vi (`-v`)
bindkey -v
# Remove path separator from WORDCHARS.
WORDCHARS=${WORDCHARS//[\/]}

# ----------------------
# Sheldon configuration
# ----------------------

eval "$(sheldon source)"

# -----------------
# PATH configuration
# -----------------

export PATH=$PATH:$HOME/.local/bin

# --------------------
# Environment variable
# --------------------

# pkg-config
export PKG_CONFIG_PATH=$PKG_CONFIG_PATH:/usr/local/lib/pkgconfig
# Azure Functions Core tools
export FUNCTIONS_CORE_TOOLS_TELEMETRY_OPTOUT=true
# Qt
export QT_QPA_PLATFORM="wayland;xcb"

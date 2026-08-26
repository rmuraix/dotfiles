# Machine-specific settings (e.g. remote servers), not tracked in this repo.
# Loaded first so that the PATH adjustments below take precedence over any
# absolute PATH assignments made there.
[ -f "$HOME/.zshrc.local" ] && source "$HOME/.zshrc.local"

# Homebrew: macOS only, used for Casks (GUI apps). Optional.
if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# mise: CLI tools and runtimes. Shims take precedence over Homebrew.
export PATH="$HOME/.local/bin:$PATH"
if command -v mise >/dev/null 2>&1; then
    eval "$(mise activate zsh)"
fi

eval "$(sheldon source)"

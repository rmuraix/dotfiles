#!/usr/bin/env bash

install_mise() {
    if [ -x /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi

    if command -v mise >/dev/null 2>&1; then
        command echo -e "\e[1;94m [skipped] Install mise \e[m"
        return
    fi

    curl https://mise.run | sh
    export PATH="$HOME/.local/bin:$PATH"
    command echo -e "\e[1;36m [completed] Install mise \e[m"
}

install_tools() {
    install_mise

    local dotdir
    dotdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

    mise trust "$dotdir/.config/mise/config.toml" >/dev/null 2>&1 || true
    mise install --yes
    command echo -e "\e[1;36m [completed] Install tools via mise \e[m"
}

install_casks() {
    if [ "$(uname)" != "Darwin" ]; then
        command echo -e "\e[1;94m [skipped] Install Homebrew Casks (macOS only) \e[m"
        return
    fi
    if [ ! -x /opt/homebrew/bin/brew ]; then
        command echo -e "\e[1;94m [skipped] Install Homebrew Casks (Homebrew not found) \e[m"
        return
    fi

    eval "$(/opt/homebrew/bin/brew shellenv)"

    local brewFilePath
    brewFilePath="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/.config/brew/Brewfile"
    brew bundle install --file="$brewFilePath"
    command echo -e "\e[1;36m [completed] Install Homebrew Casks \e[m"
}

link_to_homedir() {
  command echo "backup old dotfiles..."
  if [ ! -d "$HOME/.dotbackup" ];then
    command echo "$HOME/.dotbackup not found. Auto Make it"
    command mkdir "$HOME/.dotbackup"
  fi

  local dotdir
  dotdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

  if [[ "$HOME" != "$dotdir" ]];then
    for f in "$dotdir"/.??*; do
      [[ $(basename "$f") == ".git" ]] && continue
      [[ $(basename "$f") == ".github" ]] && continue
      [[ $(basename "$f") == ".gitignore" ]] && continue
      [[ $(basename "$f") == ".dockerignore" ]] && continue
      [[ $(basename "$f") == ".bin" ]] && continue
      if [[ -L "$HOME/$(basename "$f")" ]];then
        command rm -f "$HOME/$(basename "$f")"
      fi
      if [[ -e "$HOME/$(basename "$f")" ]];then
        command mv "$HOME/$(basename "$f")" "$HOME/.dotbackup"
      fi
      command ln -snf "$f" "$HOME"
    done
  else
    command echo "same install src dest"
  fi
  command echo -e "\e[1;36m [completed] Link files \e[m"

}

# Link first so that ~/.config/mise/config.toml is available as the global mise config
case "$(uname)" in
    Linux|Darwin)
        link_to_homedir
        install_tools
        install_casks
        ;;
    *)
        echo -e "\e[31mThis script is only for Linux or MacOS\e[m\n"
        exit 1
        ;;
esac

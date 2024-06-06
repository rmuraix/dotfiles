#!/usr/bin/env bash

install_tools(){
    if ! command -v brew >/dev/null 2>&1; then
        NONINTERACTIVE=1 \
         /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    else
        command echo -e "\e[1;94m [skipped] Install Homebrew \e[m"
    fi

    if [ "$(uname)" = Darwin ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    fi

    local brewFilePath
    brewFilePath="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/.config/brew/Brewfile"
    if command -v brew >/dev/null 2>&1; then
        command echo -e "\e[1;36m [completed] Install Homebrew \e[m"
        brew bundle install --file="$brewFilePath"
        command echo -e "\e[1;36m [completed] Install Homebrew Formulae \e[m"
    else
        command echo -e "\e[1;94m [skipped] Install Homebrew Formulae \e[m"
    fi
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

# Check OS
if [ -e /etc/debian_version ] || [ -e /etc/debian_release ]; then
    # Check Ubuntu or Debian
    if [ -e /etc/lsb-release ]; then
        # Ubuntu
        sudo apt-get update -qq
        sudo apt-get upgrade -y -qq
        install_tools
        link_to_homedir
    fi
elif [ "$(uname)" = Darwin ]; then
    install_tools
    link_to_homedir
else
    echo -e "\e[31mThis script is only for Ubuntu or MacOS\e[m\n"
    exit 1
fi
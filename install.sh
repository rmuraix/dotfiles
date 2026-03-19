#!/usr/bin/env bash

set -euo pipefail

detect_flake_target() {
  local uname_s uname_m
  uname_s="$(uname -s)"
  uname_m="$(uname -m)"

  case "$uname_s" in
    Darwin)
      case "$uname_m" in
        arm64) printf '%s\n' "rmuraix-aarch64-darwin" ;;
        x86_64) printf '%s\n' "rmuraix-x86_64-darwin" ;;
        *) printf '%s\n' "rmuraix-x86_64-darwin" ;;
      esac
      ;;
    Linux)
      printf '%s\n' "rmuraix"
      ;;
    *)
      command echo -e "\e[31mThis script is only for Ubuntu or MacOS\e[m\n"
      exit 1
      ;;
  esac
}

log_completed() {
  command echo -e "\e[1;36m [completed] $1 \e[m"
}

log_skipped() {
  command echo -e "\e[1;94m [skipped] $1 \e[m"
}

brew_bin() {
  local candidate
  for candidate in \
    /opt/homebrew/bin/brew \
    /usr/local/bin/brew \
    /home/linuxbrew/.linuxbrew/bin/brew
  do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

ensure_homebrew() {
  local brew_exe

  if brew_exe="$(brew_bin)"; then
    log_skipped "Install Homebrew"
  else
    NONINTERACTIVE=1 \
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    brew_exe="$(brew_bin)"
    log_completed "Install Homebrew"
  fi

  eval "$("$brew_exe" shellenv)"
}

install_brew_bundle() {
  local dotdir brewfile
  dotdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
  brewfile="$dotdir/brew/Brewfile"

  if command -v brew >/dev/null 2>&1; then
    brew bundle install --file="$brewfile"
    log_completed "Install Homebrew Formulae"
  else
    log_skipped "Install Homebrew Formulae"
  fi
}

link_to_homedir() {
  local dotdir f target

  command echo "backup old dotfiles..."
  if [ ! -d "$HOME/.dotbackup" ]; then
    command echo "$HOME/.dotbackup not found. Auto Make it"
    command mkdir "$HOME/.dotbackup"
  fi

  dotdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

  if [[ "$HOME" == "$dotdir" ]]; then
    command echo "same install src dest"
    return
  fi

  for f in "$dotdir"/.??*; do
    target="$HOME/$(basename "$f")"
    [[ $(basename "$f") == ".git" ]] && continue
    [[ $(basename "$f") == ".github" ]] && continue
    [[ $(basename "$f") == ".gitignore" ]] && continue
    [[ $(basename "$f") == ".dockerignore" ]] && continue
    [[ $(basename "$f") == ".bin" ]] && continue
    [[ $(basename "$f") == ".zshrc" ]] && continue

    if [[ -L "$target" ]]; then
      command rm -f "$target"
    fi
    if [[ -e "$target" ]]; then
      command mv "$target" "$HOME/.dotbackup"
    fi
    command ln -snf "$f" "$HOME"
  done

  log_completed "Link files"
}

main() {
  detect_flake_target >/dev/null
  ensure_homebrew
  install_brew_bundle
  link_to_homedir
}

main "$@"

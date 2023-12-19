#!/usr/bin/env bash
set -ue

helpmsg() {
  command echo "Usage:"
  command echo "Link dotfiles: $0 [--link | -l]" 0>&2
  command echo "Print this message: $0 [--help | -h]" 0>&2
  command echo ""
}

set_locale(){
  sudo sed -i 's/\/\/archive.ubuntu.com/\/\/jp.archive.ubuntu.com/g' /etc/apt/sources.list
  sudo sed -i 's/\/\/us.archive.ubuntu.com/\/\/jp.archive.ubuntu.com/g' /etc/apt/sources.list
  sudo sed -i 's/\/\/fr.archive.ubuntu.com/\/\/jp.archive.ubuntu.com/g' /etc/apt/sources.list
  sudo apt -y update
  sudo apt install -y language-pack-ja
  sudo update-locale LANG=ja_JP.UTF8
  sudo apt install -y manpages-ja manpages-ja-dev
  sudo apt install -y fonts-noto-cjk fonts-noto-cjk-extra
}

install_tools() {
    # cURL
    if ! command -v curl >/dev/null 2>&1; then
        sudo apt install -y curl
        echo -e "\e[36mInstalled curl\e[m\n"
    fi
    # zsh
    if ! command -v zsh >/dev/null 2>&1; then
        sudo apt install -y zsh
        echo -e "\e[36mInstalled zsh\e[m\n"
    fi
    # Neovim
    if ! command -v nvim >/dev/null 2>&1; then
        sudo snap install nvim --classic
        echo -e "\e[36mInstalled Neovim\e[m\n"
    fi
    # git
    if ! command -v git >/dev/null 2>&1; then
        sudo apt install -y git
        echo -e "\e[36mInstalled git\e[m\n"
    fi
    # Rust
    if ! command -v rustup >/dev/null 2>&1; then
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
        rustup self update
        rustup update
        echo -e "\e[36mInstalled rustup, rustc, cargo\e[m\n"
    fi
    # fzf
    if ! command -v fzf >/dev/null 2>&1; then
        sudo apt install -y fzf
        echo -e "\e[36mInstalled fzf\e[m\n"
    fi
    # bat
    if ! command -v bat >/dev/null 2>&1; then
        sudo apt install -y bat
        mkdir -p ~/.local/bin
        ln -s /usr/bin/batcat ~/.local/bin/bat
        echo -e "\e[36mInstalled bat\e[m\n"
    fi
    # lsd
    if ! command -v lsd >/dev/null 2>&1; then
        cargo install lsd
        echo -e "\e[36mInstalled lsd\e[m\n"
    fi
    # fd
    if ! command -v fd >/dev/null 2>&1; then
        cargo install fd-find
        echo -e "\e[36mInstalled fd\e[m\n"
    fi
    # ripgrep
    if ! command -v rg >/dev/null 2>&1; then
        sudo apt-get install -y ripgrep
        echo -e "\e[36mInstalled ripgrep\e[m\n"
    fi
    # Starship
    if ! command -v starship >/dev/null 2>&1; then
        curl -sS https://starship.rs/install.sh | sh -s -- -y
        echo -e "\e[36mInstalled starship\e[m\n"
    fi
    # sheldon
    if ! command -v sheldon >/dev/null 2>&1; then
        cargo install sheldon --locked
        echo -e "\e[36mInstalled sheldon\e[m\n"
    fi
    # vim-plug
    if [ ! -e "$HOME/.vim/autoload/plug.vim" ]; then
        curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
        https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
        echo -e "\e[36mInstalled vim-plug\e[m\n"
    fi
    # rtx-cli
    if ! command -v rtx >/dev/null 2>&1; then
        cargo install rtx-cli
        echo -e "\e[36mInstalled rtx-cli\e[m\n"
    fi

    command echo -e "\e[1;36m Tool installation completed!!!! \e[m"
}

link_to_homedir() {
  command echo "backup old dotfiles..."
  if [ ! -d "$HOME/.dotbackup" ];then
    command echo "$HOME/.dotbackup not found. Auto Make it"
    command mkdir "$HOME/.dotbackup"
  fi

  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
  local dotdir
  dotdir=$(dirname "${script_dir}")
  
  if [[ "$HOME" != "$dotdir" ]];then
    for f in "$dotdir"/.??*; do
      [[ $(basename "$f") == ".git" ]] && continue
      [[ $(basename "$f") == ".github" ]] && continue
      [[ $(basename "$f") == ".gitignore" ]] && continue
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
  command echo -e "\e[1;36m Link Completed!!!! \e[m"

}

run_all(){
  sudo apt update
  sudo apt upgrade -y
  set_locale
  install_tools
  link_to_homedir
}

while [ $# -gt 0 ];do
  case ${1} in
    --debug|-d)
      set -uex
      ;;
    --link|-l)
      link_to_homedir
      ;;
    --all|-a)
      run_all
      ;;
    --help|-h)
      helpmsg
      ;;
    *)
      ;;
  esac
  shift
done



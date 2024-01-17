#!/usr/bin/env bash

install_tools(){
    # zsh
    if ! command -v zsh >/dev/null 2>&1; then
        sudo apt-get install -y -qq zsh
        echo -e "\e[36mInstalled zsh\e[m\n"
    else
        echo -e "\e[36mAlready installed zsh\e[m\n"
    fi

    # Neovim
    if ! command -v nvim >/dev/null 2>&1; then
        sudo snap install nvim --classic
        echo -e "\e[36mInstalled Neovim\e[m\n"
    else
        echo -e "\e[36mAlready installed Neovim\e[m\n"
    fi

    # git
    if ! command -v git >/dev/null 2>&1; then
        sudo apt-get install -y -qq git
        echo -e "\e[36mInstalled git\e[m\n"
    else
        echo -e "\e[36mAlready installed git\e[m\n"
    fi

    # Rust
    if ! command -v rustup >/dev/null 2>&1; then
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
        rustup self update
        rustup update
        echo -e "\e[36mInstalled rustup, rustc, cargo\e[m\n"
    else
        echo -e "\e[36mAlready installed rustup, rustc, cargo\e[m\n"
    fi

    # fzf
    if ! command -v fzf >/dev/null 2>&1; then
        sudo apt-get install -y -qq fzf
        echo -e "\e[36mInstalled fzf\e[m\n"
    else
        echo -e "\e[36mAlready installed fzf\e[m\n"
    fi

    # bat
    if ! command -v batcat >/dev/null 2>&1; then
        sudo apt-get install -y -qq bat
        mkdir -p ~/.local/bin
        ln -s /usr/bin/batcat ~/.local/bin/bat
        echo -e "\e[36mInstalled bat\e[m\n"
    else
        echo -e "\e[36mAlready installed bat\e[m\n"
    fi

    # lsd
    if ! command -v lsd >/dev/null 2>&1; then
        sudo apt-get install -y -qq lsd
        echo -e "\e[36mInstalled lsd\e[m\n"
    else
        echo -e "\e[36mAlready installed lsd\e[m\n"
    fi

    # fd
    if ! command -v fd >/dev/null 2>&1; then
        sudo apt install -y -qq fd-find
        echo -e "\e[36mInstalled fd\e[m\n"
    else
        echo -e "\e[36mAlready installed fd\e[m\n"
    fi

    # ripgrep
    if ! command -v rg >/dev/null 2>&1; then
        sudo apt-get install -y -qq ripgrep
        echo -e "\e[36mInstalled ripgrep\e[m\n"
    else
        echo -e "\e[36mAlready installed ripgrep\e[m\n"
    fi

    # Starship
    if ! command -v starship >/dev/null 2>&1; then
        curl --proto '=https' -fLsS https://starship.rs/install.sh | sh
        echo -e "\e[36mInstalled starship\e[m\n"
    else
        echo -e "\e[36mAlready installed starship\e[m\n"
    fi

    # sheldon
    if ! command -v sheldon >/dev/null 2>&1; then
        curl --proto '=https' -fLsS https://rossmacarthur.github.io/install/crate.sh \
        | bash -s -- --repo rossmacarthur/sheldon --to ~/.local/bin
        echo -e "\e[36mInstalled sheldon\e[m\n"
    else
        echo -e "\e[36mAlready installed sheldon\e[m\n"
    fi
    
    # mise
    if ! command -v mise >/dev/null 2>&1; then
        curl --proto '=https' -fLsS https://mise.jdx.dev/install.sh | sh
        echo -e "\e[36mInstalled mise\e[m\n"
    else
        echo -e "\e[36mAlready installed mise\e[m\n"
    fi
}

# Check OS
if [ -e /etc/debian_version ] || [ -e /etc/debian_release ]; then
    # Check Ubuntu or Debian
    if [ -e /etc/lsb-release ]; then
        # Ubuntu
        sudo apt-get update -qq
        sudo apt-get upgrade -y -qq
        install_tools
    fi
fi
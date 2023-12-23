# dotfiles

![Licence](https://img.shields.io/github/license/rmuraix/dotfiles)
[![CI](https://github.com/rmuraix/dotfiles/actions/workflows/ci.yml/badge.svg)](https://github.com/rmuraix/dotfiles/actions/workflows/ci.yml)  
![terminal](./images/screenshot_terminal.png)  
This is my personal collection of configuration files.  
Here are some details about my setup:  
- **OS**: Ubuntu
- **Shell**: zsh
- **Editor**: VSCode (and Neovim)

## Features

- Shell plugin management w/ [sheldon](https://sheldon.cli.rs/)
- Neovim plugin management w/ [lazy.nvim](https://github.com/folke/lazy.nvim)
- Runtime management w/ [rtx-cli](https://github.com/jdxcode/rtx)
- Dress up w/ [Starship](https://starship.rs/)
- one-step installer
## Requirements
- [Nerd font](https://www.nerdfonts.com/font-downloads)
## Installation

1. Run `.bin/install.sh --all`
2. Run `chsh -s $(which zsh)` to change login shell

# dotfiles

![Licence](https://img.shields.io/github/license/rmuraix/dotfiles)
[![CI](https://github.com/rmuraix/dotfiles/actions/workflows/ci.yml/badge.svg)](https://github.com/rmuraix/dotfiles/actions/workflows/ci.yml)
[![Deploy Docker image](https://github.com/rmuraix/dotfiles/actions/workflows/deploy-image.yml/badge.svg)](https://github.com/rmuraix/dotfiles/actions/workflows/deploy-image.yml)  
![terminal](./images/screenshot_terminal.png)  
This is my personal collection of configuration files.  
Here are some details about my setup:

- **OS**: Ubuntu
- **Shell**: zsh
- **Editor**: VSCode (and Neovim)

## Features

- Shell plugin management w/ [sheldon](https://sheldon.cli.rs/)
- Neovim plugin management w/ [lazy.nvim](https://github.com/folke/lazy.nvim)
- Dress up w/ [Starship](https://starship.rs/)
- one-step installer

## Requirements

- [Nerd font](https://www.nerdfonts.com/font-downloads)

## Installation

```sh
git clone https://github.com/rmuraix/dotfiles.git "$HOME"/dotfiles \
&& cd "$HOME"/dotfiles \
&& make all \
&& chsh -s $(which zsh)
```

### Docker

```sh
docker pull ghcr.io/rmuraix/dotfiles:main
```

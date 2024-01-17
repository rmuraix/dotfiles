#!/usr/bin/env bash

set_locale(){
    sudo sed -i 's/\/\/archive.ubuntu.com/\/\/jp.archive.ubuntu.com/g' /etc/apt/sources.list
    sudo sed -i 's/\/\/us.archive.ubuntu.com/\/\/jp.archive.ubuntu.com/g' /etc/apt/sources.list
    sudo sed -i 's/\/\/fr.archive.ubuntu.com/\/\/jp.archive.ubuntu.com/g' /etc/apt/sources.list
    sudo apt-get -y update
    sudo apt-get install -y language-pack-ja
    sudo update-locale LANG=ja_JP.UTF8
    sudo apt-get install -y manpages-ja manpages-ja-dev
    sudo apt-get install -y fonts-noto-cjk fonts-noto-cjk-extra
}

install_pkgs(){
    sudo apt-get install -qq -y \
        curl \
        apt-transport-https \
        ca-certificates \
        gnupg-agent \
        software-properties-common \
        build-essential
}

# Check OS
if [ -e /etc/debian_version ] || [ -e /etc/debian_release ]; then
    # Check Ubuntu or Debian
    if [ -e /etc/lsb-release ]; then
        # Ubuntu
        sudo apt-get update -qq
        sudo apt-get upgrade -y -qq
        set_locale
    fi
fi
#!/usr/bin/env bash

setup_ubuntu() {
    sudo sed -i 's/\/\/archive.ubuntu.com/\/\/jp.archive.ubuntu.com/g' /etc/apt/sources.list
    sudo sed -i 's/\/\/us.archive.ubuntu.com/\/\/jp.archive.ubuntu.com/g' /etc/apt/sources.list
    sudo sed -i 's/\/\/fr.archive.ubuntu.com/\/\/jp.archive.ubuntu.com/g' /etc/apt/sources.list

    command echo -e "\e[1;36m [completed] Change apt server \e[m"

    sudo apt-get update -qq
    sudo apt-get upgrade -y -qq

    sudo apt-get install -qq -y \
        build-essential \
        ca-certificates \
        curl \
        file \
        git \
        gnupg-agent \
        language-pack-ja \
        manpages-ja \
        manpages-ja-dev \
        procps \
        software-properties-common \
        unzip \
        wget \
        zip \
        zsh
    
    command echo -e "\e[1;36m [completed] Install basic packages \e[m"

    if command -v update-locale >/dev/null 2>&1; then
        sudo update-locale LANG=ja_JP.UTF8
        command echo -e "\e[1;36m [completed] Update locale \e[m"
    else
        command echo -e "\e[1;94m [skipped] Install Homebrew Formulae \e[m"
    fi

    if [ -e /etc/systemd/timesyncd.conf ]; then
        sudo sed -i 's/#NTP=/NTP=ntp.nict.jp/g' /etc/systemd/timesyncd.conf
        command echo -e "\e[1;36m [completed] Set NTP server \e[m"
    fi
}

# Check OS
if [ -e /etc/debian_version ] || [ -e /etc/debian_release ]; then
    # Check Ubuntu or Debian
    if [ -e /etc/lsb-release ]; then
        # Ubuntu
        setup_ubuntu
    fi
fi
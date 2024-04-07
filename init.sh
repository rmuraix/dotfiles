#!/usr/bin/env bash

setup_ubuntu() {
    sudo sed -i 's/\/\/archive.ubuntu.com/\/\/jp.archive.ubuntu.com/g' /etc/apt/sources.list
    sudo sed -i 's/\/\/us.archive.ubuntu.com/\/\/jp.archive.ubuntu.com/g' /etc/apt/sources.list
    sudo sed -i 's/\/\/fr.archive.ubuntu.com/\/\/jp.archive.ubuntu.com/g' /etc/apt/sources.list

    sudo apt-get update -qq
    sudo apt-get upgrade -y -qq

    sudo apt-get install -qq -y \
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
        timedatectl \
        unzip \
        wget \
        zip \
        zsh

    sudo update-locale LANG=ja_JP.UTF8
    sudo sed -i 's/#NTP=/NTP=ntp.nict.jp/g' /etc/systemd/timesyncd.conf
}

# Check OS
if [ -e /etc/debian_version ] || [ -e /etc/debian_release ]; then
    # Check Ubuntu or Debian
    if [ -e /etc/lsb-release ]; then
        # Ubuntu
        setup_ubuntu
    fi
fi
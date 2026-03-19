#!/usr/bin/env bash

set -euo pipefail

log_completed() {
  command echo -e "\e[1;36m [completed] $1 \e[m"
}

log_skipped() {
  command echo -e "\e[1;94m [skipped] $1 \e[m"
}

setup_ubuntu() {
  sudo sed -i 's#//archive.ubuntu.com#//jp.archive.ubuntu.com#g' /etc/apt/sources.list
  sudo sed -i 's#//us.archive.ubuntu.com#//jp.archive.ubuntu.com#g' /etc/apt/sources.list
  sudo sed -i 's#//fr.archive.ubuntu.com#//jp.archive.ubuntu.com#g' /etc/apt/sources.list
  log_completed "Change apt server"

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
  log_completed "Install basic packages"

  if command -v update-locale >/dev/null 2>&1; then
    sudo update-locale LANG=ja_JP.UTF8
    log_completed "Update locale"
  else
    log_skipped "Update locale"
  fi

  if [ -e /etc/systemd/timesyncd.conf ]; then
    sudo sed -i 's/#NTP=/NTP=ntp.nict.jp/g' /etc/systemd/timesyncd.conf
    log_completed "Set NTP server"
  else
    log_skipped "Set NTP server"
  fi
}

main() {
  case "$(uname -s)" in
    Linux)
      if [ -e /etc/lsb-release ]; then
        setup_ubuntu
      else
        log_skipped "System initialization (unsupported Linux distribution)"
      fi
      ;;
    Darwin)
      log_skipped "System initialization on macOS"
      ;;
    *)
      command echo -e "\e[31mThis script is only for Ubuntu or MacOS\e[m\n"
      exit 1
      ;;
  esac
}

main "$@"

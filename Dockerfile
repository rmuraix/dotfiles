FROM ubuntu:22.04

LABEL maintainer=rmuraix

ARG USERNAME=dev

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ Asia/Tokyo
ENV LANG ja_JP.UTF-8
ENV LANGUAGE ja_JP:en
ENV LC_ALL ja_JP.UTF-8

RUN apt-get update \
   && apt-get install -y --no-install-recommends \
    sudo \
    git \
    software-properties-common \
    build-essential \
    curl \
    zsh \
    ca-certificates \
    file \
    language-pack-ja \
    tzdata \
  && rm -rf /var/lib/apt/lists/* \
  && update-locale LANG=ja_JP.UTF-8 LANGUAGE="ja_JP:ja" \
  && echo "${TZ}" > /etc/timezone \
  && rm /etc/localtime \
  && ln -s /usr/share/zoneinfo/Asia/Tokyo /etc/localtime \
  && dpkg-reconfigure -f noninteractive tzdata \
  && apt-get autoremove -y \
  && apt-get clean -y \
  && groupadd -g 1000 ${USERNAME} \
  && useradd -g ${USERNAME} -G sudo -m -s /bin/bash ${USERNAME} \
  && echo "${USERNAME}:${USERNAME}" | chpasswd \
  && echo "Defaults visiblepw" >> /etc/sudoers \
  && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER ${USERNAME}
WORKDIR /home/${USERNAME}/

COPY --chown=${USERNAME}:${USERNAME} . /home/${USERNAME}/dotfiles

RUN /home/${USERNAME}/dotfiles/install.sh \
  && rm -rf .cache

CMD ["zsh"]
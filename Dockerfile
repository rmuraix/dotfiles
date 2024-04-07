FROM ubuntu:22.04 as builder

LABEL maintainer=rmuraix

ARG USERNAME=dev

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  sudo \
  git \
  software-properties-common \
  build-essential \
  curl \
  ca-certificates \
  file

RUN groupadd -g 1000 ${USERNAME} \
  && useradd -g ${USERNAME} -G sudo -m -s /bin/bash ${USERNAME} \
  && echo "${USERNAME}:${USERNAME}" | chpasswd \
  && echo "Defaults visiblepw" >> /etc/sudoers \
  && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER ${USERNAME}
WORKDIR /home/${USERNAME}/

COPY --chown=${USERNAME}:${USERNAME} . /home/${USERNAME}/dotfiles

RUN /home/${USERNAME}/dotfiles/install.sh \
  && rm -rf .cache

FROM ubuntu:22.04

LABEL maintainer=rmuraix

ARG USERNAME=dev

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  build-essential \
  git \
  zsh \
  && apt-get autoremove -y \
  && apt-get clean -y \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd -g 1000 ${USERNAME} \
  && useradd -g ${USERNAME} -G sudo -m -s /bin/bash ${USERNAME}

USER ${USERNAME}
WORKDIR /home/${USERNAME}/

COPY --from=builder --chown=${USERNAME}:${USERNAME} /home/linuxbrew/.linuxbrew /home/linuxbrew/.linuxbrew
COPY --from=builder --chown=${USERNAME}:${USERNAME} /home/${USERNAME} /home/${USERNAME}

CMD ["zsh"]
FROM ubuntu:22.04 as base

LABEL maintainer=rmuraix
ARG USERNAME=ubuntu
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    sudo \
    zsh \
  && if ! id -u ${USERNAME} > /dev/null 2>&1; then \
       groupadd -g 1000 ${USERNAME} \
       && useradd -u 1000 -g ${USERNAME} -G sudo -m -s /bin/bash ${USERNAME} \
     fi \
  && usermod -s /bin/bash ${USERNAME} \
  && echo "${USERNAME}:${USERNAME}" | chpasswd \
  && echo "Defaults visiblepw" >> /etc/sudoers \
  && echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
  && apt-get autoremove -y \
  && apt-get clean -y \
  && rm -rf /var/lib/apt/lists/*

USER ${USERNAME}
WORKDIR /home/${USERNAME}/

FROM base as builder

COPY --chown=${USERNAME}:${USERNAME} . /home/${USERNAME}/dotfiles

RUN /home/${USERNAME}/dotfiles/init.sh \
  && /home/${USERNAME}/dotfiles/install.sh \
  && rm -rf /home/${USERNAME}/.cache

FROM base

COPY --from=builder --chown=${USERNAME}:${USERNAME} /home/linuxbrew/.linuxbrew /home/linuxbrew/.linuxbrew
COPY --from=builder --chown=${USERNAME}:${USERNAME} /home/${USERNAME} /home/${USERNAME}

CMD ["zsh"]

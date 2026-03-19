FROM ubuntu:24.04 as base

LABEL maintainer=rmuraix
ARG USERNAME=rmuraix
ENV DEBIAN_FRONTEND=noninteractive

RUN set -e; \
    apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    sudo \
    xz-utils \
    zsh \
  && if ! id -u ${USERNAME} > /dev/null 2>&1; then \
       groupadd -g 1000 ${USERNAME} \
       && useradd -u 1000 -g ${USERNAME} -G sudo -m -s /bin/bash ${USERNAME}; \
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

RUN bash -lc 'set -euo pipefail \
  && curl -L https://nixos.org/nix/install | sh -s -- --no-daemon \
  && source /home/${USERNAME}/.nix-profile/etc/profile.d/nix.sh \
  && nix profile install nixpkgs#home-manager \
  && cd /home/${USERNAME}/dotfiles \
  && make bootstrap \
  && rm -rf /home/${USERNAME}/.cache'

FROM base

COPY --from=builder /nix /nix
COPY --from=builder --chown=${USERNAME}:${USERNAME} /home/linuxbrew/.linuxbrew /home/linuxbrew/.linuxbrew
COPY --from=builder --chown=${USERNAME}:${USERNAME} /home/${USERNAME} /home/${USERNAME}

CMD ["zsh"]

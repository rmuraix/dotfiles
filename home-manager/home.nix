{ config, pkgs, lib, ... }:

let
  recursiveConfigDirs = [
    "ccstatusline"
    "git"
    "nix"
    "nvim"
  ];

  brewPaths =
    if pkgs.stdenv.isDarwin then
      [
        "/opt/homebrew/bin"
        "/opt/homebrew/sbin"
        "/usr/local/bin"
        "/usr/local/sbin"
      ]
    else
      [
        "/home/linuxbrew/.linuxbrew/bin"
        "/home/linuxbrew/.linuxbrew/sbin"
      ];

  mkRecursiveConfigDir = name: {
    source = ../configs/${name};
    recursive = true;
  };
in
{
  home.stateVersion = "25.11";

  xdg.enable = true;

  home.packages = with pkgs; [
    neovim
    fzf
    ripgrep
    fd
    lsd
    ghq
    uv
  ];

  home.sessionPath =
    [ "${config.home.homeDirectory}/.local/bin" ]
    ++ brewPaths
    ++ lib.optionals pkgs.stdenv.isLinux [ "/snap/bin" ];

  home.sessionVariables =
    {
      EDITOR = "nvim";
      VISUAL = "nvim";
      FUNCTIONS_CORE_TOOLS_TELEMETRY_OPTOUT = "true";
    }
    // lib.optionalAttrs pkgs.stdenv.isLinux {
      QT_QPA_PLATFORM = "wayland;xcb";
    };

  xdg.configFile =
    lib.genAttrs recursiveConfigDirs mkRecursiveConfigDir
    // {
      "zsh/lib" = {
        source = ../configs/zsh/lib;
        recursive = true;
      };
    };

  programs.zsh = {
    enable = true;
    dotDir = "${config.xdg.configHome}/zsh";
    enableCompletion = true;
    autosuggestion.enable = true;
    syntaxHighlighting.enable = true;
    historySubstringSearch.enable = true;
    shellAliases =
      {
        g = "git";
        ga = "git add";
        gd = "git diff";
        gs = "git status";
        gp = "git push";
        gb = "git branch";
        gst = "git status";
        gco = "git checkout";
        gf = "git fetch";
        gc = "git commit";
        ls = "lsd";
        l = "ls -l";
        la = "ls -a";
        lla = "ls -la";
        lt = "ls --tree";
        cat = "bat";
      }
      // lib.optionalAttrs pkgs.stdenv.isLinux {
        aptup = "sudo apt update && sudo apt upgrade";
        ntp = "sudo ntpdate ntp.nict.jp";
      };
    history = {
      path = "${config.xdg.stateHome}/.zsh_history";
      size = 1000;
      save = 10000;
      share = true;
      ignoreAllDups = true;
      ignorePatterns = [
        "cd"
        "pwd"
        "ls"
        "l"
        "la"
        "lla"
        "rm"
        "rmdir"
        "code"
        "nvim"
      ];
    };
    setOptions = [
      "AUTO_CD"
      "HIST_REDUCE_BLANKS"
    ];
    initContent = ''
      source ${config.xdg.configHome}/zsh/lib/command.zsh
      source ${config.xdg.configHome}/zsh/lib/variable.zsh
    '';
  };

  programs.starship = {
    enable = true;
    enableZshIntegration = true;
    settings = builtins.fromTOML (builtins.readFile ../configs/starship/starship.toml);
  };

  programs.mise = {
    enable = true;
    enableZshIntegration = true;
    globalConfig = builtins.fromTOML (builtins.readFile ../configs/mise/config.toml);
  };

  programs.gh = {
    enable = true;
    settings = {
      git_protocol = "ssh";
      editor = "code";
      prompt = "enabled";
      aliases = {
        co = "pr checkout";
      };
    };
  };

  programs.bat = {
    enable = true;
    config = {
      theme = "Visual Studio Dark+";
      "map-syntax" = [
        "*.ino:C++"
        ".ignore:Git Ignore"
      ];
    };
  };

  programs.zellij = {
    enable = true;
    extraConfig = builtins.readFile ../configs/zellij/config.kdl;
  };

  programs.home-manager.enable = true;
}

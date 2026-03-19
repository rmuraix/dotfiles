UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)

ifeq ($(UNAME_S),Darwin)
ifeq ($(UNAME_M),arm64)
TARGET ?= rmuraix-aarch64-darwin
else
TARGET ?= rmuraix-x86_64-darwin
endif
else
TARGET ?= rmuraix
endif

.PHONY: all
all: init install build

.PHONY: bootstrap
bootstrap: init install switch

.PHONY: init
init:
	@echo "\033[0;34mRun init.sh\033[0m"
	@bash init.sh
	@echo "\033[0;34mDone.\033[0m"

.PHONY: install
install:
	@echo "\033[0;34mRun install.sh\033[0m"
	@bash install.sh
	@echo "\033[0;34mDone.\033[0m"

.PHONY: switch
switch:
	@echo "\033[0;34mApply Home Manager flake\033[0m"
	@home-manager --extra-experimental-features 'nix-command flakes' switch --flake .#$(TARGET)
	@echo "\033[0;34mDone.\033[0m"

.PHONY: build
build:
	@echo "\033[0;34mBuild Home Manager flake\033[0m"
	@home-manager --extra-experimental-features 'nix-command flakes' build --flake .#$(TARGET)
	@echo "\033[0;34mDone.\033[0m"

.PHONY: help
help:
	@echo "\033[0;34minit\033[0m: Initialize environment"
	@echo "\033[0;34minstall\033[0m: Install tools"
	@echo "\033[0;34mbuild\033[0m: Build Home Manager flake (TARGET=$(TARGET))"
	@echo "\033[0;34mswitch\033[0m: Apply Home Manager flake (TARGET=$(TARGET))"
	@echo "\033[0;34mbootstrap\033[0m: Run init, install, and switch"
	@echo "\033[0;34mhelp\033[0m: Show this help message"

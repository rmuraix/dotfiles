.PHONY: all
all: init install

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

.PHONY: help
help:
	@echo "\033[0;34minit\033[0m: Initialize environment"
	@echo "\033[0;34minstall\033[0m: Install tools"
	@echo "\033[0;34mhelp\033[0m: Show this help message"
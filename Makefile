# This Makefile has been written according to guidelines at
# https://tech.davis-hansson.com/p/make/

# I've turned off .RECIPEPREFIX because WebStorm can't parse it. See YouTrack
# https://youtrack.jetbrains.com/issue/CPP-23329/Support-RECIPEPREFIX-in-newer-Make-versions-to-avoid-TAB-charact
## Use ">" instead of "\t" for blocks to avoid surprising whitespace issues
#ifeq ($(origin .RECIPEPREFIX), undefined)
#  $(error "This Make does not support .RECIPEPREFIX. Please use GNU Make 4.0 or later. If you've installed an up-to-date Make with homebrew, you maye need to invoke 'gmake' instead of 'make'.")
#endif
#.RECIPEPREFIX = >

# Make sure we use actual bash instead of zsh or sh
SHELL := bash

# Enforce bash "strict mode"
# http://redsymbol.net/articles/unofficial-bash-strict-mode/
.SHELLFLAGS := -euo pipefail -c

# Use one shell session per rule instead of one shell session per line
.ONESHELL:

# Indicate this Makefile is portable
.POSIX:

# Delete the target of a Make rule if the rule fails
.DELETE_ON_ERROR:

# Warn on undefined variables
MAKEFLAGS += --warn-undefined-variables

# Disable all the magical-but-unreadable bits of Make
MAKEFLAGS += --no-builtin-rules

# Wrap npx so it only uses local dependencies
NPX := npx --no-install

################################################################################
## Constants
################################################################################

# Reminder: order matters here
TMP_DIR                  := .tmp
SENTINEL_DIR             := $(TMP_DIR)/sentinel

EXAMPLE_DIRS             := $(shell find examples -mindepth 1 -maxdepth 1 -type d)

EXAMPLE_OUTPUT_FILES     := template.yml types.ts actions.ts
EXAMPLE_OUTPUT           := $(addprefix $(EXAMPLE_DIRS),$(addprefix /__generated__/,$(EXAMPLE_OUTPUT_FILES)))

################################################################################
## Public Targets
################################################################################

build: README.md $(EXAMPLE_OUTPUT) | $(SENTINEL_DIR) $(TMP_DIR)
.PHONY: build

clean:
	rm -rf $(EXAMPLE_OUTPUT) $(TMP_DIR) $(SENTINEL_DIR)
.PHONY: clean

################################################################################
## Helpers
################################################################################

# Print any Makefile variable
# Usage: make print-USER
print-%:
	@echo $* = $($*)
.PHONY: print-%

$(SENTINEL_DIR): | $(TMP_DIR)
	@mkdir -p $@

$(TMP_DIR):
	@mkdir -p $@

###############################################################################
## Generated Rules
###############################################################################

define GEN_EXAMPLE
$(EXAMPLE_DIR)/__generated__/template.yml:
	touch $$(@)
$(EXAMPLE_DIR)/__generated__/types.ts:
	touch $$(@)
$(EXAMPLE_DIR)/__generated__/actions.ts:
	touch $$(@)
endef
$(foreach EXAMPLE_DIR,$(EXAMPLE_DIRS),$(eval $(GEN_EXAMPLE)))

###############################################################################
## Targets
###############################################################################

README.md:
	$(NPX) markdown-toc -i --bullets='-' --maxdepth=3 README.md
	$(NPX) prettier --write README.md
.PHONY: README.md

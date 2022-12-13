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

EXAMPLE_OUTPUT_FILES     := actions.ts template.yml

EXAMPLE_OUTPUT           := $(foreach X,$(EXAMPLE_DIRS),$(foreach Y,$(addprefix /__generated__/,$(EXAMPLE_OUTPUT_FILES)),$X$Y))

GENERATED_DIRS          := $(addsuffix /__generated__,$(EXAMPLE_DIRS))

RUNTIME_SRC_TS      := $(shell find ./src -name '*.ts')
RUNTIME_DIST_CJS_JS := $(subst .ts,.js,$(subst src,dist/cjs,$(RUNTIME_SRC_TS)))
RUNTIME_DIST_EMS_JS := $(subst .ts,.js,$(subst src,dist/esm,$(RUNTIME_SRC_TS)))
RUNTIME_TYPES       := $(subst .ts,.d.ts,$(subst src,dist/types,$(filter-out $(filter %.test.ts,$(RUNTIME_SRC_TS)),$(RUNTIME_SRC_TS))))

################################################################################
## Public Targets
################################################################################

build: README.md dist/codegen/actions.js dist/codegen/cloudformation.js $(RUNTIME_DIST_CJS_JS) $(RUNTIME_DIST_EMS_JS) $(RUNTIME_TYPES) $(EXAMPLE_OUTPUT) | $(SENTINEL_DIR) $(TMP_DIR)
.PHONY: build

clean:
	rm -rf dist $(RUNTIME_DIST_CJS_JS) $(RUNTIME_DIST_EMS_JS) $(EXAMPLE_OUTPUT) $(TMP_DIR) $(SENTINEL_DIR) $(GENERATED_DIRS)
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

$(EXAMPLE_DIR)/__generated__/$(EXAMPLE_OUTPUT_FILES) &: $(RUNTIME_DIST_EMS_JS)
	npx graphql-codegen --debug --verbose --project $(subst examples/,,$(EXAMPLE_DIR))
	npm run eslint -- --fix $(EXAMPLE_DIR)/__generated__

endef
$(foreach EXAMPLE_DIR,$(EXAMPLE_DIRS),$(eval $(GEN_EXAMPLE)))

###############################################################################
## Rules
###############################################################################

$(RUNTIME_DIST_CJS_JS) &: $(RUNTIME_SRC_TS)
	$(NPX) esbuild $(?) --format=cjs --outbase=src --outdir=dist/cjs --platform=node

$(RUNTIME_DIST_EMS_JS) &: $(RUNTIME_SRC_TS)
	$(NPX) esbuild $(?) --format=esm --outbase=src --outdir=dist/esm --platform=node

dist/codegen/actions.js: src/codegen/actions/index.ts dist/schema.graphqls $(shell find src/codegen -name *.ts)
	$(NPX) esbuild $(<) --bundle --external:graphql --format=cjs --outfile=$@ --platform=node

dist/codegen/cloudformation.js: src/codegen/cloudformation/index.ts dist/schema.graphqls $(shell find src/codegen -name *.ts)
	$(NPX) esbuild $(<) --bundle --external:graphql --format=cjs --outfile=$@ --platform=node

dist/schema.graphqls: src/codegen/schema.graphqls
	mkdir -p dist
	cp $(<) $(@)

$(RUNTIME_TYPES) &:
	$(NPX) tsc --emitDeclarationOnly --declaration --project tsconfig.build.json --outDir dist/types

###############################################################################
## Targets
###############################################################################

README.md:
	$(NPX) markdown-toc -i --bullets='-' --maxdepth=3 README.md
	$(NPX) prettier --write README.md
.PHONY: README.md

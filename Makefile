run:
	@go run . serve

SHELL := /bin/bash

db:
	@if [ ! -f vec0.dylib ]; then \
		echo "Error: vec0.dylib not found. Please run 'make download-vec' first."; \
		exit 1; \
	fi
	@/opt/homebrew/opt/sqlite/bin/sqlite3 -init <(echo '.load ./vec0.dylib') ./pb_data/data.db

download-vec:
	@echo "Downloading sqlite-vec extension for macOS ARM64..."
	@curl -L -o vec0.tar.gz https://github.com/asg017/sqlite-vec/releases/download/v0.1.6/sqlite-vec-0.1.6-loadable-macos-aarch64.tar.gz
	@tar -xzf vec0.tar.gz
	@rm vec0.tar.gz
	@echo "sqlite-vec extension downloaded to vec0.dylib"

SHELL := /bin/bash

run:
	@go run . serve --http=0.0.0.0:8090

fe:
	@pushd ./frontend && npm run dev -- --host && popd

reset:
	@rm -r ./pb_data/*
	@make setup-su

setup-su:
	@go run . superuser upsert test@test.com test12345

# Run application and create a regular user before running this
fe-pb-types:
	@npx pocketbase-typegen --url http://localhost:8090 --email test@test.com --password 'test12345' --out frontend/src/types/pocketbase-types.ts

clip-docker:
	@pushd ./clip && sh ./build-docker.sh && docker run -p 8001:8001 caloriemate-clip && popd

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

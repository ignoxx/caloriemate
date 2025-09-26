SHELL := /bin/bash

run:
	@go run . serve --http=0.0.0.0:8090

fe:
	@pushd ./frontend && npm run dev && popd

setup-su:
	@go run . superuser upsert test@test.com test12345

fe-pb-types:
	@npx pocketbase-typegen --url http://localhost:8090 --email test@test.com --password 'test12345' --out frontend/src/types/pocketbase-types.ts

# CLIP Service - One command to rule them all
clip-run:
	@echo "🚀 Starting CLIP Embedding Service..."
	@echo "📍 Service will be available at: http://localhost:8001"
	@echo "📖 API Documentation at: http://localhost:8001/docs"
	@echo ""
	@if [ ! -d "clip/clip_env" ]; then \
		echo "Creating virtual environment..."; \
		cd clip && python3 -m venv clip_env; \
	fi
	@echo "Checking dependencies..."
	@cd clip && source clip_env/bin/activate && python3 -c "import clip" 2>/dev/null && echo "✅ CLIP already installed" || { \
		echo "Installing dependencies (this may take a few minutes)..."; \
		source clip_env/bin/activate && pip install --upgrade pip; \
		source clip_env/bin/activate && pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu; \
		source clip_env/bin/activate && pip install git+https://github.com/openai/CLIP.git; \
		source clip_env/bin/activate && pip install -r requirements.txt; \
		echo "✅ Setup complete!"; \
	}
	@echo "Starting CLIP service..."
	@cd clip && source clip_env/bin/activate && python3 clip_service.py

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

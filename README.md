# CalorieMate

A personal project I built to help track what I eat without overthinking it. The idea is simple: snap a photo of your meal, let AI give you a rough estimate of calories and protein, and get back to eating. No fuss, no precise measurements—just enough info to build awareness of what you're consuming.

At the time of writing, I've managed to lose about 7kg using this approach. The goal was never to track everything perfectly, but to get a feel for my eating habits until I could develop that intuition naturally and move on.

I'm making this public in case anyone else finds it useful and wants to self-host their own instance.

## How it works

The core workflow is dead simple:
- Open the app, take a quick picture of your food
- AI analyzes it and gives you rough calorie/protein estimates
- Start eating, no waiting around
- Later, if you want, you can review the meal, add more context (like "this was a large portion" or "homemade pasta"), and re-analyze for a better estimate

The app focuses on calories and protein since those were my main concerns. The more details you provide, the more accurate the estimates get, but even with minimal info, you get ballpark numbers that are good enough to track trends.

Under the hood, it uses CLIP embeddings to detect similar meals you've logged before, so over time it gets faster at recognizing your regular foods.

## Self-Hosting

The easiest way to run this is with Docker Compose.

### Prerequisites

- Docker and Docker Compose
- OpenRouter API key (get one at [openrouter.ai](https://openrouter.ai))

### Quick Start

1. Clone the repo:
```bash
git clone https://github.com/yourusername/caloriemate.git
cd caloriemate
```

2. Create a `.env` file and add your OpenRouter API key:
```bash
cp .env.example .env
```

Edit the `.env` file:
```env
OPENROUTER_API_KEY=your_actual_api_key_here
```

That's all you need. Optionally, you can also set:
- `OPENROUTER_VISION_MODEL` - Use a different vision model (default: `google/gemini-2.5-flash`)
- `PORT` - Change the exposed port (default: `8080`)

3. Start it up:
```bash
docker compose up -d
```

4. Watch the logs until you see the admin setup URL:
```bash
docker compose logs -f app
```

Look for a line that shows an admin setup URL. Open that URL in your browser to create your admin account and start using the app.

That's it. The app runs two services: the main app (backend + frontend) and a CLIP service for image embeddings. All your data (database, meal photos) is stored in a Docker volume, so it persists between restarts.

### Backing up your data

All data lives in the `pb_data` volume. To back it up:

```bash
docker compose down
docker run --rm -v caloriemate_pb_data:/data -v $(pwd):/backup alpine tar czf /backup/pb_data_backup.tar.gz -C /data .
```

To restore:

```bash
docker run --rm -v caloriemate_pb_data:/data -v $(pwd):/backup alpine tar xzf /backup/pb_data_backup.tar.gz -C /data
```

### Stopping everything

```bash
docker compose down
```

To also wipe the data:

```bash
docker compose down -v
```

## Development Setup

If you want to hack on this locally without Docker:

### Requirements

- Go 1.25+
- Node.js 22+
- Python 3.11+ (for CLIP service)
- OpenRouter API key

### Running locally

1. Install dependencies:
```bash
go mod download
cd frontend && npm install && cd ..
```

2. Create `.env` in the root:
```env
STAGE=dev
CLIP_HOST=http://localhost:8001
OPENROUTER_API_KEY=your_api_key_here
```

3. Create `.env` in the frontend folder:
```bash
echo "VITE_POCKETBASE_URL=http://localhost:8080" > frontend/.env
```

4. Start the CLIP service (uses Docker):
```bash
make clip-docker
```

5. In another terminal, start the backend:
```bash
make run
```

6. In another terminal, start the frontend dev server:
```bash
make fe
```

7. Create the superuser:
```bash
make setup-su
```

## Tech Stack

Just some notes on what I used:

- **Backend**: Go with PocketBase (gives you auth, database, file storage out of the box)
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **AI**: OpenRouter API (using Gemini 2.5 Flash for meal analysis), OpenAI CLIP for image embeddings
- **Database**: SQLite with sqlite-vec extension for vector similarity search
- **Image Processing**: Python, PyTorch, FastAPI for the CLIP service

## A note on accuracy

This is not a medical device or a precision nutrition tracker. The calorie and protein estimates are rough approximations based on what an AI vision model thinks it sees in your photo. They're meant to give you a general sense of what you're eating, not exact numbers.

If you need precise tracking for medical reasons, use a proper nutrition app with a food database and weigh your portions.

## License

MIT - do whatever you want with it.

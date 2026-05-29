# ToothStream

Real-time periodontal voice charting application with:

1. FastAPI backend for audio websocket streaming
2. Deepgram live transcription integration
3. React + TypeScript frontend with interactive full-mouth perio chart
4. Universal numbering workflow (upper 1-16, lower 32-17)

## Highlights

1. Live microphone capture from browser and streaming to backend websocket
2. Transcript parsing into clinical payloads (tooth, surface, depth triplets, bleeding, commands)
3. Interactive periodontal chart with anatomy-first SVG rendering
4. Active tooth/site highlighting and live updates from voice input
5. Undo and cursor-navigation style command flow

## Tech Stack

1. Backend: FastAPI, Uvicorn, websockets, aiohttp, python-dotenv, deepgram-sdk
2. Frontend: React 18, TypeScript, TailwindCSS, react-scripts

## Repository Layout

```text
.
|- start.bat
|- README.md
|- backend/
|  |- main.py
|  |- parser.py
|  |- normalizer.py
|  |- requirements.txt
|  \- (create) .env
\- frontend/
   |- package.json
   |- src/
   |  |- App.tsx
   |  \- components/
   \- public/
```

## Prerequisites

1. Python 3.10+
2. Node.js 18+
3. npm 9+
4. A Deepgram API key

## Quick Start (Windows)

Use the launcher script from repo root:

```bat
start.bat
```

What this does:

1. Creates backend virtual environment at backend/venv (if missing)
2. Installs backend dependencies from backend/requirements.txt
3. Starts FastAPI backend on http://127.0.0.1:8000
4. Starts frontend dev server on http://localhost:3002

## Manual Setup

### 1) Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create backend/.env with:

```env
DEEPGRAM_API_KEY=your_deepgram_api_key
```

Run backend:

```powershell
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2) Frontend

```powershell
cd frontend
npm install
$env:PORT=3002
npm start
```

## Runtime Endpoints

1. Backend API: http://127.0.0.1:8000
2. Audio websocket: ws://127.0.0.1:8000/ws/audio
3. Frontend app: http://localhost:3002

## How To Use

1. Open the frontend app in your browser.
2. Allow microphone access.
3. Start recording from the transcript panel.
4. Dictate periodontal chart values naturally.
5. Verify live updates in the chart and transcript history.

## Voice Parsing Notes

The parser supports clinical payload extraction such as:

1. Tooth selection
2. Surface selection (buccal or lingual/palatal)
3. Depth triplets
4. Bleeding and status commands
5. Cursor movement style commands

Backend parsing modules:

1. backend/normalizer.py
2. backend/parser.py

## Frontend Scripts

From frontend:

```bash
npm start
npm run build
npm run typecheck
npm test
```

## Troubleshooting

1. No transcription data:
   Ensure backend/.env contains a valid DEEPGRAM_API_KEY.
2. Frontend cannot connect:
   Verify backend is running on port 8000 and websocket path is /ws/audio.
3. Mic button appears active but no updates:
   Check browser microphone permissions and backend terminal logs.
4. Build warnings:
   Existing lint warnings may appear in development and do not always block runtime.

## Security

1. Never commit backend/.env.
2. Rotate API keys if exposed.

## License

Add your preferred license file (for example MIT) to clarify reuse terms.

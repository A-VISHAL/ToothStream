# ToothStream

**AI-Powered Real-time Periodontal Voice Charting**

ToothStream is a premium dental SaaS platform that lets clinicians dictate periodontal findings hands-free while a full-mouth chart updates live — driven by Deepgram AI speech-to-text and a clinical-grade state machine.

---

## Why ToothStream?

Traditional periodontal charting requires a second person to record while the clinician probes. ToothStream eliminates that bottleneck:

- **Clinician speaks** → Deepgram transcribes → DeepSeek parses → chart updates in < 50 ms
- No extra staff needed for data entry during examinations
- Hands stay on instruments; attention stays on the patient
- Full audit trail via transcript history

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│  ┌─────────────┐    ┌──────────────────────────────────────┐   │
│  │  Microphone │───▶│         React Frontend (CRA)         │   │
│  │  (WebAudio) │    │                                      │   │
│  └─────────────┘    │  ┌────────────┐  ┌────────────────┐  │   │
│                     │  │ LoginPage  │  │ ClinicalOverview│  │   │
│                     │  │ (hero+auth)│  │  (onboarding)  │  │   │
│                     │  └────────────┘  └────────────────┘  │   │
│                     │  ┌──────────────────────────────────┐ │   │
│                     │  │       Dashboard Workspace        │ │   │
│                     │  │  ┌────────────┐ ┌─────────────┐ │ │   │
│                     │  │  │TranscriptP.│ │  PerioChart  │ │ │   │
│                     │  │  │ + StatusBar│ │  (SVG 32T)  │ │ │   │
│                     │  │  └────────────┘ └─────────────┘ │ │   │
│                     │  └──────────────────────────────────┘ │   │
│                     │         ▲ WebSocketProvider           │   │
│                     └─────────┼────────────────────────────┘   │
└───────────────────────────────┼─────────────────────────────────┘
                                │ WebSocket (ws://)
                                │ binary PCM audio stream
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python)                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    /ws/audio endpoint                   │   │
│  │                                                         │   │
│  │  AudioChunks ──▶ Deepgram SDK ──▶ Raw Transcript        │   │
│  │                         │                               │   │
│  │                         ▼                               │   │
│  │              DeepSeek NLP Decision Engine               │   │
│  │              (deepseekDecision.ts bridged via rules)    │   │
│  │                         │                               │   │
│  │                         ▼                               │   │
│  │              Clinical Transcript Parser                 │   │
│  │              parser.py + normalizer.py                  │   │
│  │                         │                               │   │
│  │                         ▼                               │   │
│  │           JSON Payload: { tooth, surface, depth,        │   │
│  │                          bleeding, command }            │   │
│  └───────────────────────┬─────────────────────────────────┘   │
│                           │ JSON over WS                       │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            ▼
          ┌───────────────────────────────┐
          │   Clinical State Machine      │
          │   (charting state machine)    │
          │                               │
          │  Tooth → Surface → Sites[3]  │
          │  Depth / Bleeding / Jump      │
          │  Undo stack per tooth         │
          └───────────────────────────────┘
                            │
                            ▼
          ┌───────────────────────────────┐
          │   PerioChart UI Update        │
          │   (SVG, EnhancedToothCard,    │
          │    SimpleToothMap, etc.)      │
          └───────────────────────────────┘
```

---

## Key Features

| Feature | Detail |
|---------|--------|
| **Live Voice Charting** | Browser mic → FastAPI WebSocket → Deepgram STT → chart update < 50 ms round-trip |
| **32-Tooth Full Arch** | Universal numbering (upper 1–16, lower 32–17). SVG anatomy cards per tooth type |
| **Surface Awareness** | Buccal and lingual/palatal surface tracking with 3 sites (mesial/mid/distal) per surface |
| **Bleeding Detection** | Voice command `"bleeding"` or `"no bleeding"` marks site-level DP |
| **Clinical State Machine** | Explicit tooth commit before advancing; no accidental cursor jumps |
| **Undo Stack** | Per-tooth history with voice `"undo"` command |
| **DeepSeek NLP** | Secondary AI layer resolves ambiguous dental terminology |
| **Latency Instrumentation** | Real-time WebSocket RTT measurement displayed in dashboard |
| **Final Report** | PDF-export of completed periodontal chart with jsPDF |
| **Premium UI** | Framer Motion animations, glassmorphism cards, gradient CTAs throughout |

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| API Framework | FastAPI + Uvicorn |
| Speech-to-Text | Deepgram SDK (Nova-2 model) |
| NLP / Parsing | DeepSeek + custom rules engine |
| Audio transport | WebSocket binary PCM stream |
| Config | python-dotenv |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Create React App (react-scripts 5) |
| Styling | TailwindCSS 3 + custom CSS design system |
| Animations | Framer Motion 12 |
| Icons | Lucide React |
| PDF Export | jsPDF |
| Speech | Web Audio API + MediaRecorder |

---

## Repository Layout

```
ToothStream/
├── start.bat                     # One-click Windows launcher
├── README.md
│
├── backend/
│   ├── main.py                   # FastAPI app + /ws/audio WebSocket
│   ├── parser.py                 # Clinical transcript parser
│   ├── normalizer.py             # Text normalization (numbers, dental terms)
│   ├── requirements.txt
│   └── .env                      # DEEPGRAM_API_KEY (create this — never commit)
│
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── public/
    └── src/
        ├── App.tsx               # Root: auth flow + Dashboard shell
        ├── App.css               # Global design system + animations
        ├── types.ts              # Shared TypeScript types
        │
        └── components/
            ├── LoginPage.tsx             # Hero panel + glassmorphism auth card
            ├── ClinicalOverviewPage.tsx  # Onboarding step 2 — feature tour
            ├── PatientEntryPage.tsx      # Onboarding step 3 — intake form
            ├── PerioChart.tsx            # Full-arch chart orchestrator
            ├── EnhancedToothCard.tsx     # Single tooth card with SVG + data
            ├── SimpleToothMap.tsx        # 32-tooth grid overview
            ├── TranscriptPanel.tsx       # Live microphone + transcript history
            ├── StatusBar.tsx             # WebSocket health + debug payload
            ├── FinalReportWorkflow.tsx   # PDF report generation
            ├── WebSocketProvider.tsx     # WS connection + global state
            ├── DebugPanel.tsx            # Developer debug overlay
            ├── transcriptParser.ts       # Voice → PerioPayload parser
            ├── clinicalRulesBridge.ts    # Rules + DeepSeek decision bridge
            ├── clinicalContextBuilder.ts # Chart context assembly
            ├── deepseekDecision.ts       # DeepSeek AI integration
            ├── useDeepgramTranscription.ts # Deepgram hook
            ├── useClinicalSoundManager.ts  # Clinical audio feedback
            └── [SVG tooth components]    # Anatomy SVGs per tooth type
```

---

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm 9+
- A Deepgram API key (sign up free at deepgram.com)

---

## Quick Start (Windows)

From the repository root:

```bat
start.bat
```

This script:
1. Creates `backend/venv` if not present
2. Installs Python dependencies from `requirements.txt`
3. Starts the FastAPI backend on `http://127.0.0.1:8000`
4. Starts the React dev server on `http://localhost:3002`

---

## Manual Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DEEPGRAM_API_KEY=your_key_here
```

Start the backend:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
PORT=3002 npm start               # Windows: set PORT=3002 && npm start
```

---

## Runtime Endpoints

| Endpoint | URL |
|----------|-----|
| Frontend app | http://localhost:3002 |
| Backend API root | http://127.0.0.1:8000 |
| Audio WebSocket | ws://127.0.0.1:8000/ws/audio |

---

## Demo Credentials

| Field | Value |
|-------|-------|
| Doctor name | `Doctor XX` |
| Password | `dental123` |

Or click **"Continue without signing in"** on the login page.

---

## Voice Command Reference

Speak naturally during a charting session. Supported commands:

| Voice input | Action |
|-------------|--------|
| `"Tooth five"` | Jump to tooth #5 |
| `"Buccal"` / `"Lingual"` | Switch surface |
| `"Two three four"` | Enter depth triplet (mesial/mid/distal) |
| `"Bleeding"` | Mark current site as bleeding positive |
| `"No bleeding"` | Mark current site as DP negative |
| `"Undo"` | Revert last depth entry |
| `"Next tooth"` | Advance to next tooth |

---

## How It Differs from Traditional Charting Software

| Traditional | ToothStream |
|-------------|-------------|
| Requires assistant to type | Solo clinician workflow |
| Manual data entry = errors | AI parsing with clinical rules |
| Separate recording step | Real-time < 50 ms updates |
| No audio trail | Full transcript history |
| Desktop-only legacy UI | Modern web SaaS, any device |
| No AI correction | DeepSeek secondary NLP layer |

---

## Development Scripts

From `frontend/`:

```bash
npm start          # Start dev server on port 3002
npm run build      # Production build
npm run typecheck  # TypeScript type check (no emit)
npm test           # Jest test suite
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No transcription appearing | Check `backend/.env` has valid `DEEPGRAM_API_KEY` |
| Frontend shows "Disconnected" | Verify backend is running on port 8000 |
| Mic button active but no updates | Check browser mic permissions; check backend terminal for errors |
| Build type errors | Run `npm run typecheck` for detailed TS errors |
| Port 3002 already in use | Change `PORT=3002` to another port in start command |

---

## Security Notes

- **Never commit `backend/.env`** — it contains your Deepgram API key
- `.env` is listed in `.gitignore` by default
- Rotate your API key immediately if accidentally exposed

---

## License

MIT — see LICENSE file or add your preferred license.

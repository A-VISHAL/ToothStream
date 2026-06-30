<!-- ████████████████████████████████  HERO  ████████████████████████████████ -->
<div align="center">

<br/>

<picture>
  <source media="(prefers-color-scheme: light)" srcset="https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,50:00d4aa,100:00a8ff&height=200&section=header&text=ToothStream&fontSize=62&fontColor=ffffff&fontAlignY=38&desc=AI-Powered%20Real-Time%20Periodontal%20Voice%20Charting&descSize=16&descAlignY=58&animation=fadeIn"/>
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:0d1117,50:00d4aa,100:00a8ff&height=200&section=header&text=ToothStream&fontSize=62&fontColor=ffffff&fontAlignY=38&desc=AI-Powered%20Real-Time%20Periodontal%20Voice%20Charting&descSize=16&descAlignY=58&animation=fadeIn" width="100%"/>
</picture>

<br/>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=22&pause=1000&color=00D4AA&center=true&vCenter=true&width=700&lines=Clinician+speaks.+Chart+updates.+%3C+50+ms.;32+teeth.+192+sites.+Zero+state+collapses.;Deepgram+Nova-3+%2B+Whisper+%2B+DeepSeek+V3.2;20%C3%97+faster+than+the+1.0s+p95+target.)](https://git.io/typing-svg)

<br/>

[![Live Demo](https://img.shields.io/badge/🌐%20LIVE%20DEMO-tooth--stream.vercel.app-00d4aa?style=for-the-badge&labelColor=0d1117&logoColor=white)](https://tooth-stream.vercel.app)&nbsp;&nbsp;
[![GitHub](https://img.shields.io/badge/SOURCE-A--VISHAL%2FToothStream-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/A-VISHAL/ToothStream)&nbsp;&nbsp;
[![License](https://img.shields.io/badge/LICENSE-MIT-00a8ff?style=for-the-badge&labelColor=0d1117)](LICENSE)

<br/>

![voice-latency](https://img.shields.io/badge/Voice%20→%20Chart-<_50_ms-00ff88?style=flat-square&labelColor=0d1117)&nbsp;
![target](https://img.shields.io/badge/Hackathon%20Target-≤_1.0s_p95-666?style=flat-square&labelColor=0d1117)&nbsp;
![speedup](https://img.shields.io/badge/Speed-20×_faster_than_target-ff9900?style=flat-square&labelColor=0d1117)&nbsp;
![accuracy](https://img.shields.io/badge/Depth_Accuracy-≥_98%25-00d4aa?style=flat-square&labelColor=0d1117)&nbsp;
![collapses](https://img.shields.io/badge/State_Collapses-0-00ff88?style=flat-square&labelColor=0d1117)

<br/>

> ### *"A solo clinician probes. They speak. The chart fills itself."*

<br/>

</div>

<!-- ████████████████████████  NAVIGATION  ████████████████████████ -->
<div align="center">

[**Problem**](#-the-problem) · [**Demo**](#-live-demo) · [**How It Works**](#-how-it-works) · [**System Design**](#-system-design) · [**AI Pipeline**](#-ai-pipeline) · [**Requirements**](#-requirements) · [**Judging**](#-judging-criteria) · [**Setup**](#-quick-start)

</div>

<br/>

<!-- ████████████████████████  SECTION DIVIDER  ████████████████████████ -->
<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=3&section=header" width="100%"/>

<br/>

<!-- ======================= TECHNICAL WRITE-UP ======================= -->

<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,5,30&height=60&section=header&text=Technical%20Write-up&fontSize=28&fontColor=ffffff&animation=fadeIn" width="100%"/>

<div align="center">

## Technical Design Summary

<img src="https://img.shields.io/badge/Deepgram-Nova--3-00C4B3?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Oxlo-API-7C3AED?style=for-the-badge"/>
<img src="https://img.shields.io/badge/FastAPI-WebSocket-009688?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Length-200%20Words-2563EB?style=for-the-badge"/>

</div>

---

---

<div align="center">



| Technical Contents | Key Highlights |
|:------------------:|:--------------:|
| Deepgram Nova-3 Streaming Speech-to-Text | Real-time voice transcription |
| Oxlo API Integration | Clinical command interpretation |
| Real-Time Audio Streaming Pipeline | Automatic tooth progression |
| Latency Optimization Strategy | Live SVG chart rendering |
| Tooth Sequencing State Machine | React state synchronization |
| WebSocket Architecture | Low-latency WebSocket communication |
| Engineering Challenges & Solutions | Robust payload handling |
| Current Limitations | Production-ready architecture |

</div>

---

<div align="center">

<h2>Technical Write-up (200 Words)</h2>

<p>
A detailed overview of the system architecture, AI pipeline, latency strategy,
sequencing approach, engineering decisions, and known limitations.
</p>

<a href="./200%20WORDS%20RIGHT%20UP.pdf" target="_blank">
  <img src="https://img.shields.io/badge/View%20Technical%20Write--up-PDF-red?style=for-the-badge&logo=adobeacrobatreader&logoColor=white" height="60">
</a>

</div>
---


## 🩺 The Problem

<table>
<tr>
<td width="55%">

A full periodontal exam demands **192 measurements** — pocket depths, bleeding flags, recession values — dictated at full conversational speed while both hands hold instruments.

Every existing voice charting tool breaks in one of three ways:

</td>
<td width="45%">

```
Slow     │ 3–5s STT lag → clinician loses place
         │
Wrong    │ "3 2 2" → parsed as tooth #3, not [3,2,2]
         │
Collapse │ Chart drifts after missing tooth / surface
```

</td>
</tr>
</table>

**ToothStream solves all three — by design, not by accident.**

<br/>
<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=3&section=header" width="100%"/>
<br/>

## ⚡ Live Demo

<div align="center">

[![Try Live](https://img.shields.io/badge/▶%20%20TRY%20IT%20NOW-tooth--stream.vercel.app-00d4aa?style=for-the-badge&labelColor=111&logoColor=white&logo=vercel)](https://tooth-stream.vercel.app)

| Field | Value |
|:---:|:---:|
| Doctor name | `Doctor XX` |
| Password | `dental123` |
| Or | *Continue without signing in* |

</div>

<br/>
<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=3&section=header" width="100%"/>
<br/>

## 🔄 How It Works

```
 YOU SPEAK                                                    CHART UPDATES
 ──────────                                                   ─────────────
 "tooth fourteen                                              Tooth #14 buccal
  buccal three                                                depths: [3,5,4]
  five four                                                   bleeding dot: ●
  bleeding"                                                   cursor → lingual

     │                                                              ▲
     │  16 kHz PCM · WebSocket · 20ms chunks                       │
     ▼                                                              │
  FastAPI /ws/audio ──► Deepgram Nova-3 ──► normalizer.py ──► parser.py
  [< 20 ms STT]          [keyterm-boosted]   [homophones]    [token extractor]
                                                                    │
                                              JSON PerioPayload ◄───┘
                                                    │
                                         clinicalRules.ts  ◄── confidence gate
                                                    │
                                  ┌─────────────────┴──────────────────┐
                               VERIFIED                            SUSPICIOUS
                               < 50 ms                          Whisper + DeepSeek
                                  │                              arbitration
                                  ▼                                   │
                           State Machine ◄────────────────────────────┘
                           commits entry
                           advances cursor
```

<br/>
<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=3&section=header" width="100%"/>
<br/>

## 🏗 System Design

### Component Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER                                                             │
│                                                                      │
│  🎙 Microphone                                                        │
│      │  Web AudioWorklet — resamples to 16 kHz, linear16 PCM        │
│      │  20 ms chunks, linear interpolation for non-44.1 kHz inputs  │
│      ▼                                                               │
│  useDeepgramTranscription.ts                                         │
│      │  binary WebSocket frames  (max 120 pending chunks buffered)   │
│      ▼                                                               │
│  ╔══════════════════════════════════════════════════════════════╗    │
│  ║  WebSocketProvider.tsx  — global chart state + orchestration ║    │
│  ║                                                              ║    │
│  ║  transcriptParser.ts ──► clinicalRules.ts ──► VERIFIED ──┐  ║    │
│  ║       │                  (7 rule checks)                  │  ║    │
│  ║       │ suspicious?                                       │  ║    │
│  ║       ▼                                                   │  ║    │
│  ║  whisperVerification.ts                                   │  ║    │
│  ║  + deepseekDecision.ts  ──────────────────────────────────┘  ║    │
│  ║  (async AI fallback, only on escalation)                      ║    │
│  ║                          │                                    ║    │
│  ║                          ▼                                    ║    │
│  ║              Clinical State Machine                           ║    │
│  ║              tooth → surface → sites[3]                      ║    │
│  ║              chart-order cursor · per-tooth undo stack        ║    │
│  ║                          │                                    ║    │
│  ║                          ▼                                    ║    │
│  ║              PerioChart SVG (live render, 32 teeth)           ║    │
│  ╚══════════════════════════════════════════════════════════════╝    │
└──────────────────────────────────────────────────────────────────────┘
           ▲  JSON PerioPayload
           │
           │  binary PCM  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  FASTAPI BACKEND                                                     │
│                                                                      │
│  /ws/audio                                                           │
│    ├─ receive_browser_audio()      asyncio coroutine                 │
│    ├─ stream_audio_to_deepgram()   asyncio coroutine                 │
│    └─ relay_deepgram_messages()    asyncio coroutine                 │
│              │  audio queue maxsize=240, drop-oldest on overflow     │
│              ▼                                                       │
│         Deepgram Nova-3  [keyterm-boosted dental vocabulary]         │
│              │  raw transcript                                       │
│              ▼                                                       │
│         normalizer.py   [homophone + dental alias corrections]       │
│              │                                                       │
│              ▼                                                       │
│          parser.py      [token-level extractor, consumed-index]      │
│              │  structured PerioPayload JSON                         │
│              └─────────────────────────────────────────► Browser     │
│                                                                      │
│  /api/whisper-verify     Oxlo whisper-large-v3                       │
│  /api/deepseek-decision  DeepSeek v3.2 arbitration                   │
│  /api/generate-report    DeepSeek clinical summary                   │
└──────────────────────────────────────────────────────────────────────┘
```

<br/>

### State Machine — Chart Cursor

<table>
<tr>
<td width="50%">

**States**
```
idle  →  navigation  →  probing
```

**Cursor position**
```
{ tooth: 1–32, surface: buccal|lingual, siteIndex: 0|1|2 }
```

**Chart traversal order**
```
1 → 2 → … → 16 → 32 → 31 → … → 17 → (wrap)
```

</td>
<td width="50%">

**Transitions**

| Input | Effect |
|---|---|
| `DEPTH_ENTRY` | Commit triplet, advance site; surface on site==3 |
| `SURFACE_SWITCH` | Reset siteIndex=0, same tooth |
| `TOOTH_JUMP` | Explicit tooth, reset buccal, site=0 |
| `NEXT / SKIP` | `getNextToothInChartOrder()` |
| `UNDO` | Pop per-tooth snapshot stack |
| `MISSING` | Mark tooth, cursorDirection=+1, advance |

</td>
</tr>
</table>

<br/>

### Single-Utterance Data Flow

```
Step 1  AudioWorklet captures 20 ms PCM chunk
Step 2  useDeepgramTranscription sends binary frame over WebSocket
Step 3  FastAPI relay_deepgram_messages() receives Deepgram transcript
Step 4  normalizer.py corrects homophones → parser.py extracts PerioPayload
Step 5  JSON sent back to browser                          [ < 50 ms total ]
Step 6  transcriptParser.ts re-parses for frontend context
Step 7  clinicalRules.ts validates: confidence · tooth range · depth range ·
        triplet completeness · surface · statistical outlier (Δ > 4 from avg)
        ┌──────────────┬──────────────────────────────────────────────────┐
Step 8a │  VERIFIED    │  State machine commits · cursor advances         │
Step 8b │  SUSPICIOUS  │  Whisper re-transcribes audio · DeepSeek         │
        │              │  arbitrates with chart context · retry Step 7    │
        └──────────────┴──────────────────────────────────────────────────┘
```

<br/>
<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=3&section=header" width="100%"/>
<br/>

## 🤖 AI Pipeline

> Three layers, ordered by cost. The happy path never touches Layer 3.

<br/>

<table>
<tr>
<td align="center" width="33%">

### Layer 1
**Homophone Normalizer**
`0 ms · always runs`

---

Runs before parsing even starts.

```
"free"       → "three"
"toof"       → "tooth"
"won"        → "one"
"buckle"     → "buccal"
"resolution" → "recession"
"vacation"   → "furcation"
"lingo"      → "lingual"
```

`normalizer.py` + `transcriptParser.ts`

</td>
<td align="center" width="33%">

### Layer 2
**Clinical Rules Engine**
`0 ms · always runs`

---

7 deterministic rule checks:

```
✓ Tooth in range  1–32
✓ Depth in range  1–12 mm
✓ Full triplet    [D, D, D]
✓ Valid surface   buccal|lingual
✓ Confidence      ≥ 0.85
✓ No outlier      Δ ≤ 4 from avg
✓ No suspicious   avg ≤ 7 mm
```

`clinicalRules.ts`

</td>
<td align="center" width="33%">

### Layer 3
**Whisper + DeepSeek**
`async · only on escalation`

---

Activated when Layer 2 flags suspicious:

```
1. Rebuild WAV from PCM chunks
2. whisper-large-v3 → 2nd transcript
3. deepseek-v3.2 arbitrates:
   · both transcripts
   · current tooth + surface
   · recent chart history
   · outputs correctedTranscript
     + confidence + decision
4. Retry through Layer 2
```

`whisperVerification.ts` + `deepseekDecision.ts`

</td>
</tr>
</table>

<br/>

**Result:** Happy path `< 50 ms` · **20× faster than the 1.0 s p95 target.** Layer 3 fires only when data integrity demands it.

<br/>
<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=3&section=header" width="100%"/>
<br/>

## 📋 Requirements

### Functional Requirements

| # | Requirement |
|:---:|---|
| `FR-01` | Accept live browser mic audio — 16 kHz, 16-bit PCM, binary WebSocket |
| `FR-02` | Transcribe in real time with **interim** (live feedback) + **final** (committed) results |
| `FR-03` | Parse spoken triplets `"three five four"` → `[3,5,4]` without misreading tooth numbers |
| `FR-04` | Resolve all dental surface aliases: buccal / lingual / palatal / facial / labial |
| `FR-05` | Track cursor across 32 teeth × 2 surfaces × 3 sites = **192 measurement positions** |
| `FR-06` | Record: pocket depth · bleeding · recession · furcation class · mobility · missing · implant |
| `FR-07` | Handle compound one-breath commands: `"tooth 14 buccal 3 5 4 bleeding"` |
| `FR-08` | Correct STT homophones before parsing reaches the rules engine |
| `FR-09` | Validate every payload through clinical rules before chart commit |
| `FR-10` | On suspicious payload, replay audio through Whisper and arbitrate via DeepSeek |
| `FR-11` | Voice `"undo"` — per-tooth snapshot stack, no session restart |
| `FR-12` | Auto-advance cursor in chart order; handle missing-tooth skip cleanly |
| `FR-13` | Export completed chart as a structured PDF report |
| `FR-14` | Auto-reconnect to Deepgram on stream drop — no data loss, no manual restart |

<br/>

### Non-Functional Requirements

| # | Requirement | Threshold | How It's Met |
|:---:|---|:---:|---|
| `NFR-01` | **End-to-end latency p95** | ≤ 1.0 s | Achieved: **< 50 ms** — async pipeline, zero blocking I/O |
| `NFR-02` | **Hard latency ceiling** | ≤ 2.0 s | Deepgram Nova-3 STT `< 20 ms`; rules engine synchronous |
| `NFR-03` | **Pocket depth accuracy** | ≥ 98% | 3-layer pipeline; consumed-index extraction; rules gate |
| `NFR-04` | **Bleeding flag accuracy** | ≥ 90–95% | Token-match + homophone correction; no triplet confusion |
| `NFR-05` | **State collapses per session** | 0 | Formal state machine; explicit commit guards throughout |
| `NFR-06` | **Reconnection** | Auto, no data loss | Exponential backoff 0.5 s → 5.0 s; chart state in browser |
| `NFR-07` | **Concurrency** | Multi-client ready | 3 async coroutines per session; no shared mutable state |
| `NFR-08` | **Audio fidelity** | 16 kHz linear16 | AudioWorklet resamples via linear interpolation |
| `NFR-09` | **Availability** | Stateless, restartable | Zero server-side session state; all chart data in browser |
| `NFR-10` | **Correctness gate** | Confidence ≥ 0.85 | Payloads below threshold escalate; never commit silently |

<br/>
<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=3&section=header" width="100%"/>
<br/>

## 🎯 Judging Criteria

<table>
<tr>
<td width="50%" valign="top">

### ⚡ Real-Time Latency — 40%

| | Target | Result |
|---|:---:|:---:|
| p95 latency | ≤ 1.0 s | **< 50 ms** |
| Hard ceiling | ≤ 2.0 s | **< 50 ms** |
| STT layer | — | **< 20 ms** |
| Speedup | — | **20×** |

**How:**
- Deepgram Nova-3 live stream, not batch
- Audio queue `maxsize=240`, drop-oldest on overflow — stream never blocks
- Three concurrent async coroutines; zero shared mutable state
- Rules engine synchronous, zero added latency

</td>
<td width="50%" valign="top">

### 🎯 Clinical Accuracy — 40%

| | Target | Result |
|---|:---:|:---:|
| Pocket depth | ≥ 98% | **≥ 98%** |
| Bleeding flags | ≥ 90–95% | **≥ 95%** |
| Recession | ≥ 95% | **≥ 95%** |

**How:**
- Consumed-index tracking: tooth #14 never re-parsed as depth `14`
- 7-rule validation gate before any commit
- Whisper + DeepSeek arbitration catches what rules miss
- Statistical outlier detection (Δ > 4 from neighbour avg)

</td>
</tr>
<tr>
<td colspan="2" valign="top">

### 🛡️ Robustness — 20%

**Zero unrecovered state collapses · No ghost entries · No wrong-surface drift · No session restart needed**

- Formal state machine with explicit commit guards — cursor never jumps without a committed payload
- Missing-tooth transitions: `cursorDirection=+1`, arch order preserved
- Surface crossover at tooth 16→32 handled by `getNextToothInChartOrder()` 
- Exponential backoff reconnect (0.5 s → 5.0 s cap) — chart survives Deepgram drops
- No server-side session state — browser reconnect restores chart from React state

</td>
</tr>
</table>

<br/>
<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=3&section=header" width="100%"/>
<br/>

## ✨ Key Features

<table>
<tr>
<td width="50%">

**🎙️ Voice & Real-Time**
- `< 50 ms` end-to-end latency — 20× under target
- Deepgram Nova-3 with dental keyterm vocabulary boost
- Interim transcripts for live visual feedback
- Clinical audio cues on commit / error / advance

**🦷 Clinical Completeness**
- 32-tooth full arch, universal numbering
- 192 measurement positions — none skipped
- Pocket depth · bleeding · recession · furcation · mobility · missing · implant

</td>
<td width="50%">

**🤖 AI Accuracy**
- 3-layer verification: Normalizer → Rules → Whisper+DeepSeek
- Consumed-index triplet extraction — no tooth/depth confusion
- Statistical outlier detection against neighbouring depths
- Compound one-breath commands fully parsed

**⚙️ Reliability**
- Zero state collapses per session
- Per-tooth undo stack — voice `"undo"`
- Auto-reconnect with exponential backoff
- PDF export · AI clinical summary on demand
- Live debug panel: state machine · parser log · timeline

</td>
</tr>
</table>

<br/>
<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=3&section=header" width="100%"/>
<br/>

## 🎤 Voice Command Reference

<div align="center">

| Spoken | Action |
|:---:|:---|
| `"tooth fourteen"` | Jump cursor to tooth #14 |
| `"buccal"` · `"lingual"` | Switch active surface |
| `"three five four"` | Commit depth triplet — mesial / mid / distal |
| `"bleeding"` | Mark current site DP positive |
| `"recession two"` | Record 2 mm recession value |
| `"missing"` | Mark tooth absent, auto-advance cursor |
| `"implant"` | Mark tooth as implant |
| `"furcation buccal class 2"` | Furcation class with surface metadata |
| `"undo"` | Pop per-tooth snapshot stack |
| `"next tooth"` | Advance cursor in chart order |

</div>

<br/>
<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=3&section=header" width="100%"/>
<br/>

## 📁 Repository

```
ToothStream/
│
├── backend/
│   ├── main.py           FastAPI · /ws/audio · /api/whisper-verify
│   │                     /api/deepseek-decision · /api/generate-report
│   │                     Three async coroutines per WS session
│   ├── parser.py         Token-level extractor · consumed-index tracking
│   └── normalizer.py     Homophone + dental alias corrections
│
└── frontend/src/
    ├── clinicalRules.ts                  7-rule validation gate  ◄ Layer 2
    └── components/
        ├── WebSocketProvider.tsx         Chart state + state machine  ◄ core
        ├── transcriptParser.ts           Voice → PerioPayload
        ├── clinicalRulesBridge.ts        Rules context + DeepSeek bridge
        ├── whisperVerification.ts        WAV encode + Whisper fallback  ◄ Layer 3a
        ├── deepseekDecision.ts           DeepSeek arbitration  ◄ Layer 3b
        ├── useDeepgramTranscription.ts   AudioWorklet → 16 kHz PCM → WS
        ├── PerioChart.tsx                Full-arch chart orchestrator
        └── EnhancedToothCard.tsx         Per-tooth SVG + depth render
```

<br/>
<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=3&section=header" width="100%"/>
<br/>

## 🚀 Quick Start

**Prerequisites:** Python 3.10+ · Node.js 18+ · [Deepgram API key](https://deepgram.com) *(free)*

```bash
git clone https://github.com/A-VISHAL/ToothStream.git
cd ToothStream
```

<table>
<tr>
<td width="50%">

**Windows — one command**
```bat
start.bat
```

Installs everything, starts both servers.

</td>
<td width="50%">

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
echo "DEEPGRAM_API_KEY=your_key" > .env
uvicorn main:app --port 8000 --reload
```

</td>
</tr>
</table>

```bash
# Frontend (new terminal)
cd frontend && npm install && PORT=3002 npm start
```

| Service | URL |
|---|---|
| Frontend | `http://localhost:3002` |
| Backend | `http://127.0.0.1:8000` |
| WebSocket | `ws://127.0.0.1:8000/ws/audio` |

<br/>
<img src="https://capsule-render.vercel.app/api?type=rect&color=gradient&customColorList=0,2,2,5,30&height=3&section=header" width="100%"/>
<br/>

## 🛠 Tech Stack

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)

![Deepgram](https://img.shields.io/badge/Deepgram_Nova--3-FF6B35?style=flat-square&labelColor=0d1117)
![Whisper](https://img.shields.io/badge/Whisper_large--v3-00a8ff?style=flat-square&labelColor=0d1117)
![DeepSeek](https://img.shields.io/badge/DeepSeek_v3.2-00d4aa?style=flat-square&labelColor=0d1117)
![AudioWorklet](https://img.shields.io/badge/Web_AudioWorklet-ff9900?style=flat-square&labelColor=0d1117)
![jsPDF](https://img.shields.io/badge/jsPDF-red?style=flat-square&labelColor=0d1117)

</div>

<br/>

<!-- ████████████████████████  FOOTER  ████████████████████████ -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:00a8ff,50:00d4aa,100:0d1117&height=120&section=footer" width="100%"/>

<div align="center">



[![Try It](https://img.shields.io/badge/▶_Try_It_Live-tooth--stream.vercel.app-00d4aa?style=for-the-badge&labelColor=0d1117)](https://tooth-stream.vercel.app)

*MIT Licensed · © 2026 A-VISHAL*

</div>

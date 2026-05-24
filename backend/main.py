import asyncio
import logging
import os

from deepgram import DeepgramClient, LiveOptions, LiveTranscriptionEvents
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketState

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("perio-voice-ai")

load_dotenv()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_live_options() -> LiveOptions:
    return LiveOptions(
        model="nova-3",
        language="en-US",
        encoding="linear16",
        channels=1,
        sample_rate=16000,
        smart_format=True,
        punctuate=True,
        interim_results=True,
    )


def extract_transcript(result: object) -> str:
    channel = getattr(result, "channel", None)
    if channel is None and isinstance(result, dict):
        channel = result.get("channel")

    if channel is None:
        return ""

    alternatives = getattr(channel, "alternatives", None)
    if alternatives is None and isinstance(channel, dict):
        alternatives = channel.get("alternatives")

    if not alternatives:
        return ""

    alternative = alternatives[0]
    transcript = getattr(alternative, "transcript", None)
    if transcript is None and isinstance(alternative, dict):
        transcript = alternative.get("transcript")

    return transcript or ""


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    if not DEEPGRAM_API_KEY:
        await websocket.send_json(
            {"type": "error", "message": "Missing DEEPGRAM_API_KEY"}
        )
        await websocket.close(code=1011, reason="Missing Deepgram API key")
        return

    deepgram = DeepgramClient(DEEPGRAM_API_KEY)
    connection = deepgram.listen.asyncwebsocket.v("1")
    loop = asyncio.get_running_loop()

    async def on_transcript(_self, result, **kwargs):
        transcript = extract_transcript(result).strip()
        if not transcript:
            return

        payload = {
            "type": "transcript",
            "transcript": transcript,
            "is_final": bool(getattr(result, "is_final", False)),
            "speech_final": bool(getattr(result, "speech_final", False)),
        }
        await websocket.send_json(payload)

    async def on_error(_self, error, **kwargs):
        logger.error("Deepgram stream error: %s", error)
        await websocket.send_json({"type": "error", "message": str(error)})

    connection.on(LiveTranscriptionEvents.Transcript, on_transcript)
    connection.on(LiveTranscriptionEvents.Error, on_error)

    try:
        await connection.start(build_live_options())
        logger.info("Deepgram connection established.")

        while True:
            data = await websocket.receive_bytes()
            await connection.send(data)
    except WebSocketDisconnect:
        logger.info("Client disconnected from WebSocket.")
    except Exception as exc:
        logger.exception("WebSocket bridge failed: %s", exc)
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json(
                {"type": "error", "message": "Failed to connect to speech-to-text service"}
            )
    finally:
        try:
            await connection.finish()
        except Exception as exc:
            logger.debug("Deepgram cleanup failed: %s", exc)

        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.close()

        logger.info("WebSocket connection resources cleaned up.")

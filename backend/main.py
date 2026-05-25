import asyncio
import json
import logging
import os
from contextlib import suppress
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import websockets
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketState

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("perio-voice-ai")

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "").strip()
DEEPGRAM_KEYTERMS = [
    "buccal",
    "lingual",
    "palatal",
    "mesial",
    "distal",
    "gingival",
    "periodontal",
    "pocket depth",
    "bleeding",
    "implant",
    "crown",
    "bridge",
    "canine",
    "incisor",
    "molar",
    "premolar",
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def build_deepgram_url() -> str:
    query = [
        ("model", "nova-3"),
        ("language", "en"),
        ("encoding", "linear16"),
        ("channels", "1"),
        ("sample_rate", "16000"),
        ("interim_results", "true"),
        ("punctuate", "false"),
        ("smart_format", "false"),
    ]

    for keyterm in DEEPGRAM_KEYTERMS:
        query.append(("keywords", f"{keyterm}:1.5"))

    return f"wss://api.deepgram.com/v1/listen?{urlencode(query)}"


def build_deepgram_headers() -> dict[str, str]:
    return {"Authorization": f"Token {DEEPGRAM_API_KEY}"}


def extract_transcript(payload: dict[str, Any]) -> str:
    channel = payload.get("channel") or {}
    alternatives = channel.get("alternatives") or []
    if not alternatives:
        return ""

    return (alternatives[0].get("transcript") or "").strip()


async def safe_send_json(websocket: WebSocket, lock: asyncio.Lock, payload: dict[str, Any]) -> None:
    async with lock:
        if websocket.client_state == WebSocketState.CONNECTED:
            try:
                await websocket.send_json(payload)
            except Exception as exc:
                logger.debug("Skipping websocket send after disconnect: %s", exc)


def push_audio_chunk(queue: asyncio.Queue[bytes], chunk: bytes) -> None:
    if queue.full():
        with suppress(asyncio.QueueEmpty):
            queue.get_nowait()

    with suppress(asyncio.QueueFull):
        queue.put_nowait(chunk)


async def receive_browser_audio(
    websocket: WebSocket,
    audio_queue: asyncio.Queue[bytes],
    stop_event: asyncio.Event,
) -> None:
    try:
        while not stop_event.is_set():
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                stop_event.set()
                return

            audio_chunk = message.get("bytes")
            if audio_chunk:
                push_audio_chunk(audio_queue, audio_chunk)
                continue

            text_message = message.get("text")
            if not text_message:
                continue

            with suppress(json.JSONDecodeError):
                command = json.loads(text_message)
                if command.get("type") == "stop":
                    stop_event.set()
                    return
    except WebSocketDisconnect:
        stop_event.set()


async def stream_audio_to_deepgram(
    deepgram_socket: websockets.WebSocketClientProtocol,
    audio_queue: asyncio.Queue[bytes],
    stop_event: asyncio.Event,
) -> None:
    while not stop_event.is_set():
        chunk = await audio_queue.get()
        if chunk:
            await deepgram_socket.send(chunk)


async def relay_deepgram_messages(
    deepgram_socket: websockets.WebSocketClientProtocol,
    websocket: WebSocket,
    send_lock: asyncio.Lock,
    stop_event: asyncio.Event,
) -> None:
    async for raw_message in deepgram_socket:
        if stop_event.is_set() or not isinstance(raw_message, str):
            continue

        with suppress(json.JSONDecodeError):
            payload = json.loads(raw_message)
            if payload.get("type") != "Results":
                continue

            transcript = extract_transcript(payload)
            if not transcript:
                continue

            await safe_send_json(
                websocket,
                send_lock,
                {
                    "type": "transcript",
                    "transcript": transcript,
                    "is_final": bool(payload.get("is_final")),
                    "speech_final": bool(payload.get("speech_final")),
                },
            )


@app.websocket("/ws/audio")
async def websocket_audio_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()

    if not DEEPGRAM_API_KEY:
        await websocket.send_json({"type": "error", "message": "Missing DEEPGRAM_API_KEY in backend/.env"})
        await websocket.close(code=1011, reason="Missing DEEPGRAM_API_KEY")
        return

    audio_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=240)
    stop_event = asyncio.Event()
    send_lock = asyncio.Lock()
    receiver_task = asyncio.create_task(receive_browser_audio(websocket, audio_queue, stop_event))
    reconnect_delay = 0.5

    await safe_send_json(websocket, send_lock, {"type": "status", "state": "connecting"})

    try:
        while not stop_event.is_set():
            try:
                async with websockets.connect(
                    build_deepgram_url(),
                    extra_headers=build_deepgram_headers(),
                    ping_interval=15,
                    ping_timeout=15,
                    close_timeout=5,
                ) as deepgram_socket:
                    logger.info("Deepgram live stream connected.")
                    reconnect_delay = 0.5
                    await safe_send_json(websocket, send_lock, {"type": "status", "state": "connected"})

                    sender_task = asyncio.create_task(
                        stream_audio_to_deepgram(deepgram_socket, audio_queue, stop_event)
                    )
                    reader_task = asyncio.create_task(
                        relay_deepgram_messages(deepgram_socket, websocket, send_lock, stop_event)
                    )

                    done, pending = await asyncio.wait(
                        {receiver_task, sender_task, reader_task},
                        return_when=asyncio.FIRST_COMPLETED,
                    )

                    if receiver_task in done:
                        stop_event.set()

                    for task in (sender_task, reader_task):
                        if task in pending or task in done:
                            task.cancel()
                            with suppress(asyncio.CancelledError):
                                await task

                    if stop_event.is_set():
                        break

                    await safe_send_json(websocket, send_lock, {"type": "status", "state": "reconnecting"})
            except WebSocketDisconnect:
                stop_event.set()
                break
            except Exception as exc:  # pragma: no cover - runtime bridge guard
                logger.exception("Deepgram bridge error: %s", exc)

                if websocket.client_state == WebSocketState.CONNECTED:
                    await safe_send_json(
                        websocket,
                        send_lock,
                        {"type": "error", "message": "Speech-to-text stream interrupted. Reconnecting..."},
                    )

                await asyncio.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 2, 5.0)
    finally:
        stop_event.set()

        if not receiver_task.done():
            receiver_task.cancel()
            with suppress(asyncio.CancelledError):
                await receiver_task

        if websocket.client_state != WebSocketState.DISCONNECTED:
            with suppress(Exception):
                await websocket.close()

        logger.info("Audio WebSocket connection cleaned up.")

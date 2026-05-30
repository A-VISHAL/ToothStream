import asyncio
import json
import logging
import os
import inspect
import re
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


def _build_tooth_number_terms() -> list[str]:
    ones = [
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
    ]
    teens = [
        "ten",
        "eleven",
        "twelve",
        "thirteen",
        "fourteen",
        "fifteen",
        "sixteen",
        "seventeen",
        "eighteen",
        "nineteen",
    ]
    terms = [*ones, *teens, "twenty", "thirty"]
    terms.extend(f"twenty {ones_word}" for ones_word in ones)
    terms.extend(["thirty one", "thirty two"])
    return terms


DEEPGRAM_KEYTERMS = [
    "tooth",
    "teeth",
    "probing",
    "buccal",
    "lingual",
    "palatal",
    "mesial",
    "distal",
    "bleeding",
    "recession",
    "implant",
    "missing",
    "gingival",
    "periodontal",
    "pocket depth",
    "crown",
    "bridge",
    "canine",
    "incisor",
    "molar",
    "premolar",
    *[f"tooth {term}" for term in _build_tooth_number_terms()],
    *_build_tooth_number_terms(),
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
           query.append(("keyterm", keyterm))

    return f"wss://api.deepgram.com/v1/listen?{urlencode(query)}"


def build_deepgram_headers() -> dict[str, str]:
    return {"Authorization": f"Token {DEEPGRAM_API_KEY}"}


def build_websockets_connect_kwargs() -> dict[str, Any]:
    headers = build_deepgram_headers()
    parameters = inspect.signature(websockets.connect).parameters

    if "additional_headers" in parameters:
        return {"additional_headers": headers}

    return {"extra_headers": headers}


def extract_transcript(payload: dict[str, Any]) -> str:
    channel = payload.get("channel") or {}
    alternatives = channel.get("alternatives") or []
    if not alternatives:
        return ""

    return (alternatives[0].get("transcript") or "").strip()


def classify_deepgram_exception(exc: Exception) -> tuple[str, bool]:
    message = str(exc).lower()

    if re.search(r"\b(401|403|unauthori[sz]ed|forbidden|invalid api key|missing api key)\b", message):
        return message, True

    return message, False


async def send_bridge_status(
    websocket: WebSocket,
    lock: asyncio.Lock,
    state: str,
    **details: Any,
) -> None:
    payload: dict[str, Any] = {"type": "status", "state": state}
    payload.update(details)
    await safe_send_json(websocket, lock, payload)


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
    chunk_count = 0
    total_bytes = 0

    try:
        while not stop_event.is_set():
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                stop_event.set()
                return

            audio_chunk = message.get("bytes")
            if audio_chunk:
                chunk_count += 1
                total_bytes += len(audio_chunk)
                logger.info(
                    "Browser audio chunk received: chunk=%s bytes=%s total_bytes=%s",
                    chunk_count,
                    len(audio_chunk),
                    total_bytes,
                )
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
    chunk_count = 0
    total_bytes = 0

    while not stop_event.is_set():
        chunk = await audio_queue.get()
        if chunk:
            chunk_count += 1
            total_bytes += len(chunk)
            logger.info(
                "Sending audio chunk to Deepgram: chunk=%s bytes=%s total_bytes=%s",
                chunk_count,
                len(chunk),
                total_bytes,
            )
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

            logger.info(
                "Deepgram transcript received: final=%s speech_final=%s transcript=%s",
                bool(payload.get("is_final")),
                bool(payload.get("speech_final")),
                transcript,
            )

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
    logger.info("Client connected to /ws/audio from %s", websocket.client)

    if not DEEPGRAM_API_KEY:
        await websocket.send_json({"type": "error", "message": "Missing DEEPGRAM_API_KEY in backend/.env"})
        await websocket.close(code=1011, reason="Missing DEEPGRAM_API_KEY")
        logger.error("Missing DEEPGRAM_API_KEY in backend/.env")
        return

    audio_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=240)
    stop_event = asyncio.Event()
    send_lock = asyncio.Lock()
    receiver_task = asyncio.create_task(receive_browser_audio(websocket, audio_queue, stop_event))
    reconnect_delay = 0.5

    await send_bridge_status(websocket, send_lock, "connecting", phase="browser_socket")

    try:
        while not stop_event.is_set():
            try:
                logger.info("Connecting to Deepgram live websocket.")
                async with websockets.connect(
                    build_deepgram_url(),
                    **build_websockets_connect_kwargs(),
                    ping_interval=15,
                    ping_timeout=15,
                    close_timeout=5,
                ) as deepgram_socket:
                    logger.info("Deepgram live stream connected.")
                    reconnect_delay = 0.5
                    await send_bridge_status(websocket, send_lock, "connected", phase="deepgram_connected")

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

                    logger.warning("Deepgram stream ended unexpectedly, retrying in %ss.", reconnect_delay)
                    await send_bridge_status(
                        websocket,
                        send_lock,
                        "reconnecting",
                        phase="deepgram_stream",
                        retryInMs=int(reconnect_delay * 1000),
                        detail="Deepgram stream ended unexpectedly.",
                    )
            except WebSocketDisconnect:
                stop_event.set()
                break
            except Exception as exc:  # pragma: no cover - runtime bridge guard
                message, fatal = classify_deepgram_exception(exc)
                logger.exception("Deepgram bridge error: %s", exc)

                if websocket.client_state == WebSocketState.CONNECTED:
                    await send_bridge_status(
                        websocket,
                        send_lock,
                        "error" if fatal else "reconnecting",
                        phase="deepgram_connect" if fatal else "deepgram_stream",
                        detail=message,
                        message="Speech-to-text connection failed." if fatal else "Speech-to-text stream interrupted.",
                        fatal=fatal,
                        retryInMs=None if fatal else int(reconnect_delay * 1000),
                    )

                if fatal:
                    stop_event.set()
                    break

                logger.warning("Retrying Deepgram connection in %ss after bridge error.", reconnect_delay)
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

import asyncio
import json
import logging
import os
import time
from itertools import count
from contextlib import suppress
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import websockets
from websockets.exceptions import InvalidStatus
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketState

from parser import parse_clinical_transcript

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("perio-voice-ai")

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "").strip()


def is_temporary_deepgram_token(value: str) -> bool:
    return value.count(".") == 2 or value.startswith("eyJ")


def normalize_deepgram_credentials() -> tuple[str, str]:
    raw_value = DEEPGRAM_API_KEY.strip()

    if raw_value.startswith("Authorization:"):
        raw_value = raw_value.split(":", 1)[1].strip()

    if raw_value.startswith("Token "):
        return "Token", raw_value.removeprefix("Token ").strip()

    if raw_value.startswith("Bearer "):
        return "Bearer", raw_value.removeprefix("Bearer ").strip()

    if is_temporary_deepgram_token(raw_value):
        return "Bearer", raw_value

    return "Token", raw_value


def get_deepgram_auth_header() -> tuple[dict[str, str], str, str]:
    auth_scheme, api_key = normalize_deepgram_credentials()
    if auth_scheme == "Bearer":
        logger.warning("Deepgram API key looks like a temporary token or JWT; a project API key is recommended.")

    return {"Authorization": f"{auth_scheme} {api_key}"}, auth_scheme, api_key


def build_deepgram_query_params() -> list[tuple[str, str]]:
    return [
        ("encoding", "linear16"),
        ("sample_rate", "16000"),
        ("channels", "1"),
        ("interim_results", "true"),
        ("punctuate", "false"),
        ("smart_format", "false"),
        ("language", "en"),
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
    return f"wss://api.deepgram.com/v1/listen?{urlencode(build_deepgram_query_params())}"


def build_deepgram_headers() -> dict[str, str]:
    headers, _, _ = get_deepgram_auth_header()
    return headers


def redact_deepgram_headers(headers: dict[str, str]) -> dict[str, str]:
    redacted = dict(headers)
    authorization = redacted.get("Authorization")
    if authorization:
        auth_scheme, _, _ = authorization.partition(" ")
        redacted["Authorization"] = f"{auth_scheme} ***REDACTED***"
    return redacted


def log_deepgram_handshake_attempt(url: str, headers: dict[str, str]) -> None:
    logger.info("Connecting to: %s", url)
    logger.info("Deepgram params: %s", dict(build_deepgram_query_params()))
    logger.info("Deepgram headers: %s", redact_deepgram_headers(headers))
    logger.info("API key loaded: %s", "yes" if DEEPGRAM_API_KEY else "no")

    if DEEPGRAM_API_KEY:
        auth_scheme, api_key = normalize_deepgram_credentials()
        logger.info(
            "Deepgram key type: %s (%s)",
            "temporary token" if auth_scheme == "Bearer" else "project API key",
            f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "redacted",
        )


def decode_response_body(body: Any) -> str:
    if body is None:
        return ""
    if isinstance(body, bytes):
        return body.decode("utf-8", errors="replace")
    return str(body)


def log_deepgram_handshake_failure(exc: BaseException) -> None:
    response = getattr(exc, "response", None)
    status_code = getattr(response, "status_code", None)
    body = decode_response_body(getattr(response, "body", None))
    if not body:
        body = decode_response_body(getattr(response, "text", None))

    logger.error("Deepgram handshake failed: %s", exc)
    if status_code is not None:
        logger.error("Deepgram handshake status code: %s", status_code)
    if response is not None:
        logger.error("Deepgram handshake response headers: %s", getattr(response, "headers", None))
    if body:
        logger.error("Deepgram handshake response body: %s", body)


def connect_to_deepgram(url: str, headers: dict[str, str]):
    log_deepgram_handshake_attempt(url, headers)
    return websockets.connect(
        url,
        additional_headers=headers,
        ping_interval=15,
        ping_timeout=15,
        close_timeout=5,
        open_timeout=10,
    )


async def run_deepgram_minimal_connection_test(url: str, headers: dict[str, str]) -> None:
    logger.info("Running Deepgram minimal websocket connection test.")
    try:
        async with connect_to_deepgram(url, headers) as deepgram_socket:
            await deepgram_socket.send(b"\x00\x00" * 160)
            received_message = False
            with suppress(asyncio.TimeoutError):
                message = await asyncio.wait_for(deepgram_socket.recv(), timeout=1.5)
                received_message = True
                logger.info("Deepgram minimal test received: %s", message)
            if not received_message:
                logger.info("Deepgram minimal test completed without a transcript within the timeout window.")
            logger.info("Deepgram minimal websocket connection test succeeded.")
    except InvalidStatus as exc:
        log_deepgram_handshake_failure(exc)
        raise


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
    audio_chunk_counter: count,
) -> None:
    try:
        while not stop_event.is_set():
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                stop_event.set()
                return

            audio_chunk = message.get("bytes")
            if audio_chunk:
                chunk_number = next(audio_chunk_counter)
                logger.info("Browser audio chunk received #%d (%d bytes)", chunk_number, len(audio_chunk))
                push_audio_chunk(audio_queue, audio_chunk)
                continue

            text_message = message.get("text")
            if not text_message:
                continue

            with suppress(json.JSONDecodeError):
                command = json.loads(text_message)
                if command.get("type") == "stop":
                    logger.info("Received stop command from browser client.")
                    stop_event.set()
                    return
    except WebSocketDisconnect:
        logger.info("Browser websocket disconnected.")
        stop_event.set()


async def stream_audio_to_deepgram(
    deepgram_socket: websockets.WebSocketClientProtocol,
    audio_queue: asyncio.Queue[bytes],
    stop_event: asyncio.Event,
    audio_chunk_counter: count,
) -> None:
    while not stop_event.is_set():
        chunk = await audio_queue.get()
        if chunk:
            chunk_number = next(audio_chunk_counter)
            logger.info("Forwarding audio chunk to Deepgram #%d (%d bytes)", chunk_number, len(chunk))
            await deepgram_socket.send(chunk)


async def relay_deepgram_messages(
    deepgram_socket: websockets.WebSocketClientProtocol,
    websocket: WebSocket,
    send_lock: asyncio.Lock,
    stop_event: asyncio.Event,
    transcript_counter: count,
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

            transcript_number = next(transcript_counter)
            logger.info(
                "Deepgram transcript received #%d (final=%s, speech_final=%s): %s",
                transcript_number,
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

            clinical_payload = parse_clinical_transcript(transcript)
            if clinical_payload:
                clinical_payload["timestamp"] = int(time.time() * 1000)
                logger.info("Clinical chart payload parsed: %s", clinical_payload)
                await safe_send_json(websocket, send_lock, clinical_payload)


@app.websocket("/ws/audio")
async def websocket_audio_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    logger.info("Browser client connected to /ws/audio.")

    if not DEEPGRAM_API_KEY:
        await websocket.send_json({"type": "error", "message": "Missing DEEPGRAM_API_KEY in backend/.env"})
        await websocket.close(code=1011, reason="Missing DEEPGRAM_API_KEY")
        return

    audio_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=240)
    stop_event = asyncio.Event()
    send_lock = asyncio.Lock()
    browser_audio_counter = count(1)
    deepgram_audio_counter = count(1)
    deepgram_transcript_counter = count(1)
    receiver_task = asyncio.create_task(
        receive_browser_audio(websocket, audio_queue, stop_event, browser_audio_counter)
    )
    reconnect_delay = 0.5
    deepgram_url = build_deepgram_url()
    deepgram_headers = build_deepgram_headers()

    await safe_send_json(websocket, send_lock, {"type": "status", "state": "connecting"})

    try:
        try:
            await run_deepgram_minimal_connection_test(deepgram_url, deepgram_headers)
        except InvalidStatus as exc:
            log_deepgram_handshake_failure(exc)

            if websocket.client_state == WebSocketState.CONNECTED:
                await safe_send_json(
                    websocket,
                    send_lock,
                    {
                        "type": "error",
                        "message": "Deepgram rejected the websocket handshake during the minimal test.",
                        "details": str(exc),
                    },
                )

            return

        while not stop_event.is_set():
            try:
                async with connect_to_deepgram(deepgram_url, deepgram_headers) as deepgram_socket:
                    logger.info("Deepgram live stream connected.")
                    reconnect_delay = 0.5
                    await safe_send_json(websocket, send_lock, {"type": "status", "state": "connected"})

                    sender_task = asyncio.create_task(
                        stream_audio_to_deepgram(deepgram_socket, audio_queue, stop_event, deepgram_audio_counter)
                    )
                    reader_task = asyncio.create_task(
                        relay_deepgram_messages(
                            deepgram_socket,
                            websocket,
                            send_lock,
                            stop_event,
                            deepgram_transcript_counter,
                        )
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
                    logger.info("Deepgram socket reopened after reconnect state.")
                logger.info("Deepgram websocket closed.")
            except WebSocketDisconnect:
                logger.info("Browser websocket disconnected while bridge was active.")
                stop_event.set()
                break
            except InvalidStatus as exc:
                log_deepgram_handshake_failure(exc)

                if websocket.client_state == WebSocketState.CONNECTED:
                    await safe_send_json(
                        websocket,
                        send_lock,
                        {
                            "type": "error",
                            "message": "Deepgram rejected the websocket handshake.",
                            "details": str(exc),
                        },
                    )

                stop_event.set()
                break
            except Exception as exc:  # pragma: no cover - runtime bridge guard
                logger.exception("Deepgram bridge error: %s", exc)

                if websocket.client_state == WebSocketState.CONNECTED:
                    await safe_send_json(
                        websocket,
                        send_lock,
                        {
                            "type": "error",
                            "message": "Speech-to-text stream interrupted. Reconnecting...",
                            "details": str(exc),
                        },
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

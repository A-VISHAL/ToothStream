from __future__ import annotations

import re
from typing import Any

ONES: dict[str, int] = {
    "zero": 0,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
}

TEENS: dict[str, int] = {
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
}

TENS: dict[str, int] = {
    "twenty": 20,
    "thirty": 30,
}

NUMBER_WORDS: dict[str, int] = {**ONES, **TEENS, **TENS}
for tens_word, tens_value in TENS.items():
    for ones_word, ones_value in ONES.items():
        if ones_value == 0:
            continue

        candidate = tens_value + ones_value
        if candidate <= 32:
            NUMBER_WORDS[f"{tens_word} {ones_word}"] = candidate

SURFACE_ALIASES: dict[str, str] = {
    "buccal": "buccal",
    "facial": "buccal",
    "labial": "buccal",
    "buckle": "buccal",
    "lingual": "lingual",
    "palatal": "lingual",
}

SITE_INDEX_WORDS: dict[str, int] = {
    "mesial": 0,
    "mid": 1,
    "middle": 1,
    "distal": 2,
}

COMMAND_WORDS = {"undo", "repeat", "correct", "skip", "resume", "next", "previous"}
TOKEN_PATTERN = re.compile(r"\d+|[a-z]+")


def tokenize(transcript: str) -> list[str]:
    return TOKEN_PATTERN.findall(transcript.lower())


def normalize_surface(surface: str | None) -> str | None:
    if not surface:
        return None

    return SURFACE_ALIASES.get(surface.lower())


def parse_number_phrase(tokens: list[str], index: int) -> tuple[int | None, int]:
    token = tokens[index]

    if token.isdigit():
        return int(token), 1

    if index + 1 < len(tokens):
        combined = f"{token} {tokens[index + 1]}"
        if combined in NUMBER_WORDS:
            return NUMBER_WORDS[combined], 2

    if token in NUMBER_WORDS:
        return NUMBER_WORDS[token], 1

    return None, 0


def find_number_spans(tokens: list[str]) -> list[tuple[int, int, int]]:
    spans: list[tuple[int, int, int]] = []
    index = 0

    while index < len(tokens):
        candidate, length = parse_number_phrase(tokens, index)
        if candidate is None:
            index += 1
            continue

        spans.append((index, candidate, length))
        index += length

    return spans


def extract_surface(tokens: list[str]) -> str | None:
    for token in tokens:
        surface = normalize_surface(token)
        if surface:
            return surface
    return None


def extract_site_index(tokens: list[str]) -> int | None:
    for token in tokens:
        site_index = SITE_INDEX_WORDS.get(token)
        if site_index is not None:
            return site_index

    return None


def extract_command(tokens: list[str]) -> str | None:
    for index, token in enumerate(tokens):
        if token in {"next", "previous"}:
            if index + 1 < len(tokens) and tokens[index + 1] == "tooth":
                return token
            if index == len(tokens) - 1:
                return token

        if token in COMMAND_WORDS:
            return token

    return None


def extract_tooth(tokens: list[str]) -> tuple[int | None, set[int]]:
    if not tokens:
        return None, set()

    if "tooth" in tokens:
        tooth_index = tokens.index("tooth")
        search_index = tooth_index + 1

        while search_index < len(tokens):
            candidate, length = parse_number_phrase(tokens, search_index)
            if candidate is not None and 1 <= candidate <= 32:
                consumed = set(range(search_index, search_index + length))
                return candidate, consumed
            search_index += 1

        return None, set()

    number_spans = find_number_spans(tokens)
    if len(number_spans) == 1 and any(token in {"missing", "implant"} for token in tokens):
        start_index, candidate, length = number_spans[0]
        if 1 <= candidate <= 32:
            return candidate, set(range(start_index, start_index + length))

    surface_index = next((index for index, token in enumerate(tokens) if token in SURFACE_ALIASES), None)
    if surface_index is not None:
        for start_index, candidate, length in number_spans:
            if start_index < surface_index and 1 <= candidate <= 32:
                return candidate, set(range(start_index, start_index + length))

    return None, set()


def extract_recession(tokens: list[str]) -> tuple[int | bool | None, set[int]]:
    for index, token in enumerate(tokens):
        if token not in {"recession", "recessed"}:
            continue

        search_index = index + 1
        while search_index < len(tokens):
            candidate, length = parse_number_phrase(tokens, search_index)
            if candidate is not None:
                consumed = set(range(index, search_index + length))
                return candidate, consumed
            if tokens[search_index] in COMMAND_WORDS or tokens[search_index] in SURFACE_ALIASES:
                break
            search_index += 1

        return True, {index}

    return None, set()


def extract_triplet(tokens: list[str], consumed_indices: set[int]) -> list[int] | None:
    values: list[int] = []
    index = 0

    while index < len(tokens):
        if index in consumed_indices:
            index += 1
            continue

        candidate, length = parse_number_phrase(tokens, index)
        if candidate is None:
            index += 1
            continue

        values.append(candidate)
        if len(values) == 3:
            return values

        index += length

    return None


def parse_clinical_transcript(transcript: str, *, raw_transcript: str | None = None) -> dict[str, Any] | None:
    cleaned = transcript.strip().lower()
    if not cleaned:
        return None

    tokens = tokenize(cleaned)
    if not tokens:
        return None

    command = extract_command(tokens)
    tooth, tooth_consumed = extract_tooth(tokens)
    surface = extract_surface(tokens)
    site_index = extract_site_index(tokens)
    recession, recession_consumed = extract_recession(tokens)

    consumed_indices = tooth_consumed | recession_consumed
    depth = extract_triplet(tokens, consumed_indices)

    bleeding = any(token in {"bleeding", "bleed"} for token in tokens)
    missing = "missing" in tokens
    implant = "implant" in tokens

    if implant:
        missing = False

    cursor_direction: int | None = None
    if command in {"next", "skip", "resume"}:
        cursor_direction = 1
    elif command == "previous":
        cursor_direction = -1
    elif missing:
        cursor_direction = 1
    elif depth is not None:
        cursor_direction = 1

    has_chart_signal = any(
        (
            tooth is not None,
            surface is not None,
            site_index is not None,
            depth is not None,
            bleeding,
            recession is not None,
            missing,
            implant,
            command is not None,
        )
    )

    if not has_chart_signal:
        return None

    payload: dict[str, Any] = {
        "type": "clinical",
        "transcript": cleaned,
        "rawTranscript": raw_transcript.strip() if raw_transcript else cleaned,
        "normalizedTranscript": cleaned,
        "timestamp": 0,
    }

    if tooth is not None:
        payload["tooth"] = tooth

    if surface is not None:
        payload["surface"] = surface

    if site_index is not None:
        payload["siteIndex"] = site_index

    if depth is not None:
        payload["depth"] = depth

    if command is not None:
        payload["command"] = command

    if cursor_direction is not None:
        payload["cursorDirection"] = cursor_direction

    if depth is not None or command in {"skip", "resume", "next", "previous"} or missing:
        payload["advanceCursor"] = True

    if bleeding:
        payload["bleeding"] = True

    if recession is not None:
        payload["recession"] = recession

    if missing:
        payload["missing"] = True

    if implant:
        payload["implant"] = True

    return payload
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
        value = tens_value + ones_value
        if value <= 32:
            NUMBER_WORDS[f"{tens_word} {ones_word}"] = value

SURFACE_ALIASES: dict[str, str] = {
    "buccal": "buccal",
    "facial": "buccal",
    "labial": "buccal",
    "lingual": "lingual",
    "palatal": "lingual",
}

SITE_INDEX_WORDS: dict[str, int] = {
    "mesial": 0,
    "middle": 1,
    "mid": 1,
    "distal": 2,
}

COMMAND_WORDS = {"undo", "repeat", "correct", "skip", "resume"}
CLINICAL_KEYWORDS = {
    "tooth",
    "missing",
    "implant",
    "bleeding",
    "bleed",
    "recession",
    "recessed",
    *SURFACE_ALIASES.keys(),
    *SITE_INDEX_WORDS.keys(),
    *COMMAND_WORDS,
}

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
    for token in tokens:
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

    surface_index = next((index for index, token in enumerate(tokens) if token in SURFACE_ALIASES), None)
    number_spans = find_number_spans(tokens)

    if surface_index is not None:
        for start_index, candidate, length in number_spans:
            if start_index < surface_index and 1 <= candidate <= 32:
                return candidate, set(range(start_index, start_index + length))

    if any(token in {"missing", "implant"} for token in tokens) and len(number_spans) == 1:
        start_index, candidate, length = number_spans[0]
        if 1 <= candidate <= 32:
            return candidate, set(range(start_index, start_index + length))

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


def parse_clinical_transcript(transcript: str) -> dict[str, Any] | None:
    cleaned = transcript.strip()
    if not cleaned:
        return None

    tokens = tokenize(cleaned)
    if not tokens:
        return None

    tooth, consumed_indices = extract_tooth(tokens)
    surface = extract_surface(tokens)
    site_index = extract_site_index(tokens)
    command = extract_command(tokens)
    depth = extract_triplet(tokens, consumed_indices)
    bleeding = any(token in {"bleeding", "bleed"} for token in tokens)
    recession = any(token in {"recession", "recessed"} for token in tokens)
    missing = "missing" in tokens
    implant = "implant" in tokens

    if implant:
        missing = False

    has_chart_signal = any(
        (
            tooth is not None,
            surface is not None,
            site_index is not None,
            depth is not None,
            bleeding,
            recession,
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
        if command in {"skip", "resume"}:
            payload["advanceCursor"] = True

    if depth is not None:
        payload["advanceCursor"] = True

    if bleeding:
        payload["bleeding"] = True

    if recession:
        payload["recession"] = True

    if missing:
        payload["missing"] = True

    if implant:
        payload["implant"] = True

    return payload

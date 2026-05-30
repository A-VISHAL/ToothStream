from __future__ import annotations

import re
from typing import Any

COMMON_WORD_REPLACEMENTS: dict[str, str] = {
    "for": "four",
    "free": "three",
    "tree": "three",
    "toof": "tooth",
    "to": "two",
    "too": "two",
    "won": "one",
    "sex": "six",
    "ate": "eight",
    "teeth": "tooth",
}

DENTAL_WORD_REPLACEMENTS: dict[str, str] = {
    "buckle": "buccal",
    "buckle site": "buccal site",
    "lingo": "lingual",
    "palatal": "palatal",
    "distal": "distal",
    "mesial": "mesial",
}

TOKEN_PATTERN = re.compile(r"\b[a-z]+\b", re.IGNORECASE)


def _apply_word_replacements(text: str, replacements: dict[str, str]) -> str:
    normalized = text

    for source, target in replacements.items():
        normalized = re.sub(rf"\b{re.escape(source)}\b", target, normalized, flags=re.IGNORECASE)

    return normalized


def normalize_transcript_text(transcript: str) -> str:
    cleaned = transcript.strip().lower()
    if not cleaned:
        return ""

    normalized = _apply_word_replacements(cleaned, COMMON_WORD_REPLACEMENTS)
    normalized = _apply_word_replacements(normalized, DENTAL_WORD_REPLACEMENTS)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def normalize_clinical_transcript(transcript: str) -> dict[str, Any]:
    raw_transcript = transcript.strip()
    normalized_transcript = normalize_transcript_text(raw_transcript)

    return {
        "rawTranscript": raw_transcript,
        "normalizedTranscript": normalized_transcript,
    }
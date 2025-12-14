import json
from typing import Iterable, Optional

import requests

from .judgment import Paragraph

GEMINI_MODEL = "gemini-1.5-flash"


def build_prompt(query: str, paragraphs: Iterable[Paragraph]) -> str:
    numbered = "\n".join(f"{p.number}. {p.text}" for p in paragraphs)
    return (
        "You are summarizing legal paragraphs.\n"
        "Use ONLY the provided text. Do not invent facts, names, or citations.\n"
        "Do not add case names, numbers, or citations.\n"
        "Write a concise 2-3 sentence summary capturing the main points relevant to the query.\n"
        f"Query: {query.strip() or 'N/A'}\n"
        "Paragraphs:\n"
        f"{numbered}"
    )


def summarize_with_gemini(
    api_key: Optional[str],
    query: str,
    paragraphs: list[Paragraph],
    max_chars: int = 3000,
) -> Optional[str]:
    if not api_key:
        return None
    if not paragraphs:
        return None

    combined = ""
    limited_paragraphs: list[Paragraph] = []
    for para in paragraphs:
        if len(combined) + len(para.text) > max_chars:
            break
        limited_paragraphs.append(para)
        combined += para.text

    if not limited_paragraphs:
        return None

    prompt = build_prompt(query, limited_paragraphs)

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 120,
        },
    }

    try:
        response = requests.post(url, params={"key": api_key}, headers=headers, data=json.dumps(payload), timeout=10)
        if response.status_code == 429:
            return None
        response.raise_for_status()
        data = response.json()
        candidates = data.get("candidates") or []
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        texts = [part.get("text", "") for part in parts if isinstance(part, dict)]
        summary = " ".join(texts).strip()
        return summary or None
    except Exception:  # noqa: BLE001
        return None


def summarize_issues_and_holding(
    api_key: Optional[str],
    query: str,
    paragraphs: list[Paragraph],
    max_chars: int = 3200,
) -> tuple[Optional[str], Optional[str]]:
    """
    Single-call dual summary: issue + holding. Returns (issue_summary, holding_summary).
    """
    if not api_key or not paragraphs:
        return None, None

    combined = ""
    limited: list[Paragraph] = []
    for para in paragraphs:
        if len(combined) + len(para.text) > max_chars:
            break
        limited.append(para)
        combined += para.text
    if not limited:
        return None, None

    numbered = "\n".join(f"{p.number}. {p.text}" for p in limited)
    prompt = (
        "You are summarizing Supreme Court judgment paragraphs.\n"
        "Use ONLY the provided text. Do not invent facts, names, or citations.\n"
        "Do not add case names, numbers, or citations.\n"
        "Produce two parts, each 2 sentences max:\n"
        "Issue Summary: what legal issue is addressed.\n"
        "Holding Summary: what the court held or applied.\n"
        f"Query: {query.strip() or 'N/A'}\n"
        "Paragraphs:\n"
        f"{numbered}\n"
        "Output format:\n"
        "Issue Summary: <text>\n"
        "Holding Summary: <text>"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 160,
        },
    }

    try:
        response = requests.post(url, params={"key": api_key}, headers=headers, data=json.dumps(payload), timeout=10)
        if response.status_code == 429:
            return None, None
        response.raise_for_status()
        data = response.json()
        candidates = data.get("candidates") or []
        if not candidates:
            return None, None
        parts = candidates[0].get("content", {}).get("parts", [])
        texts = " ".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
        issue_summary, holding_summary = _split_dual_summary(texts)
        return issue_summary, holding_summary
    except Exception:  # noqa: BLE001
        return None, None


def _split_dual_summary(text: str) -> tuple[Optional[str], Optional[str]]:
    issue_summary = None
    holding_summary = None
    for line in text.splitlines():
        if line.lower().startswith("issue summary"):
            _, _, rest = line.partition(":")
            issue_summary = rest.strip() or None
        if line.lower().startswith("holding summary"):
            _, _, rest = line.partition(":")
            holding_summary = rest.strip() or None
    if issue_summary is None or holding_summary is None:
        # fallback: try splitting on 'Holding Summary'
        if "Holding Summary" in text:
            before, _, after = text.partition("Holding Summary")
            issue_summary = issue_summary or before.replace("Issue Summary:", "").strip() or None
            holding_summary = holding_summary or after.replace(":", "", 1).strip() or None
    return issue_summary, holding_summary

import re
import time
from dataclasses import dataclass
from typing import List, Optional

import requests
from requests import RequestException
from bs4 import BeautifulSoup

from .ranking import tokenize

USER_AGENT = "CitationXBot/0.1 (contact: support@citationx.local)"
SEARCH_URL = "https://indiankanoon.org/search/"
RATE_LIMIT_SECONDS = 0.6
LANDMARK_TITLES = {
    "puttaswamy",
    "kesavananda bharati",
    "maneka gandhi",
    "golaknath",
    "aum capital",
    "ajaib singh",
}


def normalize_query(query: str) -> str:
    normalized = " ".join(query.split())
    return normalized.strip()


@dataclass
class CaseResult:
    title: str
    url: str
    court: Optional[str]
    year: Optional[str]
    bench: Optional[str] = None
    judges: Optional[list[str]] = None


def fetch_search_results(query: str) -> List[CaseResult]:
    normalized = normalize_query(query)
    if not normalized:
        return []

    time.sleep(RATE_LIMIT_SECONDS)
    params = {"formInput": normalized}
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
    }

    try:
        response = requests.get(SEARCH_URL, params=params, headers=headers, timeout=12)
        response.raise_for_status()
        return parse_results(response.text)
    except RequestException:
        return []


def parse_results(html: str) -> List[CaseResult]:
    soup = BeautifulSoup(html, "html.parser")
    results: List[CaseResult] = []

    for block in soup.select("article.result"):
        title_link = block.select_one("h4.result_title a[href]")
        if not title_link:
            continue

        title = title_link.get_text(" ", strip=True)

        doc_link = block.select_one('a[href^="/doc/"]')
        href = doc_link.get("href") if doc_link else title_link.get("href")
        if not href:
            continue
        url = href if href.startswith("http") else f"https://indiankanoon.org{href}"

        meta_text = _extract_meta_text(block)
        if not _is_supreme_court(meta_text):
            continue

        court = "Supreme Court of India"
        year = _extract_year(f"{title} {meta_text}")
        judges = _extract_judges(meta_text)

        results.append(
            CaseResult(
                title=title,
                url=url,
                court=court,
                year=year,
                bench=None,
                judges=judges,
            )
        )

    return results


def _extract_meta_text(block) -> str:
    meta = block.select_one("div.hlbottom") or block.select_one(".result_meta") or block.find("div", class_="result_info")
    if meta:
        return meta.get_text(" ", strip=True)
    return block.get_text(" ", strip=True)


def _extract_year(meta_text: str) -> Optional[str]:
    match = re.search(r"\b(19|20)\d{2}\b", meta_text)
    return match.group(0) if match else None


def _is_supreme_court(meta_text: str) -> bool:
    if not meta_text:
        return False
    text = meta_text.lower()
    return "supreme court" in text


def _extract_judges(meta_text: str) -> Optional[list[str]]:
    if not meta_text:
        return None
    parts = [p.strip() for p in meta_text.split(" - ") if p.strip()]
    if len(parts) < 2:
        return None
    candidate = parts[-2]
    if not candidate or candidate.lower().startswith("cited") or candidate.lower() == "full document":
        return None
    judges = [j.strip() for j in candidate.split(",") if j.strip()]
    return judges or None


def rerank_cases(query: str, cases: List[CaseResult]) -> List[CaseResult]:
    """Deterministic re-ranker to surface non-obvious cases."""
    query_terms = set(tokenize(query))
    scored: List[tuple[float, int, CaseResult]] = []
    for idx, case in enumerate(cases):
        title_terms = set(tokenize(case.title))
        overlap = len(query_terms & title_terms)

        # Recency bonus
        try:
            year_val = int(case.year) if case.year else 0
        except ValueError:
            year_val = 0
        recency = (year_val - 1950) / 100.0

        # Penalize famous landmarks so lesser-known cases surface
        landmark_penalty = -2.0 if any(key in case.title.lower() for key in LANDMARK_TITLES) else 0.0

        # Length bonus for specificity
        length_bonus = min(len(case.title) / 50.0, 1.0)

        score = overlap * 3 + recency + length_bonus + landmark_penalty
        scored.append((score, idx, case))

    scored.sort(key=lambda x: (-x[0], x[1]))

    # Diversify by decade to avoid only the most cited years
    seen_decades = set()
    diversified: List[CaseResult] = []
    for _, _, case in scored:
        decade = None
        try:
            if case.year:
                decade = int(case.year) // 10
        except ValueError:
            decade = None
        if decade is not None and decade in seen_decades and len(diversified) >= 3:
            continue
        if decade is not None:
            seen_decades.add(decade)
        diversified.append(case)

    return diversified or cases

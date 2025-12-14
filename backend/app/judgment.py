import re
import time
from dataclasses import dataclass
from typing import List, Optional

import requests
from bs4 import BeautifulSoup

from .citation import format_scc_style
from .citation_graph import CitationRelation, extract_citation_relations

USER_AGENT = "CitationXBot/0.1 (contact: support@citationx.local)"
RATE_LIMIT_SECONDS = 0.6


@dataclass
class Paragraph:
    number: int
    text: str


@dataclass
class JudgmentResult:
    url: str
    case_name: str
    court: str
    date: Optional[str]
    year: Optional[str]
    bench: Optional[str]
    bench_strength: Optional[int]
    judges: list[str]
    citation: Optional[str]
    scc_citation: Optional[str]
    paragraphs: List[Paragraph]
    full_text: str
    relations: List[CitationRelation]


def fetch_judgment(url: str) -> JudgmentResult:
    safe_url = url.strip()
    if not safe_url.startswith("http"):
        raise ValueError("url must be http or https")

    time.sleep(RATE_LIMIT_SECONDS)
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
    }
    response = requests.get(safe_url, headers=headers, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    if not _is_supreme_court(soup):
        raise ValueError("Only Supreme Court judgments are supported.")

    case_name = _extract_case_name(soup) or "Supreme Court Judgment"
    date = _extract_date(soup)
    year = _extract_year(soup)
    bench, judges = _extract_bench_and_judges(soup)
    bench_strength = len(judges) if judges else None
    paragraphs = _extract_paragraphs(soup)
    citation = _extract_citation(soup)
    scc_citation = format_scc_style(citation)
    relations = extract_citation_relations(paragraphs)
    full_text = "\n\n".join(p.text for p in paragraphs)

    return JudgmentResult(
        url=safe_url,
        case_name=case_name,
        court="Supreme Court of India",
        date=date,
        year=year,
        bench=bench,
        bench_strength=bench_strength,
        judges=judges,
        citation=citation,
        scc_citation=scc_citation,
        paragraphs=paragraphs,
        full_text=full_text,
        relations=relations,
    )


def _extract_paragraphs(soup: BeautifulSoup) -> List[Paragraph]:
    selectors = [
        "div.text p",
        "div#content p",
        "div.judgments p",
        "p",
    ]
    seen = set()
    texts: List[str] = []
    for selector in selectors:
        for p in soup.select(selector):
            text = p.get_text(" ", strip=True)
            if not text:
                continue
            if text in seen:
                continue
            seen.add(text)
            texts.append(text)
        if texts:
            break

    if not texts:
        pre_blocks = soup.find_all("pre")
        for pre in pre_blocks:
            raw = pre.get_text("\n", strip=True)
            parts = [part.strip() for part in re.split(r"\n\s*\n", raw) if part.strip()]
            for part in parts:
                if part in seen:
                    continue
                seen.add(part)
                texts.append(part)
            if texts:
                break

    return [Paragraph(number=i + 1, text=txt) for i, txt in enumerate(texts)]


def _extract_citation(soup: BeautifulSoup) -> Optional[str]:
    # Look for explicit "Equivalent citations" label
    text = soup.get_text("\n", strip=True)
    match = re.search(r"Equivalent citations:\s*([^\n]+)", text, flags=re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # Fall back to meta or title hints
    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    if title:
        title_match = re.search(r"\((\d{4}[^)]+)\)", title)
        if title_match:
            return title_match.group(1).strip()
    return None


def _extract_bench_and_judges(soup: BeautifulSoup) -> tuple[Optional[str], list[str]]:
    text = soup.get_text("\n", strip=True)
    bench_match = re.search(r"Bench:\s*([^\n]+)", text, flags=re.IGNORECASE)
    bench_text = bench_match.group(1).strip() if bench_match else None
    judges: list[str] = []
    if bench_text:
        judges = [j.strip() for j in bench_text.split(",") if j.strip()]
    return bench_text, judges


def _extract_year(soup: BeautifulSoup) -> Optional[str]:
    text = soup.get_text(" ", strip=True)
    match = re.search(r"\b(19|20)\d{2}\b", text)
    return match.group(0) if match else None


def _extract_date(soup: BeautifulSoup) -> Optional[str]:
    text = soup.get_text("\n", strip=True)
    for label in ["Date:", "Decided On:", "Pronounced On:"]:
        pattern = rf"{label}\s*([^\n]+)"
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def _extract_case_name(soup: BeautifulSoup) -> Optional[str]:
    # Try heading first
    heading = soup.find("h2")
    if heading:
        title = heading.get_text(" ", strip=True)
        if title:
            return title
    # Fallback to title tag
    if soup.title and soup.title.string:
        raw = soup.title.string.strip()
        # Strip trailing segments like "- Supreme Court of India"
        cleaned = re.split(r"[-|•]", raw)[0].strip()
        return cleaned or raw
    return None


def _is_supreme_court(soup: BeautifulSoup) -> bool:
    text = soup.get_text(" ", strip=True).lower()
    return "supreme court" in text

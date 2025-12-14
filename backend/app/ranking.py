import re
from typing import Iterable, List, Sequence

from .judgment import Paragraph

STOPWORDS = {
    "the",
    "and",
    "or",
    "a",
    "an",
    "of",
    "in",
    "to",
    "for",
    "on",
    "with",
    "by",
    "is",
    "are",
    "be",
    "as",
    "this",
    "that",
    "at",
    "from",
}


def tokenize(text: str) -> List[str]:
    return [token for token in re.findall(r"\b\w+\b", text.lower()) if token not in STOPWORDS]


def score_paragraphs(
    query: str,
    paragraphs: Sequence[Paragraph],
    max_paragraphs: int = 5,
    min_paragraphs: int = 2,
    max_chars: int = 1200,
) -> List[Paragraph]:
    terms = tokenize(query)
    if not terms:
        return _truncate(paragraphs[:max_paragraphs], max_chars)

    term_set = set(terms)
    scored: List[tuple[int, int, Paragraph]] = []
    for idx, para in enumerate(paragraphs):
        tokens = tokenize(para.text)
        if not tokens:
            continue
        overlap = term_set.intersection(tokens)
        match_count = sum(tokens.count(term) for term in term_set)
        score = len(overlap) * 5 + match_count
        scored.append((score, idx, para))

    if not scored:
        return _truncate(paragraphs[:max_paragraphs], max_chars)

    scored.sort(key=lambda x: (-x[0], x[1]))
    selected: List[Paragraph] = []
    total_chars = 0
    for _, _, para in scored:
        if len(selected) >= max_paragraphs:
            break
        projected = total_chars + len(para.text)
        if selected and projected > max_chars:
            break
        selected.append(para)
        total_chars = projected

    if len(selected) < min_paragraphs:
        for para in paragraphs:
            if para in selected:
                continue
            projected = total_chars + len(para.text)
            if projected > max_chars:
                break
            selected.append(para)
            total_chars = projected
            if len(selected) >= min_paragraphs:
                break

    return selected


def _truncate(paragraphs: Iterable[Paragraph], max_chars: int) -> List[Paragraph]:
    selected: List[Paragraph] = []
    total_chars = 0
    for para in paragraphs:
        projected = total_chars + len(para.text)
        if selected and projected > max_chars:
            break
        selected.append(para)
        total_chars = projected
    return selected

from dataclasses import dataclass
from typing import Dict, List, Sequence

from .judgment import Paragraph
from .ranking import tokenize

DEFAULT_ISSUES: Dict[str, List[str]] = {
    "right to privacy": [
        "privacy",
        "article 21",
        "autonomy",
        "private life",
        "personal liberty",
        "information privacy",
    ],
    "freedom of speech": ["speech", "expression", "article 19", "reasonable restriction", "free speech"],
    "due process": ["procedure established by law", "natural justice", "fair hearing", "due process"],
}


@dataclass
class IssueMapping:
    issue: str
    paragraphs: List[int]


def map_issues(paragraphs: Sequence[Paragraph], issues: List[str] | None = None) -> List[IssueMapping]:
    issues = issues or list(DEFAULT_ISSUES.keys())
    mappings: List[IssueMapping] = []

    for issue in issues:
        keywords = _collect_keywords(issue)
        if not keywords:
            continue
        scored: List[tuple[float, int, int]] = []  # score, para_index, para_number
        for idx, para in enumerate(paragraphs):
            tokens = tokenize(para.text)
            if not tokens:
                continue
            overlap = keywords.intersection(tokens)
            if not overlap:
                continue
            match_count = sum(tokens.count(term) for term in keywords)
            score = len(overlap) * 4 + match_count
            scored.append((score, idx, para.number))
        scored.sort(key=lambda x: (-x[0], x[1]))
        paragraph_numbers = [pnum for _, _, pnum in scored[:10]]
        if paragraph_numbers:
            mappings.append(IssueMapping(issue=_canonical_issue(issue), paragraphs=paragraph_numbers))

    return mappings


def _collect_keywords(issue: str) -> set[str]:
    base = tokenize(issue)
    synonyms = []
    default = DEFAULT_ISSUES.get(issue.lower())
    if default:
        for phrase in default:
            synonyms.extend(tokenize(phrase))
    return set(base + synonyms)


def _canonical_issue(issue: str) -> str:
    return issue.strip().lower()

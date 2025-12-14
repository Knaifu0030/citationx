import re
from dataclasses import dataclass
from typing import List, Optional, Sequence, TYPE_CHECKING

from .citation import format_scc_style

if TYPE_CHECKING:
    from .judgment import Paragraph  # pragma: no cover


@dataclass
class CitationRelation:
    paragraph_number: int
    cited_text: str
    normalized_citation: Optional[str]
    relation: str  # relies_on | followed_in | distinguished_from


SCC_PATTERN = re.compile(r"\((?:19|20)\d{2}\)\s*\d+\s*SCC\s*\d+", flags=re.IGNORECASE)
AIR_PATTERN = re.compile(r"AIR\s*(?:19|20)\d{2}\s*SC\s*\d+", flags=re.IGNORECASE)


def extract_citation_relations(paragraphs: Sequence["Paragraph"]) -> List[CitationRelation]:
    relations: List[CitationRelation] = []
    for para in paragraphs:
        citations = _extract_citations(para.text)
        if not citations:
            continue
        relation = _detect_relation(para.text.lower())
        if not relation:
            continue
        for cite in citations:
            relations.append(
                CitationRelation(
                    paragraph_number=para.number,
                    cited_text=cite,
                    normalized_citation=format_scc_style(cite) or cite,
                    relation=relation,
                )
            )
    return relations


def _extract_citations(text: str) -> List[str]:
    citations = []
    citations.extend(SCC_PATTERN.findall(text))
    citations.extend(AIR_PATTERN.findall(text))
    # De-duplicate while preserving order
    seen = set()
    unique: List[str] = []
    for c in citations:
        key = c.lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(c.strip())
    return unique


def _detect_relation(text_lower: str) -> Optional[str]:
    if any(kw in text_lower for kw in ["relied on", "relied upon", "based on"]):
        return "relies_on"
    if "followed" in text_lower:
        return "followed_in"
    if "distinguished" in text_lower:
        return "distinguished_from"
    return None

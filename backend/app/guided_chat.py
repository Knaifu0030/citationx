from dataclasses import dataclass
from typing import List, Optional

from .ranking import tokenize

ALLOWED_PROMPTS = [
    "give a similar supreme court case",
    "any other case with different reasoning?",
    "a case applying the same principle differently",
]


@dataclass
class ProvidedCase:
    case_name: str
    scc_citation: Optional[str]
    summary: Optional[str]
    issues: Optional[List[str]] = None


@dataclass
class SuggestedCase:
    case_name: str
    scc_citation: Optional[str]
    reason: str


def guided_recommendations(prompt: str, cases: List[ProvidedCase]) -> List[SuggestedCase]:
    normalized_prompt = prompt.lower().strip()
    prompt_type = _prompt_type(normalized_prompt)
    if prompt_type is None:
        return []

    scored: List[tuple[float, ProvidedCase]] = []
    prompt_terms = set(tokenize(normalized_prompt))
    for c in cases:
        text = " ".join(filter(None, [c.case_name, c.summary or "", " ".join(c.issues or [])]))
        tokens = set(tokenize(text))
        overlap = len(prompt_terms & tokens)
        specificity = min(len(text) / 200.0, 1.0)
        score = overlap * 3 + specificity
        scored.append((score, c))

    scored.sort(key=lambda x: -x[0])
    suggestions: List[SuggestedCase] = []
    for score, c in scored[:3]:
        reason = _build_reason(c, prompt_type)
        suggestions.append(
            SuggestedCase(
                case_name=c.case_name,
                scc_citation=c.scc_citation,
                reason=reason,
            )
        )
    return suggestions


def _prompt_type(prompt: str) -> Optional[str]:
    if "similar" in prompt:
        return "similar"
    if "different reasoning" in prompt or "different reasoning?" in prompt:
        return "different_reasoning"
    if "same principle" in prompt or "applying the same principle" in prompt:
        return "same_principle"
    return None


def _build_reason(case: ProvidedCase, prompt_type: str) -> str:
    base = (case.summary or "").strip()
    if prompt_type == "similar":
        return base[:220] or "Relevant on similar issues per provided summary."
    if prompt_type == "different_reasoning":
        return f"Applies a different reasoning path: {base[:200]}" if base else "Applies a different reasoning path per provided summary."
    if prompt_type == "same_principle":
        return f"Applies the same principle in a different context: {base[:200]}" if base else "Applies the same principle in a different context per provided summary."
    return base[:220]

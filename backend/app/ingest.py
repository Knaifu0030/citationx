from dataclasses import asdict
from typing import Any, Dict

from .judgment import fetch_judgment


def ingest_supreme_court_judgment(url: str) -> Dict[str, Any]:
    """
    Fetch and normalize a Supreme Court judgment into a structured payload
    suitable for persistence.
    """
    judgment = fetch_judgment(url)
    payload = asdict(judgment)
    return payload

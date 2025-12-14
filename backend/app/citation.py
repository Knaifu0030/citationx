import re
from typing import Optional


def format_scc_style(raw_citation: Optional[str]) -> Optional[str]:
    """
    Normalize SCC-style citations when already present in the source text.
    We do not fabricate SCC citations; we only reformat existing SCC-like strings.
    Example input: "2017 10 SCC 1" -> "(2017) 10 SCC 1"
    """
    if not raw_citation:
        return None

    match = re.search(r"((?:19|20)\d{2})\s*\)?\s*(\d+)\s*SCC\s*(\d+)", raw_citation, flags=re.IGNORECASE)
    if not match:
        return None

    year_value, volume, page = match.group(1), match.group(2), match.group(3)

    return f"({year_value}) {volume} SCC {page}"

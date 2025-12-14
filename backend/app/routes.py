from fastapi import APIRouter

from .guided_chat import ProvidedCase, guided_recommendations
from .ingest import ingest_supreme_court_judgment
from .issue_mapping import map_issues
from .judgment import fetch_judgment


router = APIRouter()


@router.get("/ingest", tags=["judgment"])
async def ingest(url: str | None = None) -> dict:
    if not url:
        return {"error": "url is required"}
    try:
        payload = ingest_supreme_court_judgment(url)
        return payload
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return {"error": f"failed to ingest: {exc}"}


@router.get("/issues", tags=["judgment"])
async def issues(url: str | None = None, issues: str | None = None) -> dict:
    if not url:
        return {"error": "url is required"}
    try:
        judgment = fetch_judgment(url)
        issue_list = [i.strip() for i in issues.split(",")] if issues else None
        mappings = map_issues(judgment.paragraphs, issue_list)
        return {
            "url": url,
            "case_name": judgment.case_name,
            "issues": [{"issue": m.issue, "paragraphs": m.paragraphs} for m in mappings],
        }
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return {"error": f"failed to map issues: {exc}"}


@router.post("/chat/guided", tags=["chat"])
async def chat_guided(payload: dict) -> dict:
    prompt = str(payload.get("prompt") or "").strip()
    cases_payload = payload.get("cases") or []
    if not prompt:
        return {"error": "prompt is required"}
    if not isinstance(cases_payload, list) or not cases_payload:
        return {"error": "at least one case with case_name and scc_citation is required"}

    provided_cases: list[ProvidedCase] = []
    for item in cases_payload:
        try:
            provided_cases.append(
                ProvidedCase(
                    case_name=str(item.get("case_name") or "").strip(),
                    scc_citation=str(item.get("scc_citation") or "").strip() or None,
                    summary=str(item.get("summary") or "").strip() or None,
                    issues=item.get("issues") if isinstance(item.get("issues"), list) else None,
                )
            )
        except Exception:
            continue
    if not provided_cases:
        return {"error": "invalid cases payload"}

    suggestions = guided_recommendations(prompt, provided_cases)
    if not suggestions:
        return {"error": "prompt not supported or no suggestions available"}

    return {
        "prompt": prompt,
        "suggestions": [
            {"case_name": s.case_name, "scc_citation": s.scc_citation, "reason": s.reason}
            for s in suggestions
        ],
    }

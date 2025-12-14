from dataclasses import asdict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .cache import cache_get, cache_set
from .config import get_settings
from .gemini import summarize_issues_and_holding, summarize_with_gemini
from .ingest import ingest_supreme_court_judgment
from .issue_mapping import map_issues
from .judgment import JudgmentResult, fetch_judgment
from .ranking import score_paragraphs
from .rate_limit import rate_limiter
from .routes import router as ingest_router
from .search import CaseResult, fetch_search_results, normalize_query, rerank_cases


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)

if settings.allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(ingest_router, prefix="/judgment")

@app.middleware("http")
async def enforce_rate_limit(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    # Skip health checks to keep observability noise-free
    if request.url.path.startswith("/health"):
        return await call_next(request)

    allowed, remaining = rate_limiter.allow(client_ip)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "error": "too_many_requests",
                "message": "Free-tier limit reached. Please wait a minute and try again.",
                "retry_after_seconds": 60,
            },
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
    response.headers["X-RateLimit-Limit"] = str(rate_limiter.limit)
    return response


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/search", tags=["search"])
async def search(q: str | None = None) -> dict[str, list[CaseResult] | str]:
    query = q or ""
    normalized = normalize_query(query)
    cache_key = f"search:{normalized}"
    cached = cache_get(cache_key)
    if cached is not None:
        return {"query": query, "normalized_query": normalized, "results": cached}

    results = rerank_cases(query, fetch_search_results(query))
    serialized = [asdict(r) for r in results]
    # Avoid caching empty results for long; upstream may be slow/unavailable.
    cache_set(cache_key, serialized, ttl_seconds=600 if serialized else 30)
    return {"query": query, "normalized_query": normalized, "results": serialized}


@app.get("/judgment", tags=["judgment"])
async def judgment(url: str | None = None) -> JudgmentResult | dict[str, str]:
    if not url:
        return {"error": "url is required"}
    try:
        result = fetch_judgment(url)
        return {
            "url": result.url,
            "case_name": result.case_name,
            "court": result.court,
            "date": result.date,
            "year": result.year,
            "bench": result.bench,
            "bench_strength": result.bench_strength,
            "judges": result.judges,
            "citation": result.citation,
            "scc_citation": result.scc_citation,
            "paragraphs": [asdict(p) for p in result.paragraphs],
            "relations": [asdict(r) for r in result.relations],
            "full_text": result.full_text,
        }
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return {"error": f"failed to fetch or parse: {exc}"}


@app.get("/judgment/select", tags=["judgment"])
async def judgment_select(
    url: str | None = None,
    q: str | None = None,
    max_paragraphs: int = 5,
    max_chars: int = 1200,
) -> dict[str, object]:
    if not url:
        return {"error": "url is required"}
    if max_paragraphs < 2:
        max_paragraphs = 2
    if max_paragraphs > 5:
        max_paragraphs = 5
    try:
        judgment = fetch_judgment(url)
        selected = score_paragraphs(
            q or "",
            judgment.paragraphs,
            max_paragraphs=max_paragraphs,
            min_paragraphs=2,
            max_chars=max_chars,
        )
        return {
            "query": q or "",
            "url": url,
            "citation": judgment.citation,
            "paragraphs": [para.__dict__ for para in selected],
        }
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return {"error": f"failed to fetch or select: {exc}"}


@app.get("/judgment/summarize", tags=["judgment"])
async def judgment_summarize(
    url: str | None = None,
    q: str | None = None,
    max_paragraphs: int = 5,
    max_chars: int = 1200,
) -> dict[str, object]:
    if not url:
        return {"error": "url is required"}
    if max_paragraphs < 2:
        max_paragraphs = 2
    if max_paragraphs > 5:
        max_paragraphs = 5
    try:
        judgment = fetch_judgment(url)
        selected = score_paragraphs(
            q or "",
            judgment.paragraphs,
            max_paragraphs=max_paragraphs,
            min_paragraphs=2,
            max_chars=max_chars,
        )

        normalized_query = normalize_query(q or "")
        cache_key = f"summary:{url}:{normalized_query}:{max_paragraphs}:{max_chars}"
        cached = cache_get(cache_key)
        if cached is not None:
            return {
                "query": q or "",
                "url": url,
                "case_name": judgment.case_name,
                "court": judgment.court,
                "date": judgment.date,
                "year": judgment.year,
                "bench": judgment.bench,
                "bench_strength": judgment.bench_strength,
                "judges": judgment.judges,
                "citation": judgment.citation,
                "scc_citation": judgment.scc_citation,
                "paragraphs": [asdict(p) for p in selected],
                "relations": [asdict(r) for r in judgment.relations],
                "summary": cached.get("summary"),
                "issue_summary": cached.get("issue_summary"),
                "holding_summary": cached.get("holding_summary"),
                "summary_source": cached.get("source", "cache"),
                "model": cached.get("model"),
                "cache": True,
            }

        summary = summarize_with_gemini(
            settings.gemini_api_key,
            q or "",
            selected,
            max_chars=max_chars,
        )
        issue_summary, holding_summary = summarize_issues_and_holding(
            settings.gemini_api_key,
            q or "",
            selected,
            max_chars=max_chars,
        )
        if summary is None:
            summary = _fallback_summary(selected, max_chars)
            source = "fallback"
        else:
            source = "gemini"

        if issue_summary is None or holding_summary is None:
            issue_summary, holding_summary = _fallback_dual_summary(selected, max_chars)

        cache_set(
            cache_key,
            {
                "summary": summary,
                "issue_summary": issue_summary,
                "holding_summary": holding_summary,
                "source": source,
                "model": "gemini-1.5-flash" if source == "gemini" else None,
            },
            ttl_seconds=900,
        )
        return {
            "query": q or "",
            "url": url,
            "case_name": judgment.case_name,
            "court": judgment.court,
            "date": judgment.date,
            "year": judgment.year,
            "bench": judgment.bench,
            "bench_strength": judgment.bench_strength,
            "judges": judgment.judges,
            "citation": judgment.citation,
            "scc_citation": judgment.scc_citation,
            "paragraphs": [asdict(p) for p in selected],
            "relations": [asdict(r) for r in judgment.relations],
            "summary": summary,
            "issue_summary": issue_summary,
            "holding_summary": holding_summary,
            "summary_source": source,
            "model": "gemini-1.5-flash" if source == "gemini" else None,
        }
    except ValueError as exc:
        return {"error": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return {"error": f"failed to summarize: {exc}"}


def _fallback_summary(paragraphs: list, max_chars: int = 300) -> str:
    parts = []
    for para in paragraphs[:3]:
        if len(" ".join(parts)) > max_chars:
            break
        parts.append(para.text)
    combined = " ".join(parts).strip()
    if not combined:
        return "Summary unavailable."
    return combined[:max_chars]


def _fallback_dual_summary(paragraphs: list, max_chars: int = 300) -> tuple[str, str]:
    issue = _fallback_summary(paragraphs, max_chars)
    holding = _fallback_summary(paragraphs[1:], max_chars) if len(paragraphs) > 1 else issue
    return issue, holding

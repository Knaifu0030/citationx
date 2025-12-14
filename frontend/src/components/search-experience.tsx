"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { ResultCard, ResultParagraph } from "@/components/result-card";
import { SearchInput } from "@/components/search-input";

type SearchState = "idle" | "loading" | "empty" | "results";

type SearchResult = {
  title: string;
  court?: string;
  year?: string;
  citation?: string;
  scc_citation?: string | null;
  url: string;
  paragraphs: ResultParagraph[];
};

const examples = [
  "summary judgment standard second circuit",
  "daubert motion reliability factors",
  "rule 12(b)(6) pleading burden",
  "limiting instruction curative measures",
];

export function SearchExperience() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>("idle");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const timeoutRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  const hintText = useMemo(
    () =>
      "Search across matters, filings, and citations. Use quotes for exact phrases and connectors like AND/OR.",
    [],
  );

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const runSearch = async (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    setQuery(trimmed);
    focusInput();
    if (!trimmed) {
      setState("idle");
      setResults([]);
      setError(null);
      return;
    }
    setState("loading");
    setResults([]);
    setError(null);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const res = await fetch(`${apiBase}/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }
      const data = (await res.json()) as { results?: Array<Partial<SearchResult>> };
      const fetched: SearchResult[] = (data?.results || []).map((item) => ({
        title: item.title,
        court: item.court,
        year: item.year,
        citation: item.citation,
        scc_citation: item.scc_citation || null,
        url: sanitizeCaseUrl(item.url || ""),
        paragraphs: [],
      }));
      setResults(fetched);
      setState(fetched.length ? "results" : "empty");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Unable to load results right now. Please try again.");
      setState("empty");
    }
  };

  const fetchDetails = async (caseUrl: string) => {
    if (!caseUrl) return;
    const sanitizedUrl = sanitizeCaseUrl(caseUrl);
    setLoadingDetails((prev) => ({ ...prev, [caseUrl]: true }));
    try {
      const res = await fetch(`${apiBase}/judgment?url=${encodeURIComponent(sanitizedUrl)}`);
      if (!res.ok) throw new Error("Failed to load details");
      const data = await res.json();
      const paras: ResultParagraph[] = (data?.paragraphs || []).slice(0, 3);
      setResults((prev) =>
        prev.map((r) =>
          r.url === caseUrl
            ? {
                ...r,
                citation: data?.citation || r.citation,
                scc_citation: data?.scc_citation || r.scc_citation,
                paragraphs: paras,
              }
            : r,
        ),
      );
    } catch {
      setError("Unable to load details for this case.");
    } finally {
      setLoadingDetails((prev) => ({ ...prev, [caseUrl]: false }));
    }
  };

  const handleSubmit = () => {
    runSearch(query);
  };

  const handleChip = (value: string) => {
    runSearch(value);
  };

  useEffect(() => {
    const timeoutId = timeoutRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInputField = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isInputField) {
        event.preventDefault();
        focusInput();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          Search
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-[var(--color-text)] md:text-4xl">
          Find cited authority with confidence
        </h1>
        <p className="max-w-2xl text-sm text-[var(--color-text-muted)]">{hintText}</p>
      </div>

      <SearchInput
        ref={inputRef}
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        placeholder="Search by citation, topic, or docket..."
        isLoading={state === "loading"}
        className="max-w-3xl"
      />
      <div className="flex flex-wrap justify-center gap-2">
        {examples.map((example) => (
          <Button
            key={example}
            variant="ghost"
            size="sm"
            onClick={() => handleChip(example)}
            className="rounded-full border-dashed"
          >
            {example}
          </Button>
        ))}
      </div>

      <div className="mt-2 w-full max-w-4xl">
        {state === "loading" && <LoadingSkeleton />}
        {state === "empty" && <EmptyState query={query} />}
        {state === "idle" && <IdleState />}
        {state === "results" && (
          <div className="space-y-4">
            {results.map((result) => (
              <ResultCard
                key={result.url}
                {...result}
                isLoadingDetails={!!loadingDetails[result.url]}
                onLoadDetails={() => fetchDetails(result.url)}
              />
            ))}
          </div>
        )}
        {error && <p className="mt-2 text-center text-xs text-[var(--color-text-muted)]">{error}</p>}
      </div>
    </div>
  );
}

function sanitizeCaseUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return url.split("#")[0].split("?")[0];
  }
}

function LoadingSkeleton() {
  const rows = Array.from({ length: 3 });
  return (
    <div className="space-y-3">
      {rows.map((_, index) => (
        <Card key={index} className="animate-pulse">
          <div className="flex flex-col gap-3">
            <div className="h-4 w-1/3 rounded-full bg-[var(--color-surface-muted)]" />
            <div className="h-3 w-5/6 rounded-full bg-[var(--color-surface-muted)]" />
            <div className="flex gap-2">
              <div className="h-3 w-24 rounded-full bg-[var(--color-surface-muted)]" />
              <div className="h-3 w-16 rounded-full bg-[var(--color-surface-muted)]" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <Card className="text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-10 w-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)]" />
        <p className="text-base font-semibold text-[var(--color-text)]">No results yet</p>
        <p className="max-w-md text-sm text-[var(--color-text-muted)]">
          {query
            ? "We didn't find anything for this query. Adjust your terms or try a different connector."
            : "Start by running a search. Use the examples above if you need inspiration."}
        </p>
      </div>
    </Card>
  );
}

function IdleState() {
  return (
    <Card className="text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-10 w-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)]" />
        <p className="text-base font-semibold text-[var(--color-text)]">Ready when you are</p>
        <p className="max-w-md text-sm text-[var(--color-text-muted)]">
          Use the examples above or press <kbd className="rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-xs">
            /
          </kbd>{" "}
          to jump into the search bar.
        </p>
      </div>
    </Card>
  );
}

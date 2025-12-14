"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Layout } from "@/components/layout";
import { cn } from "@/lib/classnames";
import { TransparencyPanel } from "@/components/transparency-panel";
import { ShortcutGuide } from "@/components/shortcut-guide";

type Paragraph = {
  number: number;
  text: string;
};

type JudgmentData = {
  case_name: string;
  citation?: string | null;
  scc_citation?: string | null;
  court?: string | null;
  date?: string | null;
  year?: string | null;
  bench?: string | null;
  bench_strength?: number | null;
  judges?: string[] | null;
  url: string;
  paragraphs: Paragraph[];
};

type SummaryData = {
  summary?: string | null;
  issue_summary?: string | null;
  holding_summary?: string | null;
};

export default function CaseDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawUrl = searchParams.get("url") || "";
  const decoded = rawUrl ? decodeURIComponent(rawUrl) : "";
  const caseUrl = decoded.split("#")[0].split("?")[0];
  const fallbackTitle = searchParams.get("title") || "Supreme Court Judgment";
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  const [data, setData] = useState<JudgmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<SummaryData | null>(null);
  const paraRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!caseUrl) {
      setError("No case URL provided.");
      return;
    }
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/judgment?url=${encodeURIComponent(caseUrl)}`);
        if (!res.ok) throw new Error(`Failed to load case (${res.status})`);
        const json = await res.json();
        if (!cancelled) {
          setData({
            case_name: json.case_name || fallbackTitle,
            citation: json.citation,
            scc_citation: json.scc_citation,
            court: json.court,
            date: json.date,
            year: json.year,
            bench: json.bench,
            bench_strength: json.bench_strength,
            judges: json.judges,
            url: caseUrl,
            paragraphs: json.paragraphs || [],
          });
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message || "Unable to load case details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [apiBase, fallbackTitle, caseUrl]);

  useEffect(() => {
    if (!caseUrl) return;
    let cancelled = false;
    const fetchSummaries = async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const res = await fetch(
          `${apiBase}/judgment/summarize?url=${encodeURIComponent(caseUrl)}&q=${encodeURIComponent(
            data?.case_name || fallbackTitle,
          )}`,
        );
        if (!res.ok) throw new Error(`Failed to load summaries (${res.status})`);
        const json = await res.json();
        if (!cancelled) {
          setSummaries({
            summary: json.summary,
            issue_summary: json.issue_summary,
            holding_summary: json.holding_summary,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setSummaryError((err as Error).message || "Unable to load summaries.");
        }
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };
    fetchSummaries();
    return () => {
      cancelled = true;
    };
  }, [apiBase, caseUrl, data?.case_name, fallbackTitle]);

  const assignRef = (num: number) => (el: HTMLDivElement | null) => {
    paraRefs.current[num] = el;
  };

  const scrollToPara = (num: number) => {
    const ref = paraRefs.current[num];
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
      ref.focus({ preventScroll: true });
    }
  };

  const paragraphs = data?.paragraphs || [];
  const relevantParas = paragraphs.slice(0, 2).map((p) => p.number);

  const cleanCitation = formatCitationBlock(data?.citation);

  return (
    <Layout>
      <div className="mb-2 flex justify-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className="px-0 text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-accent)]"
          aria-label="Back to search results"
        >
          ← Back to search
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Case</p>
            <h1 className="text-xl font-semibold leading-tight text-[var(--color-text)]">
              {data?.case_name || fallbackTitle}
            </h1>
            {data?.scc_citation && (
              <p className="text-xs text-[var(--color-text-muted)]">SCC style: {data.scc_citation}</p>
            )}
          </div>

          <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
            <MetaRow label="Citation" value={cleanCitation} mono />
            <MetaRow label="Court" value={data?.court || "Supreme Court of India"} />
            <MetaRow label="Date" value={data?.date} />
            <MetaRow label="Year" value={data?.year} />
            <MetaRow label="Bench" value={data?.bench} />
            <MetaRow
              label="Judges"
              value={(data?.judges || []).filter(Boolean).join(", ") || (data?.bench_strength ? `${data.bench_strength} judge bench` : "")}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              disabled={!paragraphs.length}
              onClick={() => scrollToPara(relevantParas[0] ?? paragraphs[0]?.number ?? 1)}
            >
              Jump to relevant
            </Button>
            {caseUrl && (
              <a
                href={caseUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              >
                Open source
              </a>
            )}
            <a
              href={`https://www.scconline.com/?s=${encodeURIComponent(data?.case_name || fallbackTitle)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
            >
              Verify on SCC Online
            </a>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Navigate</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Discovery-only view. Verify authoritative text on SCC.
            </p>
            <div className="flex flex-wrap gap-2">
              {paragraphs.map((para) => (
                <Button key={para.number} size="sm" variant="ghost" onClick={() => scrollToPara(para.number)}>
                  ¶{para.number}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <SummaryPanel summaries={summaries} loading={summaryLoading} error={summaryError} />
          {loading && <CaseLoading />}
          {error && <Card className="text-sm text-[var(--color-text-muted)]">{error}</Card>}
          {!loading &&
            !error &&
            paragraphs.map((para) => (
              <div
                key={para.number}
                ref={assignRef(para.number)}
                tabIndex={-1}
                className={cn(
                  "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                  relevantParas.includes(para.number) && "border-[var(--color-accent)] bg-[var(--color-surface-muted)]",
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                    ¶{para.number}
                  </span>
                  {relevantParas.includes(para.number) && (
                    <span className="rounded-full bg-[var(--color-accent)] px-2 py-1 text-xs font-semibold text-[var(--color-contrast)]">
                      Relevant
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-[var(--color-text)]">{para.text}</p>
              </div>
            ))}
          {!loading && !error && paragraphs.length === 0 && (
            <Card className="text-sm text-[var(--color-text-muted)]">
              Paragraphs could not be loaded for this case.
            </Card>
          )}
        </div>
      </div>
      <div className="mt-6">
        <TransparencyPanel />
        <ShortcutGuide />
      </div>
    </Layout>
  );
}

function MetaRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  const values = value.includes(";") ? value.split(";").map((v) => v.trim()).filter(Boolean) : [value];
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[var(--color-text)]">{label}</span>
      <div className="flex flex-col items-end gap-1 text-right">
        {values.map((val) => (
          <span key={val} className={mono ? "font-mono text-[var(--color-text)]" : "text-[var(--color-text)]"}>
            {val}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatCitationBlock(raw?: string | null): string | null {
  if (!raw) return null;
  const parts = raw
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  return parts.join("; ");
}
function CaseLoading() {
  const rows = Array.from({ length: 4 });
  return (
    <div className="space-y-3">
      {rows.map((_, idx) => (
        <div key={idx} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <div className="h-4 w-16 rounded bg-[var(--color-surface-muted)]" />
          <div className="mt-3 h-3 w-full rounded bg-[var(--color-surface-muted)]" />
          <div className="mt-2 h-3 w-5/6 rounded bg-[var(--color-surface-muted)]" />
        </div>
      ))}
    </div>
  );
}

function SummaryPanel({ summaries, loading, error }: { summaries: SummaryData | null; loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <Card>
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-[var(--color-surface-muted)]" />
          <div className="h-3 w-full rounded bg-[var(--color-surface-muted)]" />
          <div className="h-3 w-5/6 rounded bg-[var(--color-surface-muted)]" />
        </div>
      </Card>
    );
  }
  if (error) {
    return <Card className="text-sm text-[var(--color-text-muted)]">{error}</Card>;
  }
  if (!summaries) return null;

  return (
    <Card title="Summaries" className="space-y-2">
      {summaries.issue_summary && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Issue</p>
          <p className="text-sm text-[var(--color-text)]">{summaries.issue_summary}</p>
        </div>
      )}
      {summaries.holding_summary && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Holding</p>
          <p className="text-sm text-[var(--color-text)]">{summaries.holding_summary}</p>
        </div>
      )}
      {summaries.summary && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Overview</p>
          <p className="text-sm text-[var(--color-text)]">{summaries.summary}</p>
        </div>
      )}
      {!summaries.issue_summary && !summaries.holding_summary && !summaries.summary && (
        <p className="text-xs text-[var(--color-text-muted)]">No summaries available for this case.</p>
      )}
    </Card>
  );
}

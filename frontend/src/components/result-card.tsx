import { useState } from "react";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { cn } from "@/lib/classnames";

export type ResultParagraph = {
  number: number;
  text: string;
};

export type ResultCardProps = {
  title: string;
  court?: string;
  year?: string;
  citation?: string | null;
  scc_citation?: string | null;
  url: string;
  paragraphs: ResultParagraph[];
  isLoadingDetails?: boolean;
  onLoadDetails?: () => void;
};

export function ResultCard({
  title,
  court,
  year,
  citation,
  scc_citation,
  url,
  paragraphs,
  isLoadingDetails,
  onLoadDetails,
}: ResultCardProps) {
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [copiedPara, setCopiedPara] = useState<number | null>(null);
  const sccSearchUrl = `https://www.scconline.com/?s=${encodeURIComponent(title)}`;

  const handleCopy = async (text: string, type: "citation" | "para", paraNo?: number) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      if (type === "citation") {
        setCopiedCitation(true);
        setTimeout(() => setCopiedCitation(false), 1200);
      } else if (paraNo !== undefined) {
        setCopiedPara(paraNo);
        setTimeout(() => setCopiedPara(null), 1200);
      }
    } catch {
      // swallow copy errors
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
          {year && (
            <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-1 text-xs text-[var(--color-text-muted)]">
              {year}
            </span>
          )}
          {court && (
            <span className="rounded-full border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)]">
              {court}
            </span>
          )}
        </div>
        {citation && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span className="font-mono text-[var(--color-text)]">{citation}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(citation, "citation")}
              className="rounded-full"
              aria-label="Copy citation"
            >
              {copiedCitation ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
        {scc_citation && (
          <p className="text-xs text-[var(--color-text-muted)]">SCC style: {scc_citation}</p>
        )}
        <div className="flex flex-wrap gap-2 text-sm text-[var(--color-text-muted)]">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            Open source
          </a>
          <a
            href={`/case?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            Inspect case
          </a>
         {onLoadDetails && (
           <Button size="sm" variant="ghost" onClick={onLoadDetails} disabled={isLoadingDetails}>
             {isLoadingDetails ? "Loading details..." : "Preview paragraphs"}
           </Button>
         )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
          <a
            href={sccSearchUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            Verify on SCC Online
          </a>
          <span>Discovery only — verify authoritative text on SCC.</span>
        </div>
      </div>

      {paragraphs.length > 0 && (
        <div className="space-y-3">
          {paragraphs.map((para) => (
            <div
              key={para.number}
              className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 transition hover:border-[var(--color-accent)] focus-within:border-[var(--color-accent)]"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                  ¶{para.number}
                </span>
                <p className="flex-1 text-sm leading-relaxed text-[var(--color-text)]">{para.text}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy(para.text, "para", para.number)}
                  className={cn(
                    "self-start rounded-full opacity-0 transition group-hover:opacity-100 focus:opacity-100",
                    copiedPara === para.number && "opacity-100",
                  )}
                  aria-label={`Copy paragraph ${para.number}`}
                >
                  {copiedPara === para.number ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

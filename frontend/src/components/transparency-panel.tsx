import { Card } from "@/components/card";

export function TransparencyPanel() {
  return (
    <Card className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-[var(--color-text)]">How this app works</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          We surface publicly available Supreme Court of India judgments. Paragraphs are parsed and numbered
          directly from the judgment text. No SCC or paid databases are accessed.
        </p>
      </div>

      <div className="space-y-1 text-xs text-[var(--color-text-muted)]">
        <p className="text-sm font-semibold text-[var(--color-text)]">AI usage</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>AI is only used to summarize already-extracted paragraphs.</li>
          <li>No new cases, citations, or facts are added by AI.</li>
          <li>The app continues to work if AI is unavailable.</li>
        </ul>
      </div>

      <div className="space-y-1 text-xs text-[var(--color-text-muted)]">
        <p className="text-sm font-semibold text-[var(--color-text)]">Verification</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Always verify authoritative text on SCC Online or official reports.</li>
          <li>This tool is for discovery and study; it does not replace official sources.</li>
        </ul>
      </div>
    </Card>
  );
}

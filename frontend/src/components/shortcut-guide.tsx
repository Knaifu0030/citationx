"use client";

export function ShortcutGuide() {
  return (
    <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2 text-xs text-[var(--color-text-muted)] shadow-sm">
      <span className="font-semibold text-[var(--color-text)]">Shortcuts</span>
      <span className="rounded bg-[var(--color-surface)] px-2 py-1 font-mono text-[var(--color-text)]">/</span>
      <span>focus search</span>
    </div>
  );
}

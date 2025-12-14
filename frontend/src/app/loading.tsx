import { Layout } from "@/components/layout";

export default function Loading() {
  const rows = Array.from({ length: 3 });
  return (
    <Layout>
      <div className="space-y-4">
        <div className="h-10 w-3/4 rounded-lg bg-[var(--color-surface-muted)]" />
        <div className="h-6 w-1/2 rounded-lg bg-[var(--color-surface-muted)]" />
        {rows.map((_, idx) => (
          <div key={idx} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
            <div className="h-4 w-2/3 rounded bg-[var(--color-surface-muted)]" />
            <div className="mt-3 h-3 w-5/6 rounded bg-[var(--color-surface-muted)]" />
            <div className="mt-2 h-3 w-4/6 rounded bg-[var(--color-surface-muted)]" />
          </div>
        ))}
      </div>
    </Layout>
  );
}

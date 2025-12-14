import { Layout } from "@/components/layout";

export default function LoadingCase() {
  const rows = Array.from({ length: 4 });
  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
          <div className="h-5 w-3/4 rounded bg-[var(--color-surface-muted)]" />
          <div className="h-4 w-1/2 rounded bg-[var(--color-surface-muted)]" />
          <div className="h-4 w-2/3 rounded bg-[var(--color-surface-muted)]" />
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-16 rounded-full bg-[var(--color-surface-muted)]" />
            <div className="h-6 w-20 rounded-full bg-[var(--color-surface-muted)]" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-28 rounded bg-[var(--color-surface-muted)]" />
            <div className="h-8 w-24 rounded bg-[var(--color-surface-muted)]" />
          </div>
        </div>
        <div className="space-y-3">
          {rows.map((_, idx) => (
            <div key={idx} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
              <div className="h-4 w-16 rounded bg-[var(--color-surface-muted)]" />
              <div className="mt-3 h-3 w-full rounded bg-[var(--color-surface-muted)]" />
              <div className="mt-2 h-3 w-5/6 rounded bg-[var(--color-surface-muted)]" />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

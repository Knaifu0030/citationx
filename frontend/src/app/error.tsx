"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/button";
import { Layout } from "@/components/layout";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Something went wrong</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          We hit a snag. You can retry the last action or return to the homepage.
        </p>
        <div className="flex gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </Layout>
  );
}

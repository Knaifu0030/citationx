"use client";

import { FormEvent, forwardRef } from "react";
import { Button } from "@/components/button";
import { cn } from "@/lib/classnames";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onSubmit, placeholder, isLoading = false, className }, ref) => {
    const handleSubmit = (event: FormEvent) => {
      event.preventDefault();
      onSubmit();
    };

    return (
      <form onSubmit={handleSubmit} className={cn("w-full", className)} role="search">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm focus-within:border-[var(--color-accent)] focus-within:shadow-md">
          <input
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-lg font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            aria-label="Search"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Searching…" : "Search"}
          </Button>
        </div>
      </form>
    );
  },
);

SearchInput.displayName = "SearchInput";

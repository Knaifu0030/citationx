"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/classnames";

type ButtonVariant = "primary" | "ghost";
type ButtonSize = "md" | "sm";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref,
) {
  const base =
    "inline-flex items-center justify-center rounded-md border text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-contrast)] hover:bg-[var(--color-accent-strong)] hover:border-[var(--color-accent-strong)]",
    ghost:
      "bg-transparent border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]",
  };

  const sizes: Record<ButtonSize, string> = {
    md: "px-4 py-2.5",
    sm: "px-3 py-2 text-xs",
  };

  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
});

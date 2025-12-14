import { HTMLAttributes } from "react";
import { cn } from "@/lib/classnames";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
};

export function Card({ title, description, className, children, ...props }: CardProps) {
  return (
    <section
      suppressHydrationWarning
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-[var(--color-text)] shadow-sm",
        className,
      )}
      {...props}
    >
      {(title || description) && (
        <div className="mb-3 space-y-1">
          {title && <h3 className="text-base font-semibold leading-6">{title}</h3>}
          {description && <p className="text-sm text-[var(--color-text-muted)]">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

import { clsx, type ClassValue } from "clsx";
import { X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("card p-4", className)}>{children}</section>;
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "soft" | "danger" }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50",
        variant === "primary" && "bg-primary text-primary-fg",
        variant === "ghost" && "bg-transparent text-fg",
        variant === "soft" && "bg-soft text-primary",
        variant === "danger" && "bg-soft text-primary",
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({ label, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full text-fg active:bg-soft",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-fg">{label}</span>
      {children}
    </label>
  );
}

export const controlClass =
  "h-11 w-full rounded-2xl border border-line bg-bg px-3 text-base text-fg outline-none focus:border-primary";

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
    </div>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" className="absolute inset-0 bg-fg/40" aria-label="Cerrar" onClick={onClose} />
      <div className="sheet-safe relative z-10 max-h-[88dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-line bg-surface px-4 pt-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="Cerrar panel" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full bg-soft p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "h-10 flex-1 rounded-full px-2 text-sm font-semibold",
            value === option.id ? "bg-surface text-primary" : "text-muted",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SwatchDot({ id }: { id: string }) {
  return <span className={cn("inline-block size-3 rounded-full", `swatch-${id}`)} />;
}

export function Pill({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", active ? "bg-soft text-primary" : "bg-bg text-muted")}>
      {children}
    </span>
  );
}

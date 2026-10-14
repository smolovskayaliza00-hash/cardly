import clsx from 'clsx';
import { motion } from 'framer-motion';
import { ChevronRight, Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { haptic } from '../lib/telegram';

type ButtonVariant = 'gold' | 'surface' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

export function Button({
  variant = 'gold',
  size = 'md',
  loading,
  icon,
  block,
  className,
  children,
  disabled,
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      onClick={(e) => {
        haptic.impact('light');
        onClick?.(e);
      }}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100',
        size === 'lg' ? 'h-14 rounded-2xl px-6 text-[17px]' : 'h-11 rounded-xl px-4 text-[15px]',
        variant === 'gold' && 'gold-fill shadow-[0_8px_24px_-8px_var(--app-glow)]',
        variant === 'surface' && 'bg-surface-2 text-ink',
        variant === 'ghost' && 'bg-transparent text-gold',
        variant === 'danger' && 'bg-danger/12 text-danger',
        block && 'w-full',
        className,
      )}
    >
      {loading ? <Loader2 className="size-5 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function Badge({
  tone = 'default',
  children,
  className,
}: {
  tone?: 'default' | 'gold' | 'success' | 'danger' | 'warning' | 'info';
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
        tone === 'default' && 'bg-surface-3 text-muted',
        tone === 'gold' && 'bg-gold/15 text-gold',
        tone === 'success' && 'bg-success/15 text-success',
        tone === 'danger' && 'bg-danger/15 text-danger',
        tone === 'warning' && 'bg-warning/15 text-warning',
        tone === 'info' && 'bg-info/15 text-info',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge tone="warning" className={className}>
      Демо
    </Badge>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton rounded-xl', className)} />;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold tracking-wider text-muted uppercase">{children}</h2>
      {action}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('rounded-3xl border border-line bg-surface', className)}>{children}</div>;
}

export function ListItem({
  icon,
  title,
  subtitle,
  right,
  onClick,
  chevron = Boolean(onClick),
  danger,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  danger?: boolean;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={
        onClick
          ? () => {
              haptic.selection();
              onClick();
            }
          : undefined
      }
      className={clsx(
        'flex w-full items-center gap-3 px-4 py-3.5 text-left',
        onClick && 'transition active:bg-surface-2',
      )}
    >
      {icon && (
        <div
          className={clsx(
            'flex size-9 shrink-0 items-center justify-center rounded-xl',
            danger ? 'bg-danger/12 text-danger' : 'bg-surface-2 text-gold',
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className={clsx('truncate text-[15px] font-medium', danger && 'text-danger')}>{title}</div>
        {subtitle && <div className="truncate text-[13px] text-muted">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0 text-[15px] text-muted">{right}</div>}
      {chevron && <ChevronRight className="size-4 shrink-0 text-faint" />}
    </Comp>
  );
}

export function Divider() {
  return <div className="ml-16 h-px bg-line" />;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => {
            haptic.selection();
            onChange(o.value);
          }}
          className={clsx(
            'relative flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors',
            value === o.value ? 'text-ink' : 'text-muted',
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${options.map((x) => x.value).join('')}`}
              className="absolute inset-0 rounded-xl bg-surface-3 shadow-sm"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-8 py-10 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-gold">{icon}</div>
      <div className="text-[17px] font-semibold">{title}</div>
      {text && <div className="mt-1 text-[14px] text-muted">{text}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

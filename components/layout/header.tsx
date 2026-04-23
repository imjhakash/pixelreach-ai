"use client";

import { Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-semibold text-[var(--foreground)]">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--muted)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

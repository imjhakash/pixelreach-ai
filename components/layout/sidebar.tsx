"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Send,
  Building2,
  BarChart3,
  FileText,
  Settings,
  Zap,
  LogOut,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",      icon: LayoutDashboard },
  { href: "/leads",      label: "Leads",           icon: Users },
  { href: "/campaigns",  label: "Campaigns",       icon: Send },
  { href: "/profiles",   label: "Sender Profiles", icon: Building2 },
  { href: "/prompt-studio", label: "Prompt Studio", icon: FileText },
  { href: "/analytics",  label: "Analytics",       icon: BarChart3 },
  { href: "/mcp-tools",  label: "MCP Connect",     icon: Plug },
  { href: "/settings",   label: "Settings",        icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Eagerly prefetch all nav routes on mount for instant tab switching
  useEffect(() => {
    navItems.forEach(({ href }) => router.prefetch(href));
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col border-r border-[var(--border)] bg-[var(--surface)] z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[var(--border)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--foreground)] leading-tight">PixelReach AI</p>
          <p className="text-[10px] text-[var(--muted)]">by CodeMyPixel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[var(--accent)]" : "")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

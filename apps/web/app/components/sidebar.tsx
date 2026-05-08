import React from "react";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Workers", href: "/workers" },
  { label: "Attendance", href: "/attendance" },
  { label: "Payments" },
  { label: "Reports" },
];

type SidebarProps = {
  activeItem?: string;
};

export default function Sidebar({ activeItem = "Attendance" }: SidebarProps) {
  return (
    <>
      <aside className="hidden md:flex md:h-screen md:w-64 md:flex-col md:justify-between md:border-r md:border-[rgba(27,27,24,0.08)] md:bg-[var(--surface-1)] md:px-5 md:py-6">
        <div>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-100)] text-sm font-semibold text-[var(--accent-700)]">
              WA
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink-900)]">
                Wage Admin
              </p>
              <p className="text-xs text-[var(--ink-500)]">Attendance Suite</p>
            </div>
          </div>

          <p className="mb-3 text-[10px] uppercase tracking-[0.26em] text-[var(--ink-500)]">
            Overview
          </p>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = item.label === activeItem;
              const className = `rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                isActive
                  ? "bg-[var(--accent-100)] text-[var(--accent-700)]"
                  : "text-[var(--ink-700)] hover:bg-[var(--surface-2)]"
              }`;

              return item.href ? (
                <Link key={item.label} className={className} href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span key={item.label} className={className}>
                  {item.label}
                </span>
              );
            })}
          </nav>
        </div>

        <div className="rounded-2xl border border-[rgba(27,27,24,0.08)] bg-[var(--surface-2)] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--ink-500)]">
            Workspace
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--ink-900)]">
            Central Plant
          </p>
          <p className="mt-1 text-xs text-[var(--ink-500)]">
            Shift A · 42 workers
          </p>
        </div>
      </aside>

      <div className="md:hidden w-full border-b border-[rgba(27,27,24,0.08)] bg-[var(--surface-1)] px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink-500)]">
              Wage Admin
            </p>
            <p className="text-base font-semibold text-[var(--ink-900)]">
              {activeItem}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-100)] text-sm font-semibold text-[var(--accent-700)]">
            WA
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const isActive = item.label === activeItem;
            const className = `whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition ${
              isActive
                ? "border-[var(--accent-100)] bg-[var(--accent-100)] text-[var(--accent-700)]"
                : "border-[rgba(27,27,24,0.12)] bg-[var(--surface-2)] text-[var(--ink-700)]"
            }`;

            return item.href ? (
              <Link key={item.label} className={className} href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span key={item.label} className={className}>
                {item.label}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
}

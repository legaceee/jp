"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../utils/api";
import { clearStoredUser, getStoredUser, type AuthUser } from "../utils/auth";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setUser(getStoredUser());
  }, []);

  const initials = useMemo(() => {
    if (!user?.name) {
      return "A";
    }

    return user.name
      .split(" ")
      .map((chunk) => chunk[0])
      .join("");
  }, [user]);

  const handleLogout = async () => {
    await apiFetch("/auth/logout", {
      method: "POST",
      skipAuthRefresh: true,
    });
    clearStoredUser();
    router.replace("/");
  };

  return (
    <header className="w-full border-b border-[rgba(27,27,24,0.08)] bg-[var(--surface-1)] px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.26em] text-[var(--ink-500)]">
            Attendance desk
          </p>
          <h1 className="text-lg font-semibold text-[var(--ink-900)]">
            Wage Attendance
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-[rgba(27,27,24,0.12)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--ink-700)]">
            Daily summary
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-[rgba(27,27,24,0.12)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold text-[var(--ink-700)] transition hover:bg-[var(--accent-100)] hover:text-[var(--accent-700)]"
          >
            Logout
          </button>
          <div className="flex items-center gap-3 rounded-full border border-[rgba(27,27,24,0.12)] px-3 py-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-100)] font-semibold text-[var(--accent-700)]"
              suppressHydrationWarning
            >
              {isMounted ? initials : ""}
            </div>

            <div className="hidden sm:block">
              <p
                className="text-sm font-semibold text-[var(--ink-900)]"
                suppressHydrationWarning
              >
                {isMounted ? (user?.name ?? "Admin") : "Admin"}
              </p>
              <p
                className="text-xs text-[var(--ink-500)]"
                suppressHydrationWarning
              >
                {isMounted ? (user?.email ?? "Operations lead") : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastTone = "success" | "error";

type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  addToast: (message: unknown, tone: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const normalizeMessage = (message: unknown) => {
    if (typeof message === "string" && message.trim()) {
      const trimmed = message.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const parsed = JSON.parse(trimmed) as { message?: unknown };
          if (typeof parsed.message === "string" && parsed.message.trim()) {
            return parsed.message;
          }
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }

    if (message && typeof message === "object" && "message" in message) {
      const raw = (message as { message?: unknown }).message;
      if (typeof raw === "string" && raw.trim()) {
        return raw;
      }
    }

    return "Request failed";
  };

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: unknown, tone: ToastTone) => {
      const id = createId();
      const normalized = normalizeMessage(message);
      setToasts((prev) => [...prev, { id, message: normalized, tone }]);
      window.setTimeout(() => removeToast(id), 3200);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(360px,90vw)] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg transition ${
              toast.tone === "success"
                ? "border-[rgba(47,94,85,0.3)] bg-[rgba(215,228,223,0.92)] text-[var(--accent-700)]"
                : "border-[rgba(162,75,30,0.35)] bg-[rgba(242,225,217,0.92)] text-[var(--warning-500)]"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
};

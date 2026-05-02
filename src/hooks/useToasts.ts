import { createContext, useCallback, useContext, useState } from "react";

export type Toast = {
  id: number;
  message: string;
  detail?: string;
  duration?: number;
};

type ToastContextValue = {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastsState(): ToastContextValue {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), toast.duration ?? 2400);
    },
    [dismiss],
  );

  return { toasts, push, dismiss };
}

export const ToastProvider = ToastContext.Provider;

export function useToasts(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToasts måste köras inom ToastProvider");
  return ctx;
}

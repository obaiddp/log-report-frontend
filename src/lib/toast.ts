import { createContext, useContext } from "react";

export type ToastVariant = "default" | "destructive";

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

export type ToastItem = ToastOptions & { id: number };

export type ToastContextValue = {
  toast: (options: ToastOptions) => void;
  dismiss: (id: number) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

/** Shows a small notification, e.g. when a record changed in the background. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}

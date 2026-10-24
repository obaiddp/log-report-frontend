import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

import { ToastContext, type ToastItem, type ToastOptions } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TOAST_DURATION_MS = 4000;

/**
 * Minimal toast host. The project has no toast library, so this keeps the
 * stack in the corner of the viewport and auto dismisses each message.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(0);
  const timersRef = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(id);

    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = ++nextIdRef.current;

      setToasts((current) => [...current, { ...options, id }]);
      timersRef.current.set(
        id,
        window.setTimeout(() => dismiss(id), TOAST_DURATION_MS)
      );
    },
    [dismiss]
  );

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      <div
        id="toast-stack"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-xs flex-col gap-2"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            aria-live="polite"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border bg-card p-3 shadow-lg",
              item.variant === "destructive" ? "border-destructive/40" : "border-border"
            )}
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <p
                className={cn(
                  "text-sm font-medium text-foreground",
                  item.variant === "destructive" && "text-destructive"
                )}
              >
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

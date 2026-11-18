import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ListFilter } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type FilterOption = { value: string; label: string };

type ColumnFilterProps = {
  label: string;
  options: FilterOption[];
  selected: string[];
  onApply: (values: string[]) => void;
};

const PANEL_WIDTH = 224; // w-56

export default function ColumnFilter({
  label,
  options,
  selected,
  onApply,
}: ColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(selected);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const active = selected.length > 0;

  function openPanel() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8)),
      });
    }
    setDraft(selected);
    setQuery("");
    setOpen(true);
  }

  // Close on outside click, Escape, resize, or page scroll
  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  function toggle(value: string) {
    setDraft((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const visibleOptions = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={`Filter by ${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          active && "text-primary"
        )}
      >
        <ListFilter className="size-3.5" />
        {active && (
          <span className="sr-only">{selected.length} filters selected</span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={`${label} filter`}
            style={{ top: pos.top, left: pos.left, width: PANEL_WIDTH }}
            className="fixed z-50 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg"
          >
            {options.length > 8 && (
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="mb-2 h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            )}

            <div className="max-h-60 space-y-0.5 overflow-y-auto pr-1">
              {visibleOptions.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  No options
                </p>
              ) : (
                visibleOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-normal hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={draft.includes(option.value)}
                      onChange={() => toggle(option.value)}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                ))
              )}
            </div>

            <div className="mt-2 flex items-center gap-2 border-t pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 flex-1"
                onClick={() => {
                  onApply([]);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 flex-1 rounded-full"
                onClick={() => {
                  onApply(draft);
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
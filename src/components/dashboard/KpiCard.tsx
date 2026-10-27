import { Card, CardContent } from "@/components/ui/card";
import {
  TicketPlus,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  TrendingUp,
  FileText,
  ArrowDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  /** Icon to display (from lucide-react) */
  icon?: React.ComponentType<{ className?: string }>;
  /** Accent color variant for left border and icon background */
  accent?: "primary" | "amber" | "green" | "red" | "blue" | "violet";
  /** Highlight the card when value > 0 (for "needs attention" KPIs) */
  highlightWhenPositive?: boolean;
  "aria-label"?: string;
}

const ACCENT_CLASSES: Record<
  NonNullable<KpiCardProps["accent"]>,
  { border: string; bg: string; icon: string }
> = {
  primary: {
    border: "border-l-primary",
    bg: "bg-primary/10",
    icon: "text-primary",
  },
  amber: {
    border: "border-l-amber-500",
    bg: "bg-amber-500/10",
    icon: "text-amber-500",
  },
  green: {
    border: "border-l-green-500",
    bg: "bg-green-500/10",
    icon: "text-green-500",
  },
  red: {
    border: "border-l-red-500",
    bg: "bg-red-500/10",
    icon: "text-red-500",
  },
  blue: {
    border: "border-l-blue-500",
    bg: "bg-blue-500/10",
    icon: "text-blue-500",
  },
  violet: {
    border: "border-l-violet-500",
    bg: "bg-violet-500/10",
    icon: "text-violet-500",
  },
};

const DEFAULT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  total: TicketPlus,
  open: AlertTriangle,
  solved: CheckCircle,
  completed: CheckCircle,
  returned: XCircle,
  pending: AlertTriangle,
  "avg resolution": Clock,
  "avg approval": Clock,
  "last 7 days": TrendingUp,
  "needs my signature": FileText,
  "returned to me": ArrowDownLeft,
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: IconOverride,
  accent = "primary",
  highlightWhenPositive = false,
  "aria-label": ariaLabel,
}: KpiCardProps) {
  const numericValue = typeof value === "string" ? Number(value) : value;
  const isPositive = numericValue > 0;
  const shouldHighlight = highlightWhenPositive && isPositive;

  const accentKey = accent ?? "primary";
  const accentClasses = ACCENT_CLASSES[accentKey];
  const Icon = IconOverride ?? DEFAULT_ICONS[title.toLowerCase()] ?? HelpCircle;

  const ariaId = ariaLabel
    ? `kpi-${ariaLabel.toLowerCase().replace(/\s+/g, "-")}`
    : undefined;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        "border-l-4",
        accentClasses.border,
        shouldHighlight && "ring-2 ring-offset-2 ring-amber-500/50 bg-amber-50 dark:bg-amber-900/20",
        shouldHighlight && "shadow-lg"
      )}
    >
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center justify-center size-8 rounded-lg shrink-0",
                  accentClasses.bg,
                  accentClasses.icon
                )}
                aria-hidden="true"
              >
                <Icon className="size-4" />
              </span>
              <p
                className="text-xs font-medium text-muted-foreground truncate"
                title={title}
              >
                {title}
              </p>
            </div>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>
          <p
            className={cn(
              "text-3xl font-semibold tabular-nums text-foreground flex-shrink-0",
              shouldHighlight && "text-amber-600 dark:text-amber-400"
            )}
            id={ariaId}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
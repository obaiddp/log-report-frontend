/**
 * Chart color system using CSS variables for dark-mode safety.
 * Never hard-code hex; always reference var(--chart-N) or var(--status-*-bg/text).
 */

export const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/**
 * Status colors mapped by API label.
 * Each entry provides the background CSS variable (used for fills/bars/dots)
 * and the text CSS variable (used for labels/tooltips).
 */
export const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  // Support log statuses
  solved: {
    bg: "var(--status-solved-bg)",
    text: "var(--status-solved-text)",
    label: "Solved",
  },
  indoor_repairing: {
    bg: "var(--status-indoor-repairing-bg)",
    text: "var(--status-indoor-repairing-text)",
    label: "Indoor Repairing",
  },
  outdoor_repairing: {
    bg: "var(--status-outdoor-repairing-bg)",
    text: "var(--status-outdoor-repairing-text)",
    label: "Outdoor Repairing",
  },

  // Asset inspection approval statuses
  pending_admin: {
    bg: "var(--status-pending-admin-bg)",
    text: "var(--status-pending-admin-text)",
    label: "Pending admin",
  },
  completed: {
    bg: "var(--status-completed-bg)",
    text: "var(--status-completed-text)",
    label: "Completed",
  },
  returned: {
    bg: "var(--status-returned-bg)",
    text: "var(--status-returned-text)",
    label: "Returned",
  },

  // Asset item statuses
  handover_for_repairing: {
    bg: "var(--status-handover-bg)",
    text: "var(--status-handover-text)",
    label: "Handover for repairing",
  },
  recieved_after_repairing: {
    bg: "var(--status-received-bg)",
    text: "var(--status-received-text)",
    label: "Received after repairing",
  },
  new_purchase: {
    bg: "var(--status-new-purchase-bg)",
    text: "var(--status-new-purchase-text)",
    label: "New purchase",
  },
  others: {
    bg: "var(--status-others-bg)",
    text: "var(--status-others-text)",
    label: "Others",
  },
};

/**
 * Returns the color for a given label (status) or falls back to the palette by index.
 * A missing label (null/undefined) falls back to the palette too.
 */
export function colorFor(
  label: string | null | undefined,
  index: number
): { bg: string; text: string } {
  const normalized = (label ?? "").toLowerCase().replace(/\s+/g, "_");
  const status = STATUS_COLORS[normalized];
  if (status) {
    return { bg: status.bg, text: status.text };
  }
  const paletteColor = PALETTE[index % PALETTE.length];
  return { bg: paletteColor, text: paletteColor };
}

/** Human label for a status key; "Unknown" when missing. */
export function labelFor(label: string | null | undefined): string {
  if (!label) return "Unknown";
  const key = label.toLowerCase().replace(/\s+/g, "_");
  return STATUS_COLORS[key]?.label ?? label;
}

export function fillColorFor(label: string | null | undefined, index: number): string {
  return colorFor(label, index).bg;
}

export function textColorFor(label: string | null | undefined, index: number): string {
  return colorFor(label, index).text;
}
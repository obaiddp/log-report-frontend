import type {
  AssetApprovalStatus,
  SupportLogStatus,
} from "@/lib/api"

export type DashboardScope = "mine" | "department" | "all"

export interface DashboardFilters {
  scope: DashboardScope
  preset: "last7" | "last30" | "thismonth" | "custom"
  from: string
  to: string
  department_id: string
  item_type_id: string
  // support logs
  status: SupportLogStatus | ""
  asset_status: string
  approval_status: AssetApprovalStatus | ""
  // people
  created_by: string
  assigned_to: string
  prepared_by: string
  admin_user: string
}

export const EMPTY_FILTERS: DashboardFilters = {
  scope: "mine",
  preset: "custom",
  from: "",
  to: "",
  department_id: "",
  item_type_id: "",
  status: "",
  asset_status: "",
  approval_status: "",
  created_by: "",
  assigned_to: "",
  prepared_by: "",
  admin_user: "",
}

export const SCOPE_OPTIONS: Array<{ value: DashboardScope; label: string }> = [
  { value: "mine", label: "Mine" },
  { value: "department", label: "Department" },
  { value: "all", label: "All" },
]

export const PRESET_OPTIONS: Array<{ value: DashboardFilters["preset"]; label: string }> = [
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thismonth", label: "This month" },
  { value: "custom", label: "Custom" },
]

/** Local-date YYYY-MM-DD without timezone conversion. */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** Preset date ranges (inclusive). */
export function presetRange(
  preset: DashboardFilters["preset"],
  today: Date = new Date()
): { from: string; to: string } {
  const to = toLocalDateString(today)
  switch (preset) {
    case "last7":
      return { from: toLocalDateString(addDays(today, -6)), to }
    case "last30":
      return { from: toLocalDateString(addDays(today, -29)), to }
    case "thismonth":
      return {
        from: toLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1)),
        to,
      }
    case "custom":
    default:
      return { from: "", to }
  }
}

/** Detect which preset (if any) matches the given from/to. */
export function detectPreset(from: string, to: string): DashboardFilters["preset"] {
  for (const preset of ["last7", "last30", "thismonth"] as const) {
    const { from: f, to: t } = presetRange(preset)
    if (from === f && to === t) return preset
  }
  return "custom"
}

export function humanizeSupportLogStatus(status: SupportLogStatus): string {
  switch (status) {
    case "indoor_repairing":
      return "Indoor Repairing"
    case "outdoor_repairing":
      return "Outdoor Repairing"
    case "solved":
      return "Solved"
  }
}

export function humanizeAssetItemStatus(status: string | null | undefined): string {
  if (!status) return "All item statuses"
  switch (status) {
    case "handover_for_repairing":
      return "Handover for repairing"
    case "recieved_after_repairing":
      return "Received after repairing"
    case "new_purchase":
      return "New purchase"
    case "others":
      return "Others"
    default:
      return String(status)
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
  }
}

export function humanizeApprovalStatus(status: AssetApprovalStatus): string {
  switch (status) {
    case "pending_admin":
      return "Pending admin"
    case "completed":
      return "Completed"
    case "returned":
      return "Returned"
  }
}

/** Format hours as "5.2 h", or "-" when null. */
export function formatHours(hours: number | null): string {
  if (hours === null || hours === undefined) return "-"
  return `${Number(hours).toFixed(1)} h`
}

/** Format a count for tabular display. */
export function formatCount(value: number): string {
  return String(value)
}

/** Count filters that differ from defaults. */
export function countActiveFilters(f: DashboardFilters): number {
  let count = 0
  if (f.scope !== "mine") count++
  if (f.preset !== "custom") count++
  if (f.from) count++
  if (f.to) count++
  if (f.department_id) count++
  if (f.item_type_id) count++
  if (f.status) count++
  if (f.asset_status) count++
  if (f.approval_status) count++
  if (f.created_by) count++
  if (f.assigned_to) count++
  if (f.prepared_by) count++
  if (f.admin_user) count++
  return count
}

export type ChartSeries = { name: string; value: number }

/** Build a label with count for tooltips that never rely on color alone. */
export function labelWithCount(name: string | null, value: number): string {
  return `${name ?? "Unknown"}: ${value}`
}

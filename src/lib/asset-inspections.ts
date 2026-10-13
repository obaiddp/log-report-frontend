import type { AssetInspection } from "@/lib/api";

export function formatInspectionStatus(status: string | null | undefined): string {
  if (!status) return "Not set";

  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function preparedByName(inspection: AssetInspection): string {
  const prepared = inspection.prepared_by;

  if (prepared && typeof prepared === "object" && "name" in prepared) {
    return prepared.name;
  }

  return "—";
}

export function inspectionSearchText(inspection: AssetInspection): string {
  return [
    inspection.username,
    inspection.designation,
    inspection.email,
    inspection.cell,
    inspection.department?.name,
    inspection.item_type?.name,
    inspection.brand,
    inspection.model,
    inspection.serial_number,
    inspection.item_tag,
    inspection.item_problem,
    inspection.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function orDash(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}
import { useCallback, useEffect, useMemo, useState } from "react"
import { SlidersHorizontal, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import type { DashboardFilters, DashboardScope } from "./types"
import {
  humanizeApprovalStatus,
  humanizeAssetItemStatus,
  humanizeSupportLogStatus,
  presetRange,
} from "./types"
import type { DashboardReferenceData } from "./useDashboardReferenceData"

export type DashboardSectionKey = "support" | "asset"

// Filter keys whose value is a plain string and can therefore be cleared
// with "". Excludes scope (owned by the tabs) and preset (derived from the
// date range).
type ClearableFilterKey = {
  [K in keyof DashboardFilters]: "" extends DashboardFilters[K] ? K : never
}[keyof DashboardFilters]

// Fields each section can view and edit. Dates, department and item type are
// shared dashboard-wide: they appear in both bars and editing them in either
// bar refetches both sections. The remaining fields only affect their own
// section, so editing them refetches that section only.
const SECTION_FILTER_KEYS: Record<
  DashboardSectionKey,
  ClearableFilterKey[]
> = {
  support: [
    "from",
    "to",
    "department_id",
    "item_type_id",
    "status",
    "created_by",
    "assigned_to",
  ],
  asset: [
    "from",
    "to",
    "department_id",
    "item_type_id",
    "asset_status",
    "approval_status",
    "prepared_by",
    "admin_user",
  ],
}

interface SectionFilterBarProps {
  /** Which section's fields this bar edits. */
  section: DashboardSectionKey
  /** Prefix for element ids so the two bars never collide. */
  idPrefix: string
  scope: DashboardScope
  filters: DashboardFilters
  onChange: (next: Partial<DashboardFilters>) => void
  reference: DashboardReferenceData
  /** Lets the page pause auto-refresh while the popup is open. */
  onOpenChange?: (open: boolean) => void
}

/**
 * Compact per-section filter row: removable chips for active filters, a date
 * preset select, a "Filters" popup (Sheet on mobile, Dialog on desktop) for
 * the remaining fields, and a one-click Reset for this section's fields.
 * Designed to keep the whole dashboard within a laptop viewport height.
 */
export function SectionFilterBar({
  section,
  idPrefix,
  scope,
  filters,
  onChange,
  reference,
  onOpenChange,
}: SectionFilterBarProps) {
  const showPeople = scope !== "mine"

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 640
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const [popupOpen, setPopupOpen] = useState(false)
  const [draft, setDraft] = useState<DashboardFilters>(filters)

  // While the popup is closed, mirror the committed filters so it always
  // opens showing the current state. While it is open, edits stay local
  // until "Apply" commits them in a single updateFilters call.
  useEffect(() => {
    if (!popupOpen) setDraft(filters)
  }, [filters, popupOpen])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setPopupOpen(open)
      onOpenChange?.(open)
      if (!open) setDraft(filters)
    },
    [filters, onOpenChange]
  )

  const updateDraft = useCallback((patch: Partial<DashboardFilters>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  const handlePresetChange = useCallback(
    (preset: DashboardFilters["preset"]) => {
      const { from, to } = presetRange(preset)
      onChange({ preset, from, to })
    },
    [onChange]
  )

  const clearChip = useCallback(
    (key: ClearableFilterKey) => {
      const patch: Partial<DashboardFilters> = { [key]: "" }
      if (key === "from" || key === "to") patch.preset = "custom"
      onChange(patch)
    },
    [onChange]
  )

  // One-click reset of exactly this section's fields (its date range and
  // shared context included). Scope is intentionally untouched: the tabs
  // above the sections own it.
  const handleReset = useCallback(() => {
    const patch: Partial<DashboardFilters> = { preset: "custom" }
    for (const key of SECTION_FILTER_KEYS[section]) patch[key] = ""
    onChange(patch)
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [section, onChange])

  const handleApply = useCallback(() => {
    onChange(draft)
    handleOpenChange(false)
  }, [draft, onChange, handleOpenChange])

  // Chips for this section's active filters only.
  const chips = useMemo(() => {
    const list: Array<{
      key: ClearableFilterKey
      label: string
      value: string
    }> = []
    const findName = (
      options: DashboardReferenceData["departments"],
      id: string
    ) => options.find((option) => String(option.id) === id)?.name ?? id

    if (filters.from) {
      list.push({ key: "from", label: "From", value: filters.from })
    }
    if (filters.to) {
      list.push({ key: "to", label: "To", value: filters.to })
    }
    if (filters.department_id) {
      list.push({
        key: "department_id",
        label: "Department",
        value: findName(reference.departments, filters.department_id),
      })
    }
    if (filters.item_type_id) {
      list.push({
        key: "item_type_id",
        label: "Item type",
        value: findName(reference.items, filters.item_type_id),
      })
    }

    if (section === "support") {
      if (filters.status) {
        list.push({
          key: "status",
          label: "Status",
          value: humanizeSupportLogStatus(filters.status),
        })
      }
      if (showPeople && filters.created_by) {
        list.push({
          key: "created_by",
          label: "Created by",
          value: findName(reference.people, filters.created_by),
        })
      }
      if (showPeople && filters.assigned_to) {
        list.push({
          key: "assigned_to",
          label: "Assigned to",
          value: findName(reference.people, filters.assigned_to),
        })
      }
    } else {
      if (filters.asset_status) {
        list.push({
          key: "asset_status",
          label: "Item status",
          value: humanizeAssetItemStatus(filters.asset_status),
        })
      }
      if (filters.approval_status) {
        list.push({
          key: "approval_status",
          label: "Approval",
          value: humanizeApprovalStatus(filters.approval_status),
        })
      }
      if (showPeople && filters.prepared_by) {
        list.push({
          key: "prepared_by",
          label: "Prepared by",
          value: findName(reference.people, filters.prepared_by),
        })
      }
      if (showPeople && filters.admin_user) {
        list.push({
          key: "admin_user",
          label: "Approver",
          value: findName(reference.approvers, filters.admin_user),
        })
      }
    }
    return list
  }, [section, showPeople, filters, reference])

  const triggerLabel = `Filters${chips.length > 0 ? ` (${chips.length})` : ""}`

  const filterFields = (
    <div className="space-y-4">
      {/* Date range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${idPrefix}-from`}
            className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
          >
            From
          </label>
          <Input
            id={`${idPrefix}-from`}
            type="date"
            value={draft.from}
            onChange={(e) =>
              updateDraft({ from: e.target.value, preset: "custom" })
            }
            disabled={reference.loading}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${idPrefix}-to`}
            className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
          >
            To
          </label>
          <Input
            id={`${idPrefix}-to`}
            type="date"
            value={draft.to}
            onChange={(e) =>
              updateDraft({ to: e.target.value, preset: "custom" })
            }
            disabled={reference.loading}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Shared context */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${idPrefix}-department`}
            className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
          >
            Department
          </label>
          <Select
            id={`${idPrefix}-department`}
            value={draft.department_id}
            onChange={(e) => updateDraft({ department_id: e.target.value })}
            disabled={reference.loading}
            className="h-9 text-sm"
          >
            <option value="">All departments</option>
            {reference.departments.map((dept) => (
              <option key={dept.id} value={String(dept.id)}>
                {dept.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${idPrefix}-item-type`}
            className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
          >
            Item type
          </label>
          <Select
            id={`${idPrefix}-item-type`}
            value={draft.item_type_id}
            onChange={(e) => updateDraft({ item_type_id: e.target.value })}
            disabled={reference.loading}
            className="h-9 text-sm"
          >
            <option value="">All item types</option>
            {reference.items.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {section === "support" ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${idPrefix}-status`}
            className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
          >
            Support status
          </label>
          <Select
            id={`${idPrefix}-status`}
            value={draft.status}
            onChange={(e) =>
              updateDraft({ status: e.target.value as DashboardFilters["status"] })
            }
            className="h-9 text-sm"
          >
            <option value="">All statuses</option>
            <option value="in_progress">In progress</option>
            <option value="indoor_repairing">Indoor repairing</option>
            <option value="outdoor_repairing">Outdoor repairing</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${idPrefix}-asset-status`}
              className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
            >
              Item status
            </label>
            <Select
              id={`${idPrefix}-asset-status`}
              value={draft.asset_status}
              onChange={(e) => updateDraft({ asset_status: e.target.value })}
              className="h-9 text-sm"
            >
              <option value="">All item statuses</option>
              <option value="handover_for_repairing">Handover for repairing</option>
              <option value="recieved_after_repairing">Received after repairing</option>
              <option value="new_purchase">New purchase</option>
              <option value="others">Others</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`${idPrefix}-approval-status`}
              className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
            >
              Approval status
            </label>
            <Select
              id={`${idPrefix}-approval-status`}
              value={draft.approval_status}
              onChange={(e) =>
                updateDraft({
                  approval_status: e.target.value as DashboardFilters["approval_status"],
                })
              }
              className="h-9 text-sm"
            >
              <option value="">All approvals</option>
              <option value="pending_admin">Pending admin</option>
              <option value="completed">Completed</option>
              <option value="returned">Returned</option>
            </Select>
          </div>
        </div>
      )}

      {showPeople && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {section === "support" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${idPrefix}-created-by`}
                  className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
                >
                  Created by
                </label>
                <Select
                  id={`${idPrefix}-created-by`}
                  value={draft.created_by}
                  onChange={(e) => updateDraft({ created_by: e.target.value })}
                  disabled={reference.loading}
                  className="h-9 text-sm"
                >
                  <option value="">Any</option>
                  {reference.people.map((person) => (
                    <option key={person.id} value={String(person.id)}>
                      {person.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${idPrefix}-assigned-to`}
                  className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
                >
                  Assigned to
                </label>
                <Select
                  id={`${idPrefix}-assigned-to`}
                  value={draft.assigned_to}
                  onChange={(e) => updateDraft({ assigned_to: e.target.value })}
                  disabled={reference.loading}
                  className="h-9 text-sm"
                >
                  <option value="">Any</option>
                  {reference.people.map((person) => (
                    <option key={person.id} value={String(person.id)}>
                      {person.name}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${idPrefix}-prepared-by`}
                  className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
                >
                  Prepared by
                </label>
                <Select
                  id={`${idPrefix}-prepared-by`}
                  value={draft.prepared_by}
                  onChange={(e) => updateDraft({ prepared_by: e.target.value })}
                  disabled={reference.loading}
                  className="h-9 text-sm"
                >
                  <option value="">Any</option>
                  {reference.people.map((person) => (
                    <option key={person.id} value={String(person.id)}>
                      {person.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${idPrefix}-admin-user`}
                  className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
                >
                  Approver
                </label>
                <Select
                  id={`${idPrefix}-admin-user`}
                  value={draft.admin_user}
                  onChange={(e) => updateDraft({ admin_user: e.target.value })}
                  disabled={reference.loading}
                  className="h-9 text-sm"
                >
                  <option value="">Any</option>
                  {reference.approvers.map((person) => (
                    <option key={person.id} value={String(person.id)}>
                      {person.name}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div id={`${idPrefix}-bar`} className="flex flex-wrap items-center gap-2 mb-4">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          role="button"
          tabIndex={0}
          aria-label={`Remove ${chip.label} filter`}
          title={`Remove ${chip.label} filter`}
          className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 max-w-[200px] h-7"
          onClick={() => clearChip(chip.key)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              clearChip(chip.key)
            }
          }}
        >
          <span className="text-[11px] font-medium truncate">
            {chip.label}: {chip.value}
          </span>
          <X className="size-3.5 shrink-0" aria-hidden="true" />
        </Badge>
      ))}

      <div className="ml-auto flex items-center gap-2">
        <Select
          id={`${idPrefix}-preset`}
          value={filters.preset}
          onChange={(e) =>
            handlePresetChange(e.target.value as DashboardFilters["preset"])
          }
          disabled={reference.loading}
          className="h-9 w-[150px] text-sm"
          aria-label="Date range preset"
        >
          <option value="last7">Last 7 days</option>
          <option value="last30">Last 30 days</option>
          <option value="thismonth">This month</option>
          <option value="custom">Custom</option>
        </Select>

        {isMobile ? (
          <Sheet open={popupOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
              <Button
                id={`${idPrefix}-open`}
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                {triggerLabel}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Refine this section&apos;s data.</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-2">{filterFields}</div>
              <SheetFooter>
                <Button type="button" variant="outline" onClick={handleReset}>
                  Reset
                </Button>
                <Button type="button" onClick={handleApply}>
                  Apply
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={popupOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button
                id={`${idPrefix}-open`}
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                {triggerLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Filters</DialogTitle>
                <DialogDescription>Refine this section&apos;s data.</DialogDescription>
              </DialogHeader>
              {filterFields}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleReset}>
                  Reset
                </Button>
                <Button type="button" onClick={handleApply}>
                  Apply
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Button
          id={`${idPrefix}-reset`}
          type="button"
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={handleReset}
          disabled={chips.length === 0}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}
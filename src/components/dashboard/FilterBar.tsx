"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { X, Calendar } from "lucide-react"

import {
  getDepartments,
  getItems,
  getDashboardFilterOptions,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

import type { DashboardFilters } from "./types"
import {
  EMPTY_FILTERS,
  humanizeAssetItemStatus,
  humanizeApprovalStatus,
  humanizeSupportLogStatus,
  presetRange,
} from "./types"

interface FilterBarProps {
  scope: string
  filters: DashboardFilters
  onChange: (next: Partial<DashboardFilters>) => void
  resetFilters: () => void
  activeCount: number
  onFilterOpenChange?: (open: boolean) => void
}

export function FilterBar({
  scope,
  filters,
  onChange,
  resetFilters,
  activeCount,
  onFilterOpenChange,
}: FilterBarProps) {
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([])
  const [items, setItems] = useState<Array<{ id: number; name: string }>>([])
  const [people, setPeople] = useState<Array<{ id: number; name: string }>>([])
  const [approvers, setApprovers] = useState<Array<{ id: number; name: string }>>([])

  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(true)
  const [peopleLoading, setPeopleLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 640
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const [sheetFilters, setSheetFilters] = useState<DashboardFilters>(filters)

  const showPeopleFilters = scope !== "mine"

  const loadReferenceData = useCallback(async () => {
    await Promise.all([
      (async () => {
        setDepartmentsLoading(true)
        try {
          const response = await getDepartments()
          setDepartments(response.data.map((d) => ({ id: d.id, name: d.name })))
        } finally {
          setDepartmentsLoading(false)
        }
      })(),
      (async () => {
        setItemsLoading(true)
        try {
          const response = await getItems()
          setItems(response.data.map((i) => ({ id: i.id, name: i.name })))
        } finally {
          setItemsLoading(false)
        }
      })(),
      (async () => {
        setPeopleLoading(true)
        try {
          const response = await getDashboardFilterOptions(scope as any)
          setPeople(response.data.users.map((u) => ({ id: u.id, name: u.name })))
          setApprovers(response.data.approvers.map((u) => ({ id: u.id, name: u.name })))
        } finally {
          setPeopleLoading(false)
        }
      })(),
    ])
  }, [scope])

  useEffect(() => {
    void loadReferenceData()
  }, [loadReferenceData])

  useEffect(() => {
    if (!sheetOpen) setSheetFilters(filters)
  }, [filters, sheetOpen])

  const isLoadingFilters = departmentsLoading || itemsLoading || peopleLoading

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: keyof DashboardFilters; label: string; value: string }> = []
    const f = filters
    if (f.scope !== "mine") chips.push({ key: "scope", label: "Scope", value: f.scope })
    if (f.from) chips.push({ key: "from", label: "From", value: f.from })
    if (f.to) chips.push({ key: "to", label: "To", value: f.to })
    if (f.department_id) {
      const d = departments.find((x) => String(x.id) === f.department_id)
      chips.push({ key: "department_id", label: "Department", value: d?.name ?? f.department_id })
    }
    if (f.item_type_id) {
      const i = items.find((x) => String(x.id) === f.item_type_id)
      chips.push({ key: "item_type_id", label: "Item type", value: i?.name ?? f.item_type_id })
    }
    if (f.status) chips.push({ key: "status", label: "Support status", value: humanizeSupportLogStatus(f.status as any) })
    if (f.asset_status) chips.push({ key: "asset_status", label: "Item status", value: humanizeAssetItemStatus(f.asset_status) })
    if (f.approval_status) chips.push({ key: "approval_status", label: "Approval", value: humanizeApprovalStatus(f.approval_status as any) })
    if (f.created_by) {
      const p = people.find((x) => String(x.id) === f.created_by)
      chips.push({ key: "created_by", label: "Created by", value: p?.name ?? f.created_by })
    }
    if (f.assigned_to) {
      const p = people.find((x) => String(x.id) === f.assigned_to)
      chips.push({ key: "assigned_to", label: "Assigned to", value: p?.name ?? f.assigned_to })
    }
    if (f.prepared_by) {
      const p = people.find((x) => String(x.id) === f.prepared_by)
      chips.push({ key: "prepared_by", label: "Prepared by", value: p?.name ?? f.prepared_by })
    }
    if (f.admin_user) {
      const p = approvers.find((x) => String(x.id) === f.admin_user)
      chips.push({ key: "admin_user", label: "Approver", value: p?.name ?? f.admin_user })
    }
    return chips
  }, [filters, departments, items, people, approvers])

  const clearChip = useCallback((key: keyof DashboardFilters) => {
    const next: Partial<DashboardFilters> = { [key]: "" }
    if (key === "from" || key === "to") next.preset = "custom"
    onChange(next)
  }, [onChange])

  const handlePreset = useCallback((preset: DashboardFilters["preset"]) => {
    const { from, to } = presetRange(preset)
    const next: Partial<DashboardFilters> = { preset, from, to }
    onChange(next)
    setSheetFilters((prev) => ({ ...prev, ...next }))
  }, [onChange])

  const handleApplySheet = useCallback(() => {
    onChange(sheetFilters)
    setSheetOpen(false)
    onFilterOpenChange?.(false)
  }, [onChange, sheetFilters, onFilterOpenChange])

  const handleResetSheet = useCallback(() => {
    const empty: DashboardFilters = { ...EMPTY_FILTERS, preset: "custom" }
    setSheetFilters(empty)
    onChange(empty)
  }, [onChange])

  const handleOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open)
    onFilterOpenChange?.(open)
    if (!open) setSheetFilters(filters)
  }, [filters, onFilterOpenChange])

  const handleDepartmentChange = useCallback((value: string, isSheet: boolean) => {
    if (isSheet) setSheetFilters((prev) => ({ ...prev, department_id: value }))
    else onChange({ department_id: value })
  }, [onChange])
  const handleItemChange = useCallback((value: string, isSheet: boolean) => {
    if (isSheet) setSheetFilters((prev) => ({ ...prev, item_type_id: value }))
    else onChange({ item_type_id: value })
  }, [onChange])
  const handleStatusChange = useCallback((value: string, isSheet: boolean) => {
    if (isSheet) setSheetFilters((prev) => ({ ...prev, status: value as any }))
    else onChange({ status: value as any })
  }, [onChange])
  const handleAssetStatusChange = useCallback((value: string, isSheet: boolean) => {
    if (isSheet) setSheetFilters((prev) => ({ ...prev, asset_status: value }))
    else onChange({ asset_status: value })
  }, [onChange])
  const handleApprovalStatusChange = useCallback((value: string, isSheet: boolean) => {
    if (isSheet) setSheetFilters((prev) => ({ ...prev, approval_status: value as any }))
    else onChange({ approval_status: value as any })
  }, [onChange])

  const handlePersonChange = useCallback(
    (field: string, value: string, isSheet: boolean) => {
      const patch: Partial<DashboardFilters> = { [field]: value }
      if (isSheet) setSheetFilters((prev) => ({ ...prev, ...patch }))
      else onChange(patch)
    },
    [onChange]
  )

  const handleDateChange = useCallback(
    (field: "from" | "to", value: string, isSheet: boolean) => {
      const patch: Partial<DashboardFilters> = { [field]: value, preset: "custom" }
      if (isSheet) setSheetFilters((prev) => ({ ...prev, ...patch }))
      else onChange(patch)
    },
    [onChange]
  )

  const handleReset = useCallback(() => {
    resetFilters()
    setSheetFilters(filters)
  }, [resetFilters, filters])

  // --- Shared filter form markup ---
  const filterFields = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">From</label>
          <Input
            id="filter-from"
            type="date"
            value={sheetFilters.from}
            onChange={(e) => handleDateChange("from", e.target.value, true)}
            disabled={isLoadingFilters}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">To</label>
          <Input
            id="filter-to"
            type="date"
            value={sheetFilters.to}
            onChange={(e) => handleDateChange("to", e.target.value, true)}
            disabled={isLoadingFilters}
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Department</label>
          <Select
            id="filter-department"
            value={sheetFilters.department_id}
            onChange={(e) => handleDepartmentChange(e.target.value, true)}
            disabled={departmentsLoading}
            className="h-9 text-sm"
          >
            <option value="">All departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={String(dept.id)}>
                {dept.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Item type</label>
          <Select
            id="filter-item-type"
            value={sheetFilters.item_type_id}
            onChange={(e) => handleItemChange(e.target.value, true)}
            disabled={itemsLoading}
            className="h-9 text-sm"
          >
            <option value="">All item types</option>
            {items.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Support status</label>
          <Select
            id="filter-support-status"
            value={sheetFilters.status}
            onChange={(e) => handleStatusChange(e.target.value, true)}
            disabled={isLoadingFilters}
            className="h-9 text-sm"
          >
            <option value="">All statuses</option>
            <option value="indoor_repairing">Indoor Repairing</option>
            <option value="outdoor_repairing">Outdoor Repairing</option>
            <option value="solved">Solved</option>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Item status</label>
          <Select
            id="filter-item-status"
            value={sheetFilters.asset_status}
            onChange={(e) => handleAssetStatusChange(e.target.value, true)}
            disabled={isLoadingFilters}
            className="h-9 text-sm"
          >
            <option value="">All item statuses</option>
            <option value="handover_for_repairing">Handover for repairing</option>
            <option value="recieved_after_repairing">Received after repairing</option>
            <option value="new_purchase">New purchase</option>
            <option value="others">Others</option>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Approval status</label>
          <Select
            id="filter-approval-status"
            value={sheetFilters.approval_status}
            onChange={(e) => handleApprovalStatusChange(e.target.value, true)}
            disabled={isLoadingFilters}
            className="h-9 text-sm"
          >
            <option value="">All approvals</option>
            <option value="pending_admin">Pending admin</option>
            <option value="completed">Completed</option>
            <option value="returned">Returned</option>
          </Select>
        </div>
      </div>

      {showPeopleFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Created by</label>
            <Select
              id="filter-created-by"
              value={sheetFilters.created_by}
              onChange={(e) => handlePersonChange("created_by", e.target.value, true)}
              disabled={peopleLoading}
              className="h-9 text-sm"
            >
              <option value="">Any</option>
              {people.map((person) => (
                <option key={person.id} value={String(person.id)}>
                  {person.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Assigned to</label>
            <Select
              id="filter-assigned-to"
              value={sheetFilters.assigned_to}
              onChange={(e) => handlePersonChange("assigned_to", e.target.value, true)}
              disabled={peopleLoading}
              className="h-9 text-sm"
            >
              <option value="">Any</option>
              {people.map((person) => (
                <option key={person.id} value={String(person.id)}>
                  {person.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Prepared by</label>
            <Select
              id="filter-prepared-by"
              value={sheetFilters.prepared_by}
              onChange={(e) => handlePersonChange("prepared_by", e.target.value, true)}
              disabled={peopleLoading}
              className="h-9 text-sm"
            >
              <option value="">Any</option>
              {people.map((person) => (
                <option key={person.id} value={String(person.id)}>
                  {person.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Approver</label>
            <Select
              id="filter-admin-user"
              value={sheetFilters.admin_user}
              onChange={(e) => handlePersonChange("admin_user", e.target.value, true)}
              disabled={peopleLoading}
              className="h-9 text-sm"
            >
              <option value="">Any</option>
              {approvers.map((person) => (
                <option key={person.id} value={String(person.id)}>
                  {person.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Desktop: sticky inline filter bar */}
      {/* {!isMobile && (
        <Card className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur-sm">
          <CardContent className="px-4 py-4 md:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-[300px]">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Button
                    id="btn-preset-last7"
                    type="button"
                    variant={filters.preset === "last7" ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handlePreset("last7")}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    id="btn-preset-last30"
                    type="button"
                    variant={filters.preset === "last30" ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handlePreset("last30")}
                  >
                    Last 30 days
                  </Button>
                  <Button
                    id="btn-preset-thismonth"
                    type="button"
                    variant={filters.preset === "thismonth" ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handlePreset("thismonth")}
                  >
                    This month
                  </Button>
                  <Button
                    id="btn-preset-custom"
                    type="button"
                    variant={filters.preset === "custom" ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handlePreset("custom")}
                  >
                    Custom
                  </Button>
                </div>
                {filterFields}
              </div>
              <div className="flex items-end gap-2">
                {activeCount > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-w-xs overflow-hidden">
                    {activeFilterChips.slice(0, 6).map((chip) => (
                      <Badge
                        key={chip.key}
                        variant="secondary"
                        role="button"
                        tabIndex={0}
                        aria-label={`Remove ${chip.label} filter`}
                        title={`Remove ${chip.label} filter`}
                        className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 truncate max-w-[150px]"
                        onClick={() => clearChip(chip.key)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            clearChip(chip.key)
                          }
                        }}
                      >
                        <span className="text-[11px] font-medium truncate">{chip.label}: {chip.value}</span>
                        <X className="size-3.5" aria-hidden="true" />
                      </Badge>
                    ))}
                    {activeFilterChips.length > 6 && (
                      <Badge variant="secondary" className="text-[11px] font-medium">
                        +{activeFilterChips.length - 6} more
                      </Badge>
                    )}
                  </div>
                )}
                <Button
                  id="btn-reset-filters"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={!activeCount || isLoadingFilters}
                >
                  Reset filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* Mobile: Filters button opens a Sheet */}
      {/* {isMobile && (
        <div className="flex items-center gap-2">
          <Sheet open={sheetOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
              <Button id="btn-open-filters-mobile" type="button" size="sm">
                <Calendar className="size-4" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Refine support logs and asset inspections.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 p-4">
                {filterFields}
                <p className="text-xs text-muted-foreground">
                  Active: {activeCount}
                </p>
              </div>
              <SheetFooter>
                <Button
                  id="btn-reset-filters-mobile"
                  type="button"
                  variant="outline"
                  onClick={handleResetSheet}
                  disabled={activeCount === 0 || isLoadingFilters}
                >
                  Reset
                </Button>
                <Button
                  id="btn-apply-filters-mobile"
                  type="button"
                  onClick={handleApplySheet}
                  disabled={isLoadingFilters}
                >
                  Apply
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <Button
            id="btn-reset-filters-mobile-inline"
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!activeCount || isLoadingFilters}
          >
            Reset filters
          </Button>
        </div>
      )} */}
    </>
  )
}

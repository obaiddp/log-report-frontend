import { useEffect, useMemo, useRef, useState } from "react"

import { useAuth } from "@/context/AuthContext"
import { hasPermission } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { FilterBar } from "@/components/dashboard/FilterBar"
import { SupportLogsSection } from "@/components/dashboard/SupportLogsSection"
import { AssetInspectionsSection } from "@/components/dashboard/AssetInspectionsSection"
import { UserPerformanceSection } from "@/components/dashboard/UserPerformanceSection"
import { useDashboardFilters } from "@/components/dashboard/useDashboardFilters"
import type { DashboardScope } from "@/components/dashboard/types"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"

const AUTO_REFRESH_INTERVAL_MS = 30_000

interface ScopeTab {
  value: DashboardScope
  label: string
  enabled: boolean
}

export default function DashboardPage() {
  const { user } = useAuth()

  const canViewDepartment = hasPermission(user, "dashboard_department_view")
  const canViewAll = hasPermission(user, "dashboard_all_view")
  const canViewSupport = hasPermission(user, "dashboard_support_logs")
  const canViewAsset = hasPermission(user, "dashboard_asset_inspections")
  const canViewPerformance = hasPermission(user, "user_performance")

  const scopeTabs: ScopeTab[] = useMemo(
    () => [
      { value: "mine", label: "Mine", enabled: true },
      { value: "department", label: "Department", enabled: canViewDepartment },
      { value: "all", label: "All", enabled: canViewAll },
    ],
    [canViewDepartment, canViewAll]
  )

  const visibleTabs = scopeTabs.filter((t) => t.enabled)
  const hasMultipleTabs = visibleTabs.length > 1

  const {
    filters,
    updateFilters,
    version,
    activeCount,
    resetFilters,
  } = useDashboardFilters()

  // Derive scope from the filters (URL is the source of truth).
  const [scope, setScope] = useState<DashboardScope>(filters.scope)

  useEffect(() => {
    setScope(filters.scope)
  }, [filters.scope])

  // Clear people filters when the scope changes.
  const prevScopeRef = useRef<DashboardScope>(scope)
  useEffect(() => {
    if (prevScopeRef.current !== scope) {
      prevScopeRef.current = scope
      if (scope === "mine") {
        updateFilters({
          created_by: "",
          assigned_to: "",
          prepared_by: "",
          admin_user: "",
        })
      }
    }
  }, [scope, updateFilters])

  // Bump the refresh key whenever the URL filters change so sections refetch
  // silently (keeping old data visible while dimmed).
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    setRefreshKey((k) => k + 1)
  }, [version])

  const [filterOpen, setFilterOpen] = useState(false)

  useAutoRefresh(
    () => {
      setRefreshKey((k) => k + 1)
    },
    { intervalMs: AUTO_REFRESH_INTERVAL_MS, enabled: !filterOpen }
  )

  return (
    <div id="dashboard-page" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Filtered support log and asset inspection activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            id="btn-refresh-dashboard"
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Scope tabs (permission-based). Hidden when only "Mine" is visible. */}
      {hasMultipleTabs && (
        <Tabs
          value={scope}
          onValueChange={(value) => {
            const next = value as DashboardScope
            setScope(next)
            updateFilters({ scope: next })
          }}
        >
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 gap-1">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                id={`tab-scope-${tab.value}`}
                value={tab.value}
                disabled={!tab.enabled}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <FilterBar
        scope={scope}
        filters={filters}
        onChange={updateFilters}
        resetFilters={resetFilters}
        activeCount={activeCount}
        onFilterOpenChange={setFilterOpen}
      />

      {canViewSupport && (
        <SupportLogsSection
          scope={scope}
          filters={filters}
          refreshKey={refreshKey}
        />
      )}

      {canViewAsset && (
        <AssetInspectionsSection
          scope={scope}
          filters={filters}
          refreshKey={refreshKey}
        />
      )}

      {canViewPerformance && <UserPerformanceSection refreshKey={refreshKey} />}
    </div>
  )
}

// import { useEffect, useMemo, useRef, useState } from "react"

// import { useAuth } from "@/context/AuthContext"
// import { hasPermission } from "@/lib/permissions"
// import { Button } from "@/components/ui/button"
// import {
//   Tabs,
//   TabsList,
//   TabsTrigger,
// } from "@/components/ui/tabs"

// import { FilterBar } from "@/components/dashboard/FilterBar"
// import { SupportLogsSection } from "@/components/dashboard/SupportLogsSection"
// import { AssetInspectionsSection } from "@/components/dashboard/AssetInspectionsSection"
// import { UserPerformanceSection } from "@/components/dashboard/UserPerformanceSection"
// import { useDashboardFilters } from "@/components/dashboard/useDashboardFilters"
// import type { DashboardScope } from "@/components/dashboard/types"
// import { useAutoRefresh } from "@/hooks/use-auto-refresh"

// const AUTO_REFRESH_INTERVAL_MS = 30_000

// interface ScopeTab {
//   value: DashboardScope
//   label: string
//   enabled: boolean
// }

// export default function DashboardPage() {
//   const { user } = useAuth()

//   const canViewDepartment = hasPermission(user, "dashboard_department_view")
//   const canViewAll = hasPermission(user, "dashboard_all_view")
//   const canViewSupport = hasPermission(user, "dashboard_support_logs")
//   const canViewAsset = hasPermission(user, "dashboard_asset_inspections")
//   const canViewPerformance = hasPermission(user, "user_performance")

//   const scopeTabs: ScopeTab[] = useMemo(
//     () => [
//       { value: "mine", label: "Mine", enabled: true },
//       { value: "department", label: "Department", enabled: canViewDepartment },
//       { value: "all", label: "All", enabled: canViewAll },
//     ],
//     [canViewDepartment, canViewAll]
//   )

//   const visibleTabs = scopeTabs.filter((t) => t.enabled)
//   const hasMultipleTabs = visibleTabs.length > 1

//   const {
//     filters,
//     updateFilters,
//     version,
//     activeCount,
//     resetFilters,
//   } = useDashboardFilters()

//   // The URL is the source of truth for scope; no mirror state is needed.
//   const scope = filters.scope

//   // Clear people filters when the scope changes back to "mine". Guarded so
//   // it runs once per real scope change and only fires updateFilters when
//   // there is something to clear (each fire bumps version = one refetch).
//   const prevScopeRef = useRef<DashboardScope>(scope)
//   useEffect(() => {
//     if (prevScopeRef.current === scope) return
//     prevScopeRef.current = scope
//     if (scope === "mine") {
//       const hasPeopleFilters =
//         filters.created_by !== "" ||
//         filters.assigned_to !== "" ||
//         filters.prepared_by !== "" ||
//         filters.admin_user !== ""
//       if (hasPeopleFilters) {
//         updateFilters({
//           created_by: "",
//           assigned_to: "",
//           prepared_by: "",
//           admin_user: "",
//         })
//       }
//     }
//   }, [
//     scope,
//     filters.created_by,
//     filters.assigned_to,
//     filters.prepared_by,
//     filters.admin_user,
//     updateFilters,
//   ])

//   // Translate version bumps (filters/tab changed) into refresh-key bumps
//   // for the sections. Skipped while the version is unchanged, so mount and
//   // StrictMode's double-invoked mount effect never trigger a refetch.
//   const [refreshKey, setRefreshKey] = useState(0)
//   const lastVersionRef = useRef(version)
//   useEffect(() => {
//     if (lastVersionRef.current === version) return
//     lastVersionRef.current = version
//     setRefreshKey((k) => k + 1)
//   }, [version])

//   const [filterOpen, setFilterOpen] = useState(false)

//   // Exactly one tick every 30 s while the page is visible. No fetch on
//   // focus/visibility change and no fetch when the interval is (re)enabled —
//   // paused only while the filter Sheet is open.
//   useAutoRefresh(
//     () => {
//       setRefreshKey((k) => k + 1)
//     },
//     {
//       intervalMs: AUTO_REFRESH_INTERVAL_MS,
//       enabled: !filterOpen,
//       refreshOnFocus: false,
//     }
//   )

//   return (
    
//     <div id="dashboard-page" className="space-y-6">
//       <div className="flex flex-wrap items-start justify-between gap-3">
      
//         <div className="flex items-center gap-2">
//           {/* <Button
//             id="btn-refresh-dashboard"
//             variant="outline"
//             size="sm"
//             onClick={() => setRefreshKey((k) => k + 1)}
//           >
//             Refresh
//           </Button> */}
//         </div>
//       </div>

//       {/* Scope tabs (permission-based). Hidden when only "Mine" is visible. */}
//       {/* {hasMultipleTabs && (
//         <Tabs
//           value={scope}
//           onValueChange={(value) => {
//             const next = value as DashboardScope
//             updateFilters({ scope: next })
//           }}
//         >
//           <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 gap-1">
//             {visibleTabs.map((tab) => (
//               <TabsTrigger
//                 key={tab.value}
//                 id={`tab-scope-${tab.value}`}
//                 value={tab.value}
//                 disabled={!tab.enabled}
//               >
//                 {tab.label}
//               </TabsTrigger>
//             ))}
//           </TabsList>
//         </Tabs>
//       )} */}

//       <FilterBar
//         scope={scope}
//         filters={filters}
//         onChange={updateFilters}
//         resetFilters={resetFilters}
//         activeCount={activeCount}
//         onFilterOpenChange={setFilterOpen}
//       />

//       {canViewSupport && (
//         <SupportLogsSection
//           scope={scope}
//           filters={filters}
//           refreshKey={refreshKey}
//         />
//       )}

//       {canViewAsset && (
//         <AssetInspectionsSection
//           scope={scope}
//           filters={filters}
//           refreshKey={refreshKey}
//         />
//       )}

//       {canViewPerformance && <UserPerformanceSection refreshKey={refreshKey} />}
//     </div>
//   )
// }

// ======================

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RotateCw } from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { hasPermission } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { SupportLogsSection } from "@/components/dashboard/SupportLogsSection"
import { AssetInspectionsSection } from "@/components/dashboard/AssetInspectionsSection"
import { UserPerformanceSection } from "@/components/dashboard/UserPerformanceSection"
import { useDashboardFilters } from "@/components/dashboard/useDashboardFilters"
import { useDashboardReferenceData } from "@/components/dashboard/useDashboardReferenceData"
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

  const { filters, updateFilters, supportVersion, assetVersion } =
    useDashboardFilters()

  // The URL is the source of truth for scope; no mirror state is needed.
  const scope = filters.scope

  // Shared reference lists: ONE load feeds both section filter bars.
  const reference = useDashboardReferenceData(scope)

  // Clear people filters when the scope changes back to "mine". Guarded so
  // it runs once per real scope change and only fires updateFilters when
  // there is something to clear.
  const prevScopeRef = useRef<DashboardScope>(scope)
  useEffect(() => {
    if (prevScopeRef.current === scope) return
    prevScopeRef.current = scope
    if (scope === "mine") {
      const hasPeopleFilters =
        filters.created_by !== "" ||
        filters.assigned_to !== "" ||
        filters.prepared_by !== "" ||
        filters.admin_user !== ""
      if (hasPeopleFilters) {
        updateFilters({
          created_by: "",
          assigned_to: "",
          prepared_by: "",
          admin_user: "",
        })
      }
    }
  }, [
    scope,
    filters.created_by,
    filters.assigned_to,
    filters.prepared_by,
    filters.admin_user,
    updateFilters,
  ])

  // Each section has its own refresh key, translated from its own filter
  // version: editing a support-only filter refetches only the support
  // section, an asset-only filter only the asset section. Shared inputs
  // (dates, department, item type, scope) bump both versions. The
  // lastVersionRef guards keep StrictMode's double-invoked mount effects
  // from triggering refetches.
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0)
  const [supportRefreshKey, setSupportRefreshKey] = useState(0)
  const [assetRefreshKey, setAssetRefreshKey] = useState(0)

  const lastSupportVersionRef = useRef(supportVersion)
  useEffect(() => {
    if (lastSupportVersionRef.current === supportVersion) return
    lastSupportVersionRef.current = supportVersion
    setSupportRefreshKey((k) => k + 1)
  }, [supportVersion])

  const lastAssetVersionRef = useRef(assetVersion)
  useEffect(() => {
    if (lastAssetVersionRef.current === assetVersion) return
    lastAssetVersionRef.current = assetVersion
    setAssetRefreshKey((k) => k + 1)
  }, [assetVersion])

  // Manual refresh and the auto-refresh tick refetch every visible section.
  const bumpAll = useCallback(() => {
    setGlobalRefreshKey((k) => k + 1)
    setSupportRefreshKey((k) => k + 1)
    setAssetRefreshKey((k) => k + 1)
  }, [])

  const [supportFiltersOpen, setSupportFiltersOpen] = useState(false)
  const [assetFiltersOpen, setAssetFiltersOpen] = useState(false)

  // Exactly one tick every 30 s while the page is visible, paused while a
  // filter popup is open. No fetch on focus/visibility change and none when
  // the interval is (re)enabled.
  useAutoRefresh(bumpAll, {
    intervalMs: AUTO_REFRESH_INTERVAL_MS,
    enabled: !supportFiltersOpen && !assetFiltersOpen,
    refreshOnFocus: false,
  })

  return (
    <div id="dashboard-page" className="space-y-4">
      {/* One compact row: scope tabs (left) + manual refresh (right). */}
      <div className="flex flex-wrap items-center gap-2">
        {hasMultipleTabs && (
          <Tabs
            value={scope}
            onValueChange={(value) => {
              updateFilters({ scope: value as DashboardScope })
            }}
          >
            <TabsList className="w-auto">
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

        <Button
          id="btn-refresh-dashboard"
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={bumpAll}
        >
          <RotateCw className="size-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {canViewSupport && (
        <SupportLogsSection
          scope={scope}
          filters={filters}
          refreshKey={supportRefreshKey}
          onFilterChange={updateFilters}
          reference={reference}
          onFiltersOpenChange={setSupportFiltersOpen}
        />
      )}

      {canViewAsset && (
        <AssetInspectionsSection
          scope={scope}
          filters={filters}
          refreshKey={assetRefreshKey}
          onFilterChange={updateFilters}
          reference={reference}
          onFiltersOpenChange={setAssetFiltersOpen}
        />
      )}

      {canViewPerformance && (
        <UserPerformanceSection refreshKey={globalRefreshKey} />
      )}
    </div>
  )
}
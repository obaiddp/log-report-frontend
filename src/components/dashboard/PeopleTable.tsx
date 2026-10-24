import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { formatCount, labelWithCount } from "./types"

interface PeopleTableRow {
  id: number
  name: string
  total: number
  pending: number
  returned: number
  completed: number
}

type SortKey = "total" | "pending" | "returned" | "completed" | "name"

interface PeopleTableProps {
  title: string
  data: PeopleTableRow[]
  emptyMessage?: string
  ariaLabel?: string
}

const SEGMENT_COLORS: Record<keyof Pick<PeopleTableRow, "pending" | "returned" | "completed">, string> = {
  pending: "bg-amber-500",
  returned: "bg-destructive",
  completed: "bg-status-solved-bg",
}

const SEGMENT_LABELS: Record<keyof Pick<PeopleTableRow, "pending" | "returned" | "completed">, string> = {
  pending: "Pending",
  returned: "Returned",
  completed: "Completed",
}

function formatPercent(value: number, total: number): string {
  if (!total) return "0%"
  return `${Math.round((value / total) * 100)}%`
}

export function PeopleTable({
  title,
  data,
  emptyMessage = "No data yet.",
  ariaLabel,
}: PeopleTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("total")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal: number | string = a[sortKey]
      let bVal: number | string = b[sortKey]
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1
      return 0
    })
  }, [data, sortKey, sortDir])

  const maxTotal = data.length ? Math.max(...data.map((d) => d.total)) : 0

  const headers: Array<{ key: SortKey; label: string }> = [
    { key: "name", label: "Person" },
    { key: "total", label: "Total" },
    { key: "pending", label: "Pending" },
    { key: "returned", label: "Returned" },
    { key: "completed", label: "Completed" },
  ]

  return (
    <section role="region" aria-label={ariaLabel ?? title}>
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="overflow-auto border rounded-md">
        <Table>
          <caption className="sr-only">{title}</caption>
          <TableHeader>
            <TableRow>
              {headers.map((header) => {
                const active = sortKey === header.key
                return (
                  <TableHead
                    key={header.key}
                    className={cn(
                      "text-right tabular-nums cursor-pointer select-none group",
                      active &&
                        (sortDir === "asc"
                          ? "text-primary"
                          : "text-primary-hover")
                    )}
                    onClick={() => {
                      if (sortKey === header.key) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc")
                      } else {
                        setSortKey(header.key)
                        setSortDir("desc")
                      }
                    }}
                  >
                    {header.label}
                    {active && (
                      <span className="ml-1 text-[10px]">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((row) => {
                const pendingPct = maxTotal > 0 ? (row.pending / maxTotal) * 100 : 0
                const returnedPct = maxTotal > 0 ? (row.returned / maxTotal) * 100 : 0
                const completedPct = maxTotal > 0 ? (row.completed / maxTotal) * 100 : 0
                return (
                  <TableRow
                    key={row.id}
                    id={`people-row-${row.id}`}
                    className="group"
                  >
                    <TableCell className="font-medium truncate" title={row.name ?? "Unknown"}>
                      {row.name ?? "Unknown"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCount(row.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(row.pending)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(row.returned)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(row.completed)}
                    </TableCell>
                    <TableCell className="w-32">
                      <div className="h-3.5 rounded-full bg-muted overflow-hidden border border-border/60" title={labelWithCount(row.name, row.total)}>
                        {row.pending > 0 && (
                          <div
                            className={`${SEGMENT_COLORS.pending} h-full`}
                            style={{ width: `${pendingPct}%` }}
                            role="img"
                            aria-label={`${SEGMENT_LABELS.pending}: ${row.pending} (${formatPercent(row.pending, row.total)})`}
                          />
                        )}
                        {row.completed > 0 && (
                          <div
                            className={`${SEGMENT_COLORS.completed} h-full`}
                            style={{ width: `${completedPct}%` }}
                            role="img"
                            aria-label={`${SEGMENT_LABELS.completed}: ${row.completed} (${formatPercent(row.completed, row.total)})`}
                          />
                        )}
                        {row.returned > 0 && (
                          <div
                            className={`${SEGMENT_COLORS.returned} h-full`}
                            style={{ width: `${returnedPct}%` }}
                            role="img"
                            aria-label={`${SEGMENT_LABELS.returned}: ${row.returned} (${formatPercent(row.returned, row.total)})`}
                          />
                        )}
                        {(row.pending === 0 && row.completed === 0 && row.returned === 0) && (
                          <div className="h-full w-full bg-muted/40" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

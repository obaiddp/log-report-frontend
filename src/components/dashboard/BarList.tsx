import { formatCount, labelWithCount } from "./types"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface BarListRow {
  id: number | null
  name: string
  total: number
}

interface BarListProps {
  title: string
  data: BarListRow[]
  emptyMessage?: string
  ariaLabel?: string
  showRank?: boolean
}

export function BarList({
  title,
  data,
  emptyMessage = "No data yet.",
  ariaLabel,
  showRank = true,
}: BarListProps) {
  const sorted = [...data].sort((a, b) => b.total - a.total)
  const max = sorted.length ? Math.max(...sorted.map((d) => d.total)) : 0

  return (
    <section id={`barlist-${title.toLowerCase().replace(/\s+/g, "-")}`} role="region" aria-label={ariaLabel ?? title}>
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      <div className="overflow-auto border rounded-md">
        <Table>
          <caption className="sr-only">{title}</caption>
          <TableHeader>
            <TableRow>
              {showRank && <TableHead className="w-10 text-right">#</TableHead>}
              <TableHead>Name</TableHead>
              <TableHead className="w-20 text-right">Total</TableHead>
              <TableHead className="w-40 text-right" sr-only>
                Distribution
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((row, index) => {
                const percent = max > 0 ? Math.round((row.total / max) * 100) : 0
                return (
                  <TableRow key={row.id ?? index} id={`barlist-row-${row.id ?? index}`}>
                    {showRank && (
                      <TableCell className="text-right font-medium text-muted-foreground tabular-nums">
                        {index + 1}
                      </TableCell>
                    )}
                    <TableCell className="font-medium truncate" title={row.name}>
                      {row.name ?? "Unknown"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(row.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="w-full bg-muted rounded-full h-2"
                        title={labelWithCount(row.name, row.total)}
                      >
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${percent}%` }}
                          role="img"
                          aria-label={labelWithCount(row.name, row.total)}
                        />
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

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/superadmin/page-header"
import { SearchInput } from "@/components/superadmin/search-input"
import { DataTable, type Column } from "@/components/superadmin/data-table"
import { StatusBadge } from "@/components/superadmin/status-badge"

interface AuditLog {
  id: string
  adminId: string
  event: string
  description: string
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  adminEmail: string | null
  adminName: string | null
}

interface AuditResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function getEventVariant(event: string): "success" | "warning" | "error" | "info" {
  if (event.includes("SUCCESS") || event.includes("ENABLED")) return "success"
  if (event.includes("FAILED") || event.includes("LOCKED")) return "error"
  if (event.includes("WARNING") || event.includes("2FA")) return "warning"
  return "info"
}

export default function AuditLogPage() {
  const router = useRouter()
  const [data, setData] = React.useState<AuditResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    fetchLogs()
  }, [search, page])

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("event", search)
      params.set("page", String(page))

      const res = await fetch(`/api/superadmin/audit?${params}`, { credentials: "include" })
      if (res.status === 401) {
        router.push("/superadmin/login")
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      // error
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<AuditLog>[] = [
    {
      key: "event",
      label: "Event",
      render: (item) => (
        <StatusBadge label={item.event} variant={getEventVariant(item.event)} />
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (item) => <span className="text-foreground">{item.description}</span>,
    },
    {
      key: "adminName",
      label: "Admin",
      render: (item) => (
        <div>
          <p className="text-[13px]">{item.adminName || "System"}</p>
          <p className="text-[11px] text-muted-foreground">{item.adminEmail}</p>
        </div>
      ),
    },
    {
      key: "ipAddress",
      label: "IP Address",
      render: (item) => <span className="text-muted-foreground font-mono text-[11px]">{item.ipAddress || "-"}</span>,
    },
    {
      key: "createdAt",
      label: "Time",
      render: (item) => (
        <span className="text-muted-foreground text-[12px]">
          {new Date(item.createdAt).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description={`${data?.total || 0} total entries`}
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Filter by event..." />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={data?.logs || []} emptyMessage="No audit logs found" />

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[12px] text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-[12px] bg-muted rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="px-3 py-1.5 text-[12px] bg-muted rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

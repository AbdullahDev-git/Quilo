"use client"

import * as React from "react"
import { formatTimeAgo } from "@/lib/utils"
import { toast } from "@/components/toast"

interface AuditLog {
  id: string
  event: string
  description: string
  userId: string | null
  storeId: string | null
  metadata: Record<string, any> | null
  createdAt: string
  ipAddress: string | null
}

const eventIcons: Record<string, { icon: string; color: string }> = {
  "rule.created": { icon: "add_circle", color: "text-primary" },
  "rule.updated": { icon: "edit", color: "text-primary" },
  "rule.deleted": { icon: "delete", color: "text-destructive" },
  "rule.triggered": { icon: "rule", color: "text-primary" },
  "store.connected": { icon: "store", color: "text-[#006b5f] dark:text-[#62fae3]" },
  "store.disconnected": { icon: "store", color: "text-destructive" },
  "order.synced": { icon: "sync", color: "text-[#006b5f] dark:text-[#62fae3]" },
  "webhook.failed": { icon: "error", color: "text-[#ba1a1a] dark:text-[#ffdad6]" },
  "user.login": { icon: "login", color: "text-[#006b5f] dark:text-[#62fae3]" },
  "user.logout": { icon: "logout", color: "text-muted-foreground" },
  "subscription.created": { icon: "credit_card", color: "text-secondary" },
  "subscription.cancelled": { icon: "credit_card_off", color: "text-destructive" },
}

const demoLogs: AuditLog[] = [
  {
    id: "1",
    event: "rule.created",
    description: "High-Value Order Review rule created",
    userId: "user-1",
    storeId: "store-1",
    metadata: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    ipAddress: "192.168.1.1",
  },
  {
    id: "2",
    event: "rule.triggered",
    description: "Auto-approve triggered for order #1003",
    userId: null,
    storeId: "store-1",
    metadata: null,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    ipAddress: null,
  },
  {
    id: "3",
    event: "store.connected",
    description: "Shopify store khan-fashion.myshopify.com connected",
    userId: "user-1",
    storeId: "store-1",
    metadata: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    ipAddress: "192.168.1.1",
  },
  {
    id: "4",
    event: "user.login",
    description: "User logged in successfully",
    userId: "user-1",
    storeId: null,
    metadata: null,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    ipAddress: "192.168.1.1",
  },
  {
    id: "5",
    event: "order.synced",
    description: "47 orders synced from Shopify",
    userId: null,
    storeId: "store-1",
    metadata: null,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    ipAddress: null,
  },
]

const filterOptions = ["All Events", "Rules", "Stores", "Orders", "Users"]

export default function ActivityPage() {
  const [logs, setLogs] = React.useState<AuditLog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState("All Events")
  const [showFilters, setShowFilters] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/activity")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch activity")
        return res.json()
      })
      .then((data) => {
        if (data.logs && data.logs.length > 0) setLogs(data.logs)
        else setLogs(demoLogs)
        setLoading(false)
      })
      .catch(() => {
        setLogs(demoLogs)
        setLoading(false)
      })
  }, [])

  const filteredLogs = React.useMemo(() => {
    let result = logs
    if (filter !== "All Events") {
      const prefix = filter.toLowerCase().replace(/s$/, "")
      result = result.filter(l => l.event.startsWith(prefix))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.description.toLowerCase().includes(q) ||
        l.event.toLowerCase().includes(q)
      )
    }
    return result
  }, [logs, search, filter])

  const getEventIcon = (event: string) => eventIcons[event] || { icon: "history", color: "text-muted-foreground" }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <span className="material-symbols-outlined text-[48px]">error</span>
        <p className="text-body-md mt-2">Failed to load activity</p>
        <p className="text-body-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-[32px] font-semibold text-foreground tracking-tight">Activity Log</h2>
        <p className="text-body-md text-on-surface-variant">Audit trail of all automated actions and system events.</p>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground text-[20px]">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-lg border border-border text-body-md text-foreground focus:outline-none focus:ring-2 focus:ring-[#1f108e]/20 dark:focus:ring-[#818cf8]/30"
            placeholder="Search activity..."
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-body-sm font-medium hover:bg-surface-container-low transition-all">
          <span className="material-symbols-outlined text-[18px]">filter_list</span>
          Filters
          {filter !== "All Events" && (
            <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">1</span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="mb-4 p-3 bg-card border border-border rounded-lg flex flex-wrap gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => { setFilter(opt); setShowFilters(false); toast(`Filtered by ${opt}`, "info") }}
              className={`px-3 py-1.5 rounded-lg text-body-sm font-medium transition-all ${filter === opt ? "bg-primary text-primary-foreground" : "bg-surface-container-low text-on-surface-variant hover:bg-muted"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low border-b border-border">
            <tr>
              {["Event", "Description", "User", "Timestamp"].map((h) => (
                <th key={h} className="px-6 py-4 text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground">
                  <span className="material-symbols-outlined text-[48px] block mb-2">search_off</span>
                  No activity matches your search
                </td>
              </tr>
            ) : (
              filteredLogs.map((log, i) => {
                const { icon, color } = getEventIcon(log.event)
                const userLabel = log.storeId ? `Store ${log.storeId.slice(0, 8)}` : (log.userId ? `User ${log.userId.slice(0, 8)}` : "System")
                return (
                  <tr key={i} className="hover:bg-muted transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[18px] ${color}`}>{icon}</span>
                        <span className="font-mono text-[12px] bg-muted text-on-surface-variant px-2 py-0.5 rounded">{log.event}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body-md text-foreground">{log.description}</td>
                    <td className="px-6 py-4 text-body-sm text-muted-foreground">{userLabel}</td>
                    <td className="px-6 py-4 text-body-sm text-muted-foreground whitespace-nowrap">{formatTimeAgo(log.createdAt)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

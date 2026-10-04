
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { formatTimeAgo, formatCurrency } from "@/lib/utils"
import { toast } from "@/components/toast"
import { demoDashboardData } from "@/lib/demo-data"

interface DashboardData {
  stats: {
    refundsProcessed: string
    moneySaved: string
    hoursSaved: string
    pendingApprovals: string
    flaggedCount: string
    totalOrders: string
  }
  recentActivity: Array<{
    id: string
    action: string
    store: string
    time: string
    icon: string
  }>
  connectedStores: Array<{
    id: string
    name: string
    domain: string
    status: string
  }>
  quickStats: Array<{
    label: string
    value: string
    highlight?: boolean
  }>
  activeRules: number
}

const statCards = [
  { title: "Refunds Processed", key: "refundsProcessed", icon: "payments", iconBg: "bg-primary-fixed", iconColor: "text-primary", change: "+12.5%" },
  { title: "Money Saved via Exchanges", key: "moneySaved", icon: "swap_horiz", iconBg: "bg-[#62fae3]/30", iconColor: "text-secondary", change: "+18.3%" },
  { title: "Hours Saved", key: "hoursSaved", icon: "timer", iconBg: "bg-[#ffdbcc] dark:bg-[#ffdbcc]/15", iconColor: "text-[#752c00] dark:text-[#ffdbcc]", change: "+8.7%" },
  { title: "Pending Approvals", key: "pendingApprovals", icon: "pending_actions", iconBg: "bg-[#ffdbcc] dark:bg-[#ffdbcc]/15", iconColor: "text-[#752c00] dark:text-[#ffdbcc]", change: "+3.2%" },
]

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = React.useState<DashboardData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch")
        }
        return res.json()
      })
      .then((fetched) => {
        // Use demo data if API returns empty data
        if (!fetched || !fetched.stats || (fetched.recentActivity && fetched.recentActivity.length === 0)) {
          setData(demoDashboardData)
        } else {
          setData(fetched)
        }
      })
      .catch(() => {
        // On error, use demo data for prototype
        setData(demoDashboardData)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // No error state needed - we use demo data as fallback

  const flaggedCount = data?.stats.flaggedCount || "0"

  return (
    <>
      <div className="bg-[#ffdbcc]/30 dark:bg-[#ffdbcc]/10 border border-[#ffb694] dark:border-[#ffdbcc]/30 p-4 rounded-xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#752c00] dark:text-[#ffdbcc]">warning</span>
          <p className="text-body-md font-medium text-[#752c00] dark:text-[#ffdbcc]">
            {flaggedCount} item{flaggedCount !== "1" ? "s" : ""} flagged for fraud review
          </p>
        </div>
        <button onClick={() => router.push("/dashboard/approval-queue")} className="px-4 py-1.5 bg-[#752c00] text-white rounded-lg text-[12px] font-medium tracking-[0.05em] hover:bg-[#511c00] transition-colors">
          Review Now
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((m) => {
          const value = data?.stats[m.key as keyof typeof data.stats] || "0"
          return (
            <div key={m.title} className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${m.iconBg} ${m.iconColor}`}>
                  <span className="material-symbols-outlined">{m.icon}</span>
                </div>
                <span className="text-secondary font-semibold text-xs">{m.change}</span>
              </div>
              <h3 className="text-[12px] tracking-[0.05em] font-medium text-on-surface-variant mb-1">{m.title}</h3>
              <p className="text-[24px] font-semibold text-foreground tracking-tight">{value}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-fixed rounded-lg">
                  <span className="material-symbols-outlined text-primary">history</span>
                </div>
                <h3 className="font-semibold text-foreground text-[14px]">Recent Activity</h3>
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {data?.recentActivity.length === 0 ? (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  <span className="material-symbols-outlined text-[48px]">history</span>
                  <p className="text-body-md mt-2">No recent activity</p>
                </div>
              ) : (
                data?.recentActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-background transition-colors">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-medium text-foreground truncate">{item.action}</p>
                      <p className="text-body-sm text-muted-foreground">{item.store} · {item.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-fixed rounded-lg">
                <span className="material-symbols-outlined text-primary">store</span>
              </div>
              <h3 className="font-semibold text-foreground text-[14px]">Connected Stores</h3>
            </div>
            <div className="space-y-3">
              {data?.connectedStores.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <span className="material-symbols-outlined text-[32px]">store</span>
                  <p className="text-body-sm mt-1">No stores connected</p>
                </div>
              ) : (
                data?.connectedStores.map((store) => (
                  <div key={store.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-body-md font-medium text-foreground">{store.name}</p>
                      <p className="text-body-sm text-muted-foreground">{store.domain}</p>
                    </div>
                    <span className={`px-3 py-0.5 text-[11px] font-bold uppercase tracking-tight rounded-full ${
                      store.status === "Active" || store.status === "active"
                        ? "bg-[#62fae3] text-[#007165] dark:bg-[#62fae3]/20 dark:text-[#62fae3]"
                        : "bg-[#ffdad6] text-[#93000a] dark:bg-[#ffdad6]/20 dark:text-[#ffdad6]"
                    }`}>
                      {store.status}
                    </span>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => router.push("/dashboard/settings")} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Connect Store
            </button>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#62fae3]/30 rounded-lg">
                <span className="material-symbols-outlined text-secondary">bar_chart</span>
              </div>
              <h3 className="font-semibold text-foreground text-[14px]">Quick Stats</h3>
            </div>
            <div className="space-y-3">
              {data?.quickStats.map((stat) => (
                <div key={stat.label} className="flex justify-between py-1.5">
                  <span className="text-body-sm text-on-surface-variant">{stat.label}</span>
                  <span className={`text-body-sm font-semibold ${stat.highlight ? "text-destructive" : "text-foreground"}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
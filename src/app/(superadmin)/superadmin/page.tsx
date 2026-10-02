"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { StatsCard } from "@/components/superadmin/stats-card"
import { StatusBadge } from "@/components/superadmin/status-badge"
import { PageHeader } from "@/components/superadmin/page-header"

interface DashboardData {
  stats: {
    totalUsers: number
    totalStores: number
    totalOrders: number
    totalRules: number
    newUsersMonth: number
    activeStores: number
    ordersMonth: number
  }
  recentActivity: Array<{
    id: string
    event: string
    description: string
    ipAddress: string | null
    createdAt: string
  }>
  ordersByStatus: Array<{
    status: string
    count: number
  }>
}

export default function SuperadminOverviewPage() {
  const router = useRouter()
  const [data, setData] = React.useState<DashboardData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/superadmin/dashboard", {
        credentials: "include",
      })
      if (res.status === 401) {
        router.push("/superadmin/login")
        return
      }
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError("Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-superadmin-accent/30 border-t-superadmin-accent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-[14px] text-muted-foreground">{error || "No data"}</p>
        <button onClick={fetchDashboard} className="mt-4 px-4 py-2 bg-superadmin-navy text-white rounded-lg text-[13px]">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Platform Overview"
        description="Real-time visibility into the Quilo ecosystem"
        action={
          <span className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-[11px] font-medium rounded-full">
            All Systems Operational
          </span>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Merchants"
          value={data.stats.totalUsers.toLocaleString()}
          change={`+${data.stats.newUsersMonth} this month`}
          changeType="positive"
          icon="store"
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatsCard
          title="Active Stores"
          value={data.stats.activeStores.toLocaleString()}
          icon="shopping_bag"
          iconColor="bg-purple-50 text-purple-600"
        />
        <StatsCard
          title="Total Orders"
          value={data.stats.totalOrders.toLocaleString()}
          change={`+${data.stats.ordersMonth.toLocaleString()} this month`}
          changeType="positive"
          icon="shopping_cart"
          iconColor="bg-green-50 text-green-600"
        />
        <StatsCard
          title="Automation Rules"
          value={data.stats.totalRules.toLocaleString()}
          icon="rule"
          iconColor="bg-orange-50 text-orange-600"
        />
      </div>

      {/* Orders by Status */}
      {data.ordersByStatus.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <h3 className="text-[13px] font-medium text-foreground mb-3">Orders by Status</h3>
          <div className="flex gap-4 flex-wrap">
            {data.ordersByStatus.map((item) => (
              <div key={item.status} className="flex items-center gap-2">
                <StatusBadge
                  label={item.status}
                  variant={
                    item.status === "completed" ? "success" :
                    item.status === "pending" ? "warning" :
                    item.status === "cancelled" ? "error" : "info"
                  }
                />
                <span className="text-[13px] font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-[13px] font-medium text-foreground mb-3">Recent Activity</h3>
        {data.recentActivity.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-4 text-center">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {data.recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-superadmin-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{item.event}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
